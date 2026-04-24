"""카페24 채널 게이트웨이 구현 (§5, §6.2)."""

from datetime import UTC, datetime, timedelta

from src.infra.channels.base import ExternalId, ProductPage
from src.infra.channels.cafe24.client import Cafe24Client
from src.infra.channels.cafe24.mapping import (
    Cafe24OrderDTO,
    map_order_status,
    normalize_order_item,
    normalize_product,
    parse_product,
)
from src.infra.channels.registry import register

# cafe24 주문 조회 API의 최대 조회 범위 (start_date~end_date)
_CAFE24_ORDER_MAX_RANGE_DAYS = 89


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
        price_int = int(float(getattr(product, "price", 0) or 0))
        cost_price = getattr(product, "cost_price", None)
        supply_price_int = int(float(cost_price)) if cost_price else price_int
        payload: dict = {
            "product_name": (getattr(product, "name", "") or "")[:250],
            "price": str(price_int),
            "supply_price": str(supply_price_int),
            "display": "T",
            "selling": "T",
        }
        description = getattr(product, "description", None)
        if description:
            payload["summary_description"] = description[:255]
        return payload

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

    async def update_inventory(self, sku: str, qty: int, external_id: str | None = None) -> None:
        """cafe24 재고 갱신.

        cafe24의 재고 추적 모델:
        1. 상품 자체에 `use_inventory: T`가 있어야 재고 변경이 반영됨
        2. 옵션 없는 단순 상품도 자동으로 variant 1개가 생성됨 (variant_code 별개)
        3. SKU(product_code) ≠ variant_code → product_no로 variants를 조회해 variant_code 획득

        호출자가 external_id(product_no)를 전달해야 함. 누락이면 sku 매칭으로 fallback.
        """
        # 1) variant_code 확보
        variant_code: str | None = None
        product_no: str | None = external_id
        if product_no:
            variants_data = await self._client.get(f"/admin/products/{product_no}/variants")
            variants = variants_data.get("variants") or []
            # 단순 상품은 1개만, 옵션 상품은 product_code(SKU) 일치하는 것 우선
            for v in variants:
                if (v.get("custom_variant_code") or v.get("variant_code", "")).startswith(sku):
                    variant_code = v["variant_code"]
                    break
            if not variant_code and variants:
                variant_code = variants[0]["variant_code"]

        if not product_no or not variant_code:
            raise ValueError(
                f"cafe24 재고 갱신 실패 — product_no/variant_code 미확보 (sku={sku}, external_id={external_id})"
            )

        # 2) 상품의 use_inventory를 T로 보장 (이미 T면 cafe24가 idempotent하게 처리)
        await self._client.put(
            f"/admin/products/{product_no}",
            json={"request": {"use_inventory": "T"}},
        )

        # 3) variant inventories에 quantity 푸시
        await self._client.put(
            f"/admin/products/{product_no}/variants/{variant_code}/inventories",
            json={"request": {"use_inventory": "T", "quantity": qty}},
        )

    async def fetch_orders(self, since: datetime, until: datetime | None = None) -> list:
        """[since, until] 범위의 주문을 모두 가져온다.

        cafe24 제약:
        - start_date / end_date 둘 다 필수
        - 한 번에 최대 약 3개월 범위만 허용 → 자동으로 윈도우 분할
        - offset 기반 페이지네이션 (limit ≤ 500)
        """
        if until is None:
            until = datetime.now(UTC)

        max_window = timedelta(days=_CAFE24_ORDER_MAX_RANGE_DAYS)
        all_orders: list[dict] = []
        seen_ids: set[str] = set()  # 윈도우 경계 중복 회피

        window_start = since
        while window_start < until:
            window_end = min(window_start + max_window, until)
            offset = 0
            while True:
                params = {
                    "start_date": window_start.strftime("%Y-%m-%d"),
                    "end_date": window_end.strftime("%Y-%m-%d"),
                    "date_type": "order_date",
                    "limit": 100,
                    "offset": offset,
                    "embed": "items",
                }
                data = await self._client.get("/admin/orders", params=params)
                page = data.get("orders", [])
                if not page:
                    break

                for raw in page:
                    dto = Cafe24OrderDTO.model_validate(raw)
                    if dto.order_id in seen_ids:
                        continue
                    seen_ids.add(dto.order_id)
                    items_raw = raw.get("items") or dto.items or []
                    all_orders.append(
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
                            "items": [normalize_order_item(it) for it in items_raw],
                            "raw_payload": raw,
                        }
                    )

                if len(page) < 100:
                    break
                offset += 100

            window_start = window_end

        return all_orders
