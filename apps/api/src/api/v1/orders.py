"""주문 API 엔드포인트."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import CurrentUserDep, SessionDep
from src.domain.order.entities import VALID_TRANSITIONS
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
    total_price: float
    sku: str | None = None
    option_text: str | None = None
    product_id: uuid.UUID | None = None

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
    recipient_zipcode: str | None = None
    total_amount: float
    shipping_fee: float
    ordered_at: datetime | None
    paid_at: datetime | None
    shipped_at: datetime | None
    delivered_at: datetime | None = None
    tracking_number: str | None = None
    tracking_company: str | None = None
    items: list[OrderItemResponse]

    model_config = {"from_attributes": True}


class StatusTransitionRequest(BaseModel):
    status: Literal["PREPARING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]
    tracking_company: str | None = None
    tracking_number: str | None = None


class TrackingUpdateRequest(BaseModel):
    tracking_company: str | None = Field(None, max_length=100)
    tracking_number: str | None = Field(None, max_length=100)


class BulkOrderStatusRequest(BaseModel):
    order_ids: Annotated[list[uuid.UUID], Field(min_length=1, max_length=200)]
    target_status: Literal["PREPARING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]


class BulkOrderStatusItemResult(BaseModel):
    order_id: uuid.UUID
    external_order_id: str
    channel_type: str
    buyer_name: str | None
    old_status: str
    new_status: str | None
    allowed: bool
    error: str | None = None


class BulkOrderStatusResult(BaseModel):
    updated_count: int
    skipped_count: int
    items: list[BulkOrderStatusItemResult]


@router.get("", response_model=PaginatedResponse[OrderResponse])
async def list_orders(
    session: SessionDep,
    current_user: CurrentUserDep,
    cursor: str | None = Query(None, description="이전 페이지 마지막 항목 ID"),
    limit: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="주문번호/주문자 검색"),
    status: str | None = Query(None, description="상태 필터"),
):
    base = select(Order).where(Order.deleted_at.is_(None), Order.user_id == current_user.id)
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
async def get_order(order_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep):
    result = await session.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.deleted_at.is_(None), Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    return ApiResponse(data=order)


@router.patch("/bulk/status", response_model=ApiResponse[BulkOrderStatusResult])
async def bulk_transition_order_status(body: BulkOrderStatusRequest, session: SessionDep, current_user: CurrentUserDep):
    """여러 주문의 상태를 한 번에 변경한다. 전이 불가능한 주문은 건너뛰고 결과에 표시."""
    result = await session.execute(
        select(Order).where(
            Order.id.in_(body.order_ids),
            Order.deleted_at.is_(None),
            Order.user_id == current_user.id,
        )
    )
    orders = list(result.scalars().all())

    items: list[BulkOrderStatusItemResult] = []
    updated = 0
    skipped = 0

    for order in orders:
        old_status = order.status
        allowed = body.target_status in VALID_TRANSITIONS.get(old_status, set())
        if allowed:
            order.status = body.target_status
            updated += 1
            items.append(
                BulkOrderStatusItemResult(
                    order_id=order.id,
                    external_order_id=order.external_order_id,
                    channel_type=order.channel_type,
                    buyer_name=order.buyer_name,
                    old_status=old_status,
                    new_status=body.target_status,
                    allowed=True,
                )
            )
        else:
            skipped += 1
            items.append(
                BulkOrderStatusItemResult(
                    order_id=order.id,
                    external_order_id=order.external_order_id,
                    channel_type=order.channel_type,
                    buyer_name=order.buyer_name,
                    old_status=old_status,
                    new_status=None,
                    allowed=False,
                    error=f"'{old_status}' 상태에서 '{body.target_status}'으로 변경할 수 없습니다",
                )
            )

    await session.commit()
    return ApiResponse(data=BulkOrderStatusResult(updated_count=updated, skipped_count=skipped, items=items))


@router.patch("/{order_id}/status", response_model=ApiResponse[OrderResponse])
async def transition_order_status(
    order_id: uuid.UUID, body: StatusTransitionRequest, session: SessionDep, current_user: CurrentUserDep
):
    service = OrderService(session)
    existing = await service.get_by_id(order_id)
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    try:
        order = await service.transition_status(order_id, body.status)
        if body.tracking_company is not None or body.tracking_number is not None:
            order.tracking_company = body.tracking_company
            order.tracking_number = body.tracking_number
            await session.commit()
            await session.refresh(order)
        return ApiResponse(data=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.patch("/{order_id}/tracking", response_model=ApiResponse[OrderResponse])
async def update_order_tracking(
    order_id: uuid.UUID, body: TrackingUpdateRequest, session: SessionDep, current_user: CurrentUserDep
):
    """운송장 번호·택배사 정보를 업데이트한다. 상태 변경 없이 운송장만 수정할 때 사용."""
    result = await session.execute(
        select(Order).where(Order.id == order_id, Order.deleted_at.is_(None), Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    order.tracking_company = body.tracking_company
    order.tracking_number = body.tracking_number
    await session.commit()
    await session.refresh(order)
    return ApiResponse(data=order)
