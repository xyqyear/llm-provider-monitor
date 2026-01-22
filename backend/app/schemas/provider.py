from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ProviderModelConfig(BaseModel):
    model_id: int
    enabled: bool = True
    custom_prompt: str | None = None
    custom_regex: str | None = None


class ProviderCreate(BaseModel):
    name: str
    base_url: str
    auth_token: str
    website: str | None = None
    enabled: bool = True
    interval_seconds: int | None = None
    timeout_seconds: int | None = None
    model_name_mapping: dict[str, str] | None = (
        None  # {"cc-haiku": "claude-3-haiku-20240307"}
    )
    models: list[ProviderModelConfig] = []


class ProviderUpdate(BaseModel):
    name: str | None = None
    base_url: str | None = None
    auth_token: str | None = None
    website: str | None = None
    enabled: bool | None = None
    interval_seconds: int | None = None
    timeout_seconds: int | None = None
    model_name_mapping: dict[str, str] | None = None


class ProviderModelResponse(BaseModel):
    id: int
    model_id: int
    model_name: str
    display_name: str
    enabled: bool
    custom_prompt: str | None = None
    custom_regex: str | None = None


class ProviderResponse(BaseModel):
    id: int
    name: str
    base_url: str
    website: str | None
    enabled: bool
    interval_seconds: int | None
    timeout_seconds: int | None
    model_name_mapping: dict[str, str] | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProviderAdminResponse(ProviderResponse):
    auth_token: str


class ProviderModelStatus(BaseModel):
    model_id: int
    model_name: str
    display_name: str
    enabled: bool
    status_id: int | None = None
    status_name: str | None = None
    status_category: Literal["green", "yellow", "red"] | None = None
    latency_ms: int | None = None
    checked_at: datetime | None = None


class ProviderWithModels(BaseModel):
    id: int
    name: str
    base_url: str
    website: str | None
    enabled: bool
    interval_seconds: int | None
    timeout_seconds: int | None
    model_name_mapping: dict[str, str] | None = None
    models: list[ProviderModelStatus]

    class Config:
        from_attributes = True
