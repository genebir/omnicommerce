"""카페24 게이트웨이 공통 계약 테스트 (§6.6)."""

import httpx
import pytest
import respx

from src.infra.channels.cafe24.gateway import Cafe24Gateway
from tests.channels._contract.suite import run_gateway_contract

_BASE = "https://test-mall.cafe24api.com/api/v2"


def _make_product(i: int) -> dict:
    return {
        "product_no": 1000 + i,
        "product_code": f"P{1000 + i:08d}",
        "product_name": f"계약 테스트 상품 {i}",
        "selling_price": str(10000 + i * 1000),
        "selling": "T",
    }


def _make_order(i: int) -> dict:
    return {
        "order_id": f"ORD-{i:04d}",
        "order_date": "2026-01-15T10:00:00+09:00",
        "buyer_name": f"구매자{i}",
        "order_status": "N00",
        "actual_payment_amount": str(20000 + i * 1000),
        "shipping_fee": "3000",
        "items": [{"product_no": 1000 + i, "quantity": 1}],
    }


def _create_gateway() -> Cafe24Gateway:
    gw = Cafe24Gateway(
        mall_id="test-mall",
        access_token="fake-access-token",
        refresh_token="fake-refresh-token",
    )
    return gw


@respx.mock
@pytest.mark.asyncio
async def test_contract():
    gw = _create_gateway()

    def mock_list_products(count=3, next_cursor=None):
        products = [_make_product(i) for i in range(count)]
        respx.get(f"{_BASE}/admin/products").mock(
            return_value=httpx.Response(200, json={"products": products, "count": count})
        )

    def mock_upsert_product(product_id="12345"):
        respx.post(f"{_BASE}/admin/products").mock(
            return_value=httpx.Response(200, json={"product": {"product_no": product_id}})
        )

    def mock_update_inventory():
        respx.put(f"{_BASE}/admin/products/inventories").mock(
            return_value=httpx.Response(200, json={"inventory": {"result": "success"}})
        )

    def mock_fetch_orders(count=2):
        orders = [_make_order(i) for i in range(count)]
        respx.get(f"{_BASE}/admin/orders").mock(return_value=httpx.Response(200, json={"orders": orders}))

    await run_gateway_contract(
        gw,
        mock_list_products=mock_list_products,
        mock_upsert_product=mock_upsert_product,
        mock_update_inventory=mock_update_inventory,
        mock_fetch_orders=mock_fetch_orders,
    )

    await gw.close()


@respx.mock
@pytest.mark.asyncio
async def test_token_refresh_on_401():
    """카페24: 401 → 토큰 갱신 → 재시도."""
    gw = Cafe24Gateway(
        mall_id="test-mall",
        access_token="expired-token",
        refresh_token="valid-refresh-token",
        client_id="test-client-id",
        client_secret="test-client-secret",  # pragma: allowlist secret
    )

    call_count = 0

    def product_side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(401, json={"error": "Unauthorized"})
        return httpx.Response(200, json={"products": [_make_product(0)], "count": 1})

    respx.get(f"{_BASE}/admin/products").mock(side_effect=product_side_effect)
    respx.post("https://test-mall.cafe24api.com/api/v2/oauth/token").mock(
        return_value=httpx.Response(200, json={"access_token": "new-token", "refresh_token": "new-refresh"})
    )

    result = await gw.list_products()
    assert len(result.items) == 1
    assert call_count == 2

    await gw.close()


@respx.mock
@pytest.mark.asyncio
async def test_retry_on_429():
    """카페24: 429 → 지수 백오프 재시도."""
    gw = Cafe24Gateway(
        mall_id="test-mall",
        access_token="fake-token",
    )

    call_count = 0

    def rate_limit_side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            return httpx.Response(429, json={"error": "Too Many Requests"})
        return httpx.Response(200, json={"products": [_make_product(0)], "count": 1})

    respx.get(f"{_BASE}/admin/products").mock(side_effect=rate_limit_side_effect)

    result = await gw.list_products()
    assert len(result.items) == 1
    assert call_count == 3

    await gw.close()
