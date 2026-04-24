"""상품 매칭 점수 알고리즘 단위 테스트."""

from decimal import Decimal

from src.services.matching_service import (
    AUTO_CONFIRM_THRESHOLD,
    REVIEW_THRESHOLD,
    CandidateProduct,
    MatchInput,
    classify_match_status,
    compute_match_score,
    name_similarity,
    price_bonus,
    rank_candidates,
)

# ---------- name_similarity ----------


def test_name_similarity_identical() -> None:
    assert name_similarity("클라우데어 침구세트", "클라우데어 침구세트") == 100


def test_name_similarity_word_order() -> None:
    """token_set_ratio는 어순 차이를 흡수한다."""
    score = name_similarity("화이트 무선 이어폰 프리미엄", "프리미엄 화이트 이어폰 무선")
    assert score >= 95


def test_name_similarity_partial_match() -> None:
    """공백/구두점이 다른 케이스."""
    score = name_similarity("플로리아 멀티 수납함 그레이", "플로리아 멀티수납함 (그레이)")
    assert score >= 80


def test_name_similarity_unrelated() -> None:
    score = name_similarity("USB-C 충전기", "면 침구세트")
    assert score < 30


def test_name_similarity_empty() -> None:
    assert name_similarity("", "anything") == 0
    assert name_similarity("anything", "") == 0


# ---------- price_bonus ----------


def test_price_bonus_within_10pct() -> None:
    assert price_bonus(Decimal("10000"), Decimal("9500")) == 5


def test_price_bonus_within_20pct() -> None:
    assert price_bonus(Decimal("10000"), Decimal("8500")) == 2


def test_price_bonus_neutral() -> None:
    """30% 차이 — 보너스도 페널티도 없음."""
    assert price_bonus(Decimal("10000"), Decimal("13000")) == 0


def test_price_bonus_penalty_over_50pct() -> None:
    # 비율 = (21000-10000)/21000 ≈ 0.524 → 50% 초과 페널티
    assert price_bonus(Decimal("10000"), Decimal("21000")) == -10


def test_price_bonus_none_safe() -> None:
    assert price_bonus(None, Decimal("100")) == 0
    assert price_bonus(Decimal("100"), 0) == 0


# ---------- compute_match_score ----------


def test_score_sku_exact_match_returns_100() -> None:
    item = MatchInput(name="완전 다른 이름", sku="SKU-001", price=Decimal("9999"))
    candidate = CandidateProduct(product_id="p1", name="진짜 이름", sku="SKU-001", price=Decimal("100"))
    assert compute_match_score(item, candidate) == 100


def test_score_uses_name_plus_price_bonus() -> None:
    item = MatchInput(name="플로리아 멀티 수납함 그레이", sku=None, price=Decimal("25000"))
    candidate = CandidateProduct(
        product_id="p1",
        name="플로리아 멀티수납함 (그레이)",
        sku="P00000BC",
        price=Decimal("24000"),
    )
    score = compute_match_score(item, candidate)
    # 이름 80+ 와 가격 10% 이내 보너스 5점 합쳐 85+ 기대
    assert score >= 85


def test_score_unrelated_low() -> None:
    item = MatchInput(name="USB-C 충전기", sku=None, price=Decimal("12000"))
    candidate = CandidateProduct(product_id="p1", name="라탄 욕실 바구니", sku="P00X", price=Decimal("25000"))
    score = compute_match_score(item, candidate)
    assert score < REVIEW_THRESHOLD


# ---------- rank_candidates ----------


def test_rank_filters_low_scores_and_orders_desc() -> None:
    item = MatchInput(name="플로리아 수납함 그레이", sku=None, price=Decimal("25000"))
    candidates = [
        CandidateProduct("p1", "완전 무관한 상품", "X", Decimal("9999")),
        CandidateProduct("p2", "플로리아 멀티 수납함 그레이", "Y", Decimal("25000")),
        CandidateProduct("p3", "플로리아 수납함", "Z", Decimal("23000")),
    ]
    ranked = rank_candidates(item, candidates, top_k=3, min_score=REVIEW_THRESHOLD)
    assert len(ranked) >= 2
    assert ranked[0].score >= ranked[-1].score
    # 무관한 상품은 제외돼야 함
    assert "p1" not in [r.product_id for r in ranked]


def test_rank_top_k_limits_count() -> None:
    item = MatchInput(name="플로리아 수납함", sku=None, price=Decimal("25000"))
    candidates = [CandidateProduct(f"p{i}", "플로리아 수납함", "X", Decimal("25000")) for i in range(10)]
    ranked = rank_candidates(item, candidates, top_k=3)
    assert len(ranked) == 3


# ---------- classify_match_status ----------


def test_classify_auto_confirm() -> None:
    assert classify_match_status(100) == "CONFIRMED"
    assert classify_match_status(AUTO_CONFIRM_THRESHOLD) == "CONFIRMED"


def test_classify_pending_review() -> None:
    assert classify_match_status(REVIEW_THRESHOLD) == "PENDING_MATCH"
    assert classify_match_status(AUTO_CONFIRM_THRESHOLD - 1) == "PENDING_MATCH"


def test_classify_new() -> None:
    assert classify_match_status(REVIEW_THRESHOLD - 1) == "NEW"
    assert classify_match_status(0) == "NEW"
