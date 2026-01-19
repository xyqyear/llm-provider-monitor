from datetime import datetime
from typing import Literal

from pydantic import BaseModel


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
