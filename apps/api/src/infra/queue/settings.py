"""ARQ 워커 설정."""

from arq.connections import RedisSettings

from src.core.settings import settings


def get_redis_settings() -> RedisSettings:
    """REDIS_URL에서 ARQ RedisSettings를 생성."""
    url = settings.REDIS_URL
    if url.startswith("redis://"):
        parts = url.replace("redis://", "").split("/")
        host_port = parts[0]
        database = int(parts[1]) if len(parts) > 1 else 0
        if ":" in host_port:
            host, port_str = host_port.split(":")
            port = int(port_str)
        else:
            host = host_port
            port = 6379
        return RedisSettings(host=host, port=port, database=database)
    return RedisSettings()
