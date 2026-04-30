"""쿠팡 필드 매핑 — Parse / Normalize / Map 3단계 (§6.4)."""

from decimal import Decimal

from pydantic import BaseModel


class CoupangProductDTO(BaseModel):
    """[1단계 Parse] 쿠팡 WING API 응답 DTO."""

    sellerProductId: int  # noqa: N815
    sellerProductName: str = ""  # noqa: N815
    displayCategoryCode: str | None = None  # noqa: N815
    vendorItemId: int | None = None  # noqa: N815
    salePrice: int = 0  # noqa: N815
    originalPrice: int | None = None  # noqa: N815
    statusName: str = ""  # noqa: N815
    sellerProductItemId: str | None = None  # noqa: N815


class NormalizedProduct(BaseModel):
    """[2단계 Normalize] 공통 중간 표현."""

    external_id: str
    sku: str
    name: str
    price: Decimal
    cost_price: Decimal | None = None
    description: str | None = None
    status: str = "INACTIVE"
    external_url: str | None = None


class CoupangOrderDTO(BaseModel):
    """쿠팡 주문 DTO."""

    orderId: int  # noqa: N815
    orderDate: str | None = None  # noqa: N815
    paidAt: str | None = None  # noqa: N815
    status: str = ""
    totalPrice: int = 0  # noqa: N815
    shippingPrice: int = 0  # noqa: N815
    ordererName: str | None = None  # noqa: N815
    ordererEmail: str | None = None  # noqa: N815
    receiverName: str | None = None  # noqa: N815
    receiverPhone: str | None = None  # noqa: N815
    receiverAddr: str | None = None  # noqa: N815
    receiverZipCode: str | None = None  # noqa: N815
    orderItems: list[dict] = []  # noqa: N815


# 쿠팡 statusName이 ACTIVE로 분류돼야 하는 값들 (페이즈 18 docs 정합성).
# 공식 statusName enum: 임시저장 | 승인요청 | 승인대기중 | 승인완료 | 부분승인완료 |
# 승인반려 | 판매중 | 판매중지. "승인완료" 단일 매칭은 협소해, 셀러 시점에서 노출
# 가능한 상태(승인 통과 + 판매중)를 모두 ACTIVE로 묶는다.
_ACTIVE_STATUS_NAMES: frozenset[str] = frozenset({"승인완료", "부분승인완료", "판매중"})


def parse_product(raw: dict) -> CoupangProductDTO:
    return CoupangProductDTO.model_validate(raw)


def normalize_product(dto: CoupangProductDTO) -> NormalizedProduct:
    status = "ACTIVE" if dto.statusName in _ACTIVE_STATUS_NAMES else "INACTIVE"
    return NormalizedProduct(
        external_id=str(dto.sellerProductId),
        sku=dto.sellerProductItemId or str(dto.sellerProductId),
        name=dto.sellerProductName,
        price=Decimal(dto.salePrice),
        cost_price=Decimal(dto.originalPrice) if dto.originalPrice else None,
        status=status,
    )


_STATUS_MAP: dict[str, str] = {
    "ACCEPT": "PAID",
    "INSTRUCT": "PREPARING",
    "DEPARTURE": "SHIPPED",
    "DELIVERING": "SHIPPED",
    "FINAL_DELIVERY": "DELIVERED",
    "NONE_TRACKING": "SHIPPED",
    "CANCEL": "CANCELED",
    "RETURN": "REFUNDED",
    "EXCHANGE": "REFUNDED",
}


def map_order_status(coupang_status: str) -> str:
    return _STATUS_MAP.get(coupang_status, "PAID")
