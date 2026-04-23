"""네이버 스마트스토어 필드 매핑 — Parse / Normalize / Map 3단계 (§6.4)."""

from decimal import Decimal

from pydantic import BaseModel


class NaverProductDTO(BaseModel):
    """[1단계 Parse] 네이버 커머스 API 응답 DTO."""

    originProductNo: int  # noqa: N815
    channelProductNo: int | None = None  # noqa: N815
    name: str = ""
    salePrice: int = 0  # noqa: N815
    stockQuantity: int = 0  # noqa: N815
    modelName: str | None = None  # noqa: N815
    detailContent: str | None = None  # noqa: N815
    statusType: str = ""  # noqa: N815


class NormalizedProduct(BaseModel):
    """[2단계 Normalize] 공통 중간 표현."""

    external_id: str
    sku: str
    name: str
    price: Decimal
    description: str | None = None
    status: str = "INACTIVE"
    external_url: str | None = None


class NaverOrderDTO(BaseModel):
    """네이버 주문 DTO."""

    orderId: str  # noqa: N815
    orderDate: str | None = None  # noqa: N815
    paymentDate: str | None = None  # noqa: N815
    orderStatus: str = ""  # noqa: N815
    totalPaymentAmount: int = 0  # noqa: N815
    deliveryFeeAmount: int = 0  # noqa: N815
    ordererName: str | None = None  # noqa: N815
    ordererTel: str | None = None  # noqa: N815
    shippingAddress: dict | None = None  # noqa: N815
    productOrderInfos: list[dict] = []  # noqa: N815


def parse_product(raw: dict) -> NaverProductDTO:
    return NaverProductDTO.model_validate(raw)


def normalize_product(dto: NaverProductDTO) -> NormalizedProduct:
    status = "ACTIVE" if dto.statusType == "SALE" else "INACTIVE"
    return NormalizedProduct(
        external_id=str(dto.originProductNo),
        sku=dto.modelName or str(dto.originProductNo),
        name=dto.name,
        price=Decimal(dto.salePrice),
        description=dto.detailContent,
        status=status,
    )


_STATUS_MAP: dict[str, str] = {
    "PAYMENT_WAITING": "PAID",
    "PAYED": "PAID",
    "DELIVERING": "SHIPPED",
    "DELIVERED": "DELIVERED",
    "PURCHASE_DECIDED": "DELIVERED",
    "EXCHANGED": "REFUNDED",
    "CANCELED": "CANCELED",
    "RETURNED": "REFUNDED",
    "CANCEL_DONE": "CANCELED",
}


def map_order_status(naver_status: str) -> str:
    return _STATUS_MAP.get(naver_status, "PAID")
