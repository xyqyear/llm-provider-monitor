from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ProbeHistory
from ..models.status import StatusConfig
from ..schemas.common import (
    MessageResponse,
    MessageWithCountResponse,
    PaginatedResponse,
)
from ..schemas.status import (
    PreviewMatchRequest,
    PreviewMatchResponse,
    StatusConfigCreate,
    StatusConfigResponse,
    StatusConfigUpdate,
    UnmatchedMessageResponse,
)
from ..services.status_service import StatusService
from .auth import verify_admin

router = APIRouter()


@router.get("/configs", response_model=list[StatusConfigResponse])
async def get_status_configs(db: AsyncSession = Depends(get_db)):
    """Get all status configs (public)."""
    result = await db.execute(
        select(StatusConfig).order_by(StatusConfig.priority.desc())
    )
    return result.scalars().all()


@router.post("/configs", response_model=StatusConfigResponse)
async def create_status_config(
    config: StatusConfigCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Create a new status config (admin only)."""
    new_config = StatusConfig(**config.model_dump())
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)

    return new_config


@router.put("/configs/{config_id}", response_model=StatusConfigResponse)
async def update_status_config(
    config_id: int,
    config: StatusConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Update a status config (admin only)."""
    result = await db.execute(select(StatusConfig).where(StatusConfig.id == config_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="状态配置不存在")

    # Protect the default "unknown" status config (id=-1)
    if existing.id == -1:
        raise HTTPException(status_code=400, detail="无法修改默认的未知状态配置")

    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    await db.commit()
    await db.refresh(existing)

    return existing


@router.delete("/configs/{config_id}", response_model=MessageResponse)
async def delete_status_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Delete a status config (admin only)."""
    result = await db.execute(select(StatusConfig).where(StatusConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="状态配置不存在")

    # Protect the default "unknown" status config (id=-1)
    if config.id == -1:
        raise HTTPException(status_code=400, detail="无法删除默认的未知状态配置")

    await db.delete(config)
    await db.commit()

    return MessageResponse(message="已删除")


@router.post("/configs/preview", response_model=list[PreviewMatchResponse])
async def preview_regex_matches(
    request: PreviewMatchRequest,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Preview which unmatched messages would match a regex (admin only)."""
    status_service = StatusService(db)
    matches = await status_service.preview_matches(request.regex)
    return [PreviewMatchResponse(message=m.message, count=m.count) for m in matches]


@router.post("/configs/{config_id}/apply", response_model=MessageWithCountResponse)
async def apply_config_to_history(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Apply a status config to historical unmatched records (admin only)."""
    result = await db.execute(select(StatusConfig).where(StatusConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="状态配置不存在")

    status_service = StatusService(db)
    updated_count = await status_service.apply_config_to_history(config.id)

    return MessageWithCountResponse(
        message=f"已更新 {updated_count} 条记录", updated_count=updated_count
    )


@router.get("/unmatched", response_model=PaginatedResponse[UnmatchedMessageResponse])
async def get_unmatched_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Get unmatched messages from ProbeHistory (admin only)."""
    # Calculate offset
    offset = (page - 1) * page_size

    # Get total count of distinct messages
    count_result = await db.execute(
        select(func.count(func.distinct(ProbeHistory.message))).where(
            ProbeHistory.message.isnot(None)
        )
    )
    total = count_result.scalar_one()

    # Get distinct messages with their counts (paginated)
    result = await db.execute(
        select(
            ProbeHistory.message,
            func.count(ProbeHistory.id).label("occurrence_count"),
            func.min(ProbeHistory.checked_at).label("first_seen"),
            func.max(ProbeHistory.checked_at).label("last_seen"),
        )
        .where(ProbeHistory.message.isnot(None))
        .group_by(ProbeHistory.message)
        .order_by(func.count(ProbeHistory.id).desc())
        .limit(page_size)
        .offset(offset)
    )

    items = []
    for row in result:
        items.append(
            UnmatchedMessageResponse(
                message=row.message,
                occurrence_count=row.occurrence_count,
                first_seen=row.first_seen,
                last_seen=row.last_seen,
            )
        )

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
