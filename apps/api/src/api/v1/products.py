"""상품 API 엔드포인트."""

import contextlib
import uuid
from datetime import datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.channel import Channel
from src.infra.db.models.channel_listing import ChannelListing
from src.infra.db.models.product import Product
from src.services.product_service import ProductService
from src.utils.clock import now

logger = structlog.stdlib.get_logger()

router = APIRouter(prefix="/products")


class ProductCreate(BaseModel):
    sku: str = Field(max_length=100)
    name: str = Field(max_length=500)
    description: str | None = None
    price: float = Field(ge=0)
    cost_price: float | None = None
    category_path: str | None = None
    publish_to: list[str] = Field(default_factory=list, description="등록할 채널 타입 목록")


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    cost_price: float | None = None
    category_path: str | None = None
    status: str | None = None


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    sort_order: int
    alt_text: str | None

    model_config = {"from_attributes": True}


class ChannelListingInfo(BaseModel):
    channel_type: str
    external_id: str
    sync_status: str
    external_url: str | None = None

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: uuid.UUID
    sku: str
    name: str
    description: str | None
    price: float
    cost_price: float | None
    category_path: str | None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    channel_listings: list[ChannelListingInfo] = []

    model_config = {"from_attributes": True}


class ProductDetailResponse(ProductResponse):
    images: list[ProductImageResponse] = []


class ChannelDeleteResult(BaseModel):
    channel_type: str
    success: bool
    error: str | None = None
    requires_reconnect: bool = False  # True면 채널 재연결 필요


class DeleteProductResult(BaseModel):
    channel_results: list[ChannelDeleteResult] = []


@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    session: SessionDep,
    current_user: CurrentUserDep,
    cursor: str | None = Query(None, description="이전 페이지 마지막 항목 ID"),
    limit: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="상품명/SKU 검색"),
    status: str | None = Query(None, description="상태 필터"),
):
    base = select(Product).where(Product.deleted_at.is_(None), Product.user_id == current_user.id)
    if q:
        base = base.where(Product.name.ilike(f"%{q}%") | Product.sku.ilike(f"%{q}%"))
    if status:
        base = base.where(Product.status == status)
    query = base.options(selectinload(Product.channel_listings)).order_by(Product.created_at.desc()).limit(limit + 1)
    if cursor:
        query = query.where(Product.id < uuid.UUID(cursor))
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


@router.post("", response_model=ApiResponse[ProductResponse], status_code=201)
async def create_product(body: ProductCreate, session: SessionDep, current_user: CurrentUserDep):
    service = ProductService(session)
    product = await service.create(
        user_id=current_user.id,
        sku=body.sku,
        name=body.name,
        price=body.price,
        description=body.description,
        cost_price=body.cost_price,
        category_path=body.category_path,
    )

    if body.publish_to:
        await _publish_to_channels(session, product, current_user.id, body.publish_to)
        product = await _reload_with_listings(session, product.id)

    return ApiResponse(data=product)


