# CLAUDE.md

이 파일은 Claude Code가 이 리포지토리에서 작업할 때 참조하는 가이드입니다. 코드를 작성·수정·리뷰하기 전에 반드시 이 문서의 규칙과 아키텍처를 따르세요.

---

## 0. 최우선 규칙 (모든 작업 전 확인)

### 0.1 커뮤니케이션 언어

> **모든 사용자 대상 출력은 한국어로 작성합니다. 예외 없음.**

- **계획, 설명, 요약, 질문, 리뷰 코멘트, 진행 상황 보고, TODO, 에러 해석** 등 사람이 읽는 모든 텍스트는 **한국어**로 출력합니다.
- **Git 커밋 메시지, PR 제목·본문, 이슈 코멘트**도 한국어로 작성합니다. (예: `feat: 쿠팡 주문 동기화 작업자 추가`)
- **코드 주석(`#`, `//`)과 docstring**도 한국어를 기본으로 합니다. 단, 공개 라이브러리 API 문서는 영어 병기 가능.
- 다음은 원문 그대로 유지합니다 (번역 금지):
  - 코드·식별자·파일 경로·명령어·URL·환경 변수
  - 터미널 출력, 스택 트레이스, 컴파일러·린터 메시지
  - 외부 API 응답 JSON, 에러 코드 문자열
  - 영어로 확립된 기술 용어 (예: `async`, `migration`, `deadlock`) — 번역으로 의미가 흐려지면 원어 사용
- 긴 응답은 **요약을 맨 앞에 한국어로** 제시한 뒤 상세 내용을 이어서 작성합니다.
- 사용자가 특정 답변만 영어로 요청한 경우에 한해 해당 응답에서만 영어를 사용합니다. 이는 **일회성이며**, 다음 응답부터는 다시 한국어로 복귀합니다.

### 0.2 필수 참조 문서 (작업 전 선행 독서)

> **작업 유형에 해당하는 가이드 문서를 읽기 전에는 코드를 쓰지 않습니다.**

아래 표의 "해당 조건"에 하나라도 걸리면, **가장 먼저 지정 문서를 열어 전체를 읽고** 핵심 규칙을 작업 계획에 반영하세요. 문서를 읽었다는 사실을 사용자에게 보고할 때는 *"FRONTEND.md의 §3 컬러 토큰과 §13 행동 규칙을 적용했습니다"* 처럼 **참조한 섹션을 명시**합니다.

| 작업 유형 / 해당 조건 | 필수 선행 문서 |
|---|---|
| `apps/web/` 내부 파일 생성·수정 | **`FRONTEND.md`** |
| UI·스타일·컴포넌트·레이아웃·디자인 토큰 관련 작업 | **`FRONTEND.md`** |
| 새 페이지·라우트·모달·폼 추가 | **`FRONTEND.md`** |
| 접근성·반응형·상태 관리 결정 | **`FRONTEND.md`** |
| 백엔드·DB·아키텍처·채널 연동 전반 | **`CLAUDE.md`** (이 문서) |
| 신규 채널 어댑터 추가 | **`CLAUDE.md` §5 + §6** + 기존 `infra/channels/<채널>/` 코드 |
| 확장 포인트·플러그인·Capability 설계 관련 작업 | **`CLAUDE.md` §6** |
| 환경 설정·버전 고정·Dockerfile·CI·`make doctor` 관련 작업 | **`CLAUDE.md` §15** |
| 테스트 결정성·시드 데이터·스냅샷·시간·랜덤 관련 작업 | **`CLAUDE.md` §15.3** |
| 새 상수·설정값·임계값·기능 플래그 추가 | **`CLAUDE.md` §9** |
| DB/.env/하드코딩 중 어디에 둘지 판단해야 하는 작업 | **`CLAUDE.md` §9.1 · §9.8 · §9.11** |

**금지 사항:**

- ❌ `FRONTEND.md`를 읽지 않은 상태에서 `apps/web/` 하위에 새 파일을 만드는 것
- ❌ "일반적인 모범 사례"를 근거로 문서의 규칙을 무시하는 것 (예: 임의의 hex 색상 사용, 아이콘 단독 버튼 생성)
- ❌ 문서가 있는데 먼저 질문부터 하는 것 — **문서에 이미 답이 있는지 찾아보는 것이 먼저**

**충돌 시 우선순위:**

1. 사용자의 명시적 지시 (이번 대화)
2. `FRONTEND.md` (프론트엔드 영역에 한해 이 문서보다 우선)
3. `CLAUDE.md` 본문
4. 일반적인 업계 관행

### 0.3 문서 자체 관리 (Doc-as-Code)

> **이 `.md` 파일들은 "참고 자료"가 아니라 "실행 규격(spec)"이다. 코드처럼 관리한다.**

- **`CLAUDE.md`와 `FRONTEND.md`는 살아있는 문서다.** 스펙이 바뀌면 **같은 PR 안에서** 문서를 함께 고친다. "나중에 업데이트"는 없다.
- **규칙이 모호하거나 누락돼 있다고 느끼면, 질문하기 전에 먼저 문서를 수정하는 PR을 제안하라.** 주석이나 대화로 암묵적 결정을 흘리지 말고 문서에 박아라.
- **새 결정 사항은 문서에 기록한 뒤 코드에 반영한다.** 순서가 바뀌면 지식이 코드에만 남아 다음 세션에서 소실된다.
- **문서가 코드보다 권위 있다.** 문서와 구현이 어긋나면 먼저 "어느 쪽이 맞는지" 확정한 뒤 **지는 쪽을 고친다**. 임의로 한쪽을 따라가지 마라.
- 모든 PR 설명(description)에 다음 체크리스트를 포함한다:
  - [ ] 이 변경으로 `CLAUDE.md` 수정이 필요한가?
  - [ ] 이 변경으로 `FRONTEND.md` 수정이 필요한가?
  - [ ] 새 결정·관례가 문서화되었는가?
- **문서 편집 금지 영역은 없다.** 루트의 `.md` 파일은 누구나 고칠 수 있어야 한다. 단, 의미 변경은 반드시 PR 리뷰 필수.

---

## 1. 프로젝트 개요

**프로젝트명 (임시):** `omni-commerce` (멀티 커머스 통합 관리 플랫폼)

**목적:**
국내 대표 커머스 채널(카페24, 네이버 스마트스토어, 쿠팡)에 분산된 **상품 / 재고 / 주문 / 가격**을 단일 대시보드에서 관리할 수 있는 웹 서비스입니다. 셀러가 각 플랫폼 관리자 페이지를 따로 오가지 않고, 하나의 화면에서 등록·수정·동기화·분석을 수행하는 것을 목표로 합니다.

### 1.1 진짜 사용자와 실사용 시나리오 (모든 결정의 출발점)

> **이 프로젝트는 "1인 셀러 — 컴퓨터를 잘 모르는 사람"이 직접 매일 쓴다.**
> 모든 UX·기능 우선순위는 이 한 명의 사용자를 만족시키는가로 결정한다.

- **타깃 페르소나:** 카페24·네이버 스마트스토어·쿠팡 3채널을 동시에 운영 중인 1인 셀러. **개발자가 아니다.** 단축키·키보드 탐색·개발자 콘솔을 쓰지 않으며, "SKU·OAuth·API" 같은 영어 기술 용어에 약하다. 모바일에서도 주문을 확인한다.
- **가장 두려워하는 것:** "한 채널에만 잘못 적용되어 가격이 틀려진 상품" 같이 **되돌리기 힘든 실수**. 그래서 클릭이 망설여지고, 단계마다 미리보기/확인을 원한다.
- **가장 자주 하는 작업 (빈도 높은 순):**
  1. **가격 수정** — 한 상품을 3채널 동일 가격으로 맞추기
  2. **할인율 적용** — 시즌·프로모션 시 일괄 할인
  3. **단가(공급가) 수정** — 마진 계산용
  4. 재고 동기화 / 주문 확인 / 신상품 등록은 그 다음

이 4가지의 UI 흐름이 직관적이지 않으면 다른 모든 기능은 의미가 없다. **새 기능을 우선순위에 넣을 때 이 4가지에 가까운가를 먼저 묻는다.**

### 1.2 핵심 가치

- **단일 소스 오브 트루스 (SSOT):** 내부 DB가 항상 기준. 외부 플랫폼은 "동기화 대상"으로 취급한다.
- **양방향 동기화:** 내부 변경은 외부로 푸시, 외부 변경은 웹훅·폴링으로 풀인.
- **장애 격리:** 한 채널 API가 죽어도 다른 채널 및 대시보드는 정상 동작해야 한다.
- **초보자 우선 UX:** "5분 안에 첫 상품 등록"이 아니라 "**처음 본 사람이 안내 없이도 가격을 수정해서 3채널에 안전하게 반영할 수 있다**"가 합격선. 자세한 원칙은 `FRONTEND.md §1`.

### 1.3 비기능 요구 — "안전한 일괄 편집"이 1순위

새 기능을 설계할 때 다음 체크리스트를 통과해야 한다:

- [ ] **반영 전 미리보기**가 있는가? ("이 상품 N개에 이 값으로 적용됩니다" 표 형태)
- [ ] **채널별 결과**를 한 화면에서 보여주는가? (cafe24 OK / naver 실패 / coupang 미연결 등)
- [ ] **부분 실패 시 재시도**가 가능한가? (실패한 채널만 다시)
- [ ] **되돌리기**가 가능한가? (변경 전 값을 보여주고, 1클릭 원복)
- [ ] **사용자가 컴퓨터 비숙련이라는 가정 하에 카피가 작성됐는가?** (전문 용어 자동 풀이)

---

## 2. 기술 스택

| 계층 | 기술 | 비고 |
|---|---|---|
| Backend | Python 3.14, FastAPI | async/await 기본, `uvloop` + `uvicorn` |
| DB | PostgreSQL 18 | `asyncpg` + SQLAlchemy 2.x (async) |
| 마이그레이션 | Alembic | 모든 스키마 변경은 마이그레이션 필수 |
| Task Queue | ARQ (async Redis queue) | 채널 동기화, 대량 업로드 등 비동기 작업 |
| Cache | Redis | 세션, 레이트리밋, 채널 토큰 캐시 |
| Frontend | Next.js 15 (App Router), TypeScript | 상세는 `FRONTEND.md` 참고 |
| Auth | JWT (access + refresh) | HttpOnly 쿠키 기반 |
| 패키지 매니저 | `uv` (Python), `pnpm` (Next.js) | `pip` / `npm` 직접 사용 금지 |
| 테스트 | pytest, pytest-asyncio, httpx | 커버리지 80% 이상 유지 |
| 린팅 | ruff, mypy (strict), biome (FE) | pre-commit에서 강제 |

> Python 3.14를 사용하므로 `from __future__ import annotations` 불필요. PEP 695 제네릭 문법(`class Repo[T]:`), `Self` 타입, `match` 문을 적극 활용하세요.

---

## 3. 디렉터리 구조

