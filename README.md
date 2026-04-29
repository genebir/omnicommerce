# OmniCommerce

> 카페24 · 네이버 스마트스토어 · 쿠팡에 분산된 상품 · 재고 · 주문 · 가격을 단일 대시보드에서 안전하게 관리하는 셀러용 통합 플랫폼.

## 프로젝트 소개

OmniCommerce는 국내 대표 커머스 채널을 동시에 운영하는 1인 셀러를 위해 만든 통합 관리 도구입니다. 각 플랫폼 관리자 페이지를 따로 오가지 않고, 한 화면에서 등록 · 수정 · 동기화 · 분석을 처리하는 것을 목표로 합니다.

**설계 원칙**

- **단일 소스 오브 트루스(SSOT)** — 내부 DB가 기준, 외부 채널은 동기화 대상
- **양방향 동기화** — 내부 변경은 푸시, 외부 변경은 웹훅 · 폴링으로 풀인
- **장애 격리** — 한 채널 API가 죽어도 다른 채널과 대시보드는 정상 동작
- **안전한 일괄 편집 우선** — 미리보기 / 채널별 결과 / 부분 실패 재시도 / 원클릭 되돌리기

가장 자주 쓰이는 작업 흐름:

1. **가격 일괄 수정** — 한 상품을 3채널 동일 가격으로
2. **할인율 적용** — 시즌 · 프로모션 시 일괄 할인
3. **단가(공급가) 수정** — 마진 계산용
4. **재고 동기화 / 주문 확인 / 신상품 등록**

## 주요 기능

