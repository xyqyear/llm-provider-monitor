import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ProbeHistory, StatusCategory
from ..models.status import StatusConfig
from ..schemas.common import PreviewMatch


@dataclass
class MatchResult:
    """状态匹配结果"""

    status_code: int
    matched: bool  # 是否匹配到规则
    category: str  # green/yellow/red
    name: str


@dataclass
class StatusInfo:
    """状态信息"""

    category: StatusCategory
    name: str


class StatusService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def match_status(
        self, output: str, http_code: int | None = None
    ) -> MatchResult:
        """Match output to a status code based on configured patterns.

        Matching rules:
        - If only response_regex is set, match against output
        - If only http_code_pattern is set, match against http_code
        - If both are set, both must match
        - http_code_pattern supports patterns like "4xx", "5xx", or specific codes like "401"

        After a config is hit:
        - If category is green: always matched
        - If category is not green and has response_regex: matched
        - If category is not green and no response_regex: unmatched (for manual classification)

        Returns:
            MatchResult with status_code, matched flag, category, and name
        """
        result = await self.db.execute(
            select(StatusConfig).order_by(StatusConfig.priority.desc())
        )
        configs = result.scalars().all()

        for config in configs:
            # Skip if neither pattern is configured
            if not config.http_code_pattern and not config.response_regex:
                continue

            # Check if this config is hit
            http_matched = True
            regex_matched = True

            # Check HTTP code pattern
            if config.http_code_pattern:
                if http_code is None:
                    http_matched = False
                else:
                    http_matched = self._match_http_code(
                        config.http_code_pattern, http_code
                    )

            # Check response regex
            if config.response_regex:
                try:
                    regex_matched = bool(re.search(config.response_regex, output))
                except re.error:
                    regex_matched = False

            # Determine if config is hit
            hit = False
            if config.http_code_pattern and config.response_regex:
                hit = http_matched and regex_matched
            elif config.http_code_pattern:
                hit = http_matched
            elif config.response_regex:
                hit = regex_matched

            # If config is hit, determine matched status
            if hit:
                # Green category: always matched
                if config.category == "green":
                    return MatchResult(
                        status_code=config.code,
                        matched=True,
                        category=config.category.value,
                        name=config.name,
                    )

                # Non-green category with regex: matched
                if config.response_regex:
                    return MatchResult(
                        status_code=config.code,
                        matched=True,
                        category=config.category.value,
                        name=config.name,
                    )

                # Non-green category without regex: unmatched (for manual classification)
                return MatchResult(
                    status_code=config.code,
                    matched=False,
                    category=config.category.value,
                    name=config.name,
                )

        # No config hit - return unknown status
        return MatchResult(
            status_code=-1,
            matched=False,
            category="yellow",
            name="未知",
        )

    def _match_http_code(self, pattern: str, http_code: int) -> bool:
        """Match HTTP code against a pattern.

        Supports:
        - Exact codes: "401", "500"
        - Wildcard patterns: "4xx", "5xx", "2xx"
        - Multiple patterns separated by comma: "401,403,429"
        """
        patterns = [p.strip() for p in pattern.split(",")]

        for p in patterns:
            p = p.lower()
            if "xx" in p:
                # Wildcard pattern like "4xx"
                prefix = p.replace("xx", "")
                if str(http_code).startswith(prefix):
                    return True
            else:
                # Exact match
                if str(http_code) == p:
                    return True

        return False

    async def get_status_info(self, code: int) -> StatusInfo:
        """Get status info by code."""
        result = await self.db.execute(
            select(StatusConfig).where(StatusConfig.code == code)
        )
        config = result.scalar_one_or_none()

        if config:
            return StatusInfo(category=config.category, name=config.name)
        return StatusInfo(category=StatusCategory.YELLOW, name="未知")

    async def preview_matches(self, regex: str) -> list[PreviewMatch]:
        """Preview which unmatched messages would match a regex."""
        # Get unmatched messages directly from ProbeHistory
        result = await self.db.execute(
            select(ProbeHistory.message)
            .where(ProbeHistory.message.isnot(None))
            .distinct()
        )
        messages = result.scalars().all()

        matched = []
        try:
            pattern = re.compile(regex)
            for msg in messages:
                if msg and pattern.search(msg):
                    # Count occurrences of this message
                    count_result = await self.db.execute(
                        select(ProbeHistory).where(ProbeHistory.message == msg)
                    )
                    count = len(count_result.scalars().all())

                    matched.append(PreviewMatch(message=msg, count=count))
        except re.error:
            pass

        return matched

    async def apply_config_to_history(self, status_code: int) -> int:
        """Apply a new status config to unmatched historical records.

        Returns the number of records updated.
        """
        result = await self.db.execute(
            select(StatusConfig).where(StatusConfig.code == status_code)
        )
        config = result.scalar_one_or_none()

        if not config or not config.response_regex:
            return 0

        # Get unmatched history records (message is not None)
        result = await self.db.execute(
            select(ProbeHistory).where(
                ProbeHistory.message.isnot(None),
            )
        )
        records = result.scalars().all()

        updated_count = 0
        try:
            pattern = re.compile(config.response_regex)
            for record in records:
                if record.message and pattern.search(record.message):
                    record.status_code = status_code
                    record.message = None  # Clear message to save space
                    updated_count += 1
        except re.error:
            pass

        if updated_count > 0:
            await self.db.commit()

        return updated_count
