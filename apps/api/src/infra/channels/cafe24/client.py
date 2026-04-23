"""카페24 HTTP 클라이언트 — 레이트리밋, 재시도, 토큰 갱신 (§5)."""

import structlog
from aiolimiter import AsyncLimiter
from httpx import AsyncClient, HTTPStatusError

from src.core.exceptions import AuthenticationError, ChannelSyncError

logger = structlog.stdlib.get_logger()

_CAFE24_API_BASE = "https://{mall_id}.cafe24api.com/api/v2"


class Cafe24Client:
    def __init__(
        self,
        mall_id: str,
        access_token: str,
        refresh_token: str | None = None,
        client_id: str = "",
        client_secret: str = "",
    ) -> None:
        self._mall_id = mall_id
        self._access_token = access_token
        self._refresh_token = refresh_token
        self._client_id = client_id
        self._client_secret = client_secret
        self._base_url = _CAFE24_API_BASE.format(mall_id=mall_id)
        self._limiter = AsyncLimiter(max_rate=5, time_period=1)
        self._http = AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._http.aclose()

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self._base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
            "X-Cafe24-Api-Version": "2024-06-01",
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
                        await self._refresh_access_token()
                        headers["Authorization"] = f"Bearer {self._access_token}"
                        retries += 1
                        continue

                    if status in (429, 500, 502, 503, 504) and retries < max_retries:
                        import asyncio

                        await logger.awarning(
                            "cafe24 재시도",
                            status=status,
                            retry=retries + 1,
                            backoff=backoff,
                        )
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        retries += 1
                        continue

                    raise ChannelSyncError("cafe24", f"HTTP {status}: {e.response.text}") from e

    async def _refresh_access_token(self) -> None:
        if not self._refresh_token:
            raise AuthenticationError("cafe24 refresh_token이 없어 토큰 갱신 불가")
        if not self._client_id or not self._client_secret:
            raise AuthenticationError("cafe24 client_id/client_secret이 없어 토큰 갱신 불가")

        await logger.ainfo("cafe24 토큰 갱신 시도", mall_id=self._mall_id)
        refresh_url = f"https://{self._mall_id}.cafe24api.com/api/v2/oauth/token"
        response = await self._http.post(
            refresh_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": self._refresh_token,
            },
            auth=(self._client_id, self._client_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            raise AuthenticationError(f"cafe24 토큰 갱신 실패: {response.status_code}")

        data = response.json()
        self._access_token = data["access_token"]
        if "refresh_token" in data:
            self._refresh_token = data["refresh_token"]
        await logger.ainfo("cafe24 토큰 갱신 성공", mall_id=self._mall_id)

    async def get(self, path: str, **kwargs) -> dict:
        return await self._request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> dict:
        return await self._request("POST", path, **kwargs)

    async def put(self, path: str, **kwargs) -> dict:
        return await self._request("PUT", path, **kwargs)
