"""대시보드 API 통합 테스트 — 특히 user 스코핑 회귀 방지."""

import uuid

import pytest


async def _register_login(client, email: str) -> str:
    password = "testpass1234"  # pragma: allowlist secret
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": "셀러"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_dashboard_stats_requires_auth(client):
    response = await client.get("/api/v1/dashboard/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_sales_requires_auth(client):
    response = await client.get("/api/v1/dashboard/sales")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_activity_requires_auth(client):
    response = await client.get("/api/v1/dashboard/activity")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_low_stock_requires_auth(client):
    response = await client.get("/api/v1/dashboard/low-stock")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_endpoints_isolate_per_user(client):
    """사용자 A의 대시보드 호출이 다른 사용자 데이터를 절대 노출하지 않아야 한다."""
    token_a = await _register_login(client, f"a-{uuid.uuid4().hex[:8]}@example.com")
    token_b = await _register_login(client, f"b-{uuid.uuid4().hex[:8]}@example.com")

    # A가 상품 한 건 등록
    client.headers["Authorization"] = f"Bearer {token_a}"
    create_resp = await client.post(
        "/api/v1/products",
        json={"sku": f"SKU-A-{uuid.uuid4().hex[:6]}", "name": "A의 상품", "price": 1000},
    )
    assert create_resp.status_code == 201

    # B의 토큰으로 대시보드 호출 — A의 상품/주문이 비어 보여야 한다
    client.headers["Authorization"] = f"Bearer {token_b}"

    stats = (await client.get("/api/v1/dashboard/stats")).json()["data"]
    assert stats["total_products"] == 0
    assert stats["total_orders"] == 0
    assert stats["recent_orders"] == 0

    activity = (await client.get("/api/v1/dashboard/activity")).json()["data"]
    assert activity["items"] == []

    sales = (await client.get("/api/v1/dashboard/sales")).json()["data"]
    assert sales["monthly"] == []

    low_stock = (await client.get("/api/v1/dashboard/low-stock")).json()["data"]
    assert low_stock == []

    # A 본인이 호출하면 자기 상품이 보여야 한다
    client.headers["Authorization"] = f"Bearer {token_a}"
    stats_a = (await client.get("/api/v1/dashboard/stats")).json()["data"]
    assert stats_a["total_products"] == 1

    del client.headers["Authorization"]
