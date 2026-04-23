"""상품 도메인 엔티티 — 순수 Python, 프레임워크 독립."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class ProductImage:
    url: str
    sort_order: int = 0
    alt_text: str | None = None


@dataclass(frozen=True, slots=True)
class ProductOption:
    name: str
    values: list[str]
    sku_suffix: str | None = None
    price_adjustment: Decimal = Decimal("0")


@dataclass(slots=True)
class Product:
    id: uuid.UUID
    user_id: uuid.UUID
    sku: str
    name: str
    price: Decimal
    status: str = "draft"
    description: str | None = None
    cost_price: Decimal | None = None
    category_path: str | None = None
    images: list[ProductImage] = field(default_factory=list)
    options: list[ProductOption] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def activate(self) -> None:
        self.status = "active"

    def deactivate(self) -> None:
        self.status = "inactive"

    def update_price(self, new_price: Decimal) -> None:
        if new_price < 0:
            raise ValueError("가격은 0 이상이어야 합니다")
        self.price = new_price
