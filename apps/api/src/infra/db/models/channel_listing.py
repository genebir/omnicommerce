"""채널별 게시물 매핑 모델."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infra.db.base import BaseModel


class ChannelListing(BaseModel):
    __tablename__ = "channel_listings"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel_type: Mapped[str] = mapped_column(String(50), ForeignKey("channel_types.code"), nullable=False)
    external_id: Mapped[str] = mapped_column(String(200), nullable=False)
    external_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    sync_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 매칭 검토 상태:
    # - CONFIRMED: 확정 (SKU 일치 자동 매칭, 또는 사용자가 검토 후 확정)
    # - PENDING_MATCH: 자동 매칭 신뢰도가 임계값 사이라 사용자 검토 대기
    # - 그 외(default CONFIRMED): 기존 데이터/신규 등록(publish_to)은 의도적 묶음이므로 확정으로 간주
    match_status: Mapped[str] = mapped_column(String(20), nullable=False, default="CONFIRMED", index=True)
    # 자동 매칭 시 계산된 신뢰도 점수 (0~100). 사용자 확정 시에는 100.
    match_score: Mapped[int | None] = mapped_column(nullable=True)

    __table_args__ = (UniqueConstraint("product_id", "channel_type", "external_id", name="uq_listing_per_channel"),)
