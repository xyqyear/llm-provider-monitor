from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProbeHistoryResponse(BaseModel):
    id: int
    provider_id: int
    model_id: int
    status_code: int
    status_name: str
    status_category: Literal["green", "yellow", "red"]
    latency_ms: int | None
    message: str | None
    checked_at: datetime

    class Config:
        from_attributes = True


class TimelinePoint(BaseModel):
    timestamp: datetime
    status_category: Literal["green", "yellow", "red"]
    status_name: str
    count: int = 1
    avg_latency_ms: float | None = None


class CurrentStatus(BaseModel):
    provider_id: int
    model_id: int
    status_code: int
    status_name: str
    status_category: Literal["green", "yellow", "red"]
    latency_ms: int | None
    checked_at: datetime | None


class ProbeTriggerResponse(BaseModel):
    """Response from manually triggering a probe."""

    status_code: int
    status_name: str
    status_category: str
    latency_ms: int | None
    message: str | None


class CategoryCounts(BaseModel):
    """Count of statuses by category."""

    green: int = 0
    yellow: int = 0
    red: int = 0


class CategoryStatusNames(BaseModel):
    """Status names grouped by category."""

    green: list[str] = Field(default_factory=list)
    yellow: list[str] = Field(default_factory=list)
    red: list[str] = Field(default_factory=list)


class TimelineAggregation(BaseModel):
    """Internal aggregation state for timeline data."""

    timestamp: datetime
    counts: CategoryCounts
    status_names: CategoryStatusNames
    latencies: list[int] = Field(default_factory=list)
