"""네이버 커머스 API HTTP 클라이언트 — OAuth2 Client Credentials + 전자서��� (§5)."""

import time

import structlog
from aiolimiter import AsyncLimiter
from httpx import AsyncClient, HTTPStatusError

from src.core.exceptions import AuthenticationError, ChannelSyncError

logger = structlog.stdlib.get_logger()

_NAVER_API_BASE = "https://api.commerce.naver.com/external"
_NAVER_TOKEN_URL = "https://api.commerce.naver.com/external/v1/oauth2/token"


class NaverClient:
    def __init__(self, client_id: str, client_secret: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._access_token: str | None = None
        self._token_expires_at: float = 0
        self._limiter = AsyncLimiter(max_rate=10, time_period=1)
        self._http = AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._http.aclose()

    async def _ensure_token(self) -> None:
        if self._access_token and time.monotonic() < self._token_expires_at:
            return
        await self._refresh_token()

    async def _refresh_token(self) -> None:
        await logger.ainfo("naver 토큰 발급 시도")

        import hashlib
        import hmac

        timestamp = str(int(time.time() * 1000))
        message = f"{self._client_id}_{timestamp}".encode()
        signature = hmac.new(self._client_secret.encode(), message, hashlib.sha256).hexdigest()

        response = await self._http.post(
            _NAVER_TOKEN_URL,
            data={
                "client_id": self._client_id,
                "timestamp": timestamp,
                "client_secret_sign": signature,
                "grant_type": "client_credentials",
                "type": "SELF",
            },
        )
        if response.status_code != 200:
            raise AuthenticationError(f"naver 토큰 발급 실패: {response.status_code}")

        data = response.json()
        self._access_token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expires_at = time.monotonic() + expires_in - 60
        await logger.ainfo("naver 토큰 발급 성공", expires_in=expires_in)

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        await self._ensure_token()
        url = f"{_NAVER_API_BASE}{path}"
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

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
                    status = e.response.status_code

                    if status == 401 and retries == 0:
                        self._access_token = None
                        await self._ensure_token()
                        headers["Authorization"] = f"Bearer {self._access_token}"
                        retries += 1
                        continue

                    if status in (429, 500, 502, 503, 504) and retries < max_retries:
                        import asyncio

                        await logger.awarning("naver 재시도", status=status, retry=retries + 1)
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        retries += 1
                        continue

                    raise ChannelSyncError("naver", f"HTTP {status}: {e.response.text}") from e

    async def get(self, path: str, **kwargs) -> dict:
        return await self._request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> dict:
        return await self._request("POST", path, **kwargs)

    async def put(self, path: str, **kwargs) -> dict:
        return await self._request("PUT", path, **kwargs)

    async def delete(self, path: str, **kwargs) -> dict:
        return await self._request("DELETE", path, **kwargs)
