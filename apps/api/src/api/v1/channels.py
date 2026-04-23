"""채널 API 엔드포인트."""

import json
import uuid

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from src.api.v1.schemas import ApiResponse
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.channel import Channel, ChannelType
from src.infra.db.models.channel_listing import ChannelListing
from src.infra.db.models.order import Order
from src.utils.clock import now
from src.utils.crypto import encrypt

logger = structlog.stdlib.get_logger()

router = APIRouter(prefix="/channels")


class ChannelTypeResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


class ChannelResponse(BaseModel):
    id: uuid.UUID
    channel_type: str
    shop_name: str
    is_active: bool
    product_count: int = 0
    order_count: int = 0

    model_config = {"from_attributes": True}


class ChannelConnectRequest(BaseModel):
    channel_type: str = Field(max_length=50)
    shop_name: str = Field(max_length=200)
    credentials: dict


class ChannelDisconnectRequest(BaseModel):
    pass


@router.get("/types", response_model=ApiResponse[list[ChannelTypeResponse]])
async def list_channel_types(session: SessionDep):
    result = await session.execute(select(ChannelType).where(ChannelType.is_active.is_(True)))
    items = list(result.scalars().all())
    return ApiResponse(data=items)


@router.get("", response_model=ApiResponse[list[ChannelResponse]])
async def list_channels(session: SessionDep, current_user: CurrentUserDep):
    """사용자가 연결한 채널 목록 — 상품/주문 수를 단일 쿼리로 집계."""
    product_count_sq = (
        select(func.count())
        .select_from(ChannelListing)
        .where(
            ChannelListing.channel_type == Channel.channel_type,
            ChannelListing.deleted_at.is_(None),
        )
        .correlate(Channel)
        .scalar_subquery()
    )
    order_count_sq = (
        select(func.count())
        .select_from(Order)
        .where(
            Order.channel_type == Channel.channel_type,
            Order.user_id == current_user.id,
            Order.deleted_at.is_(None),
        )
        .correlate(Channel)
        .scalar_subquery()
    )
    rows = await session.execute(
        select(
            Channel,
            product_count_sq.label("product_count"),
            order_count_sq.label("order_count"),
        ).where(
            Channel.user_id == current_user.id,
            Channel.deleted_at.is_(None),
        )
    )
    return ApiResponse(
        data=[
            ChannelResponse(
                id=ch.id,
                channel_type=ch.channel_type,
                shop_name=ch.shop_name,
                is_active=ch.is_active,
                product_count=pc,
                order_count=oc,
            )
            for ch, pc, oc in rows.all()
        ]
    )


@router.post("", response_model=ApiResponse[ChannelResponse], status_code=201)
async def connect_channel(
    body: ChannelConnectRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """채널 연결 (인증 정보 저장)."""
    ct = await session.execute(
        select(ChannelType).where(ChannelType.code == body.channel_type, ChannelType.is_active.is_(True))
    )
    if not ct.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="지원하지 않는 채널 타입입니다")

    channel = Channel(
        user_id=current_user.id,
        channel_type=body.channel_type,
        shop_name=body.shop_name,
        credentials_encrypted=encrypt(json.dumps(body.credentials)),
        is_active=True,
    )
    session.add(channel)
    await session.commit()
    await session.refresh(channel)

    return ApiResponse(
        data=ChannelResponse(
            id=channel.id,
            channel_type=channel.channel_type,
            shop_name=channel.shop_name,
            is_active=channel.is_active,
        )
    )


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: int


@router.post("/{channel_id}/import-products", response_model=ApiResponse[ImportResult])
async def import_products(
    channel_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """채널에서 상품 목록을 가져와 내부 Product + ChannelListing으로 저장한다."""
    channel = await session.get(Channel, channel_id)
    if not channel or channel.user_id != current_user.id or channel.deleted_at is not None:
        raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다")

    from src.infra.channels.factory import create_gateway
    from src.infra.db.models.product import Product

    gateway = create_gateway(channel)
    imported = skipped = errors = 0

    try:
        cursor = None
        while True:
            page = await gateway.list_products(cursor=cursor)

            for item in page.items:
                existing = await session.execute(
                    select(ChannelListing).where(
                        ChannelListing.channel_type == channel.channel_type,
                        ChannelListing.external_id == item.external_id,
                    )
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

                try:
                    product = Product(
                        user_id=current_user.id,
                        sku=item.sku,
                        name=item.name,
                        price=float(item.price),
                        cost_price=float(item.cost_price) if getattr(item, "cost_price", None) else None,
                        description=item.description,
                        status=item.status,
                    )
                    session.add(product)
                    await session.flush()

                    listing = ChannelListing(
                        product_id=product.id,
                        channel_type=channel.channel_type,
                        external_id=item.external_id,
                        sync_status="SYNCED",
                        last_synced_at=now(),
                    )
                    session.add(listing)
                    imported += 1
                except Exception as exc:
                    await logger.awarning("상품 가져오기 실패", external_id=item.external_id, error=str(exc))
                    errors += 1

            await session.commit()

            if not page.next_cursor:
                break
            cursor = page.next_cursor

        await logger.ainfo(
            "채널 상품 가져오기 완료",
            channel_type=channel.channel_type,
            imported=imported,
            skipped=skipped,
            errors=errors,
        )
    finally:
        await gateway.close()

    return ApiResponse(data=ImportResult(imported=imported, skipped=skipped, errors=errors))


@router.delete("/{channel_id}", status_code=204)
async def disconnect_channel(
    channel_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """채널 연결 해제 (soft delete)."""
    channel = await session.get(Channel, channel_id)
    if not channel or channel.user_id != current_user.id or channel.deleted_at is not None:
        raise HTTPException(status_code=404, detail="채널을 찾을 수 없습니다")
    from src.utils.clock import now

    channel.deleted_at = now()
    channel.is_active = False
    await session.commit()
