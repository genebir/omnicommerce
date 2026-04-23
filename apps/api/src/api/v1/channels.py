"""채널 API 엔드포인트."""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from src.api.v1.schemas import ApiResponse
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.channel import Channel, ChannelType
from src.infra.db.models.channel_listing import ChannelListing
from src.infra.db.models.order import Order

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
    """사용자가 연결한 채널 목록."""
    result = await session.execute(
        select(Channel).where(
            Channel.user_id == current_user.id,
            Channel.deleted_at.is_(None),
        )
    )
    channels = list(result.scalars().all())

    response = []
    for ch in channels:
        product_count_result = await session.execute(
            select(func.count()).select_from(
                select(ChannelListing)
                .where(
                    ChannelListing.channel_type == ch.channel_type,
                    ChannelListing.deleted_at.is_(None),
                )
                .subquery()
            )
        )
        order_count_result = await session.execute(
            select(func.count()).select_from(
                select(Order)
                .where(
                    Order.channel_type == ch.channel_type,
                    Order.user_id == current_user.id,
                    Order.deleted_at.is_(None),
                )
                .subquery()
            )
        )
        response.append(
            ChannelResponse(
                id=ch.id,
                channel_type=ch.channel_type,
                shop_name=ch.shop_name,
                is_active=ch.is_active,
                product_count=product_count_result.scalar_one(),
                order_count=order_count_result.scalar_one(),
            )
        )
    return ApiResponse(data=response)


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

    import json

    channel = Channel(
        user_id=current_user.id,
        channel_type=body.channel_type,
        shop_name=body.shop_name,
        credentials_encrypted=json.dumps(body.credentials),
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
