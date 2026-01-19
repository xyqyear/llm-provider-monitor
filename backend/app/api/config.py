from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.config import GlobalConfig
from ..scheduler.probe_scheduler import scheduler
from ..schemas.common import MessageResponse, PasswordVerificationResponse
from ..schemas.config import GlobalConfigResponse, GlobalConfigUpdate
from .auth import verify_admin

router = APIRouter()


@router.get("", response_model=GlobalConfigResponse)
async def get_config(db: AsyncSession = Depends(get_db)):
    """Get global config (public, without sensitive data)."""
    result = await db.execute(select(GlobalConfig))
    configs = {c.key: c.value for c in result.scalars().all()}

    return GlobalConfigResponse(
        check_interval_seconds=int(configs.get("check_interval_seconds", "300")),
        check_timeout_seconds=int(configs.get("check_timeout_seconds", "120")),
        max_parallel_checks=int(configs.get("max_parallel_checks", "3")),
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

    for key, value in update_data.items():
        if key == "admin_password":
            if value:
                # Store password directly without hashing
                await _update_config_value(db, "admin_password", value)
            continue

        db_key = key
        await _update_config_value(db, db_key, str(value))

    await db.commit()

    # Refresh scheduler if interval changed
    if "check_interval_seconds" in update_data or "max_parallel_checks" in update_data:
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