async def _reload_with_listings(session, product_id: uuid.UUID) -> Product:
    result = await session.execute(
        select(Product)
        .options(selectinload(Product.channel_listings))
        .where(Product.id == product_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def _sync_update_to_channels(session, product: Product, user_id: uuid.UUID) -> None:
    """수정된 상품을 연결된 모든 채널에 동기화한다."""
    from src.core.exceptions import AuthenticationError, ChannelResourceNotFoundError
    from src.infra.channels.factory import create_gateway

    listings_result = await session.execute(
        select(ChannelListing).where(
            ChannelListing.product_id == product.id,
            ChannelListing.deleted_at.is_(None),
        )
    )
    listings = list(listings_result.scalars().all())

    for listing in listings:
        if listing.external_id == "PENDING":
            continue

        ch_result = await session.execute(
            select(Channel).where(
                Channel.user_id == user_id,
                Channel.channel_type == listing.channel_type,
                Channel.deleted_at.is_(None),
                Channel.is_active.is_(True),
            )
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            continue

        gateway = None
        try:
            gateway = create_gateway(channel, session)  # 세션 전달 → 토큰 갱신 시 DB 자동 저장
            await gateway.update_product(listing.external_id, product)
            listing.sync_status = "SYNCED"
            listing.last_synced_at = now()
            listing.last_error = None
            await logger.ainfo(
                "채널 수정 동기화 성공", channel_type=listing.channel_type, external_id=listing.external_id
            )
        except AuthenticationError as exc:
            # 토큰 만료 → 채널 비활성화, 재연결 안내
            channel.is_active = False
            listing.sync_status = "FAILED"
            listing.last_error = f"인증 실패 (재연결 필요): {exc}"
            await logger.awarning("채널 인증 실패 — 채널 비활성화", channel_type=listing.channel_type)
        except ChannelResourceNotFoundError:
            listing.sync_status = "STALE"
            listing.last_error = "채널에서 상품을 찾을 수 없음 (404)"
            await logger.awarning(
                "채널 상품 없음(404) — STALE 처리", channel_type=listing.channel_type, external_id=listing.external_id
            )
        except Exception as exc:
            listing.sync_status = "FAILED"
            listing.last_error = str(exc)
            await logger.awarning("채널 수정 동기화 실패", channel_type=listing.channel_type, error=str(exc))
        finally:
            if gateway:
                with contextlib.suppress(Exception):
                    await gateway.close()

    await session.commit()


async def _sync_delete_to_channels(
    session, product_id: uuid.UUID, user_id: uuid.UUID, channel_types: list[str] | None = None
) -> list[dict]:
    """삭제 전 채널에서 상품을 제거한다. channel_types가 None이면 모든 채널.

    Returns:
        각 채널별 삭제 결과 목록 [{"channel_type": ..., "success": ..., "error": ...}]
    """
    from src.core.exceptions import AuthenticationError, ChannelResourceNotFoundError
    from src.infra.channels.factory import create_gateway

    listing_query = select(ChannelListing).where(
        ChannelListing.product_id == product_id,
        ChannelListing.deleted_at.is_(None),
    )
    if channel_types:
        listing_query = listing_query.where(ChannelListing.channel_type.in_(channel_types))
    listings_result = await session.execute(listing_query)
    listings = list(listings_result.scalars().all())

    results: list[dict] = []

    for listing in listings:
        if listing.external_id == "PENDING":
            results.append({"channel_type": listing.channel_type, "success": True})
            continue

        ch_result = await session.execute(
            select(Channel).where(
                Channel.user_id == user_id,
                Channel.channel_type == listing.channel_type,
                Channel.deleted_at.is_(None),
                Channel.is_active.is_(True),
            )
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            results.append(
                {
                    "channel_type": listing.channel_type,
                    "success": False,
                    "error": "연결된 채널을 찾을 수 없습니다",
                }
            )
            continue

        gateway = None
        try:
            gateway = create_gateway(channel, session)  # 세션 전달 → 토큰 갱신 시 DB 자동 저장
            await gateway.delete_product(listing.external_id)
            results.append({"channel_type": listing.channel_type, "success": True})
            await logger.ainfo(
                "채널 삭제 동기화 성공", channel_type=listing.channel_type, external_id=listing.external_id
            )
        except ChannelResourceNotFoundError:
            # 이미 채널에서 삭제된 상품 — 성공으로 처리
            results.append({"channel_type": listing.channel_type, "success": True})
            await logger.ainfo(
                "채널 상품 이미 삭제됨(404) — 정상 처리",
                channel_type=listing.channel_type,
                external_id=listing.external_id,
            )
        except AuthenticationError:
            # 토큰 만료 → 채널 비활성화, 재연결 안내
            channel.is_active = False
            await session.commit()
            results.append(
                {
                    "channel_type": listing.channel_type,
                    "success": False,
                    "error": "채널 인증이 만료되었습니다. 채널 페이지에서 재연결해 주세요.",
                    "requires_reconnect": True,
                }
            )
            await logger.awarning("채널 인증 실패 — 채널 비활성화", channel_type=listing.channel_type)
        except Exception as exc:
            results.append(
                {
                    "channel_type": listing.channel_type,
                    "success": False,
                    "error": str(exc),
                }
            )
            await logger.awarning("채널 삭제 동기화 실패", channel_type=listing.channel_type, error=str(exc))
        finally:
            if gateway:
                with contextlib.suppress(Exception):
                    await gateway.close()

    return results


async def _publish_to_channels(session, product: Product, user_id: uuid.UUID, channel_types: list[str]) -> None:
    """상품을 지정한 채널들에 등록하고 ChannelListing 레코드를 생성한다."""
    from src.infra.channels.factory import create_gateway

    for channel_type in channel_types:
        ch_result = await session.execute(
            select(Channel).where(
                Channel.user_id == user_id,
                Channel.channel_type == channel_type,
                Channel.deleted_at.is_(None),
                Channel.is_active.is_(True),
            )
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            await logger.awarning("채널 연결 없음 — 스킵", channel_type=channel_type)
            continue

        sync_status = "FAILED"
        external_id = "PENDING"
        external_url = None
        last_error = None

        gateway = None
        try:
            gateway = create_gateway(channel, session)  # 세션 전달 → 토큰 갱신 시 DB 자동 저장
            ext = await gateway.upsert_product(product)
            external_id = ext.id
            external_url = ext.url
            sync_status = "SYNCED"
            await logger.ainfo("채널 등록 성공", channel_type=channel_type, external_id=external_id)
        except Exception as exc:
            last_error = str(exc)
            await logger.awarning("채널 등록 실패", channel_type=channel_type, error=last_error)
        finally:
            if gateway:
                with contextlib.suppress(Exception):
                    await gateway.close()

        listing = ChannelListing(
            product_id=product.id,
            channel_type=channel_type,
            external_id=external_id,
            external_url=external_url,
            sync_status=sync_status,
            last_synced_at=now() if sync_status == "SYNCED" else None,
            last_error=last_error,
        )
        session.add(listing)

    await session.commit()


# ===== 가격 일괄 수정 =====


class BulkPriceField(BaseModel):
    """가격 또는 단가, 두 개 중 하나 또는 둘 다 변경 가능."""

    mode: Annotated[str, Field(pattern="^(absolute|inc_amount|inc_percent)$")]
    """- absolute: value를 그대로 적용
    - inc_amount: 현재 값에 value 더함 (음수=인하)
    - inc_percent: 현재 값의 value% 변경 (음수=인하)
    """

    value: float
    round_to: int = Field(default=10, ge=1, description="원 단위 반올림 자릿수 (1·10·100·1000)")


class BulkPriceEditRequest(BaseModel):
    product_ids: list[uuid.UUID] = Field(min_length=1, max_length=500)
    price: BulkPriceField | None = None
    cost_price: BulkPriceField | None = None
    sync_channels: bool = True
    """True면 가격 변경을 연결된 채널에 동기화 시도. False면 내부 DB만."""

    channel_types: list[str] = Field(
        default_factory=list,
        description="동기화할 채널 코드 목록 (빈 배열이면 연결된 모든 채널)",
    )


def _apply_change(current: float | None, change: BulkPriceField) -> float:
    base = float(current or 0)
    if change.mode == "absolute":
        new = float(change.value)
    elif change.mode == "inc_amount":
        new = base + float(change.value)
    else:  # inc_percent
        new = base * (1.0 + float(change.value) / 100.0)

    new = max(0.0, new)
    if change.round_to > 1:
        new = round(new / change.round_to) * change.round_to
    return new


class BulkPriceProductResult(BaseModel):
    product_id: uuid.UUID
    old_price: float
    new_price: float
    old_cost_price: float | None
    new_cost_price: float | None
    channel_results: list[ChannelDeleteResult] = []  # success/error 구조 재사용


class BulkPriceEditResult(BaseModel):
    updated_count: int
    sync_attempted: bool
    batch_id: uuid.UUID  # 되돌리기·이력 조회 키
    items: list[BulkPriceProductResult]


@router.patch("/bulk/price", response_model=ApiResponse[BulkPriceEditResult])
async def bulk_edit_price(body: BulkPriceEditRequest, session: SessionDep, current_user: CurrentUserDep):
    """선택된 상품들의 가격/단가를 일괄 변경하고, 연결된 채널에 동기화한다.

    - 모드 3종: 새 가격 직접 입력 / 금액 +- / 퍼센트 +-
    - sync_channels=True면 변경 후 채널에 푸시 시도, 실패한 채널은 결과에 포함
    - channel_types 빈 배열이면 각 상품에 연결된 모든 채널이 대상
    - 모든 변경은 같은 batch_id로 history에 기록되어 한 번에 되돌릴 수 있다
    """
    from src.infra.db.models.price_history import ProductPriceHistory

    if body.price is None and body.cost_price is None:
        raise HTTPException(status_code=400, detail="price 또는 cost_price 중 하나는 필요합니다")

    products_q = await session.execute(
        select(Product).where(
            Product.id.in_(body.product_ids),
            Product.user_id == current_user.id,
            Product.deleted_at.is_(None),
        )
    )
    products = list(products_q.scalars().all())

    batch_id = uuid.uuid4()
    items: list[BulkPriceProductResult] = []

    for product in products:
        old_price = float(product.price)
        old_cost = float(product.cost_price) if product.cost_price is not None else None
        new_price = _apply_change(old_price, body.price) if body.price else old_price
        new_cost = _apply_change(old_cost, body.cost_price) if body.cost_price else old_cost

        price_changed = new_price != old_price
        cost_changed = body.cost_price is not None and new_cost != old_cost

        if price_changed:
            product.price = new_price
        if cost_changed:
            product.cost_price = new_cost

        channel_results: list[ChannelDeleteResult] = []
        if body.sync_channels and (price_changed or cost_changed):
            channel_results = [
                ChannelDeleteResult(**r)
                for r in await _sync_price_to_channels(session, product, current_user.id, body.channel_types or None)
            ]

        # 이력 기록 — price/cost_price 각각 별도 행으로
        if price_changed:
            session.add(
                ProductPriceHistory(
                    product_id=product.id,
                    user_id=current_user.id,
                    field="price",
                    old_value=old_price,
                    new_value=new_price,
                    batch_id=batch_id,
                    change_mode=body.price.mode if body.price else None,
                    change_value=float(body.price.value) if body.price else None,
                    channel_results=[r.model_dump() for r in channel_results] or None,
                )
            )
        if cost_changed:
            session.add(
                ProductPriceHistory(
                    product_id=product.id,
                    user_id=current_user.id,
                    field="cost_price",
                    old_value=old_cost,
                    new_value=new_cost,
                    batch_id=batch_id,
                    change_mode=body.cost_price.mode if body.cost_price else None,
                    change_value=float(body.cost_price.value) if body.cost_price else None,
                )
            )

        items.append(
            BulkPriceProductResult(
                product_id=product.id,
                old_price=old_price,
                new_price=new_price,
                old_cost_price=old_cost,
                new_cost_price=new_cost,
                channel_results=channel_results,
            )
        )

    await session.commit()
    return ApiResponse(
        data=BulkPriceEditResult(
            updated_count=len(items),
            sync_attempted=body.sync_channels,
            batch_id=batch_id,
            items=items,
        )
    )


async def _sync_price_to_channels(
    session, product: Product, user_id: uuid.UUID, channel_types: list[str] | None
) -> list[dict]:
    """변경된 가격을 채널에 동기화. 내부 _sync_update_to_channels와 비슷하지만
    결과를 반환해 호출자가 응답에 포함할 수 있도록 한다."""
    from src.core.exceptions import AuthenticationError, ChannelResourceNotFoundError
    from src.infra.channels.factory import create_gateway

    listing_q = select(ChannelListing).where(
        ChannelListing.product_id == product.id,
        ChannelListing.deleted_at.is_(None),
    )
    if channel_types:
        listing_q = listing_q.where(ChannelListing.channel_type.in_(channel_types))
    listings = list((await session.execute(listing_q)).scalars().all())

    results: list[dict] = []
    for listing in listings:
        if listing.external_id == "PENDING":
            results.append({"channel_type": listing.channel_type, "success": False, "error": "external_id 미발급"})
            continue

        ch_result = await session.execute(
            select(Channel).where(
                Channel.user_id == user_id,
                Channel.channel_type == listing.channel_type,
                Channel.deleted_at.is_(None),
                Channel.is_active.is_(True),
            )
        )
        channel = ch_result.scalar_one_or_none()
        if not channel:
            results.append(
                {
                    "channel_type": listing.channel_type,
                    "success": False,
                    "error": "채널 미연결",
                }
            )
            continue

        gateway = None
        try:
            gateway = create_gateway(channel, session)
            await gateway.update_product(listing.external_id, product)
            listing.sync_status = "SYNCED"
            listing.last_synced_at = now()
            listing.last_error = None
            results.append({"channel_type": listing.channel_type, "success": True})
        except AuthenticationError:
            channel.is_active = False
            listing.sync_status = "FAILED"
            listing.last_error = "인증 만료 (재연결 필요)"
            results.append(
                {
                    "channel_type": listing.channel_type,
                    "success": False,
                    "error": "채널 인증 만료",
                    "requires_reconnect": True,
                }
            )
        except ChannelResourceNotFoundError:
            listing.sync_status = "STALE"
            results.append(
                {"channel_type": listing.channel_type, "success": False, "error": "채널에서 상품을 찾을 수 없음"}
            )
        except Exception as exc:
            listing.sync_status = "FAILED"
            listing.last_error = str(exc)
            results.append({"channel_type": listing.channel_type, "success": False, "error": str(exc)})
        finally:
            if gateway:
                with contextlib.suppress(Exception):
                    await gateway.close()
    return results


# ===== 가격 변경 이력 + 되돌리기 =====


class PriceHistoryItem(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    field: str
    old_value: float | None
    new_value: float
    batch_id: uuid.UUID
    change_mode: str | None
    change_value: float | None
    channel_results: list[dict] | None = None
    reverted_at: datetime | None = None
    created_at: datetime | None = None


class PriceBatchItem(BaseModel):
    batch_id: uuid.UUID
    created_at: datetime | None
    product_count: int
    change_mode: str | None
    change_value: float | None
    field: str  # 해당 batch의 대표 field (대부분 price 또는 cost_price 단독)
    is_reverted: bool  # 전부 reverted인가


@router.get("/price-history/recent", response_model=ApiResponse[list[PriceBatchItem]])
async def list_recent_price_batches(
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(20, ge=1, le=100),
):
    """최근 가격 변경 batch 목록 (일괄 작업 단위)."""
    from src.infra.db.models.price_history import ProductPriceHistory

    rows = (
        await session.execute(
            select(
                ProductPriceHistory.batch_id,
                func.min(ProductPriceHistory.created_at).label("created_at"),
                func.count(ProductPriceHistory.id).label("product_count"),
                func.max(ProductPriceHistory.change_mode).label("change_mode"),
                func.max(ProductPriceHistory.change_value).label("change_value"),
                func.max(ProductPriceHistory.field).label("field"),
                func.bool_and(ProductPriceHistory.reverted_at.is_not(None)).label("is_reverted"),
            )
            .where(ProductPriceHistory.user_id == current_user.id)
            .group_by(ProductPriceHistory.batch_id)
            .order_by(func.min(ProductPriceHistory.created_at).desc())
            .limit(limit)
        )
    ).all()
    return ApiResponse(
        data=[
            PriceBatchItem(
                batch_id=r.batch_id,
                created_at=r.created_at,
                product_count=r.product_count,
                change_mode=r.change_mode,
                change_value=float(r.change_value) if r.change_value is not None else None,
                field=r.field,
                is_reverted=bool(r.is_reverted),
            )
            for r in rows
        ]
    )


@router.get("/{product_id}/price-history", response_model=ApiResponse[list[PriceHistoryItem]])
async def list_product_price_history(
    product_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(50, ge=1, le=200),
):
    """한 상품의 가격 변경 이력 (최신 순)."""
    from src.infra.db.models.price_history import ProductPriceHistory

    # 권한 확인
    product = await session.get(Product, product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    rows = list(
        (
            await session.execute(
                select(ProductPriceHistory)
                .where(ProductPriceHistory.product_id == product_id)
                .order_by(ProductPriceHistory.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return ApiResponse(
        data=[
            PriceHistoryItem(
                id=h.id,
                product_id=h.product_id,
                field=h.field,
                old_value=float(h.old_value) if h.old_value is not None else None,
                new_value=float(h.new_value),
                batch_id=h.batch_id,
                change_mode=h.change_mode,
                change_value=float(h.change_value) if h.change_value is not None else None,
                channel_results=h.channel_results,
                reverted_at=h.reverted_at,
                created_at=h.created_at,
            )
            for h in rows
        ]
    )


class RevertBatchResult(BaseModel):
    batch_id: uuid.UUID
    reverted_count: int  # 되돌린 상품 행 수
    new_batch_id: uuid.UUID  # 되돌리기 자체도 새 batch로 기록됨
    items: list[BulkPriceProductResult]


@router.post("/price-history/{batch_id}/revert", response_model=ApiResponse[RevertBatchResult])
async def revert_price_batch(
    batch_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """batch_id로 묶인 모든 가격 변경을 일괄 되돌린다.

    - 각 history 행의 old_value를 현재 값으로 다시 적용
    - 되돌리기 자체도 새 batch로 기록 (change_mode="revert")
    - 이미 reverted된 이력은 스킵
    - 채널에도 되돌린 값을 푸시
    """
    from src.infra.db.models.price_history import ProductPriceHistory
    from src.utils.clock import now as now_ts

    # 대상 history 조회 (사용자 소유만)
    histories = list(
        (
            await session.execute(
                select(ProductPriceHistory)
                .where(
                    ProductPriceHistory.batch_id == batch_id,
                    ProductPriceHistory.user_id == current_user.id,
                    ProductPriceHistory.reverted_at.is_(None),
                )
                .order_by(ProductPriceHistory.created_at)
            )
        )
        .scalars()
        .all()
    )
    if not histories:
        raise HTTPException(status_code=404, detail="되돌릴 변경 이력을 찾을 수 없습니다")

    # product_id별로 그룹핑하여 각 상품의 price/cost_price를 한 번에 처리
    per_product: dict[uuid.UUID, dict[str, ProductPriceHistory]] = {}
    for h in histories:
        per_product.setdefault(h.product_id, {})[h.field] = h

    new_batch_id = uuid.uuid4()
    revert_ts = now_ts()
    items: list[BulkPriceProductResult] = []

    for product_id, field_map in per_product.items():
        product = await session.get(Product, product_id)
        if not product or product.user_id != current_user.id or product.deleted_at is not None:
            continue

        old_price = float(product.price)
        old_cost = float(product.cost_price) if product.cost_price is not None else None
        new_price = old_price
        new_cost = old_cost

        # price history
        if "price" in field_map and field_map["price"].old_value is not None:
            new_price = float(field_map["price"].old_value)
            product.price = new_price
        if "cost_price" in field_map and field_map["cost_price"].old_value is not None:
            new_cost = float(field_map["cost_price"].old_value)
            product.cost_price = new_cost

        # 채널에 되돌린 값 푸시
        channel_results_dict = await _sync_price_to_channels(session, product, current_user.id, None)
        channel_results = [ChannelDeleteResult(**r) for r in channel_results_dict]

        # 원본 이력에 reverted_at 표시 + 새 이력 생성
        for field_name, h in field_map.items():
            revert_history = ProductPriceHistory(
                product_id=product.id,
                user_id=current_user.id,
                field=field_name,
                old_value=float(h.new_value),
                new_value=float(h.old_value) if h.old_value is not None else 0,
                batch_id=new_batch_id,
                change_mode="revert",
                change_value=None,
                channel_results=[r.model_dump() for r in channel_results] if field_name == "price" else None,
            )
            session.add(revert_history)
            await session.flush()
            h.reverted_at = revert_ts
            h.reverted_by_history_id = revert_history.id

        items.append(
            BulkPriceProductResult(
                product_id=product.id,
                old_price=old_price,
                new_price=new_price,
                old_cost_price=old_cost,
                new_cost_price=new_cost,
                channel_results=channel_results,
            )
        )

    await session.commit()
    return ApiResponse(
        data=RevertBatchResult(
            batch_id=batch_id,
            reverted_count=len(items),
            new_batch_id=new_batch_id,
            items=items,
        )
    )


@router.get("/{product_id}", response_model=ApiResponse[ProductDetailResponse])
async def get_product(product_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep):
    result = await session.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.channel_listings),
        )
        .where(Product.id == product_id, Product.deleted_at.is_(None), Product.user_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    return ApiResponse(data=product)


@router.patch("/{product_id}", response_model=ApiResponse[ProductResponse])
async def update_product(product_id: uuid.UUID, body: ProductUpdate, session: SessionDep, current_user: CurrentUserDep):
    service = ProductService(session)
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다")
    existing = await service.get_by_id(product_id)
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    product = await service.update(product_id, **updates)
    await _sync_update_to_channels(session, product, current_user.id)
    product = await _reload_with_listings(session, product.id)
    return ApiResponse(data=product)


@router.delete("/{product_id}", response_model=ApiResponse[DeleteProductResult])
async def delete_product(
    product_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    channel_types: Annotated[list[str], Query()] = None,  # type: ignore[assignment]
):
    """상품을 삭제한다.

    - channel_types 미지정 또는 빈 배열: 채널은 건드리지 않고 내부 DB에서만 soft-delete
    - channel_types 지정: 그 채널에서도 함께 삭제 시도
    - 채널 삭제 실패 시에도 로컬 삭제는 진행되며, 결과를 응답에 포함
    """
    service = ProductService(session)
    existing = await service.get_by_id(product_id)
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    channel_results: list[dict] = []
    if channel_types:
        channel_results = await _sync_delete_to_channels(
            session, product_id, current_user.id, channel_types=channel_types
        )
    await service.soft_delete(product_id)

    return ApiResponse(data=DeleteProductResult(channel_results=[ChannelDeleteResult(**r) for r in channel_results]))


class ImageCreate(BaseModel):
    url: str = Field(max_length=1000)
    alt_text: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


@router.post(
    "/{product_id}/images",
    response_model=ApiResponse[ProductImageResponse],
    status_code=201,
)
async def add_product_image(product_id: uuid.UUID, body: ImageCreate, session: SessionDep):
    from src.infra.db.models.product import ProductImage

    product = await session.get(Product, product_id)
    if not product or product.deleted_at:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    image = ProductImage(
        product_id=product_id,
        url=body.url,
        alt_text=body.alt_text,
        sort_order=body.sort_order,
    )
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return ApiResponse(data=image)


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def delete_product_image(product_id: uuid.UUID, image_id: uuid.UUID, session: SessionDep):
    from src.infra.db.models.product import ProductImage

    result = await session.execute(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다")
    await session.delete(image)
    await session.commit()


class ResyncResult(BaseModel):
    channel_type: str
    success: bool
    sync_status: str
    error: str | None = None


@router.post("/{product_id}/channels/{channel_type}/resync", response_model=ApiResponse[ResyncResult])
async def resync_product_to_channel(
    product_id: uuid.UUID,
    channel_type: str,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ApiResponse[ResyncResult]:
    """특정 채널로 상품을 강제 재동기화한다."""
    from src.core.exceptions import AuthenticationError, ChannelResourceNotFoundError
    from src.infra.channels.factory import create_gateway

    product_result = await session.execute(
        select(Product).where(
            Product.id == product_id,
            Product.deleted_at.is_(None),
            Product.user_id == current_user.id,
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    listing_result = await session.execute(
        select(ChannelListing).where(
            ChannelListing.product_id == product_id,
            ChannelListing.channel_type == channel_type,
            ChannelListing.deleted_at.is_(None),
        )
    )
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="채널 등록 정보를 찾을 수 없습니다")

    channel_result = await session.execute(
        select(Channel).where(
            Channel.user_id == current_user.id,
            Channel.channel_type == channel_type,
            Channel.deleted_at.is_(None),
            Channel.is_active.is_(True),
        )
    )
    channel = channel_result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=422, detail="연결된 채널을 찾을 수 없거나 비활성 상태입니다")

    gateway = None
    try:
        gateway = create_gateway(channel, session)
        await gateway.update_product(listing.external_id, product)
        listing.sync_status = "SYNCED"
        listing.last_synced_at = now()
        listing.last_error = None
        await session.commit()
        return ApiResponse(data=ResyncResult(channel_type=channel_type, success=True, sync_status="SYNCED"))
    except AuthenticationError as exc:
        channel.is_active = False
        listing.sync_status = "FAILED"
        listing.last_error = f"인증 실패 (재연결 필요): {exc}"
        await session.commit()
        return ApiResponse(
            data=ResyncResult(
                channel_type=channel_type,
                success=False,
                sync_status="FAILED",
                error="인증이 만료됐습니다. 채널을 재연결해 주세요.",
            )
        )
    except ChannelResourceNotFoundError:
        listing.sync_status = "STALE"
        listing.last_error = "채널에서 상품을 찾을 수 없음 (404)"
        await session.commit()
        return ApiResponse(
            data=ResyncResult(
                channel_type=channel_type,
                success=False,
                sync_status="STALE",
                error="채널에서 해당 상품을 찾을 수 없습니다.",
            )
        )
    except Exception as exc:
        listing.sync_status = "FAILED"
        listing.last_error = str(exc)
        await session.commit()
        return ApiResponse(
            data=ResyncResult(channel_type=channel_type, success=False, sync_status="FAILED", error=str(exc))
        )
    finally:
        if gateway:
            with contextlib.suppress(Exception):
                await gateway.close()


# ===== 채널 상품 매칭 (검토 + 확정/거부) =====


class MatchCandidateInfo(BaseModel):
    product_id: uuid.UUID
    name: str
    sku: str
    price: float
    score: int


class PendingMatchItem(BaseModel):
    listing_id: uuid.UUID
    channel_type: str
    external_id: str
    external_url: str | None
    current_match: MatchCandidateInfo  # 자동 매칭으로 임시 묶인 마스터
    candidates: list[MatchCandidateInfo]  # 다른 후보들 (score 내림차순)


class MatchConfirmRequest(BaseModel):
    product_id: uuid.UUID  # 어느 마스터로 확정할지


@router.get("/match/pending", response_model=ApiResponse[list[PendingMatchItem]])
async def list_pending_matches(session: SessionDep, current_user: CurrentUserDep):
    """매칭 검토 대기 listing 목록 + 다른 후보 추천."""
    from src.services.matching_service import (
        CandidateProduct,
        MatchInput,
        rank_candidates,
    )

    # PENDING_MATCH listing들
    pending_q = (
        select(ChannelListing)
        .join(Product, ChannelListing.product_id == Product.id)
        .where(
            ChannelListing.match_status == "PENDING_MATCH",
            ChannelListing.deleted_at.is_(None),
            Product.user_id == current_user.id,
            Product.deleted_at.is_(None),
        )
    )
    pending_listings = list((await session.execute(pending_q)).scalars().all())

    if not pending_listings:
        return ApiResponse(data=[])

    # 사용자의 모든 product (후보 풀)
    all_products = list(
        (
            await session.execute(
                select(Product).where(
                    Product.user_id == current_user.id,
                    Product.deleted_at.is_(None),
                )
            )
        )
        .scalars()
        .all()
    )
    product_pool = [
        CandidateProduct(product_id=str(p.id), name=p.name, sku=p.sku, price=float(p.price)) for p in all_products
    ]
    product_by_id = {str(p.id): p for p in all_products}

    items: list[PendingMatchItem] = []
    for listing in pending_listings:
        current_p = product_by_id.get(str(listing.product_id))
        if current_p is None:
            continue
        # listing의 비교 기준은 listing이 가리키는 product의 이름·가격을 그대로 쓰지 않고,
        # raw_payload(없을 수 있음) 또는 product 정보를 사용. raw 없으면 product 정보로.
        # cafe24 raw에 product_name/price 있는 경우 우선
        raw = listing.raw_payload or {}
        item_name = raw.get("product_name") or current_p.name
        item_sku = raw.get("product_code") or current_p.sku
        item_price = raw.get("price") or float(current_p.price)
        try:
            item_price_dec = float(item_price)
        except (TypeError, ValueError):
            item_price_dec = float(current_p.price)

        # 자기 자신(현재 가리키는 product) 제외하고 다른 후보 추천
        other_pool = [c for c in product_pool if c.product_id != str(current_p.id)]
        ranked = rank_candidates(
            MatchInput(name=item_name, sku=item_sku, price=item_price_dec),
            other_pool,
            top_k=5,
        )
        items.append(
            PendingMatchItem(
                listing_id=listing.id,
                channel_type=listing.channel_type,
                external_id=listing.external_id,
                external_url=listing.external_url,
                current_match=MatchCandidateInfo(
                    product_id=current_p.id,
                    name=current_p.name,
                    sku=current_p.sku,
                    price=float(current_p.price),
                    score=listing.match_score or 0,
                ),
                candidates=[
                    MatchCandidateInfo(
                        product_id=uuid.UUID(c.product_id),
                        name=c.product_name,
                        sku=c.product_sku,
                        price=c.product_price,
                        score=c.score,
                    )
                    for c in ranked
                ],
            )
        )

    return ApiResponse(data=items)


@router.post("/match/{listing_id}/confirm", response_model=ApiResponse[dict])
async def confirm_match(
    listing_id: uuid.UUID,
    body: MatchConfirmRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """검토 대기 listing을 사용자가 선택한 마스터로 확정."""
    listing = await session.get(ChannelListing, listing_id)
    if not listing or listing.deleted_at is not None:
        raise HTTPException(status_code=404, detail="listing을 찾을 수 없습니다")

    # 권한 검증: 새 product가 사용자 소유여야 함
    target_product = await session.get(Product, body.product_id)
    if not target_product or target_product.user_id != current_user.id or target_product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="대상 상품을 찾을 수 없습니다")

    listing.product_id = body.product_id
    listing.match_status = "CONFIRMED"
    listing.match_score = 100
    await session.commit()
    return ApiResponse(data={"listing_id": str(listing.id), "product_id": str(body.product_id)})


@router.post("/match/{listing_id}/decline", response_model=ApiResponse[dict])
async def decline_match(
    listing_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """자동 매칭을 거부 — 새 마스터를 생성해 listing을 거기에 묶는다.

    새 마스터의 이름·가격은 raw_payload(있으면) 또는 현재 가리키던 마스터에서 복사.
    """
    listing = await session.get(ChannelListing, listing_id)
    if not listing or listing.deleted_at is not None:
        raise HTTPException(status_code=404, detail="listing을 찾을 수 없습니다")

    current_p = await session.get(Product, listing.product_id)
    if not current_p or current_p.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="현재 마스터 상품을 찾을 수 없습니다")

    raw = listing.raw_payload or {}
    name = (raw.get("product_name") or current_p.name)[:500]
    sku_base = raw.get("product_code") or current_p.sku
    # SKU 충돌 회피 — 채널 코드 prefix 추가
    new_sku = f"{listing.channel_type}-{sku_base}"[:100]
    try:
        price = float(raw.get("price") or current_p.price)
    except (TypeError, ValueError):
        price = float(current_p.price)

    new_product = Product(
        user_id=current_user.id,
        sku=new_sku,
        name=name,
        price=price,
        status=current_p.status,
    )
    session.add(new_product)
    await session.flush()

    listing.product_id = new_product.id
    listing.match_status = "CONFIRMED"
    listing.match_score = 100
    await session.commit()
    return ApiResponse(data={"listing_id": str(listing.id), "new_product_id": str(new_product.id)})
