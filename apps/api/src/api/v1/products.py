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
