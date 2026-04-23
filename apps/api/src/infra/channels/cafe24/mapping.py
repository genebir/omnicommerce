"""카페24 필드 매핑 — Parse / Normalize / Map 3단계 (§6.4)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class Cafe24ProductDTO(BaseModel):
    """[1단계 Parse] 카페24 API 응답 → 채널 전용 DTO."""

    product_no: int
    product_code: str
    product_name: str
    supply_product_name: str | None = None
    selling_price: str
    supply_price: str | None = None
    summary_description: str | None = None
    detail_html: str | None = None
    category: int | None = None
    display: str | None = None
    selling: str | None = None
    created_date: str | None = None
    updated_date: str | None = None


class NormalizedProduct(BaseModel):
    """[2단계 Normalize] 공통 중간 표현."""

    external_id: str
    sku: str
    name: str
    price: Decimal
    cost_price: Decimal | None = None
    description: str | None = None
    category_path: str | None = None
    status: str = "draft"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class Cafe24OrderDTO(BaseModel):
    """[1단계 Parse] 카페24 주문 응답 DTO."""

    order_id: str
    order_date: str
    buyer_name: str | None = None
    buyer_email: str | None = None
    buyer_cellphone: str | None = None
    shipping_fee: str = "0"
    actual_payment_amount: str = "0"
    order_status: str = ""
    items: list[dict] = []
    receiver_name: str | None = None
    receiver_cellphone: str | None = None
    receiver_address1: str | None = None
    receiver_zipcode: str | None = None


def parse_product(raw: dict) -> Cafe24ProductDTO:
    return Cafe24ProductDTO.model_validate(raw)


def normalize_product(dto: Cafe24ProductDTO) -> NormalizedProduct:
    status = "active" if dto.selling == "T" else "draft"
    return NormalizedProduct(
        external_id=str(dto.product_no),
        sku=dto.product_code,
        name=dto.product_name,
        price=Decimal(dto.selling_price),
        cost_price=Decimal(dto.supply_price) if dto.supply_price else None,
        description=dto.summary_description,
        status=status,
    )


_STATUS_MAP: dict[str, str] = {
    "N00": "PAID",
    "N10": "PAID",
    "N20": "PREPARING",
    "N21": "PREPARING",
    "N22": "SHIPPED",
    "N30": "SHIPPED",
    "N40": "DELIVERED",
    "C00": "CANCELED",
    "C10": "CANCELED",
    "C34": "REFUNDED",
    "C36": "REFUNDED",
    "C40": "REFUNDED",
    "C47": "REFUNDED",
}


def map_order_status(cafe24_status: str) -> str:
    return _STATUS_MAP.get(cafe24_status, "PAID")
