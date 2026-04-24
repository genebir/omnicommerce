"""상품 가격/단가 변경 이력 — 되돌리기·감사용."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infra.db.base import BaseModel


class ProductPriceHistory(BaseModel):
    """가격/단가 변경 1건.

    - 일괄 작업이면 같은 batch_id로 그룹화 → 한 번에 되돌리기 가능
    - 되돌리기 자체도 새 history 행을 만들고, reverted_by_history_id로 원본을 가리킨다
    """

    __tablename__ = "product_price_history"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # "price" | "cost_price"
    field: Mapped[str] = mapped_column(String(20), nullable=False)

    old_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    new_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # 일괄 작업 그룹화 (같은 batch = 같은 일괄 호출)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    # 사용자가 어떤 모드/값으로 변경했는지 기록 (감사·재현용)
    # absolute | inc_amount | inc_percent | manual | revert
    change_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)

    change_value: Mapped[float | None] = mapped_column(Numeric(20, 4), nullable=True)

    # 채널 동기화 결과 (JSON 배열: [{channel_type, success, error?}, ...])
    channel_results: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # 되돌리기 추적
    reverted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reverted_by_history_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_price_history.id"), nullable=True
    )
