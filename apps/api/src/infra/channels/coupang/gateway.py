"""쿠팡 채널 게이트웨이 구현 (§5, §6.2).

페이즈 18 docs 정합성:
- 재고 갱신은 단건 path-param 방식 (`PUT /vendor-items/{vendorItemId}/quantities/{qty}`)
- 주문 조회는 `createdAtTo` + `searchType=timeFrame` 필수
"""

from datetime import UTC, datetime

from src.infra.channels.base import ExternalId, ProductPage
from src.infra.channels.coupang.client import CoupangClient
from src.infra.channels.coupang.mapping import (
    CoupangOrderDTO,
    map_order_status,
    normalize_product,
    parse_product,
)
from src.infra.channels.registry import register


@register("coupang")
class CoupangGateway:
    def __init__(self, access_key: str, secret_key: str, vendor_id: str) -> None:
        self._client = CoupangClient(access_key, secret_key, vendor_id)

    async def close(self) -> None:
        await self._client.close()

    async def list_products(self, *, cursor: str | None = None) -> ProductPage:
        params: dict = {"vendorId": self._client.vendor_id, "maxPerPage": 100}
        if cursor:
            params["nextToken"] = cursor

        path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
        data = await self._client.get(path, params=params)

        products_raw = data.get("data", [])
        items = []
        for raw in products_raw:
            dto = parse_product(raw)
            normalized = normalize_product(dto)
            items.append(normalized)

        next_cursor = data.get("nextToken")
        return ProductPage(items=items, next_cursor=next_cursor, total=data.get("totalElements"))

    async def upsert_product(self, product: object) -> ExternalId:
        name = getattr(product, "name", "") or ""
        price = int(getattr(product, "price", 0) or 0)
        product_data = {
            "sellerProductName": name,
            "vendorId": self._client.vendor_id,
            "items": [{"itemName": name, "originalPrice": price, "salePrice": price}],
        }

        path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
        data = await self._client.post(path, json=product_data)
        product_id = str(data.get("data", ""))
        return ExternalId(
            id=product_id,
            url=f"https://www.coupang.com/vp/products/{product_id}",
        )

    async def update_product(self, external_id: str, product: object) -> None:
        name = getattr(product, "name", "") or ""
        price = int(getattr(product, "price", 0) or 0)
        product_data = {
            "sellerProductName": name,
            "vendorId": self._client.vendor_id,
            "items": [{"itemName": name, "originalPrice": price, "salePrice": price}],
        }
        path = f"/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/{external_id}"
        await self._client.put(path, json=product_data)

    async def delete_product(self, external_id: str) -> None:
        path = f"/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/{external_id}"
        await self._client.delete(path)

    async def update_inventory(self, sku: str, qty: int, external_id: str | None = None) -> None:  # noqa: ARG002
        # 쿠팡 재고 갱신은 단건 path-param 방식 (공식 docs).
        # 일괄 PUT body 형태는 실재하지 않음. 다중 SKU 갱신은 호출자가 루프로 처리한다.
        # `sku`는 vendorItemId로 사용된다(현재 구조 유지). external_id(sellerProductId)는 미사용.
        path = f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{sku}/quantities/{qty}"
        await self._client.put(path)

    async def fetch_orders(self, since: datetime, until: datetime | None = None) -> list:
        # 쿠팡 주문 조회는 `createdAtTo` + `searchType=timeFrame`이 필수 (공식 docs).
        # `timeFrame`은 24시간 이내 권장 — 더 넓은 범위는 호출자가 청크로 나눠야 한다.
        # NB: 1일 초과 범위 청킹은 §16.2.1 후속 페이즈로 분리. 현 시점에서는
        # 게이트웨이가 받은 since/until을 그대로 createdAtFrom/createdAtTo로 송신.
        actual_until = until or datetime.now(UTC)
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S")
        until_str = actual_until.strftime("%Y-%m-%dT%H:%M:%S")

        path = f"/v2/providers/openapi/apis/api/v4/vendors/{self._client.vendor_id}/ordersheets"
        data = await self._client.get(
            path,
            params={
                "createdAtFrom": since_str,
                "createdAtTo": until_str,
                "searchType": "timeFrame",
                "maxPerPage": 50,
            },
        )

        orders = []
        for raw in data.get("data", []):
            dto = CoupangOrderDTO.model_validate(raw)
            orders.append(
                {
                    "external_order_id": str(dto.orderId),
                    "channel_type": "coupang",
                    "status": map_order_status(dto.status),
                    "buyer_name": dto.ordererName,
                    "buyer_email": dto.ordererEmail,
                    "total_amount": str(dto.totalPrice),
                    "shipping_fee": str(dto.shippingPrice),
                    "recipient_name": dto.receiverName,
                    "recipient_phone": dto.receiverPhone,
                    "recipient_address": dto.receiverAddr,
                    "recipient_zipcode": dto.receiverZipCode,
                    "ordered_at": dto.orderDate,
                    "items": dto.orderItems,
                    "raw_payload": raw,
                }
            )

        return orders
