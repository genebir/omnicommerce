"""대시보드 헬퍼 단위 테스트."""

from datetime import datetime, timedelta, timezone

import pytest

from src.api.v1.dashboard import _months_ago_first_day

KST = timezone(timedelta(hours=9))


@pytest.mark.parametrize(
    "current, months, expected",
    [
        # 일반: 7개월이면 6개월 전 1일
        (datetime(2026, 4, 29, 18, 0, tzinfo=KST), 7, datetime(2025, 10, 1, tzinfo=KST)),
        # 연 경계: 1월에서 12개월 → 작년 2월 1일
        (datetime(2026, 1, 15, tzinfo=KST), 12, datetime(2025, 2, 1, tzinfo=KST)),
        # 1개월 = 이번 달 1일
        (datetime(2026, 3, 31, tzinfo=KST), 1, datetime(2026, 3, 1, tzinfo=KST)),
        # 24개월: 2년 전 동일 월 1일
        (datetime(2026, 12, 15, tzinfo=KST), 24, datetime(2025, 1, 1, tzinfo=KST)),
        # 31일 달이 많은 구간 (예: 7~12월) — 옛 구현은 (months-1)*30일 빼기로 한 달 어긋날 수 있었음
        (datetime(2026, 7, 1, tzinfo=KST), 6, datetime(2026, 2, 1, tzinfo=KST)),
    ],
)
def test_months_ago_first_day(current: datetime, months: int, expected: datetime) -> None:
    assert _months_ago_first_day(current, months) == expected
