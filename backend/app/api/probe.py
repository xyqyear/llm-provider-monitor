from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ProbeHistory, StatusCategory
from ..models.status import StatusConfig
from ..schemas.common import PaginatedResponse
from ..schemas.probe import (
    CategoryCounts,
    CategoryStatusNames,
    ProbeHistoryResponse,
    ProbeTriggerResponse,
    TimelineAggregation,
    TimelineBatchItem,
    TimelineBatchResponse,
    TimelinePoint,
)
from ..services.probe_service import ProbeService
from ..services.status_service import StatusInfo, StatusService
from .auth import verify_admin

router = APIRouter()


@router.get(
    "/history/{provider_id}/{model_id}",
    response_model=PaginatedResponse[ProbeHistoryResponse],
)
async def get_probe_history(
    provider_id: int,
    model_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get probe history for a provider-model combination (public)."""
    probe_service = ProbeService(db)
    status_service = StatusService(db)

    # Calculate offset
    offset = (page - 1) * page_size

    # Get total count and history
    total = await probe_service.get_history_count(provider_id, model_id)
    history = await probe_service.get_history(provider_id, model_id, page_size, offset)

    items = []
    for record in history:
        status_info = await status_service.get_status_info(record.status_code)
        items.append(
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

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/timeline/{provider_id}/{model_id}", response_model=list[TimelinePoint])
async def get_timeline(
    provider_id: int,
    model_id: int,
    hours: float = Query(24, ge=0.1, le=720),
    aggregation: Literal["none", "hour", "6hour", "day"] = Query("none"),
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

    # Aggregate by hour, 6hour, or day
    aggregated: dict[str, TimelineAggregation] = {}
    for record in records:
        if aggregation == "hour":
            key = record.checked_at.strftime("%Y-%m-%d %H:00:00")
        elif aggregation == "6hour":
            # Round down to nearest 6-hour block (0, 6, 12, 18)
            hour_block = (record.checked_at.hour // 6) * 6
            key = record.checked_at.strftime(f"%Y-%m-%d {hour_block:02d}:00:00")
        else:  # day
            key = record.checked_at.strftime("%Y-%m-%d 00:00:00")

        if key not in aggregated:
            aggregated[key] = TimelineAggregation(
                timestamp=datetime.strptime(key, "%Y-%m-%d %H:%M:%S"),
                counts=CategoryCounts(),
                status_names=CategoryStatusNames(),
                latencies=[],
            )

        status_info = status_configs.get(record.status_code, status_configs[-1])
        category = status_info.category.value

        # Update counts
        if category == "green":
            aggregated[key].counts.green += 1
        elif category == "yellow":
            aggregated[key].counts.yellow += 1
        elif category == "red":
            aggregated[key].counts.red += 1

        # Update status names
        if category == "green":
            aggregated[key].status_names.green.append(status_info.name)
        elif category == "yellow":
            aggregated[key].status_names.yellow.append(status_info.name)
        elif category == "red":
            aggregated[key].status_names.red.append(status_info.name)

        if record.latency_ms:
            aggregated[key].latencies.append(record.latency_ms)

    # Determine dominant category and calculate average latency
    response = []
    for key in sorted(aggregated.keys()):
        data = aggregated[key]
        counts = data.counts

        # Priority: red > yellow > green
        if counts.red > 0:
            dominant_category = "red"
        elif counts.yellow > 0:
            dominant_category = "yellow"
        else:
            dominant_category = "green"

        # Get the most common status name for the dominant category
        if dominant_category == "red":
            status_names_list = data.status_names.red
        elif dominant_category == "yellow":
            status_names_list = data.status_names.yellow
        else:
            status_names_list = data.status_names.green

        if status_names_list:
            # Use the most common status name
            status_name = max(set(status_names_list), key=status_names_list.count)
        else:
            status_name = "未知"

        avg_latency = (
            sum(data.latencies) / len(data.latencies) if data.latencies else None
        )

        total_count = counts.green + counts.yellow + counts.red

        response.append(
            TimelinePoint(
                timestamp=data.timestamp,
                status_category=dominant_category,
                status_name=status_name,
                count=total_count,
                avg_latency_ms=avg_latency,
            )
        )

    return response


@router.get("/timeline/batch", response_model=TimelineBatchResponse)
async def get_timeline_batch(
    hours: float = Query(24, ge=0.1, le=720),
    aggregation: Literal["none", "hour", "6hour", "day"] = Query("none"),
    provider_ids: str | None = Query(None),
    model_ids: str | None = Query(None),
    status_categories: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get batch timeline data for multiple provider-model combinations (public)."""
    since = datetime.now(UTC) - timedelta(hours=hours)

    # Parse filter parameters
    provider_id_list = (
        [int(x) for x in provider_ids.split(",") if x.strip()] if provider_ids else None
    )
    model_id_list = (
        [int(x) for x in model_ids.split(",") if x.strip()] if model_ids else None
    )
    category_list = (
        [x.strip() for x in status_categories.split(",") if x.strip()]
        if status_categories
        else None
    )

    # Build query with filters
    query = select(ProbeHistory).where(ProbeHistory.checked_at >= since)

    if provider_id_list:
        query = query.where(ProbeHistory.provider_id.in_(provider_id_list))
    if model_id_list:
        query = query.where(ProbeHistory.model_id.in_(model_id_list))

    query = query.order_by(ProbeHistory.checked_at.asc())

    result = await db.execute(query)
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

    # Group records by provider_id and model_id
    grouped: dict[tuple[int, int], list[ProbeHistory]] = {}
    for record in records:
        key = (record.provider_id, record.model_id)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(record)

    # Process each provider-model combination
    items = []
    for (provider_id, model_id), provider_records in grouped.items():
        # Filter by status category if specified
        if category_list:
            filtered_records = []
            for record in provider_records:
                status_info = status_configs.get(record.status_code, status_configs[-1])
                if status_info.category.value in category_list:
                    filtered_records.append(record)
            provider_records = filtered_records

        if not provider_records:
            continue

        # Generate timeline for this provider-model
        if aggregation == "none":
            timeline = [
                TimelinePoint(
                    timestamp=r.checked_at,
                    status_category=status_configs.get(
                        r.status_code, status_configs[-1]
                    ).category.value,
                    status_name=status_configs.get(
                        r.status_code, status_configs[-1]
                    ).name,
                    count=1,
                    avg_latency_ms=float(r.latency_ms) if r.latency_ms else None,
                )
                for r in provider_records
            ]
        else:
            # Aggregate timeline
            aggregated: dict[str, TimelineAggregation] = {}
            for record in provider_records:
                if aggregation == "hour":
                    key = record.checked_at.strftime("%Y-%m-%d %H:00:00")
                elif aggregation == "6hour":
                    hour_block = (record.checked_at.hour // 6) * 6
                    key = record.checked_at.strftime(f"%Y-%m-%d {hour_block:02d}:00:00")
                else:  # day
                    key = record.checked_at.strftime("%Y-%m-%d 00:00:00")

                if key not in aggregated:
                    aggregated[key] = TimelineAggregation(
                        timestamp=datetime.strptime(key, "%Y-%m-%d %H:%M:%S"),
                        counts=CategoryCounts(),
                        status_names=CategoryStatusNames(),
                        latencies=[],
                    )

                status_info = status_configs.get(record.status_code, status_configs[-1])
                category = status_info.category.value

                # Update counts
                if category == "green":
                    aggregated[key].counts.green += 1
                elif category == "yellow":
                    aggregated[key].counts.yellow += 1
                elif category == "red":
                    aggregated[key].counts.red += 1

                # Update status names
                if category == "green":
                    aggregated[key].status_names.green.append(status_info.name)
                elif category == "yellow":
                    aggregated[key].status_names.yellow.append(status_info.name)
                elif category == "red":
                    aggregated[key].status_names.red.append(status_info.name)

                if record.latency_ms:
                    aggregated[key].latencies.append(record.latency_ms)

            # Convert aggregated data to timeline points
            timeline = []
            for key in sorted(aggregated.keys()):
                data = aggregated[key]
                counts = data.counts

                # Priority: red > yellow > green
                if counts.red > 0:
                    dominant_category = "red"
                elif counts.yellow > 0:
                    dominant_category = "yellow"
                else:
                    dominant_category = "green"

                # Get the most common status name for the dominant category
                if dominant_category == "red":
                    status_names_list = data.status_names.red
                elif dominant_category == "yellow":
                    status_names_list = data.status_names.yellow
                else:
                    status_names_list = data.status_names.green

                if status_names_list:
                    status_name = max(
                        set(status_names_list), key=status_names_list.count
                    )
                else:
                    status_name = "未知"

                avg_latency = (
                    sum(data.latencies) / len(data.latencies)
                    if data.latencies
                    else None
                )

                total_count = counts.green + counts.yellow + counts.red

                timeline.append(
                    TimelinePoint(
                        timestamp=data.timestamp,
                        status_category=dominant_category,
                        status_name=status_name,
                        count=total_count,
                        avg_latency_ms=avg_latency,
                    )
                )

        # Calculate uptime percentage
        green_count = sum(1 for point in timeline if point.status_category == "green")
        total_count = len(timeline)
        uptime_percentage = (
            (green_count / total_count * 100) if total_count > 0 else 0.0
        )

        items.append(
            TimelineBatchItem(
                provider_id=provider_id,
                model_id=model_id,
                timeline=timeline,
                uptime_percentage=uptime_percentage,
            )
        )

    return TimelineBatchResponse(items=items)


@router.post("/trigger/{provider_id}/{model_id}", response_model=ProbeTriggerResponse)
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

    return ProbeTriggerResponse(
        status_code=result.status_code,
        status_name=status_info.name,
        status_category=status_info.category.value,
        latency_ms=result.latency_ms,
        message=result.message,
    )
