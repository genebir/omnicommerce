"""네이버 스마트스토어 채널 게이트웨이 구현 (§5, §6.2)."""

from datetime import datetime

from src.infra.channels.base import ExternalId, ProductPage
from src.infra.channels.naver.client import NaverClient
from src.infra.channels.naver.mapping import (
    NaverOrderDTO,
    map_order_status,
    normalize_product,
    parse_product,
)
from src.infra.channels.registry import register


@register("naver")
class NaverGateway:
    def __init__(self, client_id: str, client_secret: str) -> None:
        self._client = NaverClient(client_id, client_secret)

    async def close(self) -> None:
        await self._client.close()

    async def list_products(self, *, cursor: str | None = None) -> ProductPage:
        params: dict = {"limit": 100}
        if cursor:
            params["afterProductNo"] = cursor

        data = await self._client.get("/v2/products", params=params)
        products_raw = data.get("contents", [])

        items = []
        for raw in products_raw:
            dto = parse_product(raw)
            normalized = normalize_product(dto)
            items.append(normalized)

        next_cursor = None
        if products_raw:
            last = products_raw[-1]
            next_cursor = str(last.get("originProductNo", ""))

        return ProductPage(items=items, next_cursor=next_cursor, total=data.get("totalElements"))

    async def upsert_product(self, product: object) -> ExternalId:
        product_data = {
            "originProduct": {
                "name": getattr(product, "name", "") or "",
                "salePrice": int(getattr(product, "price", 0) or 0),
                "detailContent": getattr(product, "description", "") or "",
            }
        }

        data = await self._client.post("/v2/products", json=product_data)
        product_no = str(data.get("originProductNo", ""))
        return ExternalId(
            id=product_no,
            url=f"https://smartstore.naver.com/products/{product_no}",
        )

    async def update_product(self, external_id: str, product: object) -> None:
        product_data = {
            "originProduct": {
                "name": getattr(product, "name", "") or "",
                "salePrice": int(getattr(product, "price", 0) or 0),
                "detailContent": getattr(product, "description", "") or "",
            }
        }
        await self._client.put(f"/v2/products/{external_id}", json=product_data)

    async def delete_product(self, external_id: str) -> None:
        await self._client.delete(f"/v2/products/{external_id}")

    async def update_inventory(self, sku: str, qty: int) -> None:
        await self._client.put(
            "/v2/products/stock",
            json={"stockQuantity": qty, "modelName": sku},
        )

    async def fetch_orders(self, since: datetime) -> list:
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S.000+09:00")
        data = await self._client.get(
            "/v1/pay-order/seller/orders",
            params={"lastChangedFrom": since_str},
        )

        orders = []
        for raw in data.get("data", []):
            dto = NaverOrderDTO.model_validate(raw)
            addr = dto.shippingAddress or {}
            orders.append(
                {
                    "external_order_id": dto.orderId,
                    "channel_type": "naver",
                    "status": map_order_status(dto.orderStatus),
                    "buyer_name": dto.ordererName,
                    "buyer_phone": dto.ordererTel,
                    "total_amount": str(dto.totalPaymentAmount),
                    "shipping_fee": str(dto.deliveryFeeAmount),
                    "recipient_name": addr.get("name"),
                    "recipient_phone": addr.get("tel1"),
                    "recipient_address": addr.get("baseAddress"),
                    "recipient_zipcode": addr.get("zipCode"),
                    "ordered_at": dto.orderDate,
                    "items": dto.productOrderInfos,
                    "raw_payload": raw,
                }
            )

        return orders
