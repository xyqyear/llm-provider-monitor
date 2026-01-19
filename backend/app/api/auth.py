from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.config import GlobalConfig


async def verify_admin(
    x_admin_password: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> bool:
    """Verify admin password.

    - If no password is configured, allow access
    - If password is configured but not provided, return 401
    - If password is configured and provided, verify it
    """
    result = await db.execute(
        select(GlobalConfig).where(GlobalConfig.key == "admin_password")
    )
    config = result.scalar_one_or_none()

    # No password set, allow access
    if not config or not config.value:
        return True

    # Password is set but not provided
    if not x_admin_password:
        raise HTTPException(status_code=401, detail="需要管理密码")

    # Verify password (direct comparison)
    if x_admin_password != config.value:
        raise HTTPException(status_code=401, detail="密码错误")

    return True
