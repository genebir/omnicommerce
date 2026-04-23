"""주문 API 엔드포인트."""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import SessionDep
from src.infra.db.models.order import Order
from src.services.order_service import OrderService

router = APIRouter(prefix="/orders")


class OrderResponse(BaseModel):
    id: uuid.UUID
    channel_type: str
    external_order_id: str
    status: str
    buyer_name: str | None
    total_amount: float
    shipping_fee: float
    ordered_at: datetime | None = None

    model_config = {"from_attributes": True}


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class OrderDetailResponse(BaseModel):
    id: uuid.UUID
    channel_type: str
    external_order_id: str
    status: str
    buyer_name: str | None
    buyer_phone: str | None
    buyer_email: str | None
    recipient_name: str | None
    recipient_phone: str | None
    recipient_address: str | None
    total_amount: float
    shipping_fee: float
    ordered_at: datetime | None
    paid_at: datetime | None
    shipped_at: datetime | None
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}


class StatusTransitionRequest(BaseModel):
    status: str


@router.get("", response_model=PaginatedResponse[OrderResponse])
async def list_orders(
    session: SessionDep,
    cursor: str | None = Query(None, description="이전 페이지 마지막 항�� ID"),
    limit: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="주문번호/주문자 검���"),
    status: str | None = Query(None, description="상태 필터"),
):
    base = select(Order).where(Order.deleted_at.is_(None))
    if q:
        base = base.where(Order.external_order_id.ilike(f"%{q}%") | Order.buyer_name.ilike(f"%{q}%"))
    if status:
        base = base.where(Order.status == status)
    query = base.order_by(Order.created_at.desc()).limit(limit + 1)
    if cursor:
        query = query.where(Order.id < uuid.UUID(cursor))
    result = await session.execute(query)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = str(items[-1].id) if has_more and items else None

    total_result = await session.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar_one()

    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(next_cursor=next_cursor, has_more=has_more, total=total),
    )


@router.get("/{order_id}", response_model=ApiResponse[OrderDetailResponse])
async def get_order(order_id: uuid.UUID, session: SessionDep):
    result = await session.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id, Order.deleted_at.is_(None))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    return ApiResponse(data=order)


@router.patch("/{order_id}/status", response_model=ApiResponse[OrderResponse])
async def transition_order_status(order_id: uuid.UUID, body: StatusTransitionRequest, session: SessionDep):
    service = OrderService(session)
    try:
        order = await service.transition_status(order_id, body.status)
        return ApiResponse(data=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
