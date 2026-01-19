from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False)
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    from . import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Insert default data
    await insert_default_data()


# Default template headers
DEFAULT_TEMPLATE_HEADERS = """accept: application/json
anthropic-beta: claude-code-20250219,interleaved-thinking-2025-05-14
anthropic-dangerous-direct-browser-access: true
anthropic-version: 2023-06-01
authorization: Bearer {key}
content-type: application/json
user-agent: claude-cli/2.1.1 (external, sdk-cli)
x-app: cli
x-stainless-arch: x64
x-stainless-helper-method: stream
x-stainless-lang: js
x-stainless-os: Windows
x-stainless-package-version: 0.70.0
x-stainless-retry-count: 0
x-stainless-runtime: node
x-stainless-runtime-version: v24.3.0
x-stainless-timeout: 600
Connection: keep-alive
Accept-Encoding: gzip, deflate, br, zstd"""

# Default template body
DEFAULT_TEMPLATE_BODY = """{
  "model": "{model}",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "{user_prompt}",
          "cache_control": {
            "type": "ephemeral"
          }
        }
      ]
    }
  ],
  "system": [
    {
      "type": "text",
      "text": "{system_prompt}",
      "cache_control": {
        "type": "ephemeral"
      }
    }
  ],
  "max_tokens": 32000,
  "stream": true
}"""


async def insert_default_data():
    from .models.config import GlobalConfig
    from .models.core import Model, RequestTemplate
    from .models.status import StatusConfig

    async with async_session_maker() as session:
        # Check if data already exists
        result = await session.execute(select(Model))
        if result.scalars().first():
            return

        # Create default template first
        default_template = RequestTemplate(
            name="Anthropic API",
            description="Default template for Anthropic API",
            method="POST",
            url="/v1/messages",
            headers=DEFAULT_TEMPLATE_HEADERS,
            body=DEFAULT_TEMPLATE_BODY,
        )
        session.add(default_template)
        await session.flush()  # Get the template ID

        # Default models with new names
        models = [
            Model(
                name="cc-haiku",
                model_name="claude-haiku-4-5-20251001",
                display_name="CC Haiku 4.5",
                default_prompt="ping, only respond with 'pong'",
                default_regex="pong",
                system_prompt="You are Claude Code, Anthropic's official CLI for Claude.",
                template_id=default_template.id,
                sort_order=1,
            ),
            Model(
                name="cc-sonnet",
                model_name="claude-sonnet-4-5-20250929",
                display_name="CC Sonnet 4.5",
                default_prompt="ping, only respond with 'pong'",
                default_regex="pong",
                system_prompt="You are Claude Code, Anthropic's official CLI for Claude.",
                template_id=default_template.id,
                sort_order=2,
            ),
            Model(
                name="cc-opus",
                model_name="claude-opus-4-5-20251101",
                display_name="CC Opus 4.5",
                default_prompt="ping, only respond with 'pong'",
                default_regex="pong",
                system_prompt="You are Claude Code, Anthropic's official CLI for Claude.",
                template_id=default_template.id,
                sort_order=3,
            ),
        ]
        session.add_all(models)

        # Default status configs (sorted by priority descending)
        status_configs = [
            StatusConfig(
                code=0,
                name="正常",
                category="green",
                http_code_pattern="200",
                priority=10000,
            ),
            StatusConfig(
                name="超时",
                category="red",
                response_regex="^超时",
                priority=10,
            ),
            StatusConfig(
                name="负载上限",
                category="red",
                response_regex="负载已经达到上限",
                http_code_pattern="5xx",
                priority=100,
            ),
            StatusConfig(
                name="请求错误",
                category="red",
                http_code_pattern="4xx",
                priority=50,
            ),
            StatusConfig(
                name="服务器错误",
                category="red",
                http_code_pattern="5xx",
                priority=50,
            ),
            StatusConfig(code=-1, name="未知", category="yellow", priority=-1),
        ]
        session.add_all(status_configs)

        # Default global configs
        configs = [
            GlobalConfig(key="check_interval_seconds", value="300"),
            GlobalConfig(key="check_timeout_seconds", value="120"),
            GlobalConfig(key="max_parallel_checks", value="3"),
            GlobalConfig(key="data_retention_days", value="30"),
            GlobalConfig(key="admin_password", value=""),
        ]
        session.add_all(configs)

        await session.commit()
