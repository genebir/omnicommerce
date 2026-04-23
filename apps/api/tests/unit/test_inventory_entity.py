"""재고 도메인 엔티티 단위 테스트."""

import uuid

import pytest

from src.domain.inventory.entities import Inventory


def _make_inventory(**overrides) -> Inventory:
    defaults = {
        "id": uuid.uuid4(),
        "product_id": uuid.uuid4(),
        "sku": "TEST-001",
        "warehouse_id": "default",
        "total_quantity": 100,
        "allocated": 20,
        "available": 80,
    }
    defaults.update(overrides)
    return Inventory(**defaults)


def test_allocate():
    inv = _make_inventory()
    inv.allocate(10)
    assert inv.allocated == 30
    assert inv.available == 70


def test_allocate_exceeds_available():
    inv = _make_inventory()
    with pytest.raises(ValueError, match="가용 재고"):
        inv.allocate(100)


def test_deallocate():
    inv = _make_inventory()
    inv.deallocate(10)
    assert inv.allocated == 10
    assert inv.available == 90


def test_deallocate_exceeds_allocated():
    inv = _make_inventory()
    with pytest.raises(ValueError, match="할당 재고"):
        inv.deallocate(30)


def test_adjust_increase():
    inv = _make_inventory()
    inv.adjust(120)
    assert inv.total_quantity == 120
    assert inv.available == 100


def test_adjust_decrease():
    inv = _make_inventory()
    inv.adjust(50)
    assert inv.total_quantity == 50
    assert inv.available == 30


def test_adjust_negative_raises():
    inv = _make_inventory()
    with pytest.raises(ValueError, match="0 이상"):
        inv.adjust(-10)
