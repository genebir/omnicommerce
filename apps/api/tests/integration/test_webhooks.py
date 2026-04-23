"""웹훅 수신 엔드포인트 통합 테스트."""

import hashlib
import hmac
import json

import pytest


@pytest.mark.asyncio
async def test_cafe24_webhook_accepted(client):
    """카페24 웹훅이 정상 수신되는지 검증."""
    payload = {
        "event_no": "12345",
        "event_type": "order_created",
        "mall_id": "test-mall",
        "data": {"order_id": "ORD-001"},
    }
    response = await client.post("/api/webhooks/cafe24", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


@pytest.mark.asyncio
async def test_cafe24_webhook_order_status_changed(client):
    """주문 상태 변경 웹훅도 수신되는지 검증."""
    payload = {
        "event_no": "12346",
        "event_type": "order_status_changed",
        "mall_id": "test-mall",
        "data": {"order_id": "ORD-002", "status": "N22"},
    }
    response = await client.post("/api/webhooks/cafe24", json=payload)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


@pytest.mark.asyncio
async def test_cafe24_webhook_unknown_event_type(client):
    """알 수 없는 이벤트 타입도 기본값으로 처리."""
    payload = {
        "event_no": "12347",
        "event_type": "unknown_event",
        "mall_id": "test-mall",
    }
    response = await client.post("/api/webhooks/cafe24", json=payload)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_cafe24_webhook_with_valid_signature(client, monkeypatch):
    """유효한 HMAC 서명이 포함된 웹훅 검증."""
    secret = "test-webhook-secret"
    monkeypatch.setattr("src.api.webhooks.cafe24.settings.CAFE24_WEBHOOK_SECRET", secret)

    payload = {"event_no": "99999", "event_type": "order_created", "mall_id": "test-mall"}
    body = json.dumps(payload).encode()
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    response = await client.post(
        "/api/webhooks/cafe24",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
        },
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_cafe24_webhook_with_invalid_signature(client, monkeypatch):
    """잘못된 HMAC 서명은 401 반환."""
    secret = "test-webhook-secret"
    monkeypatch.setattr("src.api.webhooks.cafe24.settings.CAFE24_WEBHOOK_SECRET", secret)

    payload = {"event_no": "99999", "event_type": "order_created"}
    response = await client.post(
        "/api/webhooks/cafe24",
        json=payload,
        headers={"X-Webhook-Signature": "invalid-signature"},
    )
    assert response.status_code == 401
