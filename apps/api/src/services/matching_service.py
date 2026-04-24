"""채널 상품 매칭 — SKU/이름 유사도/가격 차이 종합 점수.

용도:
- 신규 채널 listing import 시 기존 마스터 Product에 자동 묶음 시도
- 신뢰도 낮은 케이스는 사용자 검토(PENDING_MATCH) 대기

핵심 결정:
- 자동 확정 임계값: AUTO_CONFIRM_THRESHOLD (default 80)
- 검토 대기 최저 점수: REVIEW_THRESHOLD (default 60)
- 그 이하 / 후보 없음: 신규 Product 생성

점수 계산 (0~100):
- SKU 정확 일치 → 100 (즉시 확정)
- 이름 유사도 (rapidfuzz token_set_ratio, 0~100)
- 가격 ±10% 이내 보너스 +5
- 가격 ±20% 이내 보너스 +2
- 가격 차이 50% 초과 페널티 -10
"""

from dataclasses import dataclass
from decimal import Decimal

from rapidfuzz import fuzz

AUTO_CONFIRM_THRESHOLD = 80
REVIEW_THRESHOLD = 60


@dataclass(frozen=True, slots=True)
class MatchCandidate:
    """매칭 후보 — 마스터 Product 1개 + 점수."""

    product_id: str
    product_name: str
    product_sku: str
    product_price: float
    score: int


@dataclass(frozen=True)
class MatchInput:
    """비교 대상이 되는 채널 상품의 핵심 필드."""

    name: str
    sku: str | None
    price: Decimal | float | None


@dataclass(frozen=True)
class CandidateProduct:
    """후보 마스터 Product의 핵심 필드."""

    product_id: str
    name: str
    sku: str
    price: Decimal | float


def name_similarity(a: str, b: str) -> int:
    """0~100 정수 유사도. 한글/영어/숫자 모두 잘 작동하는 token_set_ratio.

    공백·구두점 차이, 어순 차이를 흡수한다.
    """
    if not a or not b:
        return 0
    return int(fuzz.token_set_ratio(a, b))


def price_bonus(a: Decimal | float | None, b: Decimal | float | None) -> int:
    """가격 차이에 따른 보너스(+) 또는 페널티(-)."""
    if a is None or b is None:
        return 0
    af, bf = float(a), float(b)
    if af <= 0 or bf <= 0:
        return 0
    diff_ratio = abs(af - bf) / max(af, bf)
    if diff_ratio <= 0.10:
        return 5
    if diff_ratio <= 0.20:
        return 2
    if diff_ratio > 0.50:
        return -10
    return 0


def compute_match_score(item: MatchInput, candidate: CandidateProduct) -> int:
    """후보 1개에 대한 종합 점수 0~100."""
    if item.sku and candidate.sku and item.sku == candidate.sku:
        return 100  # SKU 일치는 즉시 확정
    base = name_similarity(item.name, candidate.name)
    bonus = price_bonus(item.price, candidate.price)
    return max(0, min(100, base + bonus))


def rank_candidates(
    item: MatchInput,
    candidates: list[CandidateProduct],
    *,
    top_k: int = 5,
    min_score: int = REVIEW_THRESHOLD,
) -> list[MatchCandidate]:
    """후보들을 점수 내림차순으로 정렬, 임계값 미만은 제외."""
    scored = [
        MatchCandidate(
            product_id=c.product_id,
            product_name=c.name,
            product_sku=c.sku,
            product_price=float(c.price),
            score=compute_match_score(item, c),
        )
        for c in candidates
    ]
    scored.sort(key=lambda x: x.score, reverse=True)
    return [s for s in scored if s.score >= min_score][:top_k]


def classify_match_status(top_score: int) -> str:
    """top 후보 점수에 따라 매칭 상태 결정.

    - 100: CONFIRMED (SKU 일치)
    - >= AUTO_CONFIRM_THRESHOLD: CONFIRMED (자동 확정)
    - >= REVIEW_THRESHOLD: PENDING_MATCH (검토 대기)
    - 그 외: NEW (신규 Product 생성 필요 — 호출자가 처리)
    """
    if top_score >= AUTO_CONFIRM_THRESHOLD:
        return "CONFIRMED"
    if top_score >= REVIEW_THRESHOLD:
        return "PENDING_MATCH"
    return "NEW"
