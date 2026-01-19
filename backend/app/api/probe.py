from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ProbeHistory, StatusCategory
from ..models.status import StatusConfig
from ..schemas.probe import ProbeHistoryResponse, TimelinePoint
from ..services.probe_service import ProbeService
from ..services.status_service import StatusInfo, StatusService
from .auth import verify_admin

router = APIRouter()


@router.get(
    "/history/{provider_id}/{model_id}", response_model=list[ProbeHistoryResponse]
)
async def get_probe_history(
    provider_id: int,
    model_id: int,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get probe history for a provider-model combination (public)."""
    probe_service = ProbeService(db)
    status_service = StatusService(db)
    history = await probe_service.get_history(provider_id, model_id, limit, offset)

    response = []
    for record in history:
        status_info = await status_service.get_status_info(record.status_code)
        response.append(
            ProbeHistoryResponse(
                id=record.id,
                provider_id=record.provider_id,
                model_id=record.model_id,
                status_code=record.status_code,
                status_name=status_info.name,
                status_category=status_info.category.value,
                latency_ms=record.latency_ms,
                message=record.message,
                checked_at=record.checked_at,
            )
        )

    return response


@router.get("/timeline/{provider_id}/{model_id}", response_model=list[TimelinePoint])
async def get_timeline(
    provider_id: int,
    model_id: int,
    hours: int = Query(24, ge=1, le=168),
    aggregation: Literal["none", "hour", "day"] = Query("none"),
    db: AsyncSession = Depends(get_db),
):
    """Get timeline data for visualization (public)."""
    since = datetime.now(UTC) - timedelta(hours=hours)

    result = await db.execute(
        select(ProbeHistory)
        .where(
            ProbeHistory.provider_id == provider_id,
            ProbeHistory.model_id == model_id,
            ProbeHistory.checked_at >= since,
        )
        .order_by(ProbeHistory.checked_at.asc())
    )
    records = result.scalars().all()

    # Get status configs for category lookup
    status_result = await db.execute(select(StatusConfig))
    status_configs_list = status_result.scalars().all()
    status_configs: dict[int, StatusInfo] = {
        sc.code: StatusInfo(category=sc.category, name=sc.name)
        for sc in status_configs_list
    }
    status_configs[-1] = StatusInfo(
        category=StatusCategory.YELLOW, name="未知"
    )  # Default for unknown

    if aggregation == "none":
        return [
            TimelinePoint(
                timestamp=r.checked_at,
                status_category=status_configs.get(
                    r.status_code, status_configs[-1]
                ).category.value,
                status_name=status_configs.get(r.status_code, status_configs[-1]).name,
                count=1,
                avg_latency_ms=float(r.latency_ms) if r.latency_ms else None,
            )
            for r in records
        ]

    # Aggregate by hour or day
    aggregated: dict[str, dict] = {}
    for record in records:
        if aggregation == "hour":
            key = record.checked_at.strftime("%Y-%m-%d %H:00:00")
        else:  # day
            key = record.checked_at.strftime("%Y-%m-%d 00:00:00")

        if key not in aggregated:
            aggregated[key] = {
                "timestamp": datetime.strptime(key, "%Y-%m-%d %H:%M:%S"),
                "counts": {"green": 0, "yellow": 0, "red": 0},
                "status_names": {"green": [], "yellow": [], "red": []},
                "latencies": [],
            }

        status_info = status_configs.get(record.status_code, status_configs[-1])
        category = status_info.category.value
        aggregated[key]["counts"][category] += 1
        aggregated[key]["status_names"][category].append(status_info.name)
        if record.latency_ms:
            aggregated[key]["latencies"].append(record.latency_ms)

    # Determine dominant category and calculate average latency
    response = []
    for key in sorted(aggregated.keys()):
        data = aggregated[key]
        counts = data["counts"]

        # Priority: red > yellow > green
        if counts["red"] > 0:
            dominant_category = "red"
        elif counts["yellow"] > 0:
            dominant_category = "yellow"
        else:
            dominant_category = "green"

        # Get the most common status name for the dominant category
        status_names_list = data["status_names"][dominant_category]
        if status_names_list:
            # Use the most common status name
            status_name = max(set(status_names_list), key=status_names_list.count)
        else:
            status_name = "未知"

        avg_latency = (
            sum(data["latencies"]) / len(data["latencies"])
            if data["latencies"]
            else None
        )

        response.append(
            TimelinePoint(
                timestamp=data["timestamp"],
                status_category=dominant_category,
                status_name=status_name,
                count=sum(counts.values()),
                avg_latency_ms=avg_latency,
            )
        )

    return response


@router.post("/trigger/{provider_id}/{model_id}")
async def trigger_probe(
    provider_id: int,
    model_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    """Manually trigger a probe (admin only)."""
    probe_service = ProbeService(db)
    result = await probe_service.probe(provider_id, model_id)

    if not result:
        raise HTTPException(status_code=400, detail="检测失败或供应商/模型未启用")

    status_service = StatusService(db)
    status_info = await status_service.get_status_info(result.status_code)

    return {
        "status_code": result.status_code,
        "status_name": status_info.name,
        "status_category": status_info.category,
        "latency_ms": result.latency_ms,
        "message": result.message,
    }
