from typing import Generic, TypeVar

from pydantic import BaseModel

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
