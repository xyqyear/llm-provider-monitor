from datetime import datetime, timedelta
from typing import cast

from sqlalchemy import CursorResult, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ProbeHistory
from ..models.config import GlobalConfig


class CleanupService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_retention_days(self) -> int:
        """Get the data retention period in days."""
        result = await self.db.execute(
            select(GlobalConfig).where(GlobalConfig.key == "data_retention_days")
        )
        config = result.scalar_one_or_none()
        return int(config.value) if config else 30

    async def cleanup_old_data(self) -> dict:
        """Remove data older than the retention period.

        Returns a dict with counts of deleted records.
        """
        retention_days = await self.get_retention_days()
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        # Delete old probe history
        result = await self.db.execute(
            delete(ProbeHistory).where(ProbeHistory.checked_at < cutoff_date)
        )
        result = cast(CursorResult, result)
        history_deleted = result.rowcount

        await self.db.commit()

        return {
            "history_deleted": history_deleted,
        }
