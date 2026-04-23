"""웹훅 이벤트 디스패처 — 채널별 웹훅 페이로드를 공통 처리 파이프라인으로 전달."""

from typing import Literal

import structlog

logger = structlog.stdlib.get_logger()

WebhookEventType = Literal[
    "order.created",
    "order.status_changed",
    "order.canceled",
    "product.updated",
    "product.deleted",
    "inventory.changed",
]


async def dispatch_webhook_event(
    *,
    channel: str,
    event_type: WebhookEventType,
    payload: dict,
) -> None:
    """웹훅 이벤트를 처리한다.

    현재는 로깅만 수행. Celery/ARQ 작업 큐 구현 후 비동기 태스크로 위임 예정.
    """
    await logger.ainfo(
        "webhook_event_received",
        channel=channel,
        event_type=event_type,
        payload_keys=list(payload.keys()),
    )
