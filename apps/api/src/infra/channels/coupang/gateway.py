"""쿠팡 채널 게이트웨이 구현 (§5, §6.2)."""

from datetime import datetime

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
        from dataclasses import asdict

        payload = asdict(product) if hasattr(product, "__dataclass_fields__") else {}
        product_data = {
            "sellerProductName": payload.get("name", ""),
            "vendorId": self._client.vendor_id,
            "items": [
                {
                    "itemName": payload.get("name", ""),
                    "originalPrice": int(payload.get("price", 0)),
                    "salePrice": int(payload.get("price", 0)),
                }
            ],
        }

        path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
        data = await self._client.post(path, json=product_data)
        product_id = str(data.get("data", ""))
        return ExternalId(
            id=product_id,
            url=f"https://www.coupang.com/vp/products/{product_id}",
        )

    async def update_inventory(self, sku: str, qty: int) -> None:
        path = "/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/quantities"
        await self._client.put(
            path,
            json=[{"vendorItemId": sku, "quantity": qty}],
        )

    async def fetch_orders(self, since: datetime) -> list:
        since_str = since.strftime("%Y-%m-%dT00:00:00")
        path = f"/v2/providers/openapi/apis/api/v4/vendors/{self._client.vendor_id}/ordersheets"
        data = await self._client.get(
            path,
            params={"createdAtFrom": since_str, "maxPerPage": 50},
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
