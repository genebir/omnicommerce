"""설정 캐시 단위 테스트 (§9.6)."""

import time
from unittest.mock import AsyncMock, patch

import pytest

from src.config.schema import AppConfig
from src.infra.cache.settings_cache import SettingsCache


def _make_config() -> AppConfig:
    return AppConfig()


@pytest.mark.asyncio
async def test_cache_returns_cached_value():
    """TTL 내 캐시 히트."""
    cache = SettingsCache(ttl=60.0)
    session = AsyncMock()

    with patch("src.infra.cache.settings_cache.load_app_config", new_callable=AsyncMock) as mock_load:
        mock_load.return_value = _make_config()

        result1 = await cache.get(session)
        result2 = await cache.get(session)

        assert result1 == result2
        mock_load.assert_called_once()


@pytest.mark.asyncio
async def test_cache_reloads_after_ttl():
    """TTL 만료 후 DB 재조회."""
    cache = SettingsCache(ttl=0.01)
    session = AsyncMock()

    with patch("src.infra.cache.settings_cache.load_app_config", new_callable=AsyncMock) as mock_load:
        mock_load.return_value = _make_config()

        await cache.get(session)
        time.sleep(0.02)
        await cache.get(session)

        assert mock_load.call_count == 2


@pytest.mark.asyncio
async def test_invalidate_clears_cache():
    """invalidate 호출 시 캐시 초기화."""
    cache = SettingsCache(ttl=60.0)
    session = AsyncMock()

    with patch("src.infra.cache.settings_cache.load_app_config", new_callable=AsyncMock) as mock_load:
        mock_load.return_value = _make_config()

        await cache.get(session)
        cache.invalidate("test.key")
        assert cache.is_stale

        await cache.get(session)
        assert mock_load.call_count == 2


def test_is_stale_initially():
    """초기 상태에서 캐시는 stale."""
    cache = SettingsCache()
    assert cache.is_stale