```
omni-commerce/
├── apps/
│   ├── api/                  # FastAPI 백엔드
│   │   ├── src/
│   │   │   ├── api/          # FastAPI 라우터
│   │   │   │   ├── v1/       # health, auth, config, products, orders, inventory, channels
│   │   │   │   └── webhooks/ # 웹훅 수신기 (cafe24 구현 완료)
│   │   │   ├── config/       # Configuration-as-Data (§9) — schema.py, loader.py
│   │   │   ├── core/         # settings, security, deps, exceptions, logging
│   │   │   ├── domain/       # 도메인 모델 (순수 파이썬, 프레임워크 독립)
│   │   │   │   ├── product/
│   │   │   │   ├── order/
│   │   │   │   ├── inventory/
│   │   │   │   └── channel/
│   │   │   ├── infra/        # DB, 캐시, 외부 API 클라이언트 구현체
│   │   │   │   ├── auth/strategies/  # (미구현) 인증 전략
│   │   │   │   ├── channels/         # 채널 레지스트리 + 어댑터
│   │   │   │   │   ├── base.py       # ChannelGateway Protocol + ChannelCapabilities
│   │   │   │   │   ├── registry.py   # 자가 등록 레지스트리 (§6.2)
│   │   │   │   │   ├── cafe24/       # gateway, capabilities, mapping
│   │   │   │   │   ├── naver/
│   │   │   │   │   └── coupang/
│   │   │   │   ├── db/               # SQLAlchemy base, session, models (12 tables)
│   │   │   │   └── queue/            # ARQ 워커 + 태스크 (채널 동기화, 대량 업로드)
│   │   │   ├── services/     # 유스케이스 — auth, product, order, inventory, channel
│   │   │   ├── utils/        # clock.py (§15.4), id.py (UUIDv7)
│   │   │   └── main.py
│   │   ├── tests/
│   │   │   ├── unit/         # 도메인 엔티티 테스트 (18개)
│   │   │   ├── integration/  # health, auth 통합 테스트 (6개)
│   │   │   ├── contract/     # (미구현) 채널 계약 테스트
│   │   │   └── channels/     # 채널별 테스트 디렉터리 + fixtures
│   │   ├── alembic/          # 마이그레이션 (초기 스키마: 12 테이블)
│   │   └── pyproject.toml
│   └── web/                  # Next.js 16 프론트엔드 (상세: FRONTEND.md)
│       ├── app/              # App Router: (app)/ + (auth)/ 라우트 그룹
│       ├── components/       # primitives/ + patterns/ + layout/ (Shell, Sidebar, Topbar)
│       ├── features/         # 도메인별 UI 번들
│       ├── lib/              # api/, hooks/, utils/
│       ├── stores/           # Zustand
│       └── styles/           # globals.css (디자인 토큰)
├── packages/
│   └── shared-types/         # (미구현) OpenAPI → TS 타입 자동 생성 산출물
├── scripts/
│   ├── dump_ddl.sh           # 현재 DB 스키마 → schema.sql 추출
│   ├── schema.sql            # 추출된 DDL
│   └── seed_settings.py      # 설정 시드 (멱등)
├── setup.py                  # 원클릭 셋업 (--db-only, --migrate, --seed, --reset)
├── Makefile                  # make setup, dev, test, lint, migrate, db-reset, seed, doctor
├── docker-compose.yml        # PostgreSQL 18 + Redis 7
├── .env.example              # 부트스트랩 환경변수 템플릿 (§9.2)
├── .python-version           # 3.14.3
├── CLAUDE.md                 # (이 파일)
└── FRONTEND.md
```

**아키텍처 원칙 (클린 아키텍처 변형):**
`api/` → `services/` → `domain/` ← `infra/`
- `domain/`은 **절대** `infra/`, `api/`를 import하지 않는다.
- 외부 플랫폼(Cafe24/Naver/Coupang) 호출은 `infra/channels/`에서만. 상위 계층에는 `ChannelGateway` 인터페이스로 노출.

---

## 4. 도메인 모델 (핵심)

### Product (마스터 상품)
- 내부 ID가 기준. 플랫폼별 외부 ID는 `ChannelListing` 테이블로 매핑.
- 필드: `sku`, `name`, `description`, `price`, `options[]`, `images[]`, `category_path`, `status`.

### ChannelListing (채널별 게시물)
- `(product_id, channel_type, external_id)` 복합 유니크.
- `sync_status`: `SYNCED | PENDING | FAILED | STALE`.
- `last_synced_at`, `last_error` 필드 필수.

### Inventory
- 창고(`warehouse_id`) × SKU 단위로 관리.
- 채널별 할당 재고(`allocated`) vs 가용 재고(`available`) 분리.

### Order
- 채널에서 풀인된 주문. 내부 상태머신 유지.
- `PAID → PREPARING → SHIPPED → DELIVERED | CANCELED | REFUNDED`.

### Channel
- 사용자가 연결한 쇼핑몰 계정. 토큰은 `infra/`에서 암호화(AES-GCM) 저장.

> 도메인 객체는 Pydantic이 아닌 `@dataclass(frozen=True, slots=True)` 또는 일반 클래스로 작성하세요. Pydantic 모델은 API 입출력(DTO)에만 사용.

---

## 5. 채널 연동 규칙

**공통 인터페이스 (`infra/channels/base.py`):**
```python
class ChannelGateway(Protocol):
    async def list_products(self, *, cursor: str | None) -> ProductPage: ...
    async def upsert_product(self, product: Product) -> ExternalId: ...
    async def update_inventory(self, sku: str, qty: int) -> None: ...
    async def fetch_orders(self, since: datetime) -> list[Order]: ...
```

각 채널 구현 시 지켜야 할 것:

1. **인증 방식이 모두 다름** — 추상화하지 말고 명시적으로 구현하라.
   - Cafe24: OAuth 2.0 (mall_id별 access/refresh token).
   - 네이버 커머스 API: OAuth 2.0 Client Credentials (전자서명 기반).
   - 쿠팡 WING Open API: HMAC-SHA256 서명 헤더.
2. **레이트리밋 준수** — 모든 클라이언트는 `aiolimiter` 또는 토큰 버킷으로 보호.
3. **재시도 정책** — 5xx / 429만 지수 백오프 재시도. 4xx는 즉시 실패.
4. **토큰 만료** — 401 수신 시 자동 리프레시 후 1회 재시도.
5. **필드 매핑표** — `infra/channels/<channel>/mapping.py`에 내부 ↔ 외부 필드 변환을 집중. 라우터/서비스에 매핑 로직 절대 누출 금지.
6. **테스트** — 각 채널마다 `tests/channels/<channel>/` 에 실제 응답 샘플 기반 계약 테스트 필수. `respx`로 HTTP 모킹.

---

## 6. 확장성 & 새 플랫폼 추가하기

> **목표:** "새 채널 지원은 코어 코드 수정 없이, 새 폴더 하나 추가로 끝난다."
> 스마트스토어·쿠팡 외에도 **11번가, G마켓, 위메프, 티몬, Shopify, Amazon, eBay** 등이 언제든 추가될 수 있다고 가정하고 설계하라.

### 6.1 확장 포인트 (Plugin Seams)

시스템에서 "새 것이 추가될 가능성이 있는 지점"은 다음으로 한정된다. 이 밖의 지점에 확장 로직을 두면 즉시 반려.

| 확장 포인트 | 위치 | 추가 빈도 |
|---|---|---|
| **채널 어댑터** | `infra/channels/<name>/` | 높음 (핵심) |
| **인증 전략** | `infra/auth/strategies/` | 중 (OAuth2 / HMAC / API Key / JWT …) |
| **웹훅 수신기** | `api/webhooks/<name>/` | 중 |
| **주문 상태 매퍼** | `infra/channels/<name>/order_state.py` | 채널마다 1회 |
| **배송 수단 매퍼** | `infra/channels/<name>/shipping.py` | 채널마다 1회 |
| **카테고리 매퍼** | `infra/channels/<name>/category.py` | 채널마다 1회 |

### 6.2 Channel Registry 패턴

채널 구현체는 **레지스트리에 자가 등록**한다. 코어 코드가 채널을 `import` 하지 않아야 순환 의존 없이 플러그인처럼 동작한다.

```python
# infra/channels/registry.py
from typing import Protocol

_registry: dict[str, type["ChannelGateway"]] = {}

def register(code: str):
    def deco(cls):
        if code in _registry:
            raise RuntimeError(f"중복 채널 등록: {code}")
        _registry[code] = cls
        return cls
    return deco

def get(code: str) -> type["ChannelGateway"]:
    if code not in _registry:
        raise UnknownChannelError(code)
    return _registry[code]

def all_codes() -> list[str]:
    return sorted(_registry)
```

```python
# infra/channels/cafe24/gateway.py
@register("cafe24")
class Cafe24Gateway(ChannelGateway): ...
```

**부팅 시점**에 `infra/channels/__init__.py`가 하위 모듈을 `importlib`로 전부 로드 → 데코레이터가 자동 등록. 이후 서비스 계층은 `registry.get(channel.code)`만 쓴다.

### 6.3 Capability 선언 (필수)

모든 플랫폼이 모든 기능을 지원하지는 않는다. 코드 곳곳에 `if channel == "coupang"` 같은 분기를 심지 말고, **각 채널이 자신의 능력을 선언**하게 하라.

```python
# infra/channels/base.py
class ChannelCapabilities(BaseModel, frozen=True):
    supports_options: bool = True               # 옵션/SKU 조합 지원
    supports_scheduled_publish: bool = False    # 예약 출시 지원
    supports_bulk_inventory: bool = True        # 재고 일괄 갱신 API 존재
    supports_webhook: bool = False              # 웹훅 미지원 시 폴링 fallback
    supports_partial_update: bool = True        # PATCH 류 지원 여부
    max_images_per_product: int = 10
    max_option_combinations: int = 100
    order_fetch_min_interval_sec: int = 60      # 폴링 최소 간격
    category_schema: Literal["tree", "flat", "code"] = "tree"
```

서비스 계층 / 프론트엔드 모두 이 플래그를 읽어서 **버튼을 비활성화**하거나 **대체 경로**를 쓴다. 예: `supports_webhook=False`인 채널은 ARQ cron 스케줄러가 폴링으로 주문을 가져온다.

### 6.4 정규화 파이프라인 (3-Stage Pattern)

외부 응답을 도메인 객체로 변환할 때 **반드시** 다음 3단계를 거친다. 각 단계는 순수 함수로 단위 테스트 가능.

```
[1] Parse     (raw JSON → 채널 전용 DTO: Pydantic 모델)
     ↓
[2] Normalize (채널 DTO → 공통 중간 표현 NormalizedProduct)
     ↓
[3] Map       (중간 표현 → 도메인 객체 Product)
```

- **Parse 단계에서만** 외부 필드명을 다룬다.
- **Normalize 이후로는** 도메인 언어만 쓴다 — 채널 특유 필드가 상위에 새어 나가면 반려.
- 역방향(도메인 → 외부)도 대칭 구조로 구현.

### 6.5 새 플랫폼 추가 체크리스트

> 예: "11번가 연동 추가"를 가정. 이 체크리스트 외의 파일을 건드렸다면 설계 오류다.

**1. DB 스키마**
- [ ] `channel_type`은 PG enum이 아닌 **`TEXT + CHECK constraint`** 로 운용 (enum 추가마다 마이그레이션 발생 방지). 새 값 허용은 별도 `channel_types` 룩업 테이블에 insert.
- [ ] 필요 시 `channel_listings.raw_payload`로 대응되므로 신규 컬럼 추가는 **최후의 수단**.

**2. 백엔드 (`infra/channels/eleven_st/`)**
- [ ] `__init__.py` — 모듈 등록 트리거
- [ ] `gateway.py` — `ChannelGateway` 구현 + `@register("eleven_st")`
- [ ] `client.py` — HTTP 클라이언트 (레이트리밋, 재시도, 토큰 갱신)
- [ ] `auth.py` — 인증 전략 (기존 `infra/auth/strategies/`의 베이스 재사용)
- [ ] `mapping.py` — Parse/Normalize/Map 3단계 구현
- [ ] `order_state.py` — 외부 상태 코드 → 내부 상태머신 매핑표
- [ ] `capabilities.py` — `ChannelCapabilities` 인스턴스 export
- [ ] `README.md` — 이 채널 특유의 quirk·제약·알려진 버그 문서화

