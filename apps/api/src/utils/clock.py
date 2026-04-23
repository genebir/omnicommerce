"""시간 취득 유틸 — 테스트에서 모킹 가능하도록 래핑."""

from datetime import UTC, datetime


def now() -> datetime:
    return datetime.now(UTC)
