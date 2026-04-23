"""재고 모델 — 창고 × SKU 단위."""

import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infra.db.base import BaseModel


class Inventory(BaseModel):
    __tablename__ = "inventories"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    sku: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    warehouse_id: Mapped[str] = mapped_column(String(50), nullable=False, default="default")
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    allocated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("sku", "warehouse_id", name="uq_inventory_sku_warehouse"),)
