"""카페24 필드 매핑 단위 테스트."""

from decimal import Decimal

from src.infra.channels.cafe24.mapping import (
    map_order_status,
    normalize_product,
    parse_product,
)


def test_parse_product():
    raw = {
        "product_no": 12345,
        "product_code": "P00012345",
        "product_name": "테스트 상품",
        "selling_price": "29000",
        "supply_price": "15000",
        "summary_description": "요약 설명",
        "selling": "T",
    }
    dto = parse_product(raw)
    assert dto.product_no == 12345
    assert dto.product_code == "P00012345"
    assert dto.selling_price == "29000"


def test_normalize_product():
    raw = {
        "product_no": 99,
        "product_code": "SKU-99",
        "product_name": "정규화 테스트",
        "selling_price": "15000",
        "selling": "T",
    }
    dto = parse_product(raw)
    norm = normalize_product(dto, mall_id="testmall")
    assert norm.external_id == "99"
    assert norm.sku == "SKU-99"
    assert norm.name == "정규화 테스트"
    assert norm.price == Decimal("15000")
    assert norm.status == "ACTIVE"
    assert norm.external_url == "https://testmall.cafe24.com/product/detail.html?product_no=99"


def test_normalize_inactive_product():
    raw = {
        "product_no": 100,
        "product_code": "SKU-INACTIVE",
        "product_name": "비활성 상품",
        "selling_price": "5000",
        "selling": "F",
    }
    dto = parse_product(raw)
    norm = normalize_product(dto)
    assert norm.status == "INACTIVE"
    assert norm.external_url is None  # mall_id 없으면 None


def test_map_order_status():
    assert map_order_status("N00") == "PAID"
    assert map_order_status("N20") == "PREPARING"
    assert map_order_status("N22") == "SHIPPED"
    assert map_order_status("N40") == "DELIVERED"
    assert map_order_status("C00") == "CANCELED"
    assert map_order_status("C40") == "REFUNDED"
    assert map_order_status("UNKNOWN") == "PAID"
