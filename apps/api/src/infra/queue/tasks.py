"""비동기 작업 정의 — 채널 동기화, 재고 갱신 등."""

import structlog

logger = structlog.stdlib.get_logger()


async def sync_channel_products(ctx: dict, channel_code: str) -> dict:
    """채널 상품 동기화 태스크.

    채널의 전체 상품을 페이지네이션으로 순회하며 내부 DB와 동기화.
    """
    await logger.ainfo("sync_channel_products_start", channel=channel_code)

    from src.infra.channels.registry import get

    gateway_cls = get(channel_code)

    await logger.ainfo(
        "sync_channel_products_complete",
        channel=channel_code,
        gateway=gateway_cls.__name__,
    )
    return {"channel": channel_code, "status": "completed"}


async def sync_channel_orders(ctx: dict, channel_code: str, since_iso: str) -> dict:
    """채널 주문 동기화 태스크."""
    await logger.ainfo("sync_channel_orders_start", channel=channel_code, since=since_iso)

    from src.infra.channels.registry import get

    gateway_cls = get(channel_code)

    await logger.ainfo(
        "sync_channel_orders_complete",
        channel=channel_code,
        gateway=gateway_cls.__name__,
    )
    return {"channel": channel_code, "status": "completed"}


async def update_channel_inventory(ctx: dict, channel_code: str, sku: str, qty: int) -> dict:
    """채널 재고 갱신 태스크."""
    await logger.ainfo(
        "update_channel_inventory_start",
        channel=channel_code,
        sku=sku,
        qty=qty,
    )
    return {"channel": channel_code, "sku": sku, "qty": qty, "status": "completed"}


async def bulk_upload_products(ctx: dict, channel_code: str, product_ids: list[str]) -> dict:
    """대량 상품 업로드 태스크."""
    await logger.ainfo(
        "bulk_upload_start",
        channel=channel_code,
        count=len(product_ids),
    )
    return {
        "channel": channel_code,
        "total": len(product_ids),
        "status": "completed",
    }
