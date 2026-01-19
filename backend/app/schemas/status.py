from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator


class StatusConfigCreate(BaseModel):
    name: str
    category: Literal["green", "yellow", "red"]
    http_code_pattern: str | None = None
    response_regex: str | None = None
    priority: int = 0

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: int) -> int:
        if v < 0:
            raise ValueError("priority 不能小于 0")
        return v


class StatusConfigUpdate(BaseModel):
    name: str | None = None
    category: Literal["green", "yellow", "red"] | None = None
    http_code_pattern: str | None = None
    response_regex: str | None = None
    priority: int | None = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("priority 不能小于 0")
        return v


class StatusConfigResponse(BaseModel):
    id: int
    name: str
    category: Literal["green", "yellow", "red"]
    http_code_pattern: str | None
    response_regex: str | None
    priority: int
    created_at: datetime

    class Config:
        from_attributes = True


class UnmatchedMessageResponse(BaseModel):
    message: str
    occurrence_count: int
    first_seen: datetime
    last_seen: datetime


class PreviewMatchRequest(BaseModel):
    regex: str


class PreviewMatchResponse(BaseModel):
    message: str
    count: int
