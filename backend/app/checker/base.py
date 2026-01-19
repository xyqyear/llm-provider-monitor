from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class CheckResult:
    success: bool
    output: str
    latency_ms: int
    error: str | None = None
    http_code: int | None = None


class BaseChecker(ABC):
    @abstractmethod
    async def check(
        self,
        base_url: str,
        auth_token: str,
        model: str,
        prompt: str,
        timeout: int,
        **kwargs,
    ) -> CheckResult:
        """Execute a check against the LLM provider.

        Args:
            base_url: The API base URL
            auth_token: The authentication token
            model: The model name to use
            prompt: The test prompt
            timeout: Timeout in seconds
            **kwargs: Additional arguments (template_headers, template_body, system_prompt, etc.)

        Returns:
            CheckResult with success status, output, latency, and optional error
        """
        pass
