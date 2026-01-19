import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class StatusCategory(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class StatusConfig(Base):
    __tablename__ = "status_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[StatusCategory] = mapped_column(
        Enum(StatusCategory, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    http_code_pattern: Mapped[str | None] = mapped_column(String, nullable=True)
    response_regex: Mapped[str | None] = mapped_column(String, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
