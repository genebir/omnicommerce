"""상품 도메인 엔티티 단위 테스트."""

import uuid
from decimal import Decimal

import pytest

from src.domain.product.entities import Product


def _make_product(**overrides) -> Product:
    defaults = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "sku": "TEST-001",
        "name": "테스트 상품",
        "price": Decimal("15000"),
    }
    defaults.update(overrides)
    return Product(**defaults)


def test_product_creation():
    p = _make_product()
    assert p.status == "draft"
    assert p.price == Decimal("15000")


def test_activate():
    p = _make_product()
    p.activate()
    assert p.status == "active"


def test_deactivate():
    p = _make_product(status="active")
    p.deactivate()
    assert p.status == "inactive"


def test_update_price():
    p = _make_product()
    p.update_price(Decimal("20000"))
    assert p.price == Decimal("20000")


def test_update_price_negative_raises():
    p = _make_product()
    with pytest.raises(ValueError, match="0 이상"):
        p.update_price(Decimal("-100"))
