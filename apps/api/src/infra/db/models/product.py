"""마스터 상품 모델."""

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infra.db.base import BaseModel


class Product(BaseModel):
    __tablename__ = "products"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cost_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    category_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="INACTIVE")
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    images: Mapped[list["ProductImage"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    options: Mapped[list["ProductOption"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    channel_listings: Mapped[list["ChannelListing"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "ChannelListing",
        foreign_keys="[ChannelListing.product_id]",
        viewonly=True,
        lazy="noload",
    )


class ProductImage(BaseModel):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(500), nullable=True)

    product: Mapped["Product"] = relationship(back_populates="images")


class ProductOption(BaseModel):
    __tablename__ = "product_options"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    values: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sku_suffix: Mapped[str | None] = mapped_column(String(50), nullable=True)
    price_adjustment: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="options")
