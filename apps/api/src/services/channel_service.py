"""채널 유스케이스 서비스."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.db.models.channel import Channel, ChannelType


class ChannelService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_channel_types(self) -> list[ChannelType]:
        result = await self._session.execute(select(ChannelType).where(ChannelType.is_active.is_(True)))
        return list(result.scalars().all())

    async def connect_channel(
        self,
        *,
        user_id: uuid.UUID,
        channel_type: str,
        shop_name: str,
        credentials_encrypted: str,
    ) -> Channel:
        channel = Channel(
            user_id=user_id,
            channel_type=channel_type,
            shop_name=shop_name,
            credentials_encrypted=credentials_encrypted,
        )
        self._session.add(channel)
        await self._session.commit()
        await self._session.refresh(channel)
        return channel

    async def list_user_channels(self, user_id: uuid.UUID) -> list[Channel]:
        result = await self._session.execute(
            select(Channel).where(Channel.user_id == user_id, Channel.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def disconnect_channel(self, channel_id: uuid.UUID) -> bool:
        channel = await self._session.get(Channel, channel_id)
        if not channel:
            return False
        channel.is_active = False
        await self._session.commit()
        return True
