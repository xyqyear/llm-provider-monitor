from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .status import StatusConfig


class RequestTemplate(Base):
    __tablename__ = "request_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    method: Mapped[str] = mapped_column(
        String, nullable=False, default="POST"
    )  # HTTP method
    url: Mapped[str] = mapped_column(
        String, nullable=False, default="/v1/messages"
    )  # Request path
    headers: Mapped[str] = mapped_column(
        Text, nullable=False
    )  # Raw HTTP headers format
    body: Mapped[str] = mapped_column(Text, nullable=False)  # JSON template
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    models: Mapped[list["Model"]] = relationship("Model", back_populates="template")


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    base_url: Mapped[str] = mapped_column(String, nullable=False)
    auth_token: Mapped[str] = mapped_column(String, nullable=False)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    interval_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Model name mapping: JSON string like {"cc-haiku": "claude-3-haiku-20240307"}
    model_name_mapping: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    models: Mapped[list["ProviderModel"]] = relationship(
        "ProviderModel", back_populates="provider", cascade="all, delete-orphan"
    )
    probe_history: Mapped[list["ProbeHistory"]] = relationship(
        "ProbeHistory", back_populates="provider", cascade="all, delete-orphan"
    )


class Model(Base):
    __tablename__ = "models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    # 实际发送请求时使用的模型名，如 claude-3-haiku-20240307
    model_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    default_prompt: Mapped[str | None] = mapped_column(String, nullable=True)
    default_regex: Mapped[str | None] = mapped_column(String, nullable=True)
    # System prompt for the model
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Foreign key to request template
    template_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("request_templates.id"), nullable=True
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    template: Mapped["RequestTemplate"] = relationship(
        "RequestTemplate", back_populates="models"
    )
    provider_models: Mapped[list["ProviderModel"]] = relationship(
        "ProviderModel", back_populates="model", cascade="all, delete-orphan"
    )
    probe_history: Mapped[list["ProbeHistory"]] = relationship(
        "ProbeHistory", back_populates="model", cascade="all, delete-orphan"
    )


class ProviderModel(Base):
    __tablename__ = "provider_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False
    )
    model_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    custom_prompt: Mapped[str | None] = mapped_column(String, nullable=True)
    custom_regex: Mapped[str | None] = mapped_column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("provider_id", "model_id", name="uq_provider_model"),
    )

    provider: Mapped["Provider"] = relationship("Provider", back_populates="models")
    model: Mapped["Model"] = relationship("Model", back_populates="provider_models")


class ProbeHistory(Base):
    __tablename__ = "probe_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False
    )
    model_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("models.id", ondelete="CASCADE"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("status_configs.id"), nullable=False
    )
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str | None] = mapped_column(String, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_probe_history_lookup", "provider_id", "model_id", "checked_at"),
        Index("idx_probe_history_time", "checked_at"),
        Index("idx_probe_history_message", "message"),
    )

    provider: Mapped["Provider"] = relationship(
        "Provider", back_populates="probe_history"
    )
    model: Mapped["Model"] = relationship("Model", back_populates="probe_history")
    status: Mapped[StatusConfig] = relationship("StatusConfig")
