"""쿠팡 WING API ↔ 공식 docs 정합성 회귀 테스트 (페이즈 18).

검증 대상:
- 재고 갱신: 단건 path-param `PUT /vendor-items/{vendorItemId}/quantities/{qty}`
  (일괄 PUT body 형태가 실재하지 않으므로 회귀 시 즉시 깨져야 함)
- 주문 조회: `createdAtTo` + `searchType=timeFrame` 필수 파라미터 송신
- 상품 statusName ACTIVE 화이트리스트: "승인완료" 외 "부분승인완료"/"판매중"도 ACTIVE
- 쿼리 정렬: 서명용 query와 실제 송신 query가 동일 (httpx dict 순서 가변성 차단)
"""

from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
import respx

from src.infra.channels.coupang.gateway import CoupangGateway
from src.infra.channels.coupang.mapping import CoupangProductDTO, normalize_product

_BASE = "https://api-gateway.coupang.com"
_VENDOR_ID = "test-vendor-id"


def _create_gateway() -> CoupangGateway:
    return CoupangGateway(access_key="ak", secret_key="sk", vendor_id=_VENDOR_ID)  # pragma: allowlist secret


# ── 재고 갱신 경로 ────────────────────────────────────────────────────────


@respx.mock
@pytest.mark.asyncio
async def test_update_inventory_uses_single_path_param_route():
    """`PUT /vendor-items/{vendorItemId}/quantities/{qty}` 경로로 호출되어야 한다."""
    gw = _create_gateway()
    captured: dict[str, str] = {}

    def capture(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["method"] = request.method
        captured["body"] = request.content.decode() if request.content else ""
        return httpx.Response(200, json={"result": "success"})

    expected = f"{_BASE}/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/SKU-001/quantities/50"
    respx.put(expected).mock(side_effect=capture)

    await gw.update_inventory(sku="SKU-001", qty=50)

    assert captured["method"] == "PUT"
    assert captured["url"] == expected
    # 단건 path-param 방식은 body 없음 (일괄 PUT body 회귀 차단)
    assert captured["body"] == ""

    await gw.close()


# ── 주문 조회 파라미터 ────────────────────────────────────────────────────


@respx.mock
@pytest.mark.asyncio
async def test_fetch_orders_sends_required_query_params():
    """주문 조회 시 `createdAtFrom`/`createdAtTo`/`searchType=timeFrame` 모두 송신."""
    gw = _create_gateway()
    captured: dict[str, list[str]] = {}

    def capture(request: httpx.Request) -> httpx.Response:
        parsed = urlparse(str(request.url))
        captured.update(parse_qs(parsed.query))
        return httpx.Response(200, json={"data": []})

    respx.get(f"{_BASE}/v2/providers/openapi/apis/api/v4/vendors/{_VENDOR_ID}/ordersheets").mock(side_effect=capture)

    since = datetime(2026, 4, 30, 0, 0, 0, tzinfo=UTC)
    until = datetime(2026, 4, 30, 23, 59, 59, tzinfo=UTC)
    await gw.fetch_orders(since=since, until=until)

    assert "createdAtFrom" in captured, "쿠팡 docs 필수 파라미터 누락"
    assert "createdAtTo" in captured, "쿠팡 docs 필수 파라미터 누락"
    assert captured.get("searchType") == ["timeFrame"]
    assert captured["createdAtFrom"][0].startswith("2026-04-30T00:00")
    assert captured["createdAtTo"][0].startswith("2026-04-30T23:59")

    await gw.close()


# ── statusName 화이트리스트 ──────────────────────────────────────────────


def _product_dto(status_name: str) -> CoupangProductDTO:
    return CoupangProductDTO(sellerProductId=1, sellerProductName="t", salePrice=1000, statusName=status_name)


@pytest.mark.parametrize("status", ["승인완료", "부분승인완료", "판매중"])
def test_normalize_product_active_whitelist(status: str):
    """노출 가능한 상태 3종은 모두 ACTIVE로 분류되어야 한다."""
    assert normalize_product(_product_dto(status)).status == "ACTIVE"


@pytest.mark.parametrize("status", ["임시저장", "승인요청", "승인대기중", "승인반려", "판매중지", ""])
def test_normalize_product_inactive_for_other_statuses(status: str):
    """비노출 상태는 INACTIVE로 분류."""
    assert normalize_product(_product_dto(status)).status == "INACTIVE"


# ── 쿼리 정렬 일치 ───────────────────────────────────────────────────────


@respx.mock
@pytest.mark.asyncio
async def test_request_url_query_matches_signed_query():
    """서명에 사용된 query와 실제 송신 URL의 query가 동일해야 한다.

    httpx의 dict 직렬화 순서에 의존하면 401이 발생할 수 있으므로, 클라이언트가
    명시적으로 sorted된 query를 URL에 박아 보내는지 검증한다.
    """
    gw = _create_gateway()
    captured_url = {}

    def capture(request: httpx.Request) -> httpx.Response:
        captured_url["url"] = str(request.url)
        return httpx.Response(200, json={"data": []})

    respx.get(f"{_BASE}/v2/providers/openapi/apis/api/v4/vendors/{_VENDOR_ID}/ordersheets").mock(side_effect=capture)

    since = datetime(2026, 4, 30, 0, 0, 0, tzinfo=UTC)
    until = datetime(2026, 4, 30, 23, 59, 59, tzinfo=UTC)
    await gw.fetch_orders(since=since, until=until)

    parsed = urlparse(captured_url["url"])
    # 실제 URL의 query는 알파벳 순으로 정렬되어 있어야 함 (서명용과 동일).
    keys_in_order = [pair.split("=")[0] for pair in parsed.query.split("&")]
    assert keys_in_order == sorted(keys_in_order), (
        f"송신 URL query가 정렬되지 않음: {keys_in_order}. 서명용 query와 어긋나면 401."
    )

    await gw.close()