**3. 테스트 (`tests/channels/eleven_st/`)**
- [ ] `fixtures/` — 실제 응답 JSON 샘플 (PII 마스킹)
- [ ] `test_mapping.py` — 필드 매핑 단위 테스트
- [ ] `test_gateway_contract.py` — `ChannelGateway` 공통 계약 테스트 (파라미터화된 스위트 재사용)

**4. 프론트엔드 (`apps/web/`)**
- [ ] `FRONTEND.md` §6.3 채널 배지 테이블에 행 추가
- [ ] `features/channels/connect-wizard/`에 연결 스텝 추가 (API 키 발급 안내)
- [ ] `components/patterns/ChannelBadge.tsx`에 코드/색상 추가

**5. 문서·운영**
- [ ] `CLAUDE.md` §5 인증 방식 목록에 한 줄 추가
- [ ] `CHANGELOG.md` 기록
- [ ] `.env.example`에 필요한 환경 변수 추가

### 6.6 공통 계약 테스트 스위트

모든 채널 어댑터는 **동일한 계약 테스트**를 통과해야 한다. `tests/channels/_contract/suite.py`에 파라미터화된 테스트를 두고 각 채널에서 import:

```python
# tests/channels/eleven_st/test_contract.py
from tests.channels._contract.suite import run_gateway_contract

def test_contract(eleven_st_gateway):
    run_gateway_contract(eleven_st_gateway)
```

계약 테스트는 최소한 다음을 검증:
- 상품 목록 커서 페이지네이션 동작
- 재고 업데이트 후 조회 시 반영 확인
- 주문 수신 시 도메인 `Order` 객체로 정상 변환
- 401 → 토큰 리프레시 → 재시도 흐름
- 429 → 지수 백오프

### 6.7 안티 패턴 (절대 금지)

- ❌ `services/` 나 `api/`에서 `if channel.code == "cafe24": ...` 같은 분기
- ❌ 도메인 모델에 채널 고유 필드 노출 (`product.cafe24_mall_id` 금지 → `ChannelListing.external_ref`)
- ❌ 한 채널의 quirk를 다른 채널 코드에 조건문으로 섞는 것
- ❌ `infra/channels/`가 아닌 다른 경로에서 채널 전용 라이브러리 import
- ❌ 공통 모듈이 특정 채널을 이름으로 알고 있는 것
- ❌ 새 채널 추가를 위해 도메인·서비스·라우터를 수정하는 PR — 이런 PR은 **공통 추상화 부족 신호**이므로, 먼저 추상화를 바꾸는 리팩터링 PR을 분리해서 선행한다.

### 6.8 설정 기반 활성/비활성

각 채널은 환경 변수 `CHANNELS_ENABLED="cafe24,naver,coupang"`로 on/off. 구현체가 레지스트리에 등록돼 있어도, 설정에서 빠지면 부팅 시 서비스에서 제외. 이를 통해 **점진적 롤아웃**과 **장애 격리**(문제 있는 채널만 비활성)가 가능.

### 6.9 버전 관리

외부 API는 언제든 v2, v3로 바뀐다. 대응 전략:

- 디렉터리를 버전별로 나누지 말고, **어댑터 내부에서 `X-Api-Version` 분기**를 `client.py`에 은닉.
- breaking change는 `deprecated: true` Capability + 경고 로그로 먼저 신호.
- 필요 시 `infra/channels/cafe24/v2/`처럼 **임시 병행 운영** 허용 — 단, 6개월 내 통합.

---

## 7. API 규칙

- 모든 엔드포인트는 `/api/v1/...` 하위.
- 응답은 공통 래퍼:
  ```json
  { "data": ..., "meta": { "cursor": "...", "total": 123 } }
  ```
  에러는 RFC 7807(Problem Details) 형식으로 통일.
- 페이지네이션은 **커서 기반**만 허용 (offset 금지).
- 비동기 작업은 `202 Accepted` + `job_id` 반환, 상태는 `/api/v1/jobs/{id}`로 조회.
- 모든 mutation은 `Idempotency-Key` 헤더 지원.

---

## 8. 데이터베이스 규칙

- **마이그레이션 없는 스키마 변경 금지.** `alembic revision --autogenerate` → 사람이 검토 후 커밋.
- 모든 테이블은 `id`(UUIDv7), `created_at`, `updated_at`, `deleted_at`(soft delete) 보유.
- 외부 플랫폼에서 받은 원본 페이로드는 `raw_payload JSONB` 컬럼에 보존 (감사/디버깅용).
- 조회 성능이 필요한 JSONB 필드는 GIN 인덱스.
- 금액은 `NUMERIC(12,2)`, 절대 `FLOAT` 금지.

---

## 9. 설정 관리 (Configuration-as-Data)

> **원칙:** 운영 중 바뀔 수 있는 모든 값은 DB에 둔다. 코드·환경변수·하드코딩은 **불가피한 경우**의 마지막 수단이다.
>
> **근거:** 재배포 없이 운영이 대응해야 한다. 배포가 병목이 되는 순간 서비스가 진다.

### 9.1 3계층 분류 (어디에 저장하는가)

모든 값은 아래 셋 중 하나에 속한다. 애매하면 **DB**에 둔다.

| 계층 | 저장소 | 변경 방법 | 예시 |
|---|---|---|---|
| **부트스트랩** | `.env` / 시크릿 매니저 | 재배포 또는 시크릿 rotate | `DATABASE_URL`, `REDIS_URL`, `JWT_SIGNING_SECRET`, `PORT`, `ENV`, `SENTRY_DSN` |
| **런타임 설정** | **PostgreSQL `app_settings`** | 관리 UI·API (실시간 반영) | 레이트리밋 임계값, 폴링 주기, 재시도 횟수, 기능 플래그, 온보딩 카피, 이메일 템플릿 |
| **도메인 정책** | **PostgreSQL 도메인 테이블** | 관리 UI·마이그레이션 | 주문 상태머신 전이 규칙, 채널 Capabilities, 카테고리 매핑표, 배송비 정책 |

> **핵심 구분:** 부트스트랩은 "DB에 접속하기 전에 필요한 것"에 한정한다. 그 이후부터는 전부 DB다.

### 9.2 부트스트랩 허용 목록 (환경변수로 남길 수 있는 것)

아래 **목록에 있는 것만** 환경변수 허용. 나머지는 예외 없이 DB.

- 인프라 접속: `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `S3_ENDPOINT`
- 암호학적 시크릿: `JWT_SIGNING_SECRET`, `SESSION_SECRET`, `FERNET_KEY` (설정값 암호화용)
- 부팅 런타임: `PORT`, `HOST`, `WORKERS`, `LOG_LEVEL`, `ENV` (dev/stage/prod)
- 관찰성: `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`
- 최초 관리자 시드: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (첫 부팅에서만 사용)

**모든 환경변수는 `.env.example`에 이유·예시 값과 함께 기재.** 코드가 참조하는데 `.env.example`에 없으면 `make doctor`(§15.5) 실패.

### 9.3 `app_settings` 스키마

```python
class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str]              # 점-경로: "channel.cafe24.rate_limit"
    value: Mapped[dict]           # JSONB — 구조는 스키마 레지스트리(§9.5)가 보장
    value_type: Mapped[str]       # "int" | "string" | "bool" | "json" | "duration"
    scope: Mapped[str]            # "global" | f"tenant:{id}" | f"channel:{code}"
    description: Mapped[str]      # 관리자 UI에 노출되는 설명
    is_secret: Mapped[bool]       # true면 암호화 저장 + 평문 읽기 금지
    default_value: Mapped[dict]   # 복구·초기화용 기본값
    updated_at: Mapped[datetime]
    updated_by: Mapped[UUID]      # 감사 추적
    version: Mapped[int]          # optimistic locking

    __table_args__ = (UniqueConstraint("key", "scope"),)
```

변경 이력은 `app_settings_history`에 전부 기록 — 롤백·감사에 사용.

### 9.4 설정 접근 규칙 (코드 레벨)

**절대 규칙:**

- ❌ `os.environ.get("CAFE24_RATE_LIMIT")` — 허용 목록(§9.2) 외 환경변수 직접 참조 금지
- ❌ `MAX_RETRY = 3` 같은 모듈 레벨 상수 (변경 가능성 있는 값)
- ❌ 도메인 로직에서 `get_setting("...")`를 매번 호출 — 타입 없는 접근 금지
- ✅ `config: AppConfig`를 DI로 주입받아 `config.cafe24.rate_limit` 타입 안전 접근

### 9.5 스키마 레지스트리 (타입 안전 설정)

모든 설정 키는 **Pydantic 모델로 선언**하고, DB 값은 여기에 맞춰 검증된다. 스키마 없는 자유 key-value는 금지.

```python
# config/schema.py
class RateLimitConfig(BaseModel, frozen=True):
    requests_per_second: int = Field(ge=1, le=100, default=5)
    burst: int = Field(ge=1, default=10)

class Cafe24Config(BaseModel, frozen=True):
    rate_limit: RateLimitConfig = RateLimitConfig()
    polling_interval_sec: int = Field(ge=10, default=300)
    order_fetch_batch_size: int = Field(ge=1, le=500, default=100)

class FeatureFlags(BaseModel, frozen=True):
    bulk_upload_enabled: bool = False
    new_dashboard_v2: bool = False

class AppConfig(BaseModel, frozen=True):
    cafe24: Cafe24Config
    naver: NaverConfig
    coupang: CoupangConfig
    features: FeatureFlags
    # ...
```

부팅 시 DB 값을 읽어 `AppConfig`로 역직렬화. **스키마 위반 시 부팅 실패(fail-fast).**

### 9.6 캐싱 & 무효화

```
[App Instance] ─▶ in-memory cache (TTL 60s)
                       ▲
                       │ invalidate
                   Redis pub/sub  ◀──── 쓰기 API가 발행
                       │
                       ▼
                  PostgreSQL (SSOT)