(현재 v0.1+ 구현 상태, 자세한 진행 사항은 [CLAUDE.md §16](./CLAUDE.md#16-구현-현황--todo))

- **상품 / 주문 / 재고 관리**: 백엔드 API + 프론트 DataTable + 검색 · 필터 · 일괄 작업
- **채널 연동**: 카페24(OAuth + 웹훅), 네이버 커머스(전자서명), 쿠팡(HMAC) — 모두 `ChannelGateway` 인터페이스로 추상화
- **양방향 동기화**: ARQ 비동기 작업 큐, cron 폴링, 인증 만료 자동 비활성화 · 토큰 갱신 DB 지속
- **가격 일괄 수정**: 절대값 / 금액 증감 / 퍼센트 / 상품별 모드 + 채널 선택 + 미리보기 + 1클릭 되돌리기
- **재고 일괄 조정** + 채널 동기화
- **주문 일괄 상태 변경** + 운송장 입력 + 배송 처리
- **대시보드**: 매출 추이 차트, 최근 활동, 재고 부족 · 동기화 이슈 실시간 알림
- **관리자 설정 UI** (`/admin/settings`): 검색 · 스코프 필터 · 변경 이력 · 1클릭 롤백
- **다크 / 라이트 + 한 / 영 i18n**, 모바일 반응형

## 기술 스택

| 계층 | 기술 |
|---|---|
| Backend | Python 3.14, FastAPI, async/await (uvloop) |
| DB | PostgreSQL 18 (asyncpg + SQLAlchemy 2.x async) |
| 마이그레이션 | Alembic |
| 작업 큐 | ARQ (async Redis queue) |
| Cache | Redis 7 |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| 상태 관리 | TanStack Query, Zustand, nuqs |
| 폼 | React Hook Form + Zod |
| i18n | next-intl |
| 패키지 매니저 | uv (Python), pnpm (Node) |
| 테스트 | pytest, Vitest, Playwright, Storybook |

## 빠른 시작

### 자동 부트스트랩 (권장)

`curl`과 `git`만 있으면 됩니다 — 나머지는 모두 자동 설치됩니다.

```bash
git clone git@github.com:genebir/omnicommerce.git && cd omnicommerce
./install.sh
./start.sh
```

**지원 OS**: macOS 12+ (Intel / Apple Silicon) · Ubuntu 20.04+ · Debian 11+ · RHEL 8+ · Fedora · Arch · Windows 10/11 (WSL2)

`install.sh`가 자동으로 처리하는 것:

- Docker · Docker Compose
- `uv` + Python 3.14
- `nvm` + Node 24 + pnpm 10
- PostgreSQL 클라이언트(`psql`)
- Python · Node 의존성 설치
- `.env` 파일 생성
- PostgreSQL + Redis 컨테이너 기동
- DB 유저 · DB 생성 + 마이그레이션 + 시드 데이터

스크립트는 멱등이므로 다시 돌려도 안전합니다. 설치 로그는 `.install.log`.

> **Mac 사용자 주의**: Docker Desktop은 GUI 앱이라 설치 후 *Applications → Docker*를 한 번 직접 실행해 데몬을 띄워야 합니다. 그 후 `./install.sh`를 다시 실행하면 DB 시드까지 마저 끝납니다.

설치 완료 후:

- API: <http://localhost:8000>
- Web: <http://localhost:3000>

### 수동 셋업

이미 Python 3.14 / Node 24 / Docker 등 의존성을 갖춘 머신에서:

```bash
git clone git@github.com:genebir/omnicommerce.git && cd omnicommerce
cp .env.example .env
docker compose up -d              # PostgreSQL + Redis
make setup                        # DB 유저/DB 생성 → 마이그레이션 → 시드
cd apps/web && pnpm install && cd ../..
./start.sh
```

## 개발 가이드

자주 쓰는 명령은 모두 `make` 또는 루트 스크립트로 정리되어 있습니다.

```bash
# 개발 서버
./start.sh                        # API + Web + (옵션)Worker 한 번에
make dev                          # API만 (uvicorn --reload, port 8000)
cd apps/web && pnpm dev           # Web만 (Next.js dev, port 3000)
make worker                       # ARQ 비동기 작업 워커

# 테스트
make test                         # 백엔드 전체
make test-cov                     # 커버리지 포함
cd apps/web && pnpm tsc --noEmit  # 프론트 타입 체크
cd apps/web && pnpm test:e2e      # Playwright E2E

# 마이그레이션
make migrate                      # alembic upgrade head
make migrate-gen msg="설명"        # 새 revision 자동 생성

# DB 관리
make db-reset                     # DB 초기화 후 재생성
make seed                         # 시드 데이터 삽입 (멱등)
make doctor                       # 환경 · 문서 정합성 검증

# 린팅 · 포맷
make lint                         # ruff check --fix + format
make typecheck                    # mypy
```

## 디렉터리 구조

```
omnicommerce/
├── apps/
│   ├── api/                     # FastAPI 백엔드 (Python 3.14)
│   │   ├── src/
│   │   │   ├── api/             # 라우터 (v1, webhooks)
│   │   │   ├── domain/          # 순수 도메인 모델
│   │   │   ├── infra/           # DB · 캐시 · 채널 어댑터
│   │   │   ├── services/        # 유스케이스
│   │   │   └── config/          # Configuration-as-Data (§9)
│   │   ├── tests/               # unit · integration · channels
│   │   └── alembic/             # 마이그레이션
│   └── web/                     # Next.js 16 프론트엔드
│       ├── app/                 # App Router (auth · app)
│       ├── components/          # primitives + patterns
│       ├── features/            # 도메인별 UI 번들
│       └── messages/            # ko.json · en.json
├── install.sh                   # zero-state 자동 셋업
├── start.sh / stop.sh           # 개발 서버 기동 / 정리
├── setup.py                     # DB 유저 · DB · 시드 (멱등)
├── docker-compose.yml           # PostgreSQL 18 + Redis 7
├── Makefile                     # 자주 쓰는 명령
├── CLAUDE.md                    # 작업 규칙 · 아키텍처 · 구현 현황
└── FRONTEND.md                  # 디자인 토큰 · 컴포넌트 · UX
```

## 문서

작업 전에 반드시 읽어야 할 두 문서:

- **[CLAUDE.md](./CLAUDE.md)** — 코딩 규칙, 도메인 · 아키텍처, 채널 연동(§5–§6), 설정 관리(§9), 보안, 테스트, 재현성(§15), 진행 현황(§16)
- **[FRONTEND.md](./FRONTEND.md)** — 디자인 토큰, 컴포넌트 사양, 반응형, 접근성, 행동 규칙

다른 머신에서 이어서 작업할 때는 [CLAUDE.md §16.3](./CLAUDE.md#163-다른-머신에서-이어서-작업하기-harness)을 참조하세요.
