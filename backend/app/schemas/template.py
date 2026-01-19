import json
import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH"]

# 允许的模板变量
ALLOWED_VARIABLES = {"key", "model", "user_prompt", "system_prompt"}

# 匹配 {variable} 的正则
VARIABLE_PATTERN = re.compile(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}")


def _validate_headers_format(headers: str) -> None:
    """验证 headers 格式：每行应为 'Key: Value' 或空行"""
    for i, line in enumerate(headers.split("\n"), 1):
        line = line.strip()
        if not line:
            continue
        if ":" not in line:
            raise ValueError(f"headers 第 {i} 行格式错误，应为 'Key: Value' 格式")


def _validate_body_json(body: str) -> None:
    """验证 body 是有效的 JSON（用占位符替换变量后）"""
    # 用假值替换所有变量占位符
    test_body = VARIABLE_PATTERN.sub("test_value", body)
    try:
        json.loads(test_body)
    except json.JSONDecodeError as e:
        raise ValueError(f"body 不是有效的 JSON: {e.msg}")


def _validate_variables(url: str, headers: str, body: str) -> None:
    """验证只使用允许的变量"""
    all_text = url + headers + body
    found_vars = set(VARIABLE_PATTERN.findall(all_text))
    invalid_vars = found_vars - ALLOWED_VARIABLES
    if invalid_vars:
        raise ValueError(
            f"发现不允许的变量: {', '.join(sorted(invalid_vars))}。"
            f"允许的变量: {', '.join(sorted(ALLOWED_VARIABLES))}"
        )


class RequestTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    method: HttpMethod = "POST"
    url: str = "/v1/messages"
    headers: str
    body: str

    @model_validator(mode="after")
    def validate_template(self) -> "RequestTemplateCreate":
        _validate_headers_format(self.headers)
        _validate_body_json(self.body)
        _validate_variables(self.url, self.headers, self.body)
        return self


class RequestTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    method: HttpMethod | None = None
    url: str | None = None
    headers: str | None = None
    body: str | None = None

    @model_validator(mode="after")
    def validate_template(self) -> "RequestTemplateUpdate":
        # 只验证提供的字段
        if self.headers is not None:
            _validate_headers_format(self.headers)
        if self.body is not None:
            _validate_body_json(self.body)
        # 变量验证需要完整的 url/headers/body，在 API 层面做
        return self


class RequestTemplateResponse(BaseModel):
    id: int
    name: str
    description: str | None
    method: str
    url: str
    headers: str
    body: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
