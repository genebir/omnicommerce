"""카페24 채널 게이트웨이 구현 (§5, §6.2)."""

from datetime import datetime

from src.infra.channels.base import ExternalId, ProductPage
from src.infra.channels.cafe24.client import Cafe24Client
from src.infra.channels.cafe24.mapping import (
    Cafe24OrderDTO,
    map_order_status,
    normalize_product,
    parse_product,
)
from src.infra.channels.registry import register


@register("cafe24")
class Cafe24Gateway:
    def __init__(
        self,
        mall_id: str,
        access_token: str,
        refresh_token: str | None = None,
        client_id: str = "",
        client_secret: str = "",
    ) -> None:
        self._mall_id = mall_id
        self._client = Cafe24Client(mall_id, access_token, refresh_token, client_id, client_secret)

    def set_token_refresh_callback(self, callback) -> None:
        """토큰 갱신 후 DB 저장 콜백을 클라이언트에 연결한다."""
        self._client.set_token_refresh_callback(callback)

    async def close(self) -> None:
        await self._client.close()

    async def list_products(self, *, cursor: str | None = None) -> ProductPage:
        params: dict = {"limit": 100}
        if cursor:
            params["offset"] = int(cursor)

        data = await self._client.get("/admin/products", params=params)
        products_raw = data.get("products", [])

        items = []
        for raw in products_raw:
            dto = parse_product(raw)
            normalized = normalize_product(dto, mall_id=self._mall_id)
            items.append(normalized)

        next_cursor = None
        if len(products_raw) >= 100:
            current_offset = int(cursor) if cursor else 0
            next_cursor = str(current_offset + 100)

        return ProductPage(items=items, next_cursor=next_cursor, total=data.get("count"))

    def _build_product_payload(self, product: object) -> dict:
        return {
            "product_name": getattr(product, "name", "") or "",
            "selling_price": str(getattr(product, "price", 0) or 0),
            "supply_product_name": getattr(product, "sku", "") or "",
            "summary_description": getattr(product, "description", "") or "",
        }

    async def upsert_product(self, product: object) -> ExternalId:
        product_data = {"request": self._build_product_payload(product)}
        data = await self._client.post("/admin/products", json=product_data)
        product_info = data.get("product", {})
        product_no = str(product_info.get("product_no", ""))
        return ExternalId(
            id=product_no,
            url=f"https://{self._mall_id}.cafe24.com/product/detail.html?product_no={product_no}",
        )

    async def update_product(self, external_id: str, product: object) -> None:
        product_data = {"request": self._build_product_payload(product)}
        await self._client.put(f"/admin/products/{external_id}", json=product_data)

    async def delete_product(self, external_id: str) -> None:
        await self._client.delete(f"/admin/products/{external_id}")

    async def update_inventory(self, sku: str, qty: int) -> None:
        await self._client.put(
            "/admin/products/inventories",
            json={"request": {"variants": [{"variant_code": sku, "quantity": qty}]}},
        )

    async def fetch_orders(self, since: datetime) -> list:
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S+09:00")
        data = await self._client.get(
            "/admin/orders",
            params={"start_date": since_str, "limit": 500, "embed": "items"},
        )

        orders = []
        for raw in data.get("orders", []):
            dto = Cafe24OrderDTO.model_validate(raw)
            orders.append(
                {
                    "external_order_id": dto.order_id,
                    "channel_type": "cafe24",
                    "status": map_order_status(dto.order_status),
                    "buyer_name": dto.buyer_name,
                    "buyer_email": dto.buyer_email,
                    "buyer_phone": dto.buyer_cellphone,
                    "total_amount": dto.actual_payment_amount,
                    "shipping_fee": dto.shipping_fee,
                    "recipient_name": dto.receiver_name,
                    "recipient_phone": dto.receiver_cellphone,
                    "recipient_address": dto.receiver_address1,
                    "recipient_zipcode": dto.receiver_zipcode,
                    "ordered_at": dto.order_date,
                    "items": dto.items,
                    "raw_payload": raw,
                }
            )

        return orders