```

- 읽기: in-memory 캐시 우선, miss 시 DB. TTL 기본 60초.
- 쓰기: DB commit → Redis `settings:invalidate` 채널로 키 브로드캐스트 → 모든 인스턴스 캐시 무효화.
- 크리티컬 설정(예: 결제 게이트웨이)은 TTL 없이 영구 캐시 + 무효화 이벤트에만 의존.
- Redis 장애 시 fallback: TTL을 짧게(10초) 폴링.

### 9.7 기본값 & 시드

- 신규 설정 키는 **Alembic 마이그레이션에서 `INSERT ... ON CONFLICT DO NOTHING`**. 코드의 Python 기본값에 의존 금지 (환경별 차이 나면 지옥).
- `scripts/seed_settings.py` — 환경별(local/stage/prod) 초기값. 멱등 실행.
- 기본값 변경은 새 마이그레이션 또는 UI 경유. **기존 값 덮어쓰기 금지** (운영 설정 유실).

### 9.8 하드코딩 허용 기준

다음을 **모두** 만족할 때만 하드코딩.

1. 의미상 변경 가능성이 **0에 수렴** (HTTP 상태 코드, 물리 상수, 프로토콜 표준값).
2. 언어·표준이 정한 불변 값.
3. 변경되면 **코드 구조 자체가 바뀌어야 할** 값 (dataclass 필드명 등).

**불확실하면 DB로.** "일단 하드코딩하고 나중에 빼자"는 영원히 안 빠진다.

### 9.9 안티 패턴 (하드코딩 금지 목록)

- ❌ `MAX_RETRY = 3`, `TIMEOUT_SEC = 30` — 모듈 상수 (→ `app_settings`)
- ❌ `if country == "KR": shipping_fee = 3000` — 비즈니스 룰 분기 (→ 정책 테이블)
- ❌ 주문 상태 전이를 `match` 문으로 하드코딩 (→ 전이 규칙 테이블)
- ❌ 에러 메시지·사용자 노출 문구를 코드에 문자열로 박기 (→ 메시지 카탈로그 테이블 또는 i18n)
- ❌ `if env == "production": do_x()` — 환경 분기 (→ 기능 플래그)
- ❌ `if channel == "cafe24": ...` — 채널 분기 (→ `Capability` + 레지스트리, §6.3)
- ❌ 이메일 템플릿 HTML을 Python 문자열에 직접 (→ 템플릿 테이블)
- ❌ 대시보드 위젯 배치, 페이지 사이즈, 기본 정렬 순서 (→ UI 설정)

### 9.10 관리 UI

- **`/admin/settings`** — 권한자가 웹 UI에서 조회·수정.
- JSON 스키마(§9.5 Pydantic) 기반 **자동 폼 생성** — 필드 추가 시 UI 수정 불필요.
- 모든 변경은 감사 이력 + 변경자 기록. **롤백 1클릭**.
- 프로덕션 크리티컬 설정(결제·레이트리밋·기능 플래그)은 **2단계 승인** 필수.
- 검색·필터·시크릿 마스킹(§9.3 `is_secret`).

### 9.11 Claude Code 작업 시 설정 체크리스트

새 값·상수를 코드에 추가하려 할 때 **반드시** 자문:

- [ ] 이 값이 **환경별로 달라질 수 있는가?** → DB (부트스트랩이면 `.env`)
- [ ] 이 값이 **장기적으로 바뀔 가능성이 있는가?** → DB
- [ ] **관리자·운영자가 조정하고 싶어할 것인가?** → DB
- [ ] **긴급 변경해야 할 상황이 상상되는가?** (장애, 정책 변경, AB 테스트) → DB
- [ ] §9.8 **하드코딩 허용 기준 3개를 모두** 충족하는가?

**단 하나라도 "예 → DB" 또는 "3개 충족 실패"면 하드코딩 금지.** 불명확하면 먼저 사용자에게 *"이 값은 `app_settings`로 빼는 게 맞을까요?"* 라고 물어라.

### 9.12 DB 저장 vs 하드코딩 판단 예시

| 값 | 결론 | 이유 |
|---|---|---|
| HTTP 200, 404 등 상태 코드 | 하드코딩 | 표준 불변 |
| `SECONDS_PER_DAY = 86400` | 하드코딩 | 물리 상수 |
| 주문 상태 전이 규칙 | DB (도메인 정책) | 비즈니스 룰 변경 가능 |
| 쿠팡 폴링 주기 | DB (런타임 설정) | 장애 시 조정 필요 |
| 상품 이미지 최대 개수 | DB (채널 Capability) | 채널별 다름 + 변경 가능 |
| 정규식 — 이메일 검증 | 라이브러리 위임 | 스스로 작성하지 말 것 |
| API 버전 경로 `/v1/` | 하드코딩 | 변경 시 코드 구조 자체가 바뀜 |
| 로그인 세션 만료 시간 | DB | 보안 정책 조정 필요 |
| 페이지네이션 기본 크기 | DB (UI 설정) | 튜닝 대상 |
| JWT 알고리즘 (`HS256`) | 하드코딩 | 변경 시 전체 시크릿 rotate 필요, 코드 변경 동반 |

---

## 10. 보안

- 외부 플랫폼 토큰은 `pgcrypto` 또는 앱 레벨 AES-GCM으로 암호화 저장. 평문 로깅 금지.
- 비밀값은 `.env` 파일로만 주입. 코드·커밋 하드코딩 시 pre-commit에서 차단(`detect-secrets`).
- API 인증: JWT access(15분) + refresh(14일), refresh는 rotation + reuse detection.
- 모든 뮤테이션 엔드포인트에 CSRF 토큰(프론트 쿠키 기반 세션 시).
- 입력 검증은 Pydantic v2 모델에서 수행. 라우터 핸들러에서 수동 검증 금지.

---

## 11. 로깅 & 관찰성

- `structlog` + JSON 출력. 모든 로그에 `request_id`, `user_id`, `channel` 컨텍스트 바인딩.
- 외부 API 호출은 `span` 생성 (OpenTelemetry). 요청/응답 시간, 상태 코드 기록.
- `/healthz` (liveness), `/readyz` (readiness, DB·Redis·채널 ping 포함) 엔드포인트 제공.

---

## 12. 테스트 정책

- `tests/unit/` — 도메인 로직 (외부 의존성 전부 모킹).
- `tests/integration/` — DB·Redis 연결한 서비스 계층.
- `tests/contract/` — 채널 API 응답 계약 (저장된 fixture 기준).
- 새 기능 추가 시:
  1. 도메인 유스케이스 테스트 먼저 작성 (TDD 권장).
  2. 커버리지 하락 PR은 CI에서 차단.

---

## 13. 자주 쓰는 명령어

```bash
# 초기 세팅 (원클릭: DB 유저/DB 생성 → 마이그레이션 → 시드 데이터)
python setup.py                   # 전체 셋업
python setup.py --reset           # DB 초기화 후 재생성
python setup.py --db-only         # DB/유저 생성만
python setup.py --migrate         # 마이그레이션만
python setup.py --seed            # 시드 데이터만
make setup                        # = python setup.py

# 개발 서버
make dev                          # uvicorn --reload (port 8000)
cd apps/api && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# ARQ 워커 (비동기 태스크 큐)
make worker
cd apps/api && uv run python -m arq src.infra.queue.worker.WorkerSettings

# 마이그레이션
cd apps/api && uv run alembic revision --autogenerate -m "설명"
cd apps/api && uv run alembic upgrade head
make migrate                      # = alembic upgrade head
make migrate-gen msg="설명"       # = alembic revision --autogenerate

# 테스트
make test                         # 전체 테스트
make test-cov                     # 커버리지 포함
cd apps/api && uv run pytest tests/ -v

# 린팅
make lint                         # ruff check --fix + format
make lint-check                   # CI용 체크만
make typecheck                    # mypy

# DB 관리
make db-reset                     # DB 초기화 후 재생성
make seed                         # 시드 데이터 삽입
make doctor                       # 환경 헬스체크

# DDL 추출
./scripts/dump_ddl.sh             # → scripts/schema.sql
```

---

## 14. Claude Code 작업 시 행동 규칙

1. **출력 언어는 한국어다.** 섹션 0의 규칙을 절대 잊지 마라. 영어가 섞여 나왔다면 스스로 감지해서 한국어로 정정한 뒤 제출하라.
2. **큰 변경 전에 계획을 먼저 출력하라.** 파일 생성 전 "수정할 파일 목록 + 이유"를 보여준 뒤 착수.
3. **기존 패턴을 먼저 찾아라.** 새 채널 추가 시 `infra/channels/cafe24/`를 먼저 읽고 구조를 복제하라.
4. **레이어 경계를 넘지 마라.** 라우터에서 `asyncpg`를 직접 부르거나, 도메인에서 `httpx`를 import하면 즉시 반려.
5. **"임시로"라는 이유로 `# type: ignore`, `Any`, `try/except Exception: pass`를 추가하지 마라.** 불가피하면 주석으로 근거를 남긴다.
6. **마이그레이션을 잊지 마라.** 모델 필드 추가/변경 시 반드시 Alembic revision을 함께 생성.
7. **테스트 없는 PR 금지.** 버그 수정은 회귀 테스트 필수.
8. **시크릿·토큰 값을 코드나 로그에 남기지 마라.**
9. **프론트엔드 작업은 반드시 `FRONTEND.md` 전체를 읽은 뒤 시작하라.** `apps/web/` 하위에 단 한 줄이라도 작성·수정하기 전에 먼저 문서를 열어라. 계획 단계에서 *"FRONTEND.md의 어떤 섹션을 적용할 것인지"* 를 사용자에게 명시적으로 보고한 뒤 착수하라. 디자인 토큰(§3), 컴포넌트 사양(§6), 행동 규칙(§13)을 무시한 코드는 즉시 반려 대상이다.
10. **문서를 코드와 함께 수정하라.** 구조·규칙·결정이 바뀌면 **같은 커밋 안에서** `CLAUDE.md` / `FRONTEND.md` / `.env.example`을 업데이트한다. "나중에 문서화"는 금지. §0.3 원칙을 지켜라.
11. **Golden Path를 따르라.** §15.4 표에 정답이 있으면 그걸 쓴다. 대안을 제안하고 싶으면, 먼저 표를 갱신하는 PR을 올려 합의를 받은 뒤 적용하라.
12. **재현성을 깨는 코드를 쓰지 마라.** `datetime.now()`, `uuid.uuid4()`, `random.random()`, 라이브 외부 API 호출을 테스트 대상 코드에 직접 박지 마라. §15.3·§15.4의 유틸(`utils.clock.now()` 등)을 경유한다. 새 코드·명령을 제안하기 전에 §15.7 체크리스트를 셀프 리뷰하라.
13. **값은 DB 먼저.** 새 상수·임계값·기능 플래그를 코드나 환경변수에 추가하기 전에 §9.11 체크리스트를 돌려라. §9.2 부트스트랩 허용 목록 밖의 값을 `.env`나 모듈 상수로 넣으면 반려. 애매하면 사용자에게 *"이 값은 `app_settings`로 빼는 게 맞을까요?"* 라고 먼저 질문하라.
14. **하드코딩 전에 §9.8 세 조건을 전부 통과했는지 확인하라.** 하나라도 걸리면 DB로. "임시로 상수 하나만" 이라는 이유는 거절당한다.

---

## 15. 재현성 & Harness Engineering

> **이 `.md` 파일들은 Claude Code의 "하네스(harness)"다. 하네스의 품질이 산출물의 품질·일관성을 결정한다.**
>
> **목표:** 어떤 개발자가, 어떤 머신에서, 어떤 Claude Code 세션으로 실행해도 이 문서를 따라 작업했을 때 **동일한 결과**가 나오도록 한다.

### 15.1 핵심 원칙

1. **단일 정답 경로 (Golden Path):** 같은 작업에 여러 방법이 있으면 **하나만** 문서화한다. "`uv add` 또는 `pip install` 중 택1"은 금지 — "`uv add`만 사용, `pip` 금지"로 확정.
2. **선언적 환경:** 실행 환경은 코드가 아니라 **설정 파일**로 고정한다. 로컬 머신 상태에 의존하지 않는다.
3. **결정적 실행 (Determinism):** 같은 입력 → 같은 출력. 랜덤·시각·네트워크가 결과를 흔들면 봉인한다.
4. **자가 검증:** 환경·문서·코드 정합성은 **자동화된 명령**으로 언제든 검증 가능해야 한다 (§15.5 `make doctor`).

### 15.2 환경 고정 (Environment Pinning)

**런타임 버전:**
- `.python-version` — `3.14.x` 정확한 패치 버전까지 고정
- `.nvmrc` — Node LTS 고정
- `.tool-versions` (asdf/mise 사용 시)
- `engines` 필드 — `package.json`에 Node·pnpm 버전 명시

**의존성 락파일 — 커밋 필수:**
- `uv.lock` (Python)
- `pnpm-lock.yaml` (Node)
- 락파일 없는 상태로 `uv add`, `pnpm add` 금지. 추가 시 락파일까지 **같은 커밋**에.

**실행 환경은 컨테이너 우선:**
- 모든 개발·테스트·CI 명령은 `docker-compose` 또는 devcontainer에서 동일하게 돌아가야 한다.
- `Dockerfile`에 **정확한 베이스 이미지 다이제스트(sha256) 고정** 권장 (`python:3.14-slim@sha256:...`).
- "내 맥에서는 되는데"는 버그 리포트로 취급.

**로케일·시간대:**
- `TZ=Asia/Seoul`, `LC_ALL=ko_KR.UTF-8`을 컨테이너 ENV와 테스트 세션에 강제.
- 날짜·시간 관련 테스트는 `freezegun`(Python) / `@sinonjs/fake-timers`(JS)로 고정.

