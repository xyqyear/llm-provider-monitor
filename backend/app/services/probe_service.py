import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..checker import CheckResult, HTTPXChecker
from ..models import Model, ProbeHistory, Provider, ProviderModel
from ..models.config import GlobalConfig
from .status_service import StatusService


class ProbeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.checker = HTTPXChecker()
        self.status_service = StatusService(db)

    async def get_config_value(self, key: str, default: str = "") -> str:
        """Get a global config value."""
        result = await self.db.execute(
            select(GlobalConfig).where(GlobalConfig.key == key)
        )
        config = result.scalar_one_or_none()
        return config.value if config else default

    async def probe(self, provider_id: int, model_id: int) -> ProbeHistory | None:
        """Execute a probe for a provider-model combination."""
        # Get provider
        result = await self.db.execute(
            select(Provider).where(Provider.id == provider_id)
        )
        provider = result.scalar_one_or_none()
        if not provider or not provider.enabled:
            return None

        # Get provider-model config
        result = await self.db.execute(
            select(ProviderModel).where(
                ProviderModel.provider_id == provider_id,
                ProviderModel.model_id == model_id,
            )
        )
        provider_model = result.scalar_one_or_none()
        if not provider_model or not provider_model.enabled:
            return None

        # Get model with template
        result = await self.db.execute(
            select(Model)
            .options(selectinload(Model.template))
            .where(Model.id == model_id)
        )
        model = result.scalar_one_or_none()
        if not model or not model.enabled:
            return None

        # Get template
        template = model.template
        if not template:
            # No template configured, skip
            return None

        # Determine prompt and timeout
        prompt = (
            provider_model.custom_prompt
            or model.default_prompt
            or "1+1等于几？只回答数字。"
        )
        timeout = int(await self.get_config_value("check_timeout_seconds", "120"))

        # Get the model name to use (apply mapping if exists)
        actual_model_name = model.model_name
        if provider.model_name_mapping:
            try:
                mapping = json.loads(provider.model_name_mapping)
                if model.model_name in mapping:
                    actual_model_name = mapping[model.model_name]
            except json.JSONDecodeError:
                pass

        # Execute check
        check_result: CheckResult = await self.checker.check(
            base_url=provider.base_url,
            auth_token=provider.auth_token,
            model=actual_model_name,
            prompt=prompt,
            timeout=timeout,
            template_method=template.method,
            template_url=template.url,
            template_headers=template.headers,
            template_body=template.body,
            system_prompt=model.system_prompt,
        )

        # Determine status code
        output = check_result.output
        if check_result.error:
            output = check_result.error + "\n" + output

        match_result = await self.status_service.match_status(
            output, http_code=check_result.http_code
        )

        # Record unmatched messages for manual classification
        message = None
        if not match_result.matched:
            message = output[:1000] if output else None

        # Create history record
        history = ProbeHistory(
            provider_id=provider_id,
            model_id=model_id,
            status_code=match_result.status_code,
            latency_ms=check_result.latency_ms,
            message=message,
            checked_at=datetime.utcnow(),
        )
        self.db.add(history)
        await self.db.commit()
        await self.db.refresh(history)

        return history

    async def get_latest_status(
        self, provider_id: int, model_id: int
    ) -> ProbeHistory | None:
        """Get the latest probe history for a provider-model combination."""
        result = await self.db.execute(
            select(ProbeHistory)
            .where(
                ProbeHistory.provider_id == provider_id,
                ProbeHistory.model_id == model_id,
            )
            .order_by(ProbeHistory.checked_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_history(
        self,
        provider_id: int,
        model_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ProbeHistory]:
        """Get probe history for a provider-model combination."""
        result = await self.db.execute(
            select(ProbeHistory)
            .where(
                ProbeHistory.provider_id == provider_id,
                ProbeHistory.model_id == model_id,
            )
            .order_by(ProbeHistory.checked_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_all_enabled_tasks(self) -> list[tuple[int, int]]:
        """Get all enabled provider-model combinations."""
        result = await self.db.execute(
            select(ProviderModel)
            .join(Provider)
            .join(Model)
            .where(
                Provider.enabled == True,  # noqa: E712
                ProviderModel.enabled == True,  # noqa: E712
                Model.enabled == True,  # noqa: E712
            )
        )
        provider_models = result.scalars().all()
        return [(pm.provider_id, pm.model_id) for pm in provider_models]
