from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import RequestTemplate
from ..schemas.template import (
    RequestTemplateCreate,
    RequestTemplateResponse,
    RequestTemplateUpdate,
    _validate_variables,
)
from .auth import verify_admin

router = APIRouter()


@router.get("", response_model=list[RequestTemplateResponse])
async def get_templates(db: AsyncSession = Depends(get_db)):
    """Get all request templates (public)."""
    result = await db.execute(select(RequestTemplate).order_by(RequestTemplate.name))
    templates = result.scalars().all()
    return templates


@router.get("/{template_id}", response_model=RequestTemplateResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single template by ID."""
    result = await db.execute(
        select(RequestTemplate).where(RequestTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return template


@router.post("", response_model=RequestTemplateResponse)
async def create_template(
    template: RequestTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Create a new request template (admin only)."""
    # Check if name already exists
    result = await db.execute(
        select(RequestTemplate).where(RequestTemplate.name == template.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="模板名称已存在")

    new_template = RequestTemplate(**template.model_dump())
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return new_template


@router.put("/{template_id}", response_model=RequestTemplateResponse)
async def update_template(
    template_id: int,
    template: RequestTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Update a request template (admin only)."""
    result = await db.execute(
        select(RequestTemplate).where(RequestTemplate.id == template_id)
    )
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="模板不存在")

    update_data = template.model_dump(exclude_unset=True)

    # Check for name conflict if name is being updated
    if "name" in update_data and update_data["name"] != existing.name:
        result = await db.execute(
            select(RequestTemplate).where(RequestTemplate.name == update_data["name"])
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="模板名称已存在")

    for key, value in update_data.items():
        setattr(existing, key, value)

    # 验证更新后的完整模板变量
    try:
        _validate_variables(existing.url, existing.headers, existing.body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.commit()
    await db.refresh(existing)
    return existing


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Delete a request template (admin only)."""
    result = await db.execute(
        select(RequestTemplate).where(RequestTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    await db.delete(template)
    await db.commit()

    return {"message": "已删除"}