### 15.3 결정성 (Determinism)

비결정성을 유발하는 요소를 **전수 차단**한다:

| 비결정 요소 | 대응 |
|---|---|
| 해시 순서 (파이썬 dict) | `PYTHONHASHSEED=0` 환경 변수 |
| 랜덤 값 | 테스트 시 `random.seed(42)` / `np.random.seed(42)` |
| UUID | 운영: UUIDv7(시간 기반). 테스트: 생성 함수 모킹으로 고정값 |
| 현재 시각 | `freezegun.freeze_time("2026-01-01T00:00:00+09:00")` |
| 외부 API | `respx`/`vcrpy`로 응답 fixture 고정 — 절대 라이브 호출 금지 |
| 파일 시스템 스캔 순서 | `sorted(os.listdir(...))` 명시 |
| 부동소수점 누적 | `Decimal` 사용 (금액은 이미 `NUMERIC` 강제) |
| 병렬 실행 순서 | 테스트에서 순서 의존 있으면 `pytest-randomly`로 검출·수정 |
| 로그 타임스탬프 | 스냅샷 비교 전 정규화 유틸 적용 |
| OpenAPI 스키마 직렬화 순서 | 키를 `sorted` 후 출력 |

**스냅샷 테스트:** 출력 포맷이 중요한 영역(OpenAPI, 마이그레이션, 생성 코드)은 `syrupy` 등으로 스냅샷을 박제. 차이가 나면 리뷰.

### 15.4 "Golden Path" 레지스트리

자주 헷갈리는 선택지는 여기에 **단일 정답**으로 박아둔다. 신규 결정 시 이 표를 갱신.

| 상황 | 정답 | 금지 |
|---|---|---|
| Python 패키지 추가 | `uv add <pkg>` | `pip install`, `poetry add` |
| Node 패키지 추가 | `pnpm add <pkg>` | `npm`, `yarn` |
| 테스트 실행 | `make test` | 로컬에서 `pytest` 직접 호출 |
| DB 마이그레이션 생성 | `uv run alembic revision --autogenerate` + 수동 검토 | 손으로 SQL 작성 |
| DB 초기화 | `make db-reset` | 수동 `DROP DATABASE` |
| 환경 변수 주입 | `.env` + `pydantic-settings` | `os.environ` 직접 참조 |
| HTTP 클라이언트 | `httpx.AsyncClient` | `requests`, `aiohttp` |
| 로깅 | `structlog.get_logger()` | `print`, `logging.getLogger` 직접 사용 |
| 시간 취득 | `utils.clock.now()` (모킹 가능) | `datetime.now()` 직접 호출 |
| ID 생성 | `utils.id.new_id()` | `uuid.uuid4()` 직접 호출 |
| 변경 가능한 설정값 저장 | `app_settings` 테이블 + `AppConfig` 주입 (§9) | 모듈 상수, `.env` 남용 |
| 환경 분기 | DB 기능 플래그(§9.5) | `if env == "prod"` |
| 채널별 분기 | `Capability`(§6.3) + 레지스트리 | `if channel == "cafe24"` |

### 15.5 자가 검증 명령 (`make doctor`)

문서·환경·코드의 정합성을 자동 검증. CI에서 실패 시 병합 차단.

```bash
make doctor   # 아래 전부 수행
```

검사 항목:
- [ ] `.python-version` ↔ 실제 파이썬 버전 일치
- [ ] `.nvmrc` ↔ Node 버전 일치
- [ ] `uv.lock`, `pnpm-lock.yaml` 최신 (재생성 시 diff 없음)
- [ ] `CLAUDE.md`에 등장하는 **파일 경로가 실제 존재**
- [ ] `FRONTEND.md` §3의 **컬러 토큰이 `globals.css`와 싱크**
- [ ] `FRONTEND.md` §10의 **폴더 구조와 실제 트리 일치**
- [ ] 등록된 모든 채널(`infra/channels/*`)이 `ChannelGateway` 계약 테스트 통과
- [ ] `.env.example`에 코드가 참조하는 **모든 환경 변수가 선언**
- [ ] 코드가 참조하는 환경변수가 **§9.2 부트스트랩 허용 목록 내**에만 있음 (초과 시 실패)
- [ ] `app_settings`의 모든 키가 **§9.5 스키마 레지스트리에 선언됨** (orphan 키 감지)
- [ ] 스키마에 있는 키가 DB에 **기본값 insert 되어 있음** (마이그레이션 누락 감지)
- [ ] OpenAPI 스펙 ↔ `packages/shared-types` TS 타입 최신

### 15.6 재현 가능한 시드 데이터

- `scripts/seed.py`는 **고정 시드(`SEED=42`)로 결정적 생성**. 같은 명령 → 같은 ID·같은 값.
- 테스트 DB는 매 테스트마다 **트랜잭션 롤백** 또는 **템플릿 DB 복제**. 테스트 간 상태 공유 금지.
- Playwright E2E는 전용 시드 로더 사용, 실제 외부 API 호출 없음.

### 15.7 Claude Code 작업 시 재현성 체크리스트

코드·명령을 제안하기 전에 스스로 다음을 확인:

- [ ] 제시한 명령이 **devcontainer/Docker에서도 똑같이 동작**하는가?
- [ ] 명령에 **절대 경로·사용자별 경로**가 섞여 있지 않은가? (`/Users/foo/...` 금지)
- [ ] 버전이 명시되지 않은 `latest` 태그·와일드카드 의존성을 추가하지 않았는가?
- [ ] 테스트에 **현재 시각·랜덤·외부 네트워크** 의존이 있으면 봉인했는가?
- [ ] 새 결정사항을 `CLAUDE.md` / `FRONTEND.md` / `.env.example`에 반영했는가?
- [ ] Golden Path 표(§15.4)에 영향을 주는 결정이면 표를 갱신했는가?

### 15.8 하네스 품질 지표

정기적으로 측정하고 회귀를 감지한다:

- **First-Run Success Rate** — 새로 클론한 저장소에서 `make setup && make dev`가 **한 번에** 성공하는 비율. 목표 ≥ 95%.
- **Doctor Pass Rate** — `make doctor`가 통과하는 커밋 비율. 목표 100%.
- **명세 모호도** — 같은 요구를 다른 세션·다른 Claude 인스턴스에 전달했을 때 산출물 차이. 큰 차이가 나는 영역은 문서가 모호하다는 신호 → 문서를 구체화.
- **문서-코드 동기화 지연** — 기능 머지 후 문서 업데이트까지 걸린 시간. 0일 목표.

### 15.9 안티 패턴

- ❌ "내 환경에서는 됨" — Docker·CI에서 재현되지 않으면 해결된 게 아니다.
- ❌ `~/.bashrc`, `~/.zshrc`에 프로젝트 설정을 넣어야 돌아가는 코드.
- ❌ README·CLAUDE.md에 *"~~ 할 수도 있다"*, *"보통은 ~~"* 같은 모호한 표현.
- ❌ "일단 머지하고 문서는 나중에" — 다음 세션에서 영원히 복구되지 않는다.
- ❌ 버전 범위(`^1.2.0`, `>=3`)로 느슨하게 묶인 의존성. 정확한 고정을 선호.
- ❌ 외부 네트워크가 있어야만 돌아가는 단위 테스트.

---

## 16. 구현 현황 & TODO

### 16.1 구현 완료 (v0.1)

