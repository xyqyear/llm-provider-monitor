import asyncio
import heapq
import logging
from datetime import datetime, timedelta

from sqlalchemy import select

from ..database import async_session_maker
from ..models import Provider
from ..models.config import GlobalConfig
from ..services.cleanup_service import CleanupService
from ..services.probe_service import ProbeService

logger = logging.getLogger(__name__)


class ProbeScheduler:
    def __init__(self):
        self.task_queue: list[tuple[datetime, str]] = []
        self.running = False
        self.semaphore: asyncio.Semaphore | None = None
        self._loop_task: asyncio.Task | None = None
        self._cleanup_task: asyncio.Task | None = None

    async def _get_config_value(self, key: str, default: str = "") -> str:
        """Get a global config value."""
        async with async_session_maker() as session:
            result = await session.execute(
                select(GlobalConfig).where(GlobalConfig.key == key)
            )
            config = result.scalar_one_or_none()
            return config.value if config else default

    async def _get_interval(self, provider_id: int) -> int:
        """Get the check interval for a provider."""
        async with async_session_maker() as session:
            result = await session.execute(
                select(Provider).where(Provider.id == provider_id)
            )
            provider = result.scalar_one_or_none()

            if provider and provider.interval_seconds:
                return provider.interval_seconds

            global_interval = await self._get_config_value(
                "check_interval_seconds", "300"
            )
            return int(global_interval)

    async def start(self):
        """Start the scheduler."""
        if self.running:
            return

        self.running = True
        max_parallel = int(await self._get_config_value("max_parallel_checks", "3"))
        self.semaphore = asyncio.Semaphore(max_parallel)

        await self._schedule_all_tasks()
        self._loop_task = asyncio.create_task(self._run_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Probe scheduler started")

    async def stop(self):
        """Stop the scheduler."""
        self.running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("Probe scheduler stopped")

    async def _schedule_all_tasks(self):
        """Schedule all enabled tasks."""
        async with async_session_maker() as session:
            probe_service = ProbeService(session)
            tasks = await probe_service.get_all_enabled_tasks()

        self.task_queue.clear()
        now = datetime.now()

        for provider_id, model_id in tasks:
            task_id = f"{provider_id}_{model_id}"
            heapq.heappush(self.task_queue, (now, task_id))

        logger.info(f"Scheduled {len(tasks)} probe tasks")

    async def refresh_tasks(self):
        """Refresh the task queue (called when providers/models change)."""
        await self._schedule_all_tasks()

    async def _run_loop(self):
        """Main scheduler loop."""
        while self.running:
            try:
                if not self.task_queue:
                    await asyncio.sleep(1)
                    continue

                next_time, task_id = self.task_queue[0]
                now = datetime.now()
                wait_seconds = (next_time - now).total_seconds()

                if wait_seconds > 0:
                    await asyncio.sleep(min(wait_seconds, 1))
                    continue

                heapq.heappop(self.task_queue)
                asyncio.create_task(self._execute_task(task_id))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(1)

    async def _execute_task(self, task_id: str):
        """Execute a single probe task."""
        if not self.semaphore:
            return

        async with self.semaphore:
            try:
                provider_id, model_id = task_id.split("_")
                provider_id = int(provider_id)
                model_id = int(model_id)

                async with async_session_maker() as session:
                    probe_service = ProbeService(session)
                    result = await probe_service.probe(provider_id, model_id)
                    if result:
                        logger.info(
                            f"Probe completed: provider={provider_id}, "
                            f"model={model_id}, status={result.status_id}, "
                            f"latency={result.latency_ms}ms"
                        )
            except Exception as e:
                logger.error(f"Error executing probe task {task_id}: {e}")
            finally:
                # Reschedule the task
                try:
                    provider_id = int(task_id.split("_")[0])
                    interval = await self._get_interval(provider_id)
                    next_time = datetime.now() + timedelta(seconds=interval)
                    heapq.heappush(self.task_queue, (next_time, task_id))
                except Exception as e:
                    logger.error(f"Error rescheduling task {task_id}: {e}")

    async def _cleanup_loop(self):
        """Periodic cleanup of old data."""
        while self.running:
            try:
                # Run cleanup once per day
                await asyncio.sleep(86400)

                async with async_session_maker() as session:
                    cleanup_service = CleanupService(session)
                    result = await cleanup_service.cleanup_old_data()
                    logger.info(
                        f"Cleanup completed: {result.history_deleted} history records deleted"
                    )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")


# Global scheduler instance
scheduler = ProbeScheduler()
