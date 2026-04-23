"""주문 모델 — 채널에서 풀인된 주문."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infra.db.base import BaseModel


class Order(BaseModel):
    __tablename__ = "orders"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    channel_type: Mapped[str] = mapped_column(String(50), ForeignKey("channel_types.code"), nullable=False, index=True)
    external_order_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PAID", index=True)
    buyer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    buyer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    buyer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recipient_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recipient_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    recipient_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    recipient_zipcode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    shipping_fee: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    ordered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tracking_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tracking_company: Mapped[str | None] = mapped_column(String(100), nullable=True)
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(BaseModel):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    external_product_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    option_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