- [x] **DB 스키마 12 테이블**: users, products, product_images, product_options, orders, order_items, inventories, channel_types, channels, channel_listings, app_settings, app_settings_history
- [x] **Alembic 마이그레이션** 자동 생성 + 적용 파이프라인
- [x] **도메인 엔티티** (순수 dataclass): Product, Order (상태머신), Inventory (할당/해제), Channel, ChannelListing
- [x] **서비스 계층**: auth, product, order, inventory, channel CRUD
- [x] **API 엔드포인트 21개**: healthz/readyz, auth(register/login/refresh), config(ui/full), products(CRUD), orders(목록/상세/상태변경), inventory(조회/갱신/할당/해제), channels(타입목록)
- [x] **JWT 인증**: access(15분) + refresh(14일), bcrypt 해싱
- [x] **Channel Registry 패턴** (§6.2): cafe24, naver, coupang 스켈레톤 등록
- [x] **Configuration-as-Data** (§9): app_settings + Pydantic 스키마 레지스트리 + DB 로더
- [x] **시드 데이터**: 채널 타입 3종 + 앱 설정 10개 (멱등)
- [x] **테스트 60개**: 단위 22 + 통합 17 + 채널 매핑 12 + 계약 테스트 9 (전체 통과)
- [x] **원클릭 셋업**: setup.py (DB 유저/DB 생성 → 마이그레이션 → 시드)
- [x] **인프라**: docker-compose.yml (PostgreSQL 18 + Redis 7), Makefile, .env.example
- [x] **Golden Path 유틸**: utils/clock.py, utils/id.py (§15.4)
- [x] **공통 응답 래퍼** (§7): `ApiResponse[T]`, `PaginatedResponse[T]` — 모든 엔드포인트 적용
- [x] **커서 기반 페이지네이션** (§7): products, orders에 `next_cursor` + `has_more` + `total`
- [x] **RFC 7807 에러 응답**: 모든 에러(HTTPException, 커스텀 예외, 유효성)를 Problem Details 형식으로 통일
- [x] **structlog 연동** (§11): JSON 출력 + request_id 자동 바인딩 미들웨어 + SQL 로그 억제
- [x] **pre-commit 훅**: ruff check + format, trailing-whitespace, detect-secrets
- [x] **ruff 린트 전체 통과**: B904(raise from), import 정렬, 코드 포맷 전부 클린
- [x] **채널 게이트웨이 실제 구현** (§5, §6.4): cafe24/naver/coupang — HTTP 클라이언트(레이트리밋, 재시도, 인증) + 3단계 매핑(Parse→Normalize→Map) + 단위 테스트 12개
- [x] **계약 테스트 스위트** (§6.6): `tests/channels/_contract/suite.py` — 상품 목록/페이지네이션/등록/재고/주문 공통 검증 + 채널별 401 재시도/429 백오프 테스트
- [x] **웹훅 수신기** (§6.1): `api/webhooks/cafe24` — HMAC 서명 검증 + 이벤트 디스패처 + 통합 테스트 5개
- [x] **Redis 캐싱 + pub/sub 무효화** (§9.6): `infra/cache/settings_cache.py` — in-memory TTL 캐시 + Redis pub/sub 리스너 + config 엔드포인트 캐시 경유
- [x] **ARQ 작업 큐**: `infra/queue/` — 채널 동기화/주문 수집/재고 갱신/대량 업로드 태스크 + cron 스케줄 + `/api/v1/jobs` 엔드포인트 (202 Accepted + 상태 조회)
- [x] **`uv` 패키지 매니저 전환**: `uv.lock` 생성, Makefile 전체 `uv run` 전환, pyproject.toml에 `redis[hiredis]`+`arq` 추가
- [x] **프론트엔드 초기화** (`apps/web/`): Next.js 16 + TypeScript + Tailwind CSS v4 + pnpm, `.nvmrc`(24.14.0) + `engines` + `.npmrc(engine-strict)` 환경 고정
- [x] **디자인 토큰** (FRONTEND.md §3): `globals.css`에 Navy 팔레트(50–950) + Accent 4색 + Semantic 다크/라이트 + Tailwind `@theme inline` 매핑
- [x] **Shell 레이아웃** (FRONTEND.md §5.1, §6.1): Sidebar(240px/64px 접힘, Primary Nav 6항목, 빠른 작업, 반응형) + Topbar(검색, 동기화 상태, 알림, 프로필) + 반응형 breakpoint(§9)
- [x] **라우트 구조**: `(app)/` — dashboard, products, orders, inventory, channels, settings + `(auth)/` — login, signup. 루트(`/`)는 `/dashboard`로 리다이렉트
- [x] **폰트 로딩** (FRONTEND.md §4): Pretendard Variable(CDN) + JetBrains Mono(`next/font/google`) + `lang="ko"` + `data-theme="dark"` 기본
- [x] **shadcn/ui 통합**: Button, Dialog 프리미티브 + Navy 팔레트 매핑 (`globals.css`에 shadcn 토큰 → 프로젝트 토큰 연동)
- [x] **TanStack Query + ConfigProvider** (FRONTEND.md §11, §13.7): `QueryProvider`, `ConfigProvider`, `useConfig()`, `useFeatureFlag()`, `useChannelCapability()` 훅
- [x] **CommandPalette** (FRONTEND.md §6.2): `⌘K` 단축키, 라우트 이동 + 동작 실행, 키보드 탐색(↑↓ Enter Esc), 섹션별 그룹핑
- [x] **ChannelBadge** (FRONTEND.md §6.3): 채널별 컬러 도트 + 약어 (C24/N/CP), 브랜드색 채도 낮춤
- [x] **SyncStatus** (FRONTEND.md §6.4): 4상태(synced/syncing/pending/failed) 아이콘 + 레이블, 툴팁
- [x] **다크/라이트 토글**: Zustand `useThemeStore` + Topbar 토글 버튼, `data-theme` 속성 전환
- [x] **포맷 유틸** (FRONTEND.md §13.6): `lib/utils/format/` — date, number, currency 래퍼 (로케일 `ko-KR`, 타임존 `Asia/Seoul` 고정)
- [x] **`next-intl` 메시지 카탈로그** (FRONTEND.md §13.6, §13.7): `messages/ko.json` + `messages/en.json`, 기본 로케일 `ko`, 모든 페이지 하드코딩 문자열 → `useTranslations()` 전환
- [x] **DataTable 패턴** (FRONTEND.md §6.5): `@tanstack/react-table` + `@tanstack/react-virtual` 가상 스크롤, 행 선택 + 플로팅 액션바, empty state, 상품 페이지에 적용
- [x] **온보딩 위저드** (FRONTEND.md §7): 3단계 환영 모달(채널 연결→자동 동기화→통합 관리), 체크리스트 위젯(6항목, 진행 바, 접기/펼치기), 대시보드 통합
- [x] **Storybook 초기화** (FRONTEND.md §13.3): `@storybook/nextjs-vite` + a11y/docs 애드온, `next-intl` 데코레이터, 공개 컴포넌트 스토리 6개(ChannelBadge, SyncStatus, DataTable, CommandPalette, OnboardingWizard, OnboardingChecklist)
- [x] **Playwright E2E** (FRONTEND.md §13.4): `@playwright/test` + 기본 네비게이션 테스트(사이드바 이동 6페이지, 커맨드 팔레트 열기/이동/닫기, 루트 리다이렉트), 시간 고정·애니메이션 비활성 헬퍼
- [x] **Toast/Snackbar** (FRONTEND.md §6.7): Sonner 기반 `<Toaster>`, 우측 하단 스택, 프로젝트 토큰 스타일링
- [x] **Input/Label 프리미티브**: `components/ui/input.tsx`, `label.tsx` — aria-invalid 연동, 디자인 토큰 적용
- [x] **React Hook Form + Zod** (FRONTEND.md §6.6): LoginForm/SignupForm — zodResolver(v3 compat), 실시간 검증, 에러 메시지 aria-describedby 연결
- [x] **상품 등록 폼** (`/products/new`): ProductForm — 기본 정보(이름, SKU, 가격, 재고) + 설명, Zod 검증
- [x] **채널 연결 페이지 개선**: ChannelCard 컴포넌트 — 연결 상태, 통계(상품/주문), 채널별 카드 UI
- [x] **주문 페이지 DataTable**: OrdersTable — 주문번호, 채널, 주문자, 결제금액, 상태, 동기화 컬럼
- [x] **재고 페이지 DataTable**: InventoryTable — SKU, 상품명, 창고, 가용, 할당, 합계 컬럼
- [x] **설정 페이지 구조화**: SettingsContent — 5섹션 사이드 네비게이션(일반/알림/보안/언어/외관), 일반 설정 + 알림 토글
- [x] **대시보드 개선**: StatCard 컴포넌트(아이콘, 트렌드 표시) + RecentActivity 위젯
- [x] **모바일 반응형** (FRONTEND.md §9): Sidebar 오버레이(모바일), Topbar 햄버거 메뉴, 적응형 패딩
- [x] **에러/404 페이지**: `app/not-found.tsx`, `app/error.tsx`, `app/(app)/loading.tsx` 스켈레톤
- [x] **인증 레이아웃 개선**: 브랜드 로고 + 중앙 정렬
- [x] **API 클라이언트** (`lib/api/client.ts`): fetch 래퍼, RFC 7807 에러 핸들링, ApiClientError 클래스
- [x] **TanStack Query 훅** (`lib/hooks/`): useProducts, useCreateProduct, useOrders — 백엔드 연동 준비
- [x] **Storybook 확장**: LoginForm, SignupForm, ChannelCard, StatCard 스토리 추가 (총 10개)
- [x] **프로필 드롭다운**: Topbar User 아이콘 → DropdownMenu(계정 설정, 외관, 도움말, 로그아웃)
- [x] **ProductForm → useCreateProduct 연동**: TanStack Query mutation 연결, 캐시 무효화
- [x] **Card/Tabs UI 프리미티브**: `components/ui/card.tsx`(Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter), `components/ui/tabs.tsx`(Tabs + render prop)
- [x] **주문 상세 페이지** (`/orders/[id]`): OrderDetail 컴포넌트 — 주문 정보, 주문자, 상품 목록 테이블, 상태 배지, Card 레이아웃
- [x] **상품 상세 페이지** (`/products/[id]`): ProductDetail 컴포넌트 — Tabs(상품 정보/채널 등록 현황/재고 정보), DropdownMenu(편집/삭제)
- [x] **채널 연결 위저드**: ConnectWizard — Dialog 3단계(인증 정보 입력 → 연결 확인 → 완료), 채널별 필드 분기, 진행 표시줄
- [x] **알림 패널**: NotificationPanel — DropdownMenu 기반, 읽음/안읽음 상태, 빈 상태, 모두 읽음 처리
- [x] **테이블 상세 링크**: ProductsTable 상품명 → `/products/[id]`, OrdersTable 주문번호 → `/orders/[id]`
- [x] **유닛 테스트 확장** (27개): date 포맷(formatDate, formatDateTime, formatRelative — vi.useFakeTimers), API 클라이언트(GET/POST/에러 핸들링)
- [x] **Storybook 추가 스토리** (총 16개): Card, Tabs, NotificationPanel, ConnectWizard(채널별 3개)
- [x] **검색 바 → CommandPalette 연동**: Topbar 검색 바 클릭 시 CustomEvent로 CommandPalette 열기
- [x] **상품 편집 페이지** (`/products/[id]/edit`): ProductForm 편집 모드(defaultValues + useUpdateProduct 훅)
- [x] **대시보드 목 데이터**: StatCard에 실제 값 + 트렌드 표시, RecentActivity에 5개 데모 활동 항목
- [x] **Breadcrumb 컴포넌트**: `components/ui/breadcrumb.tsx` — 상품 상세/편집, 주문 상세 페이지에 적용
- [x] **Topbar 알림 데이터**: NotificationPanel에 2개 목 알림(읽음/안읽음 상태)
- [x] **Shell → Zustand 전환**: useSidebarStore로 collapsed/mobileOpen 상태 통합
- [x] **TanStack Query 훅 확장**: useUpdateProduct, useDeleteProduct, useUpdateOrderStatus
- [x] **DropdownMenu 유닛 테스트 8개**: 열기/닫기/Escape, DropdownItem 클릭/destructive/아이콘, Separator, Label
- [x] **Storybook 스토리 확장** (총 17개 파일): Breadcrumb, OrderDetail, ProductDetail 추가
- [x] **E2E 테스트 추가** (`detail-pages.spec.ts`): 상품 상세/주문 상세/상품 편집/검색 바 → CommandPalette (7개 테스트 케이스)
- [x] **배럴 exports 정리**: features/products/index.ts, features/orders/index.ts, lib/hooks/index.ts 업데이트
- [x] **인증 플로우 실제 구현**: Zustand auth store(토큰 관리+localStorage 지속), API 클라이언트 인증 헤더 자동 주입 + 401 시 refresh token 갱신 재시도
- [x] **LoginForm/SignupForm API 연동**: 백엔드 /auth/login, /auth/register 실제 호출, 성공 시 토큰 저장 + 리다이렉트
- [x] **회원가입 이름 필드 추가**: Zod 스키마 + SignupForm UI + i18n 키 + 백엔드 연동
- [x] **AuthGuard 보호 컴포넌트**: (app) 라우트 그룹에 미인증 시 /login 리다이렉트, hydration 로딩 UI
- [x] **Topbar 로그아웃 + 프로필 표시**: auth store 연동, 사용자 이니셜 아바타, 이름/이메일 표시, 로그아웃 시 토큰 클리어 + 리다이렉트
- [x] **백엔드 `/auth/me` 엔드포인트 추가**: JWT 토큰으로 현재 사용자 정보 조회
- [x] **백엔드 `ProductCreate`에서 `user_id` 제거**: 인증된 사용자(CurrentUserDep)에서 자동 추출
- [x] **상품 CRUD 실제 API 연동**: ProductsTable, ProductDetail, ProductForm → 목 데이터 제거, 백엔드 API 데이터 사용
- [x] **주문 목록/상세 실제 API 연동**: OrdersTable, OrderDetail → 백엔드 PaginatedResponse 연동, 상태 배지 컬러링
- [x] **재고 목록 실제 API 연동**: InventoryTable → 백엔드 /inventory 목록 엔드포인트 추가 + 프론트 useInventory 훅
- [x] **온보딩 모달 최초 1회만 표시**: localStorage 기반 완료 상태 저장
- [x] **ARQ worker cron() 에러 수정**: kwargs 미지원 → 채널별 래퍼 코루틴 팩토리로 해결
- [x] **채널 타입 목록 실제 API 연동**: ChannelList → useChannelTypes 훅, 백엔드 /channels/types 데이터 사용
- [x] **대시보드 통계 실제 API 연동**: 백엔드 `/dashboard/stats` 엔드포인트 추가 + useDashboardStats 훅 + StatCard 연동
- [x] **매출 추이 차트** (SalesChart): Recharts AreaChart — 그라데이션 영역, 커스텀 Tooltip, 프로젝트 디자인 토큰 적용
- [x] **상품 삭제 확인 다이얼로그**: ConfirmDialog 범용 컴포넌트 + ProductDetail 연동, useDeleteProduct mutation
- [x] **ConfirmDialog 범용 컴포넌트**: Dialog 기반, destructive/loading 상태, 취소/확인 버튼
- [x] **주문 상태 변경 UI**: OrderDetail에 상태 전이 드롭다운 + ConfirmDialog 확인, VALID_TRANSITIONS 기반 가능 전이만 표시
- [x] **주문 상세 API 개선**: OrderDetailResponse에 buyer_phone, recipient_address, order_items(selectinload) 추가
- [x] **대시보드 매출 API**: `/dashboard/sales` 엔드포인트 — 월별 주문 수 + 매출 집계, SalesChart 실제 데이터 연동
- [x] **대시보드 통계 개선**: recent_orders(7일), low_stock_count(재고 < 10) 실제 DB 쿼리
- [x] **상품/주문 테이블 검색**: 백엔드 `q` 파라미터(ILIKE) + 프론트 `nuqs` URL 상태 연동
- [x] **`nuqs` 도입** (FRONTEND.md §11): URL 쿼리스트링 기반 검색어 상태 관리, NuqsAdapter 설정
- [x] **채널 연결/해제 백엔드 API**: `POST /channels` (연결) + `DELETE /channels/{id}` (해제) + `GET /channels` (연결된 채널 목록 + 상품/주문 통계)
- [x] **채널 연결 위저드 API 연동**: ConnectWizard → useConnectChannel 훅으로 실제 채널 생성 API 호출
- [x] **채널 목록 연결 상태 표시**: ChannelList가 useConnectedChannels로 연결 상태·통계를 실시간 반영
- [x] **대시보드 최근 활동 API**: `/dashboard/activity` 엔드포인트 — 주문·상품 변경 기반 활동 목록, RecentActivity 실제 데이터 연동
- [x] **설정 페이지 탭 네비게이션**: activeSection 상태 기반 섹션 전환 (일반/알림/보안/언어/외관)
- [x] **언어 전환 기능**: `next-intl` 쿠키 기반 로케일 결정 (`NEXT_LOCALE`), 설정 페이지에서 한국어/영어 전환
- [x] **테마 전환 설정**: 설정 > 외관 섹션에서 다크/라이트 테마 전환, Zustand useThemeStore 연동
- [x] **상품 상태 필터**: ProductsTable에 상태(활성/비활성) 드롭다운 필터 추가, nuqs URL 상태 연동
- [x] **상품 일괄 삭제**: 행 선택 + 플로팅 액션바 + ConfirmDialog, useDeleteProduct 다중 호출
- [x] **주문 상태 필터**: OrdersTable에 주문 상태(6종) 드롭다운 필터 추가, nuqs URL 상태 연동
- [x] **재고 조정 다이얼로그**: InventoryTable 행별 편집 버튼 + Dialog(수량 입력), useUpdateInventory mutation 연동
- [x] **재고 i18n 키 확장**: adjustStock, updateSuccess, updateError 한국어/영어 번역 추가
- [x] **주문 타임라인 시각화**: OrderDetail에 4단계 스텝 타임라인(결제→준비→배송→완료) + 취소/환불 분기 표시, 아이콘·색상·시각 정보
- [x] **커서 기반 페이지네이션 UI**: 상품/주문 목록 `useInfiniteQuery` 전환 + "더 보기" 버튼, 페이지별 데이터 누적 표시
- [x] **대시보드 차트 기간 선택**: SalesChart에 3/6/12개월 드롭다운, useSalesStats(months) 동적 연동
- [x] **주문 상태 배지 i18n**: OrdersTable 상태 컬럼에서 하드코딩 대신 next-intl 키 사용
- [x] **상품 상태 배지 i18n**: ProductsTable 상태 컬럼에서 "활성"/"비활성" → t("statusActive")/t("statusInactive")
- [x] **채널 해제 기능**: ChannelCard에 해제 버튼 + ChannelList에 ConfirmDialog 확인, useDisconnectChannel mutation 연동
- [x] **비밀번호 변경 폼**: 설정 > 보안 섹션에 현재/새/확인 비밀번호 입력 폼, i18n 키 추가
- [x] **대시보드 채널 요약**: ChannelSummary 컴포넌트 — 연결된 채널별 상품/주문 수 카드, 미연결 시 연결 안내
- [x] **비밀번호 변경 API**: `POST /auth/change-password` 백엔드 엔드포인트 + AuthService.change_password 메서드
- [x] **비밀번호 변경 프론트 연동**: 설정 보안 섹션 폼 → useChangePassword 훅, 검증(8자 이상, 확인 일치), API 호출
- [x] **상품 상세 이미지 갤러리**: ProductDetail에 이미지 탭 추가, 백엔드 `GET /products/{id}` → selectinload(images) + ProductDetailResponse
- [x] **상품 이미지 데이터 파이프라인**: ProductImage 인터페이스 + useProduct 훅에서 이미지 데이터 전달
- [x] **상품 이미지 CRUD API**: `POST /products/{id}/images` (URL 추가) + `DELETE /products/{id}/images/{imageId}` (삭제) 백엔드 엔드포인트
- [x] **상품 이미지 관리 UI**: ProductDetail 이미지 탭에 URL 입력으로 이미지 추가 + 호버 시 삭제 버튼, useAddProductImage/useDeleteProductImage 훅
- [x] **주문 목록 날짜 컬럼**: OrdersTable에 주문일시(orderedAt) 컬럼 추가, 백엔드 OrderResponse에 ordered_at 필드 추가
- [x] **관리자 설정 UI (`/admin/settings`)** (§9.10): `GET/PATCH/history/rollback` 엔드포인트 5개, AdminSettingsContent(검색/스코프 필터, 커서 페이지네이션, 타입별 컬러), SettingEditDialog(JSON 검증), SettingHistoryDrawer(타임라인+롤백), 시크릿 마스킹, i18n 37키
- [x] **Naver/Coupang 상태값 정규화**: 매핑 파이프라인에서 `"active"`/`"draft"` → `"ACTIVE"`/`"INACTIVE"` 대문자 통일, 관련 단위 테스트 갱신
- [x] **`with_loader_criteria` SQLAlchemy 버그 수정**: `selectinload(Product.channel_listings)` + `with_loader_criteria` 조합 시 channel_listings 항상 빈 배열 반환 문제 — `with_loader_criteria` 제거로 해결 (soft_delete가 product+listings 동시 처리하므로 안전)
- [x] **채널 삭제 연동 (`DELETE /products/{id}`)**: 응답을 `204 No Content` → `200 OK + ApiResponse[DeleteProductResult]`로 변경, `channel_types` 쿼리 파라미터로 삭제할 채널 선택 가능
- [x] **`ChannelDeleteResult` / `DeleteProductResult` 스키마**: `channel_type`, `success`, `error`, `requires_reconnect` 필드 — 채널별 삭제 결과를 프론트에 상세 전달
- [x] **AuthenticationError 자동 채널 비활성화**: 채널 CRUD 시 인증 만료(401) 발생 → 해당 채널 `is_active=False` 마킹 + `requires_reconnect: true` 응답 반환
- [x] **토큰 갱신 DB 지속 (Token Refresh Persistence)**: `Cafe24Client`에 `TokenRefreshCallback` 타입 + `set_token_refresh_callback()` 추가, 토큰 갱신 성공 후 DB에 즉시 저장 (재시작 시 만료 토큰 재사용 버그 수정)
- [x] **`create_gateway(channel, session)` 팩토리 개선**: `session` 파라미터 추가, Cafe24 게이트웨이에 자동으로 토큰 갱신 콜백 주입 (`infra/channels/factory.py`)
- [x] **상품 삭제 채널 선택 다이얼로그**: ProductDetail·ProductsTable 양쪽에서 채널별 체크박스로 어떤 채널에서 삭제할지 선택 후 확인, `requires_reconnect` 응답 시 "채널 페이지로" 액션 토스트 표시
- [x] **채널 상품 import 로직 개선**: 이미 등록된 상품을 재가져올 때 SKU 매칭 → 기존 상품에 `ChannelListing` 추가(external_url, last_synced_at 갱신), savepoint 내부에서 중복 체크로 트랜잭션 안전성 강화
- [x] **i18n 키 추가** (`ko.json`/`en.json`): `deleteChannelFailed`, `deleteAuthExpired`, `goToChannels` 3키 추가
- [x] **관리자 권한 게이트 (페이즈 8)**: `core/deps.py`에 `require_admin` + `AdminUserDep` 의존성 도입(403 on non-superuser). `/admin/settings/*` 5개 엔드포인트를 일반 셀러 차단, `/config/full`을 미인증 차단. `tests/integration/test_admin_auth.py` 5건 회귀
- [x] **일괄 단가 미리보기 버그 수정 (페이즈 9)**: `BulkPriceEditDialog`가 `field === "cost_price"` 모드에서 미리보기를 항상 `—`로 표시하던 회귀 — `SelectedProduct.cost_price` 누락 + `previews` 계산이 `p.price`만 base로 사용. `features/products/bulk-price-preview.ts`로 헬퍼 분리(`applyChange`/`computeBulkPricePreview`), null cost_price 안전 처리. `bulk-price-preview.test.ts` 9건
- [x] **i18n 폴리싱 — 영어 모드 라벨/aria-label 누락 정리 (페이즈 10)**: 카탈로그는 있는데 컴포넌트 연동 누락이던 13곳 — `CommandPalette` 8개 라벨/섹션/placeholder, `SyncStatus` 4상태 라벨, aria-label 5개(메뉴/닫기/selectAll/selectRow/delete/openChannelPage), `TrackingDialog` placeholder. `messages.test.ts`로 ko/en 카탈로그 동기성 자동 검증

