"""네이버 스마트스토어 필드 매핑 단위 테스트."""

from decimal import Decimal

from src.infra.channels.naver.mapping import (
    map_order_status,
    normalize_product,
    parse_product,
)


def test_parse_product():
    raw = {
        "originProductNo": 55555,
        "name": "네이버 테스트 상품",
        "salePrice": 25000,
        "modelName": "NV-001",
        "statusType": "SALE",
    }
    dto = parse_product(raw)
    assert dto.originProductNo == 55555
    assert dto.salePrice == 25000


def test_normalize_product():
    raw = {
        "originProductNo": 100,
        "name": "정규화 상품",
        "salePrice": 12000,
        "modelName": "MODEL-A",
        "statusType": "SALE",
    }
    dto = parse_product(raw)
    norm = normalize_product(dto)
    assert norm.external_id == "100"
    assert norm.sku == "MODEL-A"
    assert norm.price == Decimal("12000")
    assert norm.status == "ACTIVE"


def test_normalize_draft_product():
    raw = {
        "originProductNo": 200,
        "name": "미등록 상품",
        "salePrice": 8000,
        "statusType": "SUSPENSION",
    }
    dto = parse_product(raw)
    norm = normalize_product(dto)
    assert norm.status == "INACTIVE"
    assert norm.sku == "200"


def test_map_order_status():
    assert map_order_status("PAYED") == "PAID"
    assert map_order_status("DELIVERING") == "SHIPPED"
    assert map_order_status("DELIVERED") == "DELIVERED"
    assert map_order_status("CANCELED") == "CANCELED"
    assert map_order_status("RETURNED") == "REFUNDED"
    assert map_order_status("UNKNOWN_STATUS") == "PAID"
