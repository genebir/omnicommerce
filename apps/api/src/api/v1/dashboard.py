"""대시보드 통계 API 엔드포인트."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import extract, func, select

from src.api.v1.schemas import ApiResponse
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.channel_listing import ChannelListing
from src.infra.db.models.inventory import Inventory
from src.infra.db.models.order import Order
from src.infra.db.models.product import Product
from src.utils.clock import now

router = APIRouter(prefix="/dashboard")

KST = timezone(timedelta(hours=9))


class DashboardStats(BaseModel):
    total_products: int
    total_orders: int
    recent_orders: int
    low_stock_count: int
    pending_orders: int
    sync_issue_count: int


class MonthlySales(BaseModel):
    month: str
    orders: int
    revenue: float


class SalesResponse(BaseModel):
    monthly: list[MonthlySales]


@router.get("/stats", response_model=ApiResponse[DashboardStats])
async def get_dashboard_stats(session: SessionDep, current_user: CurrentUserDep):
    product_count = await session.execute(
        select(func.count()).select_from(
            select(Product).where(Product.deleted_at.is_(None), Product.user_id == current_user.id).subquery()
        )
    )
    order_count = await session.execute(
        select(func.count()).select_from(
            select(Order).where(Order.deleted_at.is_(None), Order.user_id == current_user.id).subquery()
        )
    )

    seven_days_ago = now() - timedelta(days=7)
    recent_result = await session.execute(
        select(func.count()).select_from(
            select(Order)
            .where(Order.deleted_at.is_(None), Order.user_id == current_user.id, Order.created_at >= seven_days_ago)
            .subquery()
        )
    )

    low_stock_result = await session.execute(
        select(func.count()).select_from(
            select(Inventory)
            .join(Product, Inventory.product_id == Product.id)
            .where(Inventory.deleted_at.is_(None), Inventory.available < 10, Product.user_id == current_user.id)
            .subquery()
        )
    )

    pending_orders_result = await session.execute(
        select(func.count()).select_from(
            select(Order)
            .where(Order.deleted_at.is_(None), Order.user_id == current_user.id, Order.status == "PAID")
            .subquery()
        )
    )

    sync_issue_result = await session.execute(
        select(func.count()).select_from(
            select(ChannelListing)
            .join(Product, ChannelListing.product_id == Product.id)
            .where(
                ChannelListing.deleted_at.is_(None),
                ChannelListing.sync_status.in_(["PENDING", "STALE", "FAILED"]),
                Product.user_id == current_user.id,
            )
            .subquery()
        )
    )

    stats = DashboardStats(
        total_products=product_count.scalar_one(),
        total_orders=order_count.scalar_one(),
        recent_orders=recent_result.scalar_one(),
        low_stock_count=low_stock_result.scalar_one(),
        pending_orders=pending_orders_result.scalar_one(),
        sync_issue_count=sync_issue_result.scalar_one(),
    )
    return ApiResponse(data=stats)


def _months_ago_first_day(current: datetime, months: int) -> datetime:
    """현재 시각에서 (months-1)개월 전의 그 달 1일 0시. 월 길이에 의존하지 않는 정확 계산."""
    total = current.year * 12 + (current.month - 1) - (months - 1)
    year, month0 = divmod(total, 12)
    return current.replace(year=year, month=month0 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)


@router.get("/sales", response_model=ApiResponse[SalesResponse])
async def get_sales_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
    months: int = Query(7, ge=1, le=24, description="최근 N개월"),
):
    """월별 매출·주문 수 통계."""
    current = now()
    start_date = _months_ago_first_day(current, months)

    result = await session.execute(
        select(
            extract("year", Order.created_at).label("year"),
            extract("month", Order.created_at).label("month"),
            func.count().label("orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
        )
        .where(
            Order.deleted_at.is_(None),
            Order.user_id == current_user.id,
            Order.created_at >= start_date,
            Order.status.notin_(["CANCELED", "REFUNDED"]),
        )
        .group_by(
            extract("year", Order.created_at),
            extract("month", Order.created_at),
        )
        .order_by(
            extract("year", Order.created_at),
            extract("month", Order.created_at),
        )
    )

    rows = result.all()
    monthly = [
        MonthlySales(
            month=f"{int(row.year)}-{int(row.month):02d}",
            orders=row.orders,
            revenue=float(row.revenue),
        )
        for row in rows
    ]

    return ApiResponse(data=SalesResponse(monthly=monthly))


class ActivityItem(BaseModel):
    id: str
    type: str
    description: str  # 하위 호환을 위한 한국어 fallback
    title_key: str  # i18n 키 (예: "orderUpdated", "productUpdated") — 프론트가 t(...)로 렌더
    params: dict[str, str]  # 키에 들어갈 변수
    timestamp: str


class ActivityResponse(BaseModel):
    items: list[ActivityItem]


@router.get("/activity", response_model=ApiResponse[ActivityResponse])
async def get_recent_activity(
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(10, ge=1, le=50),
):
    """최근 활동 내역 (주문·상품 변경 기반)."""
    activities: list[ActivityItem] = []

    recent_orders = await session.execute(
        select(Order)
        .where(Order.deleted_at.is_(None), Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    for order in recent_orders.scalars().all():
        activities.append(
            ActivityItem(
                id=str(order.id),
                type="order",
                description=f"주문 {order.external_order_id} ({order.status})",
                title_key="orderUpdated",
                params={"id": order.external_order_id or "", "status": order.status or ""},
                timestamp=order.created_at.isoformat() if order.created_at else "",
            )
        )

    recent_products = await session.execute(
        select(Product)
        .where(Product.deleted_at.is_(None), Product.user_id == current_user.id)
        .order_by(Product.updated_at.desc())
        .limit(limit)
    )
    for product in recent_products.scalars().all():
        activities.append(
            ActivityItem(
                id=str(product.id),
                type="product",
                description=f"상품 {product.name} 업데이트",
                title_key="productUpdated",
                params={"name": product.name or ""},
                timestamp=product.updated_at.isoformat() if product.updated_at else "",
            )
        )

    activities.sort(key=lambda a: a.timestamp, reverse=True)

    return ApiResponse(data=ActivityResponse(items=activities[:limit]))


class LowStockItem(BaseModel):
    inventory_id: uuid.UUID
    product_id: uuid.UUID
    sku: str
    product_name: str
    available: int
    total: int


@router.get("/low-stock", response_model=ApiResponse[list[LowStockItem]])
async def get_low_stock(
    session: SessionDep,
    current_user: CurrentUserDep,
    threshold: int = Query(10, ge=0, le=10000, description="가용 재고 임계값 (이하)"),
    limit: int = Query(10, ge=1, le=50),
):
    """가용 재고가 임계값 이하인 SKU 목록 — 대시보드 알림용."""
    rows = await session.execute(
        select(Inventory, Product)
        .join(Product, Inventory.product_id == Product.id)
        .where(
            Inventory.deleted_at.is_(None),
            Product.deleted_at.is_(None),
            Product.user_id == current_user.id,
            Inventory.available <= threshold,
        )
        .order_by(Inventory.available.asc(), Product.name.asc())
        .limit(limit)
    )
    items = [
        LowStockItem(
            inventory_id=inv.id,
            product_id=p.id,
            sku=inv.sku,
            product_name=p.name,
            available=inv.available,
            total=inv.total_quantity,
        )
        for inv, p in rows.all()
    ]
    return ApiResponse(data=items)
