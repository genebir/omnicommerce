"""쿠팡 게이트웨이 공통 계약 테스트 (§6.6)."""

import httpx
import pytest
import respx

from src.infra.channels.coupang.gateway import CoupangGateway
from tests.channels._contract.suite import run_gateway_contract

_BASE = "https://api-gateway.coupang.com"
_VENDOR_ID = "test-vendor-id"
_PRODUCTS_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
_ORDERS_PATH = f"/v2/providers/openapi/apis/api/v4/vendors/{_VENDOR_ID}/ordersheets"
# 페이즈 18: 재고 갱신은 단건 path-param 방식 (`/vendor-items/{vendorItemId}/quantities/{qty}`).
_INVENTORY_BASE = "/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items"


def _make_product(i: int) -> dict:
    return {
        "sellerProductId": 3000 + i,
        "sellerProductName": f"쿠팡 계약 상품 {i}",
        "salePrice": 20000 + i * 1000,
        "sellerProductItemId": f"CP-{3000 + i}",
        "statusName": "승인완료",
    }


def _make_order(i: int) -> dict:
    return {
        "orderId": 90000 + i,
        "orderDate": "2026-01-15T10:00:00",
        "status": "ACCEPT",
        "totalPrice": 30000 + i * 1000,
        "shippingPrice": 0,
        "ordererName": f"쿠팡구매자{i}",
        "orderItems": [{"sellerProductId": 3000 + i, "quantity": 1}],
    }


def _create_gateway() -> CoupangGateway:
    return CoupangGateway(
        access_key="test-access-key",
        secret_key="test-secret-key",
        vendor_id=_VENDOR_ID,
    )


@respx.mock
@pytest.mark.asyncio
async def test_contract():
    gw = _create_gateway()

    def mock_list_products(count=3, next_cursor=None):
        products = [_make_product(i) for i in range(count)]
        respx.get(f"{_BASE}{_PRODUCTS_PATH}").mock(
            return_value=httpx.Response(
                200,
                json={"data": products, "nextToken": next_cursor, "totalElements": count},
            )
        )

    def mock_upsert_product(product_id="12345"):
        respx.post(f"{_BASE}{_PRODUCTS_PATH}").mock(return_value=httpx.Response(200, json={"data": product_id}))

    def mock_update_inventory():
        # contract suite는 sku="TEST-SKU", qty=50으로 호출. 새 단건 path-param 경로.
        respx.put(f"{_BASE}{_INVENTORY_BASE}/TEST-SKU/quantities/50").mock(
            return_value=httpx.Response(200, json={"result": "success"})
        )

    def mock_fetch_orders(count=2):
        orders = [_make_order(i) for i in range(count)]
        respx.get(f"{_BASE}{_ORDERS_PATH}").mock(return_value=httpx.Response(200, json={"data": orders}))

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
async def test_retry_on_429():
    """쿠팡: 429 → 지수 백오프 재시도."""
    gw = _create_gateway()
    call_count = 0

    def rate_limit_side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            return httpx.Response(429, json={"error": "Too Many Requests"})
        return httpx.Response(
            200,
            json={"data": [_make_product(0)], "totalElements": 1},
        )

    respx.get(f"{_BASE}{_PRODUCTS_PATH}").mock(side_effect=rate_limit_side_effect)

    result = await gw.list_products()
    assert len(result.items) == 1
    assert call_count == 3

    await gw.close()


@respx.mock
@pytest.mark.asyncio
async def test_retry_on_500():
    """쿠팡: 500 → 재시도."""
    gw = _create_gateway()
    call_count = 0

    def server_error_side_effect(request):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(500, text="Internal Server Error")
        return httpx.Response(
            200,
            json={"data": [_make_product(0)], "totalElements": 1},
        )

    respx.get(f"{_BASE}{_PRODUCTS_PATH}").mock(side_effect=server_error_side_effect)

    result = await gw.list_products()
    assert len(result.items) == 1
    assert call_count == 2

    await gw.close()
