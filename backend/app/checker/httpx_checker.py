import json
import time
from urllib.parse import urlparse

import httpx

from .base import BaseChecker, CheckResult


class HTTPXChecker(BaseChecker):
    """HTTPX-based checker implementation using request templates."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(600.0))

    async def check(
        self,
        base_url: str,
        auth_token: str,
        model: str,
        prompt: str,
        timeout: int,
        template_method: str = "POST",
        template_url: str = "/v1/messages",
        template_headers: str | None = None,
        template_body: str | None = None,
        system_prompt: str | None = None,
    ) -> CheckResult:
        """Execute a check using HTTPX with the provided template.

        Args:
            base_url: The API base URL
            auth_token: The authentication token (key)
            model: The model name to use
            prompt: The user prompt
            timeout: Timeout in seconds
            template_method: HTTP method (GET, POST, etc.)
            template_url: Request path (e.g., /v1/messages)
            template_headers: Raw HTTP headers template
            template_body: JSON body template
            system_prompt: System prompt for the model

        Returns:
            CheckResult with success status, output, latency, HTTP code, and optional error
        """
        if not template_headers or not template_body:
            return CheckResult(
                success=False,
                output="",
                latency_ms=0,
                error="缺少请求模板",
            )

        # Build variables for template substitution
        variables = {
            "key": auth_token,
            "model": model,
            "user_prompt": prompt,
            "system_prompt": system_prompt or "",
        }

        start_time = time.monotonic()

        try:
            # Parse and process headers
            headers = self._parse_headers(template_headers, variables, base_url)

            # Parse and process body
            body_str = self._substitute_variables(template_body, variables)
            body = json.loads(body_str)

            # Build full URL
            url = self._build_url(base_url, template_url, variables)

            # Determine if streaming
            is_streaming = body.get("stream", False)

            # Make the request
            if is_streaming:
                result = await self._make_streaming_request(
                    template_method, url, headers, body, timeout
                )
            else:
                result = await self._make_request(
                    template_method, url, headers, body, timeout
                )

            latency_ms = int((time.monotonic() - start_time) * 1000)
            result.latency_ms = latency_ms
            return result

        except json.JSONDecodeError as e:
            latency_ms = int((time.monotonic() - start_time) * 1000)
            return CheckResult(
                success=False,
                output="",
                latency_ms=latency_ms,
                error=f"JSON解析错误: {str(e)}",
            )
        except httpx.TimeoutException:
            latency_ms = int((time.monotonic() - start_time) * 1000)
            return CheckResult(
                success=False,
                output="",
                latency_ms=latency_ms,
                error="超时",
            )
        except Exception as e:
            latency_ms = int((time.monotonic() - start_time) * 1000)
            return CheckResult(
                success=False,
                output="",
                latency_ms=latency_ms,
                error=str(e),
            )

    def _parse_headers(
        self, template_headers: str, variables: dict, base_url: str
    ) -> dict[str, str]:
        """Parse headers from template format and substitute variables.

        Host header will be overridden by base_url's host.
        """
        headers = {}
        parsed_base_url = urlparse(base_url)

        for line in template_headers.strip().split("\n"):
            line = line.strip()
            if not line:
                continue

            # Parse header line
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()

                # Substitute variables in value
                value = self._substitute_variables(value, variables)

                # Override host header with base_url's host
                if key.lower() == "host":
                    value = parsed_base_url.netloc
                # Skip content-length as httpx will calculate it
                elif key.lower() == "content-length":
                    continue

                headers[key] = value

        return headers

    def _substitute_variables(self, text: str, variables: dict) -> str:
        """Replace {variable} placeholders with actual values."""
        result = text
        for key, value in variables.items():
            # Escape special JSON characters in values
            if isinstance(value, str):
                # For JSON body, we need to escape the value properly
                escaped_value = (
                    value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
                )
                result = result.replace(f"{{{key}}}", escaped_value)
            else:
                result = result.replace(f"{{{key}}}", str(value))
        return result

    def _build_url(self, base_url: str, template_url: str, variables: dict) -> str:
        """Build the full URL from base_url and template path."""
        # Substitute variables in URL
        path = self._substitute_variables(template_url, variables)

        # Ensure base_url doesn't end with slash and path starts with slash
        base_url = base_url.rstrip("/")
        if not path.startswith("/"):
            path = "/" + path

        return base_url + path

    async def _make_request(
        self, method: str, url: str, headers: dict, body: dict, timeout: int
    ) -> CheckResult:
        """Make a non-streaming HTTP request."""
        response = await self.client.request(
            method,
            url,
            headers=headers,
            json=body,
            timeout=timeout,
        )

        if response.status_code == 200:
            data = response.json()
            # Extract text content from response
            content = self._extract_content(data)
            return CheckResult(
                success=True,
                output=content,
                latency_ms=0,
                http_code=response.status_code,
            )
        else:
            return CheckResult(
                success=False,
                output=response.text,
                latency_ms=0,
                http_code=response.status_code,
                error=f"HTTP {response.status_code}",
            )

    async def _make_streaming_request(
        self, method: str, url: str, headers: dict, body: dict, timeout: int
    ) -> CheckResult:
        """Make a streaming HTTP request and collect all chunks."""
        collected_text = []
        http_code = None

        async with self.client.stream(
            method,
            url,
            headers=headers,
            json=body,
            timeout=timeout,
        ) as response:
            http_code = response.status_code

            if response.status_code != 200:
                error_text = await response.aread()
                return CheckResult(
                    success=False,
                    output=error_text.decode(),
                    latency_ms=0,
                    http_code=http_code,
                    error=f"HTTP {response.status_code}",
                )

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        continue
                    try:
                        data = json.loads(data_str)
                        text = self._extract_streaming_content(data)
                        if text:
                            collected_text.append(text)
                    except json.JSONDecodeError:
                        continue

        return CheckResult(
            success=True,
            output="".join(collected_text),
            latency_ms=0,
            http_code=http_code,
        )

    def _extract_content(self, data: dict) -> str:
        """Extract text content from non-streaming API response."""
        # Anthropic API format
        if "content" in data and isinstance(data["content"], list):
            texts = []
            for block in data["content"]:
                if block.get("type") == "text":
                    texts.append(block.get("text", ""))
            return "".join(texts)

        # OpenAI format
        if "choices" in data and data["choices"]:
            choice = data["choices"][0]
            if "message" in choice:
                return choice["message"].get("content", "")
            elif "text" in choice:
                return choice["text"]

        return str(data)

    def _extract_streaming_content(self, data: dict) -> str:
        """Extract text content from a streaming chunk."""
        # Anthropic streaming format
        if data.get("type") == "content_block_delta":
            delta = data.get("delta", {})
            if delta.get("type") == "text_delta":
                return delta.get("text", "")

        # OpenAI streaming format
        if "choices" in data and data["choices"]:
            choice = data["choices"][0]
            delta = choice.get("delta", {})
            return delta.get("content", "")

        return ""

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
