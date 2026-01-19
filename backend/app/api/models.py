from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Model
from ..schemas.model import ModelCreate, ModelResponse, ModelUpdate
from .auth import verify_admin

router = APIRouter()


@router.get("", response_model=list[ModelResponse])
async def get_models(db: AsyncSession = Depends(get_db)):
    """Get all models (public)."""
    result = await db.execute(select(Model).order_by(Model.sort_order, Model.name))
    return result.scalars().all()


@router.post("", response_model=ModelResponse)
async def create_model(
    model: ModelCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Create a new model (admin only)."""
    result = await db.execute(select(Model).where(Model.name == model.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="模型名称已存在")

    new_model = Model(**model.model_dump())
    db.add(new_model)
    await db.commit()
    await db.refresh(new_model)

    return new_model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: int,
    model: ModelUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Update a model (admin only)."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="模型不存在")

    update_data = model.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    await db.commit()
    await db.refresh(existing)

    return existing


@router.delete("/{model_id}")
async def delete_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Delete a model (admin only)."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")

    await db.delete(model)
    await db.commit()

    return {"message": "已删除"}
