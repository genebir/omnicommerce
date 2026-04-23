"""주문 유스케이스 서비스."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.order.entities import VALID_TRANSITIONS
from src.infra.db.models.order import Order


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
