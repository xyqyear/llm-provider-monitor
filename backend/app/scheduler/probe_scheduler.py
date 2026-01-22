import asyncio
import logging

from sqlalchemy import select

from ..checker import HTTPXChecker
from ..database import async_session_maker
from ..models import Provider
from ..models.config import GlobalConfig
from ..services.cleanup_service import CleanupService
from ..services.probe_service import ProbeService

logger = logging.getLogger(__name__)


class ProbeScheduler:
    def __init__(self):
        self.running = False
        self.tasks: dict[str, asyncio.Task] = {}
        self._cleanup_task: asyncio.Task | None = None

    async def _get_config_value(self, key: str, default: str = "") -> str:
        async with async_session_maker() as session:
            result = await session.execute(
                select(GlobalConfig).where(GlobalConfig.key == key)
            )
            config = result.scalar_one_or_none()
            return config.value if config else default

    async def _get_provider_config(self, provider_id: int) -> tuple[int, int]:
        """Get interval and timeout for a provider."""
        async with async_session_maker() as session:
            result = await session.execute(
                select(Provider).where(Provider.id == provider_id)
            )
            provider = result.scalar_one_or_none()

            global_interval = int(
                await self._get_config_value("check_interval_seconds", "300")
            )
            global_timeout = int(
                await self._get_config_value("check_timeout_seconds", "120")
            )

            if provider:
                interval = provider.interval_seconds or global_interval
                timeout = provider.timeout_seconds or global_timeout
            else:
                interval = global_interval
                timeout = global_timeout

            return interval, timeout

    async def start(self):
        if self.running:
            return

        self.running = True
        await self._start_all_tasks()
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Probe scheduler started")

    async def stop(self):
        self.running = False
        for task in self.tasks.values():
            task.cancel()
        if self.tasks:
            await asyncio.gather(*self.tasks.values(), return_exceptions=True)
        self.tasks.clear()
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("Probe scheduler stopped")

    async def _start_all_tasks(self):
        async with async_session_maker() as session:
            probe_service = ProbeService(session)
            enabled_tasks = await probe_service.get_all_enabled_tasks()

        for provider_id, model_id in enabled_tasks:
            self._start_task(provider_id, model_id)

        logger.info(f"Started {len(enabled_tasks)} probe tasks")

    def _start_task(self, provider_id: int, model_id: int):
        task_id = f"{provider_id}_{model_id}"
        if task_id not in self.tasks or self.tasks[task_id].done():
            self.tasks[task_id] = asyncio.create_task(
                self._task_loop(provider_id, model_id)
            )
            logger.debug(f"Started task {task_id}")

    def _stop_task(self, provider_id: int, model_id: int):
        task_id = f"{provider_id}_{model_id}"
        if task_id in self.tasks:
            self.tasks[task_id].cancel()
            del self.tasks[task_id]
            logger.debug(f"Stopped task {task_id}")

    async def _task_loop(self, provider_id: int, model_id: int):
        task_id = f"{provider_id}_{model_id}"
        checker = HTTPXChecker()
        while self.running:
            try:
                # Fetch config in a short-lived session
                async with async_session_maker() as session:
                    probe_service = ProbeService(session)
                    config = await probe_service.get_probe_config(provider_id, model_id)

                if not config:
                    # Provider/model disabled or not found, stop task
                    break

                # Execute HTTP check without holding a database connection
                check_result = await checker.check(
                    base_url=config.base_url,
                    auth_token=config.auth_token,
                    model=config.model_name,
                    prompt=config.prompt,
                    timeout=config.timeout,
                    template_method=config.template_method,
                    template_url=config.template_url,
                    template_headers=config.template_headers,
                    template_body=config.template_body,
                    system_prompt=config.system_prompt,
                )

                # Save result in a short-lived session
                async with async_session_maker() as session:
                    probe_service = ProbeService(session)
                    result = await probe_service.save_probe_result(config, check_result)
                    logger.info(
                        f"Probe completed: provider={provider_id}, "
                        f"model={model_id}, status={result.status_id}, "
                        f"latency={result.latency_ms}ms"
                    )

                interval, _ = await self._get_provider_config(provider_id)
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in task {task_id}: {e}")
                await asyncio.sleep(60)

    async def refresh_tasks(self):
        """Refresh task list when providers/models change."""
        async with async_session_maker() as session:
            probe_service = ProbeService(session)
            enabled_tasks = await probe_service.get_all_enabled_tasks()

        enabled_set = {f"{p}_{m}" for p, m in enabled_tasks}
        current_set = set(self.tasks.keys())

        for task_id in current_set - enabled_set:
            provider_id, model_id = map(int, task_id.split("_"))
            self._stop_task(provider_id, model_id)

        for task_id in enabled_set - current_set:
            provider_id, model_id = map(int, task_id.split("_"))
            self._start_task(provider_id, model_id)

        logger.info(
            f"Tasks refreshed: {len(self.tasks)} active, "
            f"added {len(enabled_set - current_set)}, "
            f"removed {len(current_set - enabled_set)}"
        )

    async def restart_provider_tasks(self, provider_id: int):
        """Restart all tasks for a provider (when config changes)."""
        tasks_to_restart = [
            (pid, mid)
            for task_id in list(self.tasks.keys())
            for pid, mid in [map(int, task_id.split("_"))]
            if pid == provider_id
        ]

        for pid, mid in tasks_to_restart:
            self._stop_task(pid, mid)

        async with async_session_maker() as session:
            probe_service = ProbeService(session)
            enabled_tasks = await probe_service.get_all_enabled_tasks()

        for pid, mid in enabled_tasks:
            if pid == provider_id:
                self._start_task(pid, mid)

        logger.info(f"Restarted tasks for provider {provider_id}")

    async def _cleanup_loop(self):
        while self.running:
            try:
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


scheduler = ProbeScheduler()
