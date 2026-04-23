"""카페24 웹훅 수신 엔드포인트 (§6.1)."""

import hashlib
import hmac

import structlog
from fastapi import APIRouter, Header, HTTPException, Request

from src.api.webhooks.dispatcher import dispatch_webhook_event
from src.api.webhooks.schemas import WebhookResponse
from src.core.settings import settings

logger = structlog.stdlib.get_logger()

router = APIRouter(prefix="/cafe24", tags=["웹훅-카페24"])

_EVENT_TYPE_MAP: dict[str, str] = {
    "order_created": "order.created",
    "order_status_changed": "order.status_changed",
    "order_cancel": "order.canceled",
    "product_update": "product.updated",
    "product_delete": "product.deleted",
    "stock_update": "inventory.changed",
}


def _verify_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("", response_model=WebhookResponse)
async def receive_cafe24_webhook(
    request: Request,
    x_webhook_signature: str | None = Header(None),
) -> WebhookResponse:
    """카페24 웹훅 수신.

    카페24는 웹훅 발송 시 X-Webhook-Signature 헤더에 HMAC-SHA256 서명을 포함한다.
    """
    body = await request.body()
    payload = await request.json()

    webhook_secret = settings.CAFE24_WEBHOOK_SECRET
    if webhook_secret and x_webhook_signature and not _verify_signature(body, x_webhook_signature, webhook_secret):
        await logger.awarning("cafe24 웹훅 서명 검증 실패")
        raise HTTPException(status_code=401, detail="서명 검증 실패")

    event_id = payload.get("event_no", "unknown")
    event_source = payload.get("event_type", "unknown")
    event_type = _EVENT_TYPE_MAP.get(event_source, "order.created")

    await logger.ainfo(
        "cafe24_webhook_received",
        event_id=event_id,
        event_type=event_type,
        mall_id=payload.get("mall_id"),
    )

    await dispatch_webhook_event(
        channel="cafe24",
        event_type=event_type,
        payload=payload,
    )

    return WebhookResponse(accepted=True)
