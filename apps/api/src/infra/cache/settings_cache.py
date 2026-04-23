"""설정 캐싱 + Redis pub/sub 무효화 (§9.6).

아키텍처:
  [App Instance] → in-memory cache (TTL 60s)
                         ↑
                         │ invalidate
                     Redis pub/sub  ← 쓰기 API가 발행
                         │
                         ↓
                    PostgreSQL (SSOT)
"""

import asyncio
import contextlib
import time

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.loader import load_app_config
from src.config.schema import AppConfig
from src.infra.cache.redis import get_redis

logger = structlog.stdlib.get_logger()

INVALIDATION_CHANNEL = "settings:invalidate"
_DEFAULT_TTL = 60.0
_FALLBACK_TTL = 10.0


class SettingsCache:
    """in-memory + Redis pub/sub 설정 캐시."""

    def __init__(self, ttl: float = _DEFAULT_TTL) -> None:
        self._ttl = ttl
        self._config: AppConfig | None = None
        self._expires_at: float = 0
        self._listener_task: asyncio.Task | None = None

    @property
    def is_stale(self) -> bool:
        return self._config is None or time.monotonic() >= self._expires_at

    async def get(self, session: AsyncSession, scope: str = "global") -> AppConfig:
        if not self.is_stale:
            return self._config  # type: ignore[return-value]

        config = await load_app_config(session, scope)
        self._config = config
        self._expires_at = time.monotonic() + self._ttl
        return config

    def invalidate(self, key: str | None = None) -> None:
        self._config = None
        self._expires_at = 0

    async def publish_invalidation(self, key: str) -> None:
        try:
            r = get_redis()
            await r.publish(INVALIDATION_CHANNEL, key)
            await logger.ainfo("settings_cache_invalidation_published", key=key)
        except Exception:
            await logger.awarning("settings_cache_redis_publish_failed", key=key)

    async def start_listener(self) -> None:
        if self._listener_task is not None:
            return
        self._listener_task = asyncio.create_task(self._listen())

    async def stop_listener(self) -> None:
        if self._listener_task is not None:
            self._listener_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._listener_task
            self._listener_task = None

    async def _listen(self) -> None:
        while True:
            try:
                r = get_redis()
                pubsub = r.pubsub()
                await pubsub.subscribe(INVALIDATION_CHANNEL)
                await logger.ainfo("settings_cache_listener_started")

                async for message in pubsub.listen():
                    if message["type"] == "message":
                        key = message["data"]
                        await logger.ainfo("settings_cache_invalidated", key=key)
                        self.invalidate(key)
            except asyncio.CancelledError:
                raise
            except Exception:
                await logger.awarning("settings_cache_listener_reconnecting")
                self._ttl = _FALLBACK_TTL
                await asyncio.sleep(_FALLBACK_TTL)


settings_cache = SettingsCache()
