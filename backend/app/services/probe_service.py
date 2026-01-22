import json
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..checker import CheckResult, HTTPXChecker
from ..models import Model, ProbeHistory, Provider, ProviderModel
from ..models.config import GlobalConfig
from .status_service import StatusService


@dataclass
class ProbeConfig:
    """Configuration data needed to execute a probe."""

    provider_id: int
    model_id: int
    base_url: str
    auth_token: str
    model_name: str
    prompt: str
    timeout: int
    template_method: str
    template_url: str
    template_headers: str
    template_body: str
    system_prompt: str | None


class ProbeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.status_service = StatusService(db)

    async def get_config_value(self, key: str, default: str = "") -> str:
        """Get a global config value."""
        result = await self.db.execute(
            select(GlobalConfig).where(GlobalConfig.key == key)
        )
        config = result.scalar_one_or_none()
        return config.value if config else default

    async def get_probe_config(
        self, provider_id: int, model_id: int
    ) -> ProbeConfig | None:
        """Fetch all configuration needed for a probe without holding the session."""
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
            return None

        # Determine prompt and timeout
        prompt = (
            provider_model.custom_prompt
            or model.default_prompt
            or "1+1等于几？只回答数字。"
        )
        global_timeout = int(
            await self.get_config_value("check_timeout_seconds", "120")
        )
        timeout = provider.timeout_seconds or global_timeout

        # Get the model name to use (apply mapping if exists)
        actual_model_name = model.model_name
        if provider.model_name_mapping:
            try:
                mapping = json.loads(provider.model_name_mapping)
                if model.model_name in mapping:
                    actual_model_name = mapping[model.model_name]
            except json.JSONDecodeError:
                pass

        return ProbeConfig(
            provider_id=provider_id,
            model_id=model_id,
            base_url=provider.base_url,
            auth_token=provider.auth_token,
            model_name=actual_model_name,
            prompt=prompt,
            timeout=timeout,
            template_method=template.method,
            template_url=template.url,
            template_headers=template.headers,
            template_body=template.body,
            system_prompt=model.system_prompt,
        )

    async def save_probe_result(
        self, config: ProbeConfig, check_result: CheckResult
    ) -> ProbeHistory:
        """Save probe result to database."""
        output = check_result.output
        if check_result.error:
            output = check_result.error + "\n" + output

        match_result = await self.status_service.match_status(
            output, http_code=check_result.http_code
        )

        message = None
        if not match_result.matched:
            message = output[:1000] if output else None

        history = ProbeHistory(
            provider_id=config.provider_id,
            model_id=config.model_id,
            status_id=match_result.status_id,
            latency_ms=check_result.latency_ms,
            message=message,
            checked_at=datetime.now(timezone.utc),
        )
        self.db.add(history)
        await self.db.commit()
        await self.db.refresh(history)

        return history

    async def probe(self, provider_id: int, model_id: int) -> ProbeHistory | None:
        """Execute a probe for a provider-model combination.

        Note: This method holds the database session during the HTTP request.
        For scheduler use, prefer get_probe_config + execute_probe + save_probe_result.
        """
        config = await self.get_probe_config(provider_id, model_id)
        if not config:
            return None

        checker = HTTPXChecker()
        check_result = await checker.check(
            base_url=config.base_url,
            auth_token=config.auth_token,
            model=config.model_name,
            prompt=config.prompt,
            timeout=config.timeout,
            template_method=config.template_method,
            template_url=config.template_url,
            template_headers=config.template_headers,
            template_body=config.template_body,
            system_prompt=config.system_prompt,
        )

        return await self.save_probe_result(config, check_result)

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

    async def get_history_count(
        self,
        provider_id: int,
        model_id: int,
    ) -> int:
        """Get total count of probe history for a provider-model combination."""
        from sqlalchemy import func

        result = await self.db.execute(
            select(func.count(ProbeHistory.id)).where(
                ProbeHistory.provider_id == provider_id,
                ProbeHistory.model_id == model_id,
            )
        )
        return result.scalar_one()

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
