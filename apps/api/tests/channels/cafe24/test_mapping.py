"""카페24 필드 매핑 단위 테스트."""

from decimal import Decimal

from src.infra.channels.cafe24.mapping import (
    map_order_status,
    normalize_order_item,
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


def test_normalize_order_item_basic():
    raw = {
        "product_no": 42,
        "product_code": "SKU-42",
        "product_name": "주문 라인 상품",
        "option_value": "색상=검정/사이즈=L",
        "quantity": 3,
        "product_price": "12000",
        "payment_amount": "36000",
    }
    item = normalize_order_item(raw)
    assert item["external_product_id"] == "42"
    assert item["sku"] == "SKU-42"
    assert item["name"] == "주문 라인 상품"
    assert item["option_text"] == "색상=검정/사이즈=L"
    assert item["quantity"] == 3
    assert item["unit_price"] == Decimal("12000")
    assert item["total_price"] == Decimal("36000")


def test_normalize_order_item_payment_amount_missing():
    """payment_amount 없으면 unit_price * quantity로 계산."""
    raw = {
        "product_no": 7,
        "product_code": "SKU-7",
        "product_name": "단가만 있는 상품",
        "quantity": 4,
        "product_price": "5000",
    }
    item = normalize_order_item(raw)
    assert item["total_price"] == Decimal("20000")


def test_normalize_order_item_fallback_shop_price():
    """product_price 없으면 shop_price 사용."""
    raw = {
        "product_no": 8,
        "product_code": "SKU-8",
        "product_name": "shop_price 사용",
        "quantity": 1,
        "shop_price": "9900",
    }
    item = normalize_order_item(raw)
    assert item["unit_price"] == Decimal("9900")
    assert item["total_price"] == Decimal("9900")


def test_normalize_order_item_minimal():
    """필수 필드만 있어도 깨지지 않음."""
    raw = {"product_name": "이름만 있는 라인"}
    item = normalize_order_item(raw)
    assert item["name"] == "이름만 있는 라인"
    assert item["quantity"] == 1
    assert item["unit_price"] == Decimal("0")
    assert item["total_price"] == Decimal("0")
    assert item["external_product_id"] is None
    assert item["sku"] is None
