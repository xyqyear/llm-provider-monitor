from datetime import datetime
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, PlainSerializer


def _serialize_utc_datetime(dt: datetime | None) -> str | None:
    """Serialize datetime to ISO format with Z suffix for UTC."""
    if dt is None:
        return None
    return dt.isoformat() + "Z"


UTCDatetime = Annotated[datetime, PlainSerializer(_serialize_utc_datetime, when_used="json")]

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    """Simple message response."""

    message: str


class MessageWithCountResponse(BaseModel):
    """Message response with count."""

    message: str
    updated_count: int


class HealthCheckResponse(BaseModel):
    """Health check response."""

    status: str


class PasswordVerificationResponse(BaseModel):
    """Password verification response."""

    valid: bool
    password_set: bool


class ConfigLookupResponse(BaseModel):
    """Configuration lookup response."""

    probe_interval_seconds: str
    data_retention_days: str
    admin_password: str


class CleanupResult(BaseModel):
    """Cleanup operation result."""

    history_deleted: int


class PreviewMatch(BaseModel):
    """Preview match result for a single message."""

    message: str
    count: int
