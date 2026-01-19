from pydantic import BaseModel


class ModelCreate(BaseModel):
    name: str
    model_name: str  # 实际发送请求时使用的模型名
    display_name: str
    default_prompt: str | None = None
    default_regex: str | None = None
    system_prompt: str | None = None
    template_id: int | None = None
    enabled: bool = True
    sort_order: int = 0


class ModelUpdate(BaseModel):
    name: str | None = None
    model_name: str | None = None
    display_name: str | None = None
    default_prompt: str | None = None
    default_regex: str | None = None
    system_prompt: str | None = None
    template_id: int | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class ModelResponse(BaseModel):
    id: int
    name: str
    model_name: str
    display_name: str
    default_prompt: str | None
    default_regex: str | None
    system_prompt: str | None
    template_id: int | None
    enabled: bool
    sort_order: int

    class Config:
        from_attributes = True
