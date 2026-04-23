"""쿠팡 필드 매핑 단위 테스트."""

from decimal import Decimal

from src.infra.channels.coupang.mapping import (
    map_order_status,
    normalize_product,
    parse_product,
)


def test_parse_product():
    raw = {
        "sellerProductId": 77777,
        "sellerProductName": "쿠팡 테스트 상품",
        "salePrice": 19900,
        "sellerProductItemId": "CP-001",
        "statusName": "승인완료",
    }
    dto = parse_product(raw)
    assert dto.sellerProductId == 77777
    assert dto.salePrice == 19900


def test_normalize_product():
    raw = {
        "sellerProductId": 300,
        "sellerProductName": "정규화 상품",
        "salePrice": 33000,
        "originalPrice": 20000,
        "sellerProductItemId": "CP-300",
        "statusName": "승인완료",
    }
    dto = parse_product(raw)
    norm = normalize_product(dto)
    assert norm.external_id == "300"
    assert norm.sku == "CP-300"
    assert norm.price == Decimal("33000")
    assert norm.cost_price == Decimal("20000")
    assert norm.status == "ACTIVE"


def test_normalize_draft_product():
    raw = {
        "sellerProductId": 400,
        "sellerProductName": "대기 상품",
        "salePrice": 5000,
        "statusName": "승인대기",
    }
    dto = parse_product(raw)
    norm = normalize_product(dto)
    assert norm.status == "INACTIVE"


def test_map_order_status():
    assert map_order_status("ACCEPT") == "PAID"
    assert map_order_status("INSTRUCT") == "PREPARING"
    assert map_order_status("DEPARTURE") == "SHIPPED"
    assert map_order_status("FINAL_DELIVERY") == "DELIVERED"
    assert map_order_status("CANCEL") == "CANCELED"
    assert map_order_status("RETURN") == "REFUNDED"
    assert map_order_status("UNKNOWN") == "PAID"
