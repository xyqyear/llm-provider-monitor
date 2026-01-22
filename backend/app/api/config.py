from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Provider
from ..models.config import GlobalConfig
from ..scheduler.probe_scheduler import scheduler
from ..schemas.common import MessageResponse, PasswordVerificationResponse
from ..schemas.config import GlobalConfigResponse, GlobalConfigUpdate
from .auth import verify_admin

router = APIRouter()


async def _get_config_dict(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(GlobalConfig))
    return {c.key: c.value for c in result.scalars().all()}


async def validate_timeout_interval(
    db: AsyncSession,
    new_timeout: int | None = None,
    new_interval: int | None = None,
):
    """Validate that timeout < interval for global and all provider configs."""
    configs = await _get_config_dict(db)

    global_timeout = new_timeout or int(configs.get("check_timeout_seconds", "120"))
    global_interval = new_interval or int(configs.get("check_interval_seconds", "300"))

    if global_timeout >= global_interval:
        raise HTTPException(
            status_code=400,
            detail=f"超时时间 ({global_timeout}s) 必须小于检测间隔 ({global_interval}s)",
        )

    result = await db.execute(select(Provider))
    for provider in result.scalars().all():
        p_interval = provider.interval_seconds or global_interval
        p_timeout = provider.timeout_seconds or global_timeout
        if p_timeout >= p_interval:
            raise HTTPException(
                status_code=400,
                detail=f"供应商 '{provider.name}' 的超时时间 ({p_timeout}s) 必须小于检测间隔 ({p_interval}s)",
            )


@router.get("", response_model=GlobalConfigResponse)
async def get_config(db: AsyncSession = Depends(get_db)):
    """Get global config (public, without sensitive data)."""
    configs = await _get_config_dict(db)

    return GlobalConfigResponse(
        check_interval_seconds=int(configs.get("check_interval_seconds", "300")),
        check_timeout_seconds=int(configs.get("check_timeout_seconds", "120")),
        data_retention_days=int(configs.get("data_retention_days", "30")),
        has_admin_password=bool(configs.get("admin_password", "")),
    )


@router.put("", response_model=MessageResponse)
async def update_config(
    config: GlobalConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Update global config (admin only)."""
    update_data = config.model_dump(exclude_unset=True)

    await validate_timeout_interval(
        db,
        new_timeout=update_data.get("check_timeout_seconds"),
        new_interval=update_data.get("check_interval_seconds"),
    )

    for key, value in update_data.items():
        if key == "admin_password":
            if value:
                await _update_config_value(db, "admin_password", value)
            continue

        db_key = key
        await _update_config_value(db, db_key, str(value))

    await db.commit()

    if "check_interval_seconds" in update_data:
        await scheduler.refresh_tasks()

    return MessageResponse(message="已更新")


async def _update_config_value(db: AsyncSession, key: str, value: str):
    """Update or create a config value."""
    result = await db.execute(select(GlobalConfig).where(GlobalConfig.key == key))
    config = result.scalar_one_or_none()

    if config:
        config.value = value
    else:
        db.add(GlobalConfig(key=key, value=value))


@router.post("/auth", response_model=PasswordVerificationResponse)
async def verify_password(
    x_admin_password: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Verify admin password."""
    result = await db.execute(
        select(GlobalConfig).where(GlobalConfig.key == "admin_password")
    )
    config = result.scalar_one_or_none()

    if not config or not config.value:
        return PasswordVerificationResponse(valid=True, password_set=False)

    if not x_admin_password:
        return PasswordVerificationResponse(valid=False, password_set=True)

    valid = x_admin_password == config.value
    return PasswordVerificationResponse(valid=valid, password_set=True)
