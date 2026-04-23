"""채널 게이트웨이 공통 계약 테스트 (§6.6).

모든 채널 어댑터는 동일한 계약을 이행해야 한다.
각 채널 테스트에서 fixture로 준비된 게이트웨이와 응답 빌더를 넘겨받아 실행.
"""

from datetime import UTC, datetime

from src.infra.channels.base import ExternalId, ProductPage


async def run_gateway_contract(
    gateway,
    *,
    mock_list_products,
    mock_upsert_product,
    mock_update_inventory,
    mock_fetch_orders,
    mock_token_refresh=None,
    mock_rate_limit=None,
):
    """채널 게이트웨이 공통 계약을 검증한다.

    Args:
        gateway: 테스트 대상 게이트웨이 인스턴스
        mock_list_products: 상품 목록 응답을 설정하는 콜백 (respx 라우트 반환)
        mock_upsert_product: 상품 등록 응답을 설정하는 콜백
        mock_update_inventory: 재고 갱신 응답을 설정하는 콜백
        mock_fetch_orders: 주문 조회 응답을 설정하는 콜백
        mock_token_refresh: 토큰 갱신 모킹 콜백 (401 재시도 테스트용, 없으면 건너뜀)
        mock_rate_limit: 429 응답 후 재시도 모킹 콜백 (없으면 건너뜀)
    """
    await _test_list_products_returns_product_page(gateway, mock_list_products)
    await _test_list_products_pagination(gateway, mock_list_products)
    await _test_upsert_product_returns_external_id(gateway, mock_upsert_product)
    await _test_update_inventory_succeeds(gateway, mock_update_inventory)
    await _test_fetch_orders_returns_list(gateway, mock_fetch_orders)

    if mock_token_refresh:
        await _test_token_refresh_on_401(gateway, mock_token_refresh)

    if mock_rate_limit:
        await _test_retry_on_429(gateway, mock_rate_limit)


async def _test_list_products_returns_product_page(gateway, mock_list_products):
    """상품 목록이 ProductPage 형태로 반환되는지 검증."""
    mock_list_products(count=3, next_cursor="cursor-abc")

    result = await gateway.list_products()

    assert isinstance(result, ProductPage)
    assert len(result.items) == 3
    for item in result.items:
        assert hasattr(item, "external_id")
        assert hasattr(item, "sku")
        assert hasattr(item, "name")
        assert hasattr(item, "price")
        assert hasattr(item, "status")
        assert item.status in ("active", "draft")


async def _test_list_products_pagination(gateway, mock_list_products):
    """커서 기반 페이지네이션이 동작하는지 검증."""
    mock_list_products(count=1, next_cursor=None)

    result = await gateway.list_products(cursor="100")

    assert isinstance(result, ProductPage)
    assert isinstance(result.items, list)


async def _test_upsert_product_returns_external_id(gateway, mock_upsert_product):
    """상품 등록이 ExternalId를 반환하는지 검증."""
    mock_upsert_product(product_id="12345")

    from dataclasses import dataclass

    @dataclass
    class FakeProduct:
        name: str = "계약 테스트 상품"
        price: int = 10000
        sku: str = "TEST-SKU"
        description: str = "설명"

    result = await gateway.upsert_product(FakeProduct())

    assert isinstance(result, ExternalId)
    assert result.id == "12345"
    assert result.url is not None


async def _test_update_inventory_succeeds(gateway, mock_update_inventory):
    """재고 갱신이 예외 없이 완료되는지 검증."""
    mock_update_inventory()

    await gateway.update_inventory(sku="TEST-SKU", qty=50)


async def _test_fetch_orders_returns_list(gateway, mock_fetch_orders):
    """주문 조회가 리스트를 반환하고, 필수 필드가 있는지 검증."""
    mock_fetch_orders(count=2)

    since = datetime(2026, 1, 1, tzinfo=UTC)
    result = await gateway.fetch_orders(since=since)

    assert isinstance(result, list)
    assert len(result) == 2
    for order in result:
        assert "external_order_id" in order
        assert "channel_type" in order
        assert "status" in order
        assert order["status"] in ("PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED")
        assert "raw_payload" in order


async def _test_token_refresh_on_401(gateway, mock_token_refresh):
    """401 수신 시 토큰 갱신 후 재시도하는지 검증."""
    mock_token_refresh()

    result = await gateway.list_products()
    assert isinstance(result, ProductPage)


async def _test_retry_on_429(gateway, mock_rate_limit):
    """429 수신 시 지수 백오프 후 재시도하는지 검증."""
    mock_rate_limit()

    result = await gateway.list_products()
    assert isinstance(result, ProductPage)
