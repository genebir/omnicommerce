"""주문 도메인 엔티티 단위 테스트."""

import uuid
from decimal import Decimal

import pytest

from src.domain.order.entities import Order


def _make_order(**overrides) -> Order:
    defaults = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "channel_type": "cafe24",
        "external_order_id": "EXT-001",
        "total_amount": Decimal("30000"),
    }
    defaults.update(overrides)
    return Order(**defaults)


def test_order_default_status():
    o = _make_order()
    assert o.status == "PAID"


def test_valid_transitions():
    o = _make_order()
    o.transition_to("PREPARING")
    assert o.status == "PREPARING"
    o.transition_to("SHIPPED")
    assert o.status == "SHIPPED"
    o.transition_to("DELIVERED")
    assert o.status == "DELIVERED"


def test_cancel_from_paid():
    o = _make_order()
    o.transition_to("CANCELED")
    assert o.status == "CANCELED"


def test_invalid_transition_raises():
    o = _make_order()
    with pytest.raises(ValueError, match="전이는 허용되지 않습니다"):
        o.transition_to("DELIVERED")


def test_no_transition_from_canceled():
    o = _make_order(status="CANCELED")
    with pytest.raises(ValueError):
        o.transition_to("PAID")


def test_refund_from_delivered():
    o = _make_order(status="DELIVERED")
    o.transition_to("REFUNDED")
    assert o.status == "REFUNDED"
