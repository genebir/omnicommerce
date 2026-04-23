"""재고 도메인 엔티티 — 순수 Python, 프레임워크 독립."""

import uuid
from dataclasses import dataclass


@dataclass(slots=True)
class Inventory:
    id: uuid.UUID
    product_id: uuid.UUID
    sku: str
    warehouse_id: str
    total_quantity: int
    allocated: int
    available: int

    def allocate(self, qty: int) -> None:
        if qty > self.available:
            raise ValueError(f"가용 재고({self.available}) 부족: {qty}개 할당 불가")
        self.allocated += qty
        self.available -= qty

    def deallocate(self, qty: int) -> None:
        if qty > self.allocated:
            raise ValueError(f"할당 재고({self.allocated}) 부족: {qty}개 해제 불가")
        self.allocated -= qty
        self.available += qty

    def adjust(self, new_total: int) -> None:
        if new_total < 0:
            raise ValueError("총 재고는 0 이상이어야 합니다")
        diff = new_total - self.total_quantity
        self.total_quantity = new_total
        self.available += diff
        if self.available < 0:
            self.available = 0
