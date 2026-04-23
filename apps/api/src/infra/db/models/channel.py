"""채널(연결된 쇼핑몰 계정) 모델.

channel_type은 PG enum이 아닌 TEXT + CHECK constraint로 운용한다 (CLAUDE.md §6.5).
새 채널 추가 시 channel_types 룩업 테이블에 INSERT만 하면 된다.
"""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infra.db.base import BaseModel


class ChannelType(BaseModel):
    __tablename__ = "channel_types"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Channel(BaseModel):
    __tablename__ = "channels"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    channel_type: Mapped[str] = mapped_column(String(50), ForeignKey("channel_types.code"), nullable=False)
    shop_name: Mapped[str] = mapped_column(String(200), nullable=False)
    credentials_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    raw_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "channel_type", "shop_name", name="uq_channel_per_user"),)
