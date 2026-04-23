"""쿠팡 WING Open API HTTP 클라이언트 — HMAC-SHA256 서명 (§5)."""

import hashlib
import hmac
from datetime import UTC, datetime

import structlog
from aiolimiter import AsyncLimiter
from httpx import AsyncClient, HTTPStatusError

from src.core.exceptions import ChannelSyncError

logger = structlog.stdlib.get_logger()

_COUPANG_API_BASE = "https://api-gateway.coupang.com"


class CoupangClient:
    def __init__(self, access_key: str, secret_key: str, vendor_id: str) -> None:
        self._access_key = access_key
        self._secret_key = secret_key
        self._vendor_id = vendor_id
        self._limiter = AsyncLimiter(max_rate=8, time_period=1)
        self._http = AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._http.aclose()

    def _generate_signature(self, method: str, path: str, query: str = "") -> dict[str, str]:
        dt = datetime.now(UTC).strftime("%y%m%dT%H%M%SZ")
        message = f"{dt}{method}{path}{query}"
        signature = hmac.new(
            self._secret_key.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()

        authorization = (
            f"CEA algorithm=HmacSHA256, access-key={self._access_key}, signed-date={dt}, signature={signature}"
        )
        return {
            "Authorization": authorization,
            "Content-Type": "application/json;charset=UTF-8",
            "X-Requested-By": "OmniCommerce",
        }

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{_COUPANG_API_BASE}{path}"
        query_string = ""
        if "params" in kwargs and kwargs["params"]:
            query_string = "&".join(f"{k}={v}" for k, v in sorted(kwargs["params"].items()))

        headers = self._generate_signature(method.upper(), path, query_string)

        retries = 0
        max_retries = 3
        backoff = 1.0

        while True:
            async with self._limiter:
                try:
                    response = await self._http.request(method, url, headers=headers, **kwargs)
                    response.raise_for_status()
                    return response.json()
                except HTTPStatusError as e:
                    status_code = e.response.status_code

                    if status_code in (429, 500, 502, 503, 504) and retries < max_retries:
                        import asyncio

                        await logger.awarning("coupang 재시도", status=status_code, retry=retries + 1)
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        retries += 1
                        headers = self._generate_signature(method.upper(), path, query_string)
                        continue

                    raise ChannelSyncError("coupang", f"HTTP {status_code}: {e.response.text}") from e

    @property
    def vendor_id(self) -> str:
        return self._vendor_id

    async def get(self, path: str, **kwargs) -> dict:
        return await self._request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> dict:
        return await self._request("POST", path, **kwargs)

    async def put(self, path: str, **kwargs) -> dict:
        return await self._request("PUT", path, **kwargs)

    async def delete(self, path: str, **kwargs) -> dict:
        return await self._request("DELETE", path, **kwargs)
