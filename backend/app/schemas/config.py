from pydantic import BaseModel


class GlobalConfigResponse(BaseModel):
    check_interval_seconds: int
    check_timeout_seconds: int
    max_parallel_checks: int
    data_retention_days: int
    has_admin_password: bool


class GlobalConfigUpdate(BaseModel):
    check_interval_seconds: int | None = None
    check_timeout_seconds: int | None = None
    max_parallel_checks: int | None = None
    data_retention_days: int | None = None
    admin_password: str | None = None
