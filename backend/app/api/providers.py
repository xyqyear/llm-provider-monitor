import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Model, Provider, ProviderModel
from ..scheduler.probe_scheduler import scheduler
from ..schemas.provider import (
    ProviderAdminResponse,
    ProviderCreate,
    ProviderModelConfig,
    ProviderModelStatus,
    ProviderResponse,
    ProviderUpdate,
    ProviderWithModels,
)
from ..services.probe_service import ProbeService
from ..services.status_service import StatusService
from .auth import verify_admin

router = APIRouter()


def parse_model_name_mapping(mapping_str: str | None) -> dict[str, str] | None:
    """Parse model_name_mapping from JSON string to dict."""
    if not mapping_str:
        return None
    try:
        return json.loads(mapping_str)
    except json.JSONDecodeError:
        return None


def serialize_model_name_mapping(mapping: dict[str, str] | None) -> str | None:
    """Serialize model_name_mapping from dict to JSON string."""
    if not mapping:
        return None
    return json.dumps(mapping)


@router.get("", response_model=list[ProviderWithModels])
async def get_providers_status(db: AsyncSession = Depends(get_db)):
    """Get all providers with their current status (public)."""
    result = await db.execute(
        select(Provider).options(selectinload(Provider.models)).order_by(Provider.name)
    )
    providers = result.scalars().all()

    probe_service = ProbeService(db)
    status_service = StatusService(db)

    response = []
    for provider in providers:
        models_status = []
        for pm in provider.models:
            latest = await probe_service.get_latest_status(provider.id, pm.model_id)
            status_info = await status_service.get_status_info(
                latest.status_code if latest else 0
            )

            # Get model info
            model_result = await db.execute(
                select(Model).where(Model.id == pm.model_id)
            )
            model = model_result.scalar_one_or_none()

            models_status.append(
                ProviderModelStatus(
                    model_id=pm.model_id,
                    model_name=model.name if model else "",
                    display_name=model.display_name if model else "",
                    enabled=pm.enabled,
                    status_code=latest.status_code if latest else None,
                    status_name=status_info.name,
                    status_category=status_info.category.value,
                    latency_ms=latest.latency_ms if latest else None,
                    checked_at=latest.checked_at if latest else None,
                )
            )

        response.append(
            ProviderWithModels(
                id=provider.id,
                name=provider.name,
                base_url=provider.base_url,
                enabled=provider.enabled,
                interval_seconds=provider.interval_seconds,
                model_name_mapping=parse_model_name_mapping(
                    provider.model_name_mapping
                ),
                models=models_status,
            )
        )

    return response


@router.get("/admin", response_model=list[ProviderAdminResponse])
async def get_providers_admin(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Get all providers with sensitive info (admin only)."""
    result = await db.execute(select(Provider).order_by(Provider.name))
    providers = result.scalars().all()

    # Convert model_name_mapping to dict for each provider
    response = []
    for p in providers:
        response.append(
            ProviderAdminResponse(
                id=p.id,
                name=p.name,
                base_url=p.base_url,
                auth_token=p.auth_token,
                enabled=p.enabled,
                interval_seconds=p.interval_seconds,
                model_name_mapping=parse_model_name_mapping(p.model_name_mapping),
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return response


@router.post("", response_model=ProviderResponse)
async def create_provider(
    provider: ProviderCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Create a new provider (admin only)."""
    # Check if name already exists
    result = await db.execute(select(Provider).where(Provider.name == provider.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="供应商名称已存在")

    new_provider = Provider(
        name=provider.name,
        base_url=provider.base_url,
        auth_token=provider.auth_token,
        enabled=provider.enabled,
        interval_seconds=provider.interval_seconds,
        model_name_mapping=serialize_model_name_mapping(provider.model_name_mapping),
    )
    db.add(new_provider)
    await db.commit()
    await db.refresh(new_provider)

    # Add models if specified
    for model_config in provider.models:
        pm = ProviderModel(
            provider_id=new_provider.id,
            model_id=model_config.model_id,
            enabled=model_config.enabled,
            custom_prompt=model_config.custom_prompt,
            custom_regex=model_config.custom_regex,
        )
        db.add(pm)

    await db.commit()
    await scheduler.refresh_tasks()

    return ProviderResponse(
        id=new_provider.id,
        name=new_provider.name,
        base_url=new_provider.base_url,
        enabled=new_provider.enabled,
        interval_seconds=new_provider.interval_seconds,
        model_name_mapping=parse_model_name_mapping(new_provider.model_name_mapping),
        created_at=new_provider.created_at,
        updated_at=new_provider.updated_at,
    )


@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: int,
    provider: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Update a provider (admin only)."""
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="供应商不存在")

    update_data = provider.model_dump(exclude_unset=True)

    # Handle model_name_mapping serialization
    if "model_name_mapping" in update_data:
        update_data["model_name_mapping"] = serialize_model_name_mapping(
            update_data["model_name_mapping"]
        )

    for key, value in update_data.items():
        setattr(existing, key, value)

    await db.commit()
    await db.refresh(existing)
    await scheduler.refresh_tasks()

    return ProviderResponse(
        id=existing.id,
        name=existing.name,
        base_url=existing.base_url,
        enabled=existing.enabled,
        interval_seconds=existing.interval_seconds,
        model_name_mapping=parse_model_name_mapping(existing.model_name_mapping),
        created_at=existing.created_at,
        updated_at=existing.updated_at,
    )


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Delete a provider (admin only)."""
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="供应商不存在")

    await db.delete(provider)
    await db.commit()
    await scheduler.refresh_tasks()

    return {"message": "已删除"}


@router.post("/{provider_id}/models")
async def configure_provider_models(
    provider_id: int,
    models: list[ProviderModelConfig],
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Configure models for a provider (admin only)."""
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="供应商不存在")

    # Remove existing provider_models
    result = await db.execute(
        select(ProviderModel).where(ProviderModel.provider_id == provider_id)
    )
    for pm in result.scalars().all():
        await db.delete(pm)

    # Add new ones
    for model_config in models:
        pm = ProviderModel(
            provider_id=provider_id,
            model_id=model_config.model_id,
            enabled=model_config.enabled,
            custom_prompt=model_config.custom_prompt,
            custom_regex=model_config.custom_regex,
        )
        db.add(pm)

    await db.commit()
    await scheduler.refresh_tasks()

    return {"message": "已更新"}
