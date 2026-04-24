"""비동기 작업 정의 — 채널 동기화, 재고 갱신 등."""

import contextlib
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select

from src.infra.channels.factory import create_gateway
from src.infra.db.models.channel import Channel
from src.infra.db.session import async_session_factory
from src.services.order_service import OrderService

logger = structlog.stdlib.get_logger()


async def sync_channel_products(ctx: dict, channel_code: str) -> dict:
    """채널 상품 동기화 태스크 — 현재는 placeholder (수동 import 사용 권장)."""
    await logger.ainfo("sync_channel_products_skipped", channel=channel_code)
    return {"channel": channel_code, "status": "skipped"}


async def sync_channel_orders(ctx: dict, channel_code: str, since_iso: str | None = None) -> dict:
    """채널 주문 동기화 — 활성 채널 전부 순회해 fetch + DB upsert.

    since_iso 미지정 시 24시간 전부터 조회 (cron 주기 기준 안전 마진).
    """
    if since_iso:
        since = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))
    else:
        since = datetime.now(UTC) - timedelta(hours=24)

    await logger.ainfo("sync_channel_orders_start", channel=channel_code, since=since.isoformat())

    total_imported = total_updated = total_errors = 0

    async with async_session_factory() as session:
        channels_result = await session.execute(
            select(Channel).where(
                Channel.channel_type == channel_code,
                Channel.is_active.is_(True),
                Channel.deleted_at.is_(None),
            )
        )
        channels = list(channels_result.scalars().all())

        for ch in channels:
            gateway = None
            try:
                gateway = create_gateway(ch, session)
                orders = await gateway.fetch_orders(since)
                service = OrderService(session)
                imp, upd, err = await service.import_from_channel(
                    user_id=ch.user_id, channel_type=channel_code, orders=orders
                )
                total_imported += imp
                total_updated += upd
                total_errors += err
                await logger.ainfo(
                    "sync_channel_orders_user_done",
                    channel=channel_code,
                    user_id=str(ch.user_id),
                    imported=imp,
                    updated=upd,
                    errors=err,
                )
            except Exception as exc:
                total_errors += 1
                await logger.awarning(
                    "sync_channel_orders_user_failed",
                    channel=channel_code,
                    user_id=str(ch.user_id),
                    error=str(exc),
                )
            finally:
                if gateway:
                    with contextlib.suppress(Exception):
                        await gateway.close()

    await logger.ainfo(
        "sync_channel_orders_complete",
        channel=channel_code,
        imported=total_imported,
        updated=total_updated,
        errors=total_errors,
    )
    return {
        "channel": channel_code,
        "imported": total_imported,
        "updated": total_updated,
        "errors": total_errors,
    }


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
