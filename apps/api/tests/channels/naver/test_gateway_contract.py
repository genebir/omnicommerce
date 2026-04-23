"""네이버 스마트스토어 게이트웨이 공통 계약 테스트 (§6.6)."""

import httpx
import pytest
import respx

from src.infra.channels.naver.gateway import NaverGateway
from tests.channels._contract.suite import run_gateway_contract

_BASE = "https://api.commerce.naver.com/external"
_TOKEN_URL = "https://api.commerce.naver.com/external/v1/oauth2/token"


def _make_product(i: int) -> dict:
    return {
        "originProductNo": 2000 + i,
        "name": f"네이버 계약 상품 {i}",
        "salePrice": 15000 + i * 1000,
        "modelName": f"NV-{2000 + i}",
        "statusType": "SALE",
    }


def _make_order(i: int) -> dict:
    return {
        "orderId": f"NAVER-ORD-{i:04d}",
        "orderDate": "2026-01-15T10:00:00",
        "orderStatus": "PAYED",
        "totalPaymentAmount": 25000 + i * 1000,
        "deliveryFeeAmount": 0,
        "ordererName": f"주문자{i}",
        "productOrderInfos": [{"productNo": 2000 + i, "quantity": 1}],
    }


def _create_gateway() -> NaverGateway:
    return NaverGateway(client_id="test-client-id", client_secret="test-client-secret")


@respx.mock
@pytest.mark.asyncio
async def test_contract():
    respx.post(_TOKEN_URL).mock(
        return_value=httpx.Response(200, json={"access_token": "naver-test-token", "expires_in": 3600})
    )
    gw = _create_gateway()

    def mock_list_products(count=3, next_cursor=None):
        products = [_make_product(i) for i in range(count)]
        respx.get(f"{_BASE}/v2/products").mock(
            return_value=httpx.Response(200, json={"contents": products, "totalElements": count})
        )

    def mock_upsert_product(product_id="12345"):
        respx.post(f"{_BASE}/v2/products").mock(return_value=httpx.Response(200, json={"originProductNo": product_id}))

    def mock_update_inventory():
        respx.put(f"{_BASE}/v2/products/stock").mock(return_value=httpx.Response(200, json={"result": "success"}))

    def mock_fetch_orders(count=2):
        orders = [_make_order(i) for i in range(count)]
        respx.get(f"{_BASE}/v1/pay-order/seller/orders").mock(return_value=httpx.Response(200, json={"data": orders}))

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
    """네이버: 401 → 토큰 재발급 → 재시도."""
    token_call_count = 0

    def token_side_effect(request):
        nonlocal token_call_count
        token_call_count += 1
        return httpx.Response(200, json={"access_token": f"naver-token-{token_call_count}", "expires_in": 3600})

    respx.post(_TOKEN_URL).mock(side_effect=token_side_effect)
    gw = _create_gateway()

    call_count = 0

    def product_side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(401, json={"error": "Unauthorized"})
        return httpx.Response(
            200,
            json={"contents": [_make_product(0)], "totalElements": 1},
        )

    respx.get(f"{_BASE}/v2/products").mock(side_effect=product_side_effect)

    result = await gw.list_products()
    assert len(result.items) == 1
    assert call_count == 2

    await gw.close()


@respx.mock
@pytest.mark.asyncio
async def test_retry_on_429():
    """네이버: 429 → 지수 백오프 재시도."""
    respx.post(_TOKEN_URL).mock(
        return_value=httpx.Response(200, json={"access_token": "naver-test-token", "expires_in": 3600})
    )
    gw = _create_gateway()

    call_count = 0

    def rate_limit_side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            return httpx.Response(429, json={"error": "Too Many Requests"})
        return httpx.Response(
            200,
            json={"contents": [_make_product(0)], "totalElements": 1},
        )

    respx.get(f"{_BASE}/v2/products").mock(side_effect=rate_limit_side_effect)

    result = await gw.list_products()
    assert len(result.items) == 1
    assert call_count == 3

    await gw.close()