### 16.1.1 자율 정리 사이클 (2026-04-29 ~ 2026-04-30 / 페이즈 1–10)

직전 세션이 머신 A·B 양쪽에서 동시에 진행돼 `main` 브랜치가 11(로컬)↔6(원격) 커밋으로 diverged된 상태에서 시작. 다음을 머지·검증·푸시 완료:

- [x] **페이즈 1 — 브랜치 통합**: 머신 A/B 동시 작업 머지. 실제 충돌은 `apps/api/src/api/v1/dashboard.py` 한 곳(import 단순 누락) — 자동 머지된 14개 파일은 lint/타입/테스트로 검증.
- [x] **페이즈 2 — 대시보드 user 스코핑 보안 패치**: `/dashboard/sales`·`/dashboard/activity`에 `Order.user_id`/`Product.user_id` 필터와 `CurrentUserDep` 누락 — 다른 사용자 매출/활동 노출 차단. `tests/integration/test_dashboard.py` 5건 (인증 401 + 사용자 간 격리).
- [x] **페이즈 3 — 사이드바 동기화 이슈 배지 + i18n 일관성**: `Sidebar`에 `/channels` 배지 추가(`useSyncIssues` 연동, 대시보드 카드와 일치). `SyncIssuePanel`의 상태 라벨/`재동기화`/`aria-label` i18n 키화. `StatCard`의 `자세히 보기 →` `common.viewMore` 키화. `nav.badgeSyncIssues`, `channels.syncStatus*` 키 추가.
- [x] **페이즈 4 — 일괄 수정 다이얼로그 단위·실패 카운트 i18n**: `BulkPriceEditDialog`/`BulkInventoryEditDialog`의 `원`·`%`·`개`·`라운드 단위`·`${ch} ${n}건` 하드코딩을 `unitWon`/`unitPercent`/`unitPiece`/`roundUnit`/`channelFailItem` 키로 분리. 영어 모드 폴리싱.
- [x] **페이즈 5 — 매출 차트 시작월 계산 버그 수정**: `(months-1)*30일` 빼기 방식이 31일 달 연속 구간에서 한 달 어긋날 수 있던 문제 — `_months_ago_first_day(year*12+month 정수 연산)` 헬퍼로 정확화. 5개 경계 케이스 단위 테스트 (`tests/unit/test_dashboard_helpers.py`).
- [x] **페이즈 6 — `inventory` 엔드포인트 인증/소유권 보안 패치**: `GET /{sku}`·`GET /product/{id}`·`PUT`·`POST /allocate`·`POST /deallocate` 5개 엔드포인트가 **모두 인증 없음**이었음 — 누구나 다른 사용자 재고 조회/수정/할당 가능. `_ensure_sku_owned`, `_ensure_product_owned` 헬퍼로 user 검증 일원화. `tests/integration/test_inventory_security.py` 2건.
- [x] **페이즈 7 — `jobs` 큐 API 인증 보안 패치**: `POST /jobs`(임의 task 큐잉)·`GET /jobs/{id}`(작업 정보 조회)에 `CurrentUserDep` 추가. `tests/integration/test_jobs_auth.py` 2건. 부수: 기존 에러 메시지 mojibake 수정. NB — 큐 task params 안의 user 식별자 검증은 워커 인프라가 다뤄야 하는 별개 작업, 이번 패치는 외부 노출 인증만 막는 1차 방어선.
- [x] **페이즈 8 — 관리자 권한 게이트 (특권 상승 차단)**: `/admin/settings/*` 5개 엔드포인트가 `CurrentUserDep`만 검사해 **일반 셀러도 `app_settings`(레이트리밋·기능 플래그·이메일 템플릿)를 조회·수정·롤백 가능**했음. 추가로 `GET /config/full`은 인증 자체가 없어 운영 설정이 미인증으로 노출. `core/deps.py`에 `require_admin` + `AdminUserDep`(403 on `is_superuser=False`) 도입, 관리자 엔드포인트 5개를 `AdminUserDep`로, `/config/full`은 `CurrentUserDep`로 보호. `/config/ui`는 로그인 페이지에서 필요하므로 공개 유지. `tests/integration/test_admin_auth.py` 5건 (미인증 401 / 일반 사용자 403 / 관리자 200 / `/config/full` 401·200 / `/config/ui` 공개). NB — 관리자 시드(`BOOTSTRAP_ADMIN_*`)와 프론트 admin 페이지의 403 UX 처리는 별도 페이즈로 분리.
- [x] **페이즈 9 — 일괄 단가(`cost_price`) 수정 미리보기 버그**: `BulkPriceEditDialog`가 `field === "cost_price"` 모드에서 미리보기 셀 두 칸을 항상 `—`로 표시 — `SelectedProduct` 인터페이스에 `cost_price`가 없었고, `previews` 계산도 `p.price`만 base로 사용. 사용자(컴퓨터 비숙련 1인 셀러)가 매일 수행하는 4가지 핵심 작업 중 3번째인 "단가 수정"의 안전장치가 사실상 작동하지 않던 회귀. `features/products/bulk-price-preview.ts`로 `applyChange` + `computeBulkPricePreview`를 순수 함수로 분리(테스트 가능 + null-safe), `BulkPriceEditDialog`/`ProductsTable`의 `cost_price` 필드 누락 보완, 미리보기 셀을 `oldValue`/`newValue` 일반화. 단위 테스트 9건 (`bulk-price-preview.test.ts`) — `applyChange`(absolute/inc_amount/inc_percent/clamp 4건) + `computeBulkPricePreview`(price 모드 2건 + cost_price 모드 3건, null cost_price 처리 + custom 입력 케이스).
- [x] **페이즈 10 — i18n 폴리싱 (영어 모드 라벨/aria-label 누락)**: 메시지 카탈로그(`ko.json`/`en.json`)에 `nav.*`, `sync.*`, `commandPalette.*` 키가 이미 있었지만 컴포넌트가 연동을 안 하고 한글 하드코딩만 박혀 있던 회귀. 영어 로케일에서 CommandPalette·SyncStatus 라벨/aria-label 13곳이 한글로 출력되고 있었음. 변경: ① `CommandPalette.tsx` — `useTranslations("nav")` + `useTranslations("commandPalette")`로 8개 라벨/2개 섹션/placeholder/title/noResults 연동, 검색 필터 `toLowerCase()`로 케이스 인센서티브화. ② `SyncStatus.tsx` — 모듈 상수에서 라벨 제거, `useTranslations("sync")`로 4개 상태 라벨 동적 변환. ③ a11y aria-label 5곳 — `Topbar` 햄버거(`common.menu` 신규), `SettingHistoryDrawer` 닫기(`common.close` 신규), `ProductsTable` selectAll/selectRow/delete(기존 `common` 키 재활용), `ProductDetail` 채널 페이지 열기(`products.openChannelPage` 신규). ④ `TrackingDialog` placeholder "직접 입력" → `orders.trackingCompanyDirect` 신규. 회귀 테스트 `messages.test.ts` 2건 — ko/en 카탈로그 키 트리 동일성 + 페이즈 10 핵심 키 27개 존재 보장(추가될 때 깨짐 즉시 잡힘). NB — Topbar 알림 패널 데모 데이터(임시 모킹)와 ConnectWizard cafe24 도움말 텍스트는 후속 페이즈로 분리.

