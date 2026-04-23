"""주문 도메인 엔티티 — 순수 Python, 프레임워크 독립."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

VALID_TRANSITIONS: dict[str, set[str]] = {
    "PAID": {"PREPARING", "CANCELED"},
    "PREPARING": {"SHIPPED", "CANCELED"},
    "SHIPPED": {"DELIVERED", "REFUNDED"},
    "DELIVERED": {"REFUNDED"},
    "CANCELED": set(),
    "REFUNDED": set(),
}


@dataclass(frozen=True, slots=True)
class OrderItem:
    name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    sku: str | None = None
    option_text: str | None = None
    product_id: uuid.UUID | None = None
    external_product_id: str | None = None


@dataclass(slots=True)
class Order:
    id: uuid.UUID
    user_id: uuid.UUID
    channel_type: str
    external_order_id: str
    total_amount: Decimal
    status: str = "PAID"
    shipping_fee: Decimal = Decimal("0")
    buyer_name: str | None = None
    buyer_phone: str | None = None
    buyer_email: str | None = None
    recipient_name: str | None = None
    recipient_phone: str | None = None
    recipient_address: str | None = None
    recipient_zipcode: str | None = None
    ordered_at: datetime | None = None
    paid_at: datetime | None = None
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    tracking_number: str | None = None
    tracking_company: str | None = None
    items: list[OrderItem] = field(default_factory=list)

    def transition_to(self, new_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(self.status, set())
        if new_status not in allowed:
            raise ValueError(f"'{self.status}' → '{new_status}' 전이는 허용되지 않습니다")
        self.status = new_status
