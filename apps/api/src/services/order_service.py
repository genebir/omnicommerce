"""주문 유스케이스 서비스."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.order.entities import VALID_TRANSITIONS
from src.infra.db.models.order import Order, OrderItem
from src.infra.db.models.product import Product

logger = structlog.stdlib.get_logger()


def _parse_dt(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _to_decimal(value: Any, default: str = "0") -> Decimal:
    if value is None or value == "":
        return Decimal(default)
    return Decimal(str(value))


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        order = await self._session.get(Order, order_id)
        if order and order.deleted_at is not None:
            return None
        return order

    async def list_by_user(
        self, user_id: uuid.UUID, *, limit: int = 20, cursor: uuid.UUID | None = None
    ) -> list[Order]:
        query = (
            select(Order)
            .where(Order.user_id == user_id, Order.deleted_at.is_(None))
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        if cursor:
            query = query.where(Order.id < cursor)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def transition_status(self, order_id: uuid.UUID, new_status: str) -> Order:
        order = await self._session.get(Order, order_id)
        if not order:
            raise ValueError("주문을 찾을 수 없습니다")

        allowed = VALID_TRANSITIONS.get(order.status, set())
        if new_status not in allowed:
            raise ValueError(f"'{order.status}' → '{new_status}' 전이 불가")

        order.status = new_status
        await self._session.commit()
        await self._session.refresh(order)
        return order

    async def import_from_channel(
        self,
        *,
        user_id: uuid.UUID,
        channel_type: str,
        orders: list[dict],
    ) -> tuple[int, int, int]:
        """게이트웨이가 가져온 주문 dict 리스트를 내부 DB로 upsert.

        Returns: (imported, updated, errors)
        """
        imported = updated = errors = 0
        # SKU → product_id 캐시 (이 사용자의 상품)
        product_map: dict[str, uuid.UUID] = {}

        for o in orders:
            try:
                async with self._session.begin_nested():
                    existing = await self._session.execute(
                        select(Order)
                        .options(selectinload(Order.items))
                        .where(
                            Order.user_id == user_id,
                            Order.channel_type == channel_type,
                            Order.external_order_id == o["external_order_id"],
                        )
                    )
                    order = existing.scalar_one_or_none()
                    is_new = order is None

                    if order is None:
                        order = Order(
                            user_id=user_id,
                            channel_type=channel_type,
                            external_order_id=o["external_order_id"],
                        )
                        self._session.add(order)

                    order.status = o.get("status") or "PAID"
                    order.buyer_name = o.get("buyer_name")
                    order.buyer_email = o.get("buyer_email")
                    order.buyer_phone = o.get("buyer_phone")
                    order.recipient_name = o.get("recipient_name")
                    order.recipient_phone = o.get("recipient_phone")
                    order.recipient_address = o.get("recipient_address")
                    order.recipient_zipcode = o.get("recipient_zipcode")
                    order.total_amount = _to_decimal(o.get("total_amount"))
                    order.shipping_fee = _to_decimal(o.get("shipping_fee"))
                    order.ordered_at = _parse_dt(o.get("ordered_at"))
                    order.raw_payload = o.get("raw_payload")

                    # 신규 Order는 PK 발급을 위해 flush
                    await self._session.flush()

                    # 기존 items 모두 삭제 (selectinload로 로드된 상태이므로 안전)
                    if not is_new:
                        for it in list(order.items):
                            await self._session.delete(it)
                        await self._session.flush()

                    # 새 items는 order_id를 직접 set해서 add — collection mutation 회피
                    # (async 세션의 lazy collection load 트리거 방지)
                    for item_dict in o.get("items") or []:
                        sku = item_dict.get("sku")
                        product_id: uuid.UUID | None = None
                        if sku:
                            if sku not in product_map:
                                pres = await self._session.execute(
                                    select(Product.id).where(
                                        Product.user_id == user_id,
                                        Product.sku == sku,
                                        Product.deleted_at.is_(None),
                                    )
                                )
                                product_map[sku] = pres.scalar_one_or_none()
                            product_id = product_map[sku]

                        self._session.add(
                            OrderItem(
                                order_id=order.id,
                                product_id=product_id,
                                external_product_id=item_dict.get("external_product_id"),
                                sku=sku,
                                name=item_dict.get("name") or "",
                                option_text=item_dict.get("option_text"),
                                quantity=int(item_dict.get("quantity") or 1),
                                unit_price=_to_decimal(item_dict.get("unit_price")),
                                total_price=_to_decimal(item_dict.get("total_price")),
                            )
                        )

                if is_new:
                    imported += 1
                else:
                    updated += 1
            except Exception as exc:
                errors += 1
                await logger.awarning(
                    "주문 import 실패",
                    channel_type=channel_type,
                    external_order_id=o.get("external_order_id"),
                    error=str(exc),
                )

        await self._session.commit()
        return imported, updated, errors