**누적 효과**: 회귀 테스트 30건 신규 (백엔드 101건 + 프론트 unit 46건 = 총 147건 통과), 보안 패치 4건, 잠재 버그 2건, UX/i18n 정리 3건, 신규 페이지 1건(영어 모드 라벨/aria-label 13곳 정상화). `make doctor` 신규 회귀 없음.

### 16.2 미구현 (TODO)

#### 16.2.1 즉시 후보 (다음 자율 페이즈 우선순위)

다음 세션을 시작할 때 이 표를 참조해 같은 흐름을 이어갈 수 있다. 위에서 아래로 갈수록 가치가 작거나 시간이 더 든다.

| 우선 | 영역 | 작업 | 산출 위치 |
|---|---|---|---|
| 1 | 보안 audit (후속) | (a) 부트스트랩 관리자 시드 — `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD`가 설정되어 있으면 `setup.py`(또는 첫 부팅 hook)에서 `is_superuser=True` 사용자 생성. 현재는 admin 권한자가 없으면 `/admin/settings/*`에 아무도 접근 못 함. (b) 프론트엔드 `(app)/admin/settings` 페이지에 `is_superuser` 가드 추가 — 일반 사용자에게 메뉴 숨김 + 직접 접근 시 403 메시지. | `setup.py`, `apps/api/src/api/v1/auth.py`, `apps/web/app/(app)/admin/settings/`, `apps/web/lib/stores/auth-store.ts` |
| 2 | i18n 후속 | (a) `Topbar` 알림 패널 데모 모킹(`네이버 상품 12개 동기화` 등) — 곧 실제 알림 API로 교체 예정이라 미루지만, 그 전까지 영어 모드 데모 표시는 깨짐. (b) `ConnectWizard` cafe24 도움말 텍스트(긴 한 문단) → `channels.cafe24Help*` 키로 분리. (c) 동적 다이얼로그 시각 점검(`BulkPriceEditDialog` 일괄 단가 미리보기, 채널 위저드 단계별 흐름)은 시스템에 chromium 의존성(`libnspr4` 등) 설치 후 Playwright 워크스루 재실행. | `apps/web/components/layout/Topbar.tsx`, `apps/web/features/channels/ConnectWizard.tsx`, `apps/web/tests/ux/persona-walkthrough.mjs` |
| 3 | 개발자 경험 | (a) `Makefile:doctor`가 `python --version`을 호출하지만 일부 머신엔 `python` 심볼릭 링크가 없음(예: 우분투 표준) — `python3`로 변경하거나 `command -v` fallback. (b) `pnpm lint`가 `storybook-static`·`.next`까지 검사해 12000+ warning. `eslint.config.*`에 `ignores` 추가. | `Makefile`, `apps/web/eslint.config.*` |
| 4 | (장기) | 다중 창고(WMS), B2B(세금계산서), `packages/shared-types/` (OpenAPI → TS 자동 생성) — v2 범위. | — |

#### 16.2.2 v2 범위 (보류)

- [ ] 다중 창고(WMS) 연동은 v2 범위
- [ ] B2B(세금계산서) 발행은 별도 모듈로 분리 예정
- [ ] `packages/shared-types/` — OpenAPI → TS 타입 자동 생성

### 16.3 다른 머신에서 이어서 작업하기 (Harness)

이 프로젝트는 §15 원칙대로 **선언적·결정적 환경**을 지향한다. 새 머신에서 클론 후 다음 순서를 그대로 따라가면 된다.

#### 16.3.1 첫 셋업 (한 번만)

**권장 — `install.sh` 자동 부트스트랩** (curl/git만 있으면 됨, 나머지 전부 자동 설치):

```bash
git clone git@github.com:genebir/omnicommerce.git && cd omnicommerce
./install.sh
```

지원 OS: macOS 12+ / Ubuntu 20.04+ / Debian 11+ / RHEL 8+ / Fedora / Arch / WSL2.
스크립트가 Docker, uv + Python 3.14, nvm + Node 24, pnpm 10, psql 클라이언트를 검사·설치하고 `uv sync` + `pnpm install` + `.env` 생성 + `docker compose up -d` + `setup.py`(DB 유저/DB 생성 → 마이그레이션 → 시드)까지 일괄 수행. 멱등 — 다시 돌려도 안전. 로그는 `.install.log`.

설치 후 `./start.sh`로 API + Web 동시 기동, `./stop.sh`로 정리.

**수동 셋업** (이미 의존성을 갖춘 머신에서):

```bash
git clone git@github.com:genebir/omnicommerce.git && cd omnicommerce
cp .env.example .env                 # 부트스트랩 환경변수 (§9.2)
docker compose up -d                 # PostgreSQL 18 + Redis 7
make setup                           # = python setup.py (DB 유저/DB 생성 → 마이그레이션 → 시드)
cd apps/web && pnpm install && cd ../..
```

**환경 고정 파일** (다 따로 수정하지 말 것):
- `.python-version` → 3.14.x (uv가 자동으로 동일 버전 사용)
- `apps/web/.nvmrc` → 24.14.0 + `package.json:engines` + `.npmrc(engine-strict)`
- `uv.lock` / `apps/web/pnpm-lock.yaml` → 락파일 커밋 필수, 머신 간 동일 의존성 보장

#### 16.3.2 이어서 작업할 때 (매 세션 시작)

```bash
git fetch origin && git pull --ff-only origin main      # 새 머신 동기화
make doctor                                              # 환경/문서 정합성 검증 (§15.5)
make migrate                                             # alembic upgrade head — 누락 마이그레이션 적용
make test                                                # 백엔드 회귀 테스트 (96건 통과 기준)
cd apps/web && pnpm tsc --noEmit                         # 프론트 타입 체크
```

위 4개 명령이 모두 통과하지 않으면 **새 코드를 쓰기 전에 먼저 환경 문제를 잡는다**. 프로젝트 컨텍스트는 다음을 읽어 즉시 복원된다:

1. `CLAUDE.md` (이 문서) — 작업 규칙·아키텍처·구현 현황 (§16.1)
2. `FRONTEND.md` — 프론트엔드 디자인 토큰·컴포넌트·행동 규칙
3. `git log --oneline -20` — 최근 진행 흐름

#### 16.3.3 이전 세션과 동일한 자율 사이클 재개

다음 세션이 *"이어서 자율로 진행"*을 받으면 §16.2.1 표의 **우선순위 1**부터 같은 패턴(계획 → 구현 → `ruff/test/tsc` 검증 → 커밋 → 푸시)으로 진행하면 된다. 한 페이즈 완료 시점마다 §16.1.1 형식으로 본 문서에 한 줄 추가해 다음 세션에도 끊김 없이 흐름을 이어 줄 것.

**페이즈 분리 원칙** (직전 세션에서 검증된 합의):
- 한 페이즈 = 한 가지 종류의 변경 (보안 / UX / 버그 / i18n) — 섞지 말 것.
- 각 페이즈마다 회귀 테스트 1건 이상 추가, 백엔드 `pytest` + 프론트 `tsc` 통과 확인 후 커밋.
- 푸시 전 `make doctor` 한 번 더 — 다른 머신에서 즉시 이어가도 깨끗한 상태.
- 보안 패치는 별도 페이즈로 분리. 다른 변경(스타일·리팩터)과 묶지 말 것 — 검토와 롤백이 어렵다.

---

막히거나 요구사항이 모호하면, **추측해서 구현하지 말고 먼저 질문하라.** 특히 외부 API 스펙이 불명확할 때는 공식 문서 링크를 확인한 뒤 진행할 것.
