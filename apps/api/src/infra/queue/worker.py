"""ARQ 워커 엔트리포인트.

실행: python -m arq src.infra.queue.worker.WorkerSettings
"""

from arq import cron

from src.infra.queue.settings import get_redis_settings
from src.infra.queue.tasks import (
    bulk_upload_products,
    sync_channel_orders,
    sync_channel_products,
    update_channel_inventory,
)


def _channel_product_sync(channel_code: str):
    """cron()에 kwargs를 전달할 수 없으므로 채널별 래퍼를 생성한다."""

    async def _task(ctx: dict) -> dict:
        return await sync_channel_products(ctx, channel_code=channel_code)

    _task.__qualname__ = f"sync_{channel_code}_products"
    return _task


def _channel_order_sync(channel_code: str):
    async def _task(ctx: dict) -> dict:
        return await sync_channel_orders(ctx, channel_code=channel_code)

    _task.__qualname__ = f"sync_{channel_code}_orders"
    return _task


async def startup(ctx: dict) -> None:
    """워커 시작 시 초기화."""
    import structlog

    logger = structlog.stdlib.get_logger()
    await logger.ainfo("arq_worker_started")


async def shutdown(ctx: dict) -> None:
    """워커 종료 시 정리."""
    import structlog

    logger = structlog.stdlib.get_logger()
    await logger.ainfo("arq_worker_stopped")


class WorkerSettings:
    """ARQ 워커 설정."""

    redis_settings = get_redis_settings()

    functions = [
        sync_channel_products,
        sync_channel_orders,
        update_channel_inventory,
        bulk_upload_products,
    ]

    cron_jobs = [
        cron(_channel_product_sync("cafe24"), hour={0, 6, 12, 18}, minute=0),
        cron(_channel_product_sync("naver"), hour={0, 6, 12, 18}, minute=5),
        cron(_channel_product_sync("coupang"), hour={0, 6, 12, 18}, minute=10),
        # 주문 동기화 — 15분마다 (cafe24 우선)
        cron(_channel_order_sync("cafe24"), minute={0, 15, 30, 45}),
        cron(_channel_order_sync("naver"), minute={3, 18, 33, 48}),
        cron(_channel_order_sync("coupang"), minute={6, 21, 36, 51}),
    ]

    on_startup = startup
    on_shutdown = shutdown

    max_jobs = 10
    job_timeout = 300
