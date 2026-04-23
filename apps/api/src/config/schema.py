"""런타임 설정 스키마 레지스트리 (CLAUDE.md §9.5).

모든 설정 키를 Pydantic 모델로 선언한다.
DB에서 읽은 값은 이 스키마로 검증된다.
스키마 없는 자유 key-value는 금지.
"""

from pydantic import BaseModel, Field


class RateLimitConfig(BaseModel, frozen=True):
    requests_per_second: int = Field(ge=1, le=100, default=5)
    burst: int = Field(ge=1, default=10)


class Cafe24Config(BaseModel, frozen=True):
    rate_limit: RateLimitConfig = RateLimitConfig()
    polling_interval_sec: int = Field(ge=10, default=300)
    order_fetch_batch_size: int = Field(ge=1, le=500, default=100)


class NaverConfig(BaseModel, frozen=True):
    rate_limit: RateLimitConfig = RateLimitConfig(requests_per_second=10, burst=20)
    polling_interval_sec: int = Field(ge=10, default=180)
    order_fetch_batch_size: int = Field(ge=1, le=500, default=100)


class CoupangConfig(BaseModel, frozen=True):
    rate_limit: RateLimitConfig = RateLimitConfig(requests_per_second=8, burst=15)
    polling_interval_sec: int = Field(ge=10, default=60)
    order_fetch_batch_size: int = Field(ge=1, le=500, default=50)


class FeatureFlags(BaseModel, frozen=True):
    bulk_upload_enabled: bool = False
    new_dashboard_v2: bool = False


class UIConfig(BaseModel, frozen=True):
    page_size_default: int = Field(ge=1, le=200, default=20)
    toast_duration_ms: int = Field(ge=1000, le=30000, default=4000)
    polling_interval_ms: int = Field(ge=5000, le=300000, default=30000)
    default_sort_field: str = "created_at"
    default_sort_order: str = "desc"


class AppConfig(BaseModel, frozen=True):
    cafe24: Cafe24Config = Cafe24Config()
    naver: NaverConfig = NaverConfig()
    coupang: CoupangConfig = CoupangConfig()
    features: FeatureFlags = FeatureFlags()
    ui: UIConfig = UIConfig()
