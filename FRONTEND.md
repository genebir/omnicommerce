# FRONTEND.md

`apps/web/` (Next.js) 작업 시 참조하는 프론트엔드 설계 문서입니다. 디자인 언어, 컴포넌트 규칙, 접근성, 상태 관리 정책을 모두 이 문서에서 정의합니다. `CLAUDE.md`의 일반 규칙보다 **UI/UX에 관해서는 이 문서가 우선**합니다.

---

## 0. 최우선 규칙 (프론트엔드 작업 전 확인)

### 0.1 CLAUDE.md §0 전면 승계

이 문서는 `CLAUDE.md` §0 전체를 **그대로 승계**한다. 재정의하지 않고 인용:

- **§0.1 커뮤니케이션 언어** — 모든 사용자 대상 출력(계획·설명·커밋 메시지·코드 주석·docstring)은 **한국어**. 원문 유지 대상도 동일.
- **§0.2 필수 참조 문서** — `apps/web/` 하위 작업은 이 문서 전체를 먼저 읽은 뒤 시작. 계획 단계에서 적용할 섹션(예: *"§3 컬러 토큰과 §6.5 Data Table 패턴을 적용합니다"*)을 **한국어로 명시**하고 착수.
- **§0.3 문서 자체 관리 (Doc-as-Code)** — 디자인 시스템 결정·새 패턴·새 토큰은 **같은 PR 안에서** 이 문서에 반영. "나중에"는 금지.

### 0.2 프론트엔드 특화 우선 규칙

- **이 문서가 시각·상호작용의 최종 권위다.** Figma·스크린샷·개발자 직관보다 이 문서의 규칙이 우선. 문서와 구현이 어긋나면 지는 쪽을 고친다.
- **코드를 쓰기 전에 스캔할 최소 섹션:** §3(컬러 토큰) · §6(컴포넌트 사양) · §11(상태 관리) · §13(재현성) · §14(행동 규칙).
- **토큰·컴포넌트·상태 관리 규칙을 "우회하는" 코드는 반려.** 필요하면 문서를 먼저 수정하는 PR을 분리해서 올린다.
- **새 패턴 생성 전 기존 패턴 검색.** `components/primitives/`, `components/patterns/`, `features/`를 먼저 확인. 같은 목적의 컴포넌트가 있으면 **확장**, 없으면 **신규 생성**.

### 0.3 문서-구현 싱크 의무 (강제)

아래는 문서와 코드가 반드시 일치해야 하는 지점이다. 어긋나면 `make doctor`(CLAUDE.md §15.5)에서 빌드 실패로 감지.

| 문서 영역 | 동기화 대상 | 위반 시 |
|---|---|---|
| §3 컬러 토큰 | `styles/globals.css`의 CSS 변수 | CI 실패 |
| §3 시맨틱 토큰 | `tailwind.config`의 컬러 매핑 | CI 실패 |
| §4 타이포그래피 | 실제 로드된 폰트 + Tailwind font-family | 리뷰에서 반려 |
| §5.2 스페이싱 스케일 | Tailwind 기본값 커스터마이즈 | 리뷰에서 반려 |
| §6 컴포넌트 사양 | `components/primitives|patterns/` 실제 컴포넌트 | 리뷰에서 반려 |
| §10 폴더 구조 | `apps/web/` 실제 트리 | `make doctor` 실패 |
| §13.7 Golden Path "UI 상수" 행 | 컴포넌트에 박힌 상수 0건 (린트) | CI 실패 |
| CLAUDE.md §9.5 스키마의 UI 영역 | `GET /api/v1/config/ui` 응답 ↔ `useConfig()` 타입 | CI 실패 |

**임의의 hex 값, 임의 px, 임의 폰트 크기, 임의 UI 상수가 코드에 들어가면 즉시 반려.** 예외가 필요하면 §3 토큰 또는 `app_settings`에 먼저 등록.

---

## 1. 디자인 철학

**한 줄 정의:**
> "Arc Browser의 공간감을 유지하되, **컴퓨터를 처음 쓰는 셀러가 안내 없이도 가격 수정을 끝낼 수 있게** 명확한 레이블·상시 보이는 경로·되돌리기 가능한 액션을 둔다."

### 1.1 대전제 — 이 서비스를 매일 쓰는 사람 (`CLAUDE.md §1.1`과 직접 연결)

**실사용자는 1인 셀러, 컴퓨터 비숙련자.** 단축키·키보드 탐색·개발자 콘솔을 쓰지 않는다. 클릭만으로, 화면에 보이는 것만으로 작업을 끝낼 수 있어야 한다. 이걸 못 지키면 다른 토큰/패턴 규칙은 의미 없다.

**실사용자가 매일 하는 작업 (빈도 높은 순):**
1. **가격 수정** — 3채널 동일 가격 맞추기
2. **할인율 적용** — 프로모션
3. **단가(공급가) 수정** — 마진 계산
4. 재고·주문·신상품 등록은 그 다음

→ **이 4가지의 UI가 가장 쉬워야 한다.** 새 기능이 여기에 어긋나면 반려한다.

### 1.2 초보자 우선 UX 원칙 (모든 화면에서 지킴)

1. **반영 전 미리보기** — 파괴적 액션(일괄 편집·삭제·가격 변경)은 "이 값이 여기에 적용됩니다" 표로 먼저 보여주고 확인받는다. **조용히 실행 금지.**
2. **채널별 결과를 한 화면에** — "cafe24 성공 / naver 실패 / coupang 미연결"을 배지+아이콘으로 한눈에.
3. **부분 실패 재시도** — 3채널 중 1채널만 실패 시, 그 채널만 골라 재시도 가능.
4. **되돌리기 우선** — 변경 직후 5초 스낵바 `실행 취소`, 그 이후는 변경 이력에서 1클릭 원복.
5. **전문 용어 풀이** — SKU, 할인율, 공급가 등은 inline 설명 또는 툴팁. 아이콘 단독 버튼 금지.
6. **단계 번호 매김** — 복잡한 작업은 "1단계 → 2단계" 명시.
7. **에러는 항상 다음 행동을 제시** — "실패했습니다"로 끝내지 말고 "채널 페이지에서 재연결 후 다시 시도" 같은 액션 링크.
8. **합리적 default** — 체크박스는 대부분 "안전한 쪽"으로 미리 표시. 예: 가격 일괄 수정은 "모든 채널 반영"이 기본.
9. **모바일에서 주문 처리 가능** — 외출 중 스마트폰으로 확인 자주 함 (§9 반응형).

### 1.3 Arc에서 가져오는 것
- **사이드바 중심 내비게이션** — 상단 탭바를 쓰지 않고, 좌측 세로 사이드바에 스페이스(채널별 워크스페이스)·즐겨찾기·최근 항목을 배치.
- **커맨드 팔레트(`⌘K`)** — 키보드 쓰는 사용자용 **편의 기능**. 필수 경로는 아니다 (주 사용자는 마우스).
- **부드러운 전환** — 뷰 전환 시 `view-transition-api` 또는 `framer-motion`의 `layoutId` 활용.
- **컬러 액센트 위에 네이비 캔버스** — 채도 높은 액센트는 오직 "현재 선택/활성" 상태에만.
- **미니멀한 크롬** — 불필요한 보더·그림자를 제거하고, 계층은 **배경 톤 차이**로 표현.

### 1.4 Arc에서 **가져오지 않는** 것 (초보자 배려)
- ❌ 숨겨진 제스처 전용 기능 → 모든 핵심 액션은 클릭 가능한 UI로도 제공.
- ❌ 튜토리얼 없는 빈 화면 → 첫 진입 시 3단계 온보딩 + 샘플 데이터 옵션.
- ❌ 과격한 애니메이션 → 200ms 이내, `prefers-reduced-motion` 준수.
- ❌ 용어 생략 → 아이콘만으로 된 버튼 금지. 최소 툴팁 + 가능하면 레이블 병기.
- ❌ **"직관적이면 안내 불필요"는 거짓** — 대상 사용자가 컴퓨터 비숙련자임을 잊지 말 것. 안내 카피가 길어도 감수한다.

---

## 2. 기술 스택 & 규약

| 항목 | 선택 |
|---|---|
| Framework | Next.js 15 (App Router, RSC 기본) |
| 언어 | TypeScript strict |
| 스타일링 | Tailwind CSS v4 + CSS Variables (토큰) |
| 컴포넌트 | shadcn/ui 베이스 + 프로젝트 전용 커스텀 |
| 아이콘 | Lucide |
| 애니메이션 | Motion (구 Framer Motion) |
| 차트 | Recharts (대시보드), visx (세밀 조정 필요 시) |
| 상태 | TanStack Query (서버 상태) + Zustand (UI 상태) |
| 폼 | React Hook Form + Zod |
| 테스트 | Vitest + Playwright (E2E) |
| 타입 공유 | `packages/shared-types` (OpenAPI 자동 생성) |

**규약:**
- Server Component가 기본. `"use client"`는 상호작용이 실제로 필요한 지점에서만.
- 데이터 패칭은 서버 컴포넌트에서 `fetch` + `React.cache`. 클라이언트에선 TanStack Query.
- 모든 이미지: `next/image`. 외부 호스트는 `next.config.ts`에 등록.
- 모든 텍스트는 `next-intl`(ko 기본, en 예비)을 통과. 하드코딩 금지.

---

## 3. 컬러 토큰 (네이비 + 다크네이비)

라이트/다크 2개 테마를 모두 제공하되, **다크 모드가 기본값**입니다. 다크네이비 캔버스 위의 경험을 먼저 설계하고, 라이트는 파생합니다.

### 3.1 Primitive (원본 팔레트)

```css
/* Navy scale — 메인 브랜드 */
--navy-50:  #EEF2FB;
--navy-100: #D6DFF2;
--navy-200: #AEBEE4;
--navy-300: #7F93CE;
--navy-400: #4F6AB2;
--navy-500: #2E4A93;   /* Brand */
--navy-600: #203975;
--navy-700: #172B59;
--navy-800: #0F1E42;
--navy-900: #0A1530;   /* Dark canvas */
--navy-950: #060E22;   /* Deepest */

/* Accent — Arc 감성의 채도 높은 한 점 */
--accent-iris:    #8B7CF6;  /* 선택/활성 */
--accent-aurora:  #5EE3C7;  /* 성공·동기화 완료 */
--accent-amber:   #F5A524;  /* 경고·대기 */
--accent-coral:   #F25F5C;  /* 오류·실패 */

/* Neutral */
--ink-0:  #FFFFFF;
--ink-50: #F5F7FB;
--ink-900:#0B1020;
```

### 3.2 Semantic (다크 모드 기본)

```css
:root[data-theme="dark"] {
  --bg-canvas:      var(--navy-950);       /* 최외곽 배경 */
  --bg-surface:     var(--navy-900);       /* 카드·패널 */
  --bg-surface-2:   var(--navy-800);       /* 카드 위 카드, 호버 */
  --bg-sidebar:     color-mix(in oklab, var(--navy-950) 85%, #000);
  --bg-elevated:    var(--navy-700);       /* 모달·팝오버 */

  --border-subtle:  color-mix(in oklab, var(--navy-100) 8%, transparent);
  --border-strong:  color-mix(in oklab, var(--navy-100) 16%, transparent);

  --text-primary:   var(--ink-0);
  --text-secondary: color-mix(in oklab, var(--ink-0) 72%, transparent);
  --text-tertiary:  color-mix(in oklab, var(--ink-0) 48%, transparent);

  --ring-focus:     var(--accent-iris);
  --state-success:  var(--accent-aurora);
  --state-warn:     var(--accent-amber);
  --state-error:    var(--accent-coral);
}
```

### 3.3 사용 규칙
- 화면에 **한 번에 등장하는 채도 높은 색은 1개**. 여러 상태가 겹치면 가장 중요한 것만 컬러, 나머지는 중립.
- 텍스트 대비는 WCAG AA 이상. `--text-secondary` 이하는 본문에 사용 금지, 보조 정보 전용.
- 그라데이션은 사이드바 헤더, 히어로 카드 등 **최대 2~3개 지점**에만. `linear-gradient(135deg, var(--navy-800), var(--navy-950))`.

---

## 4. 타이포그래피

| 역할 | 폰트 | 사이즈 / 라인하이트 |
|---|---|---|
| UI 기본 | Pretendard Variable | 14 / 20 |
| 본문 | Pretendard Variable | 15 / 24 |
| 대제목 | Pretendard Variable 700 | 28 / 36 |
| 숫자/코드 | JetBrains Mono | 13 / 20 |

- 한글은 Pretendard, 영문 숫자는 tabular-nums 설정(`font-variant-numeric: tabular-nums`)으로 표 정렬.
- 제목은 트래킹 `-0.01em`, 본문은 기본.

---

## 5. 레이아웃 & 스페이싱

### 5.1 전역 쉘

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (고정 240px, 접으면 64px)                         │
│  ┌──────────┬───────────────────────────────────────────┐ │
│  │          │  Topbar (56px, 검색+⌘K, 동기화 상태, 프로필) │ │
│  │  Spaces  ├───────────────────────────────────────────┤ │
│  │  Nav     │                                           │ │
│  │  Pins    │         Main Canvas                       │ │
│  │          │         (max-w 1440, 좌우 패딩 32)         │ │
│  │  [+ New] │                                           │ │
│  └──────────┴───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **Spaces**: 연결된 채널별 워크스페이스 (Cafe24 / Naver / Coupang / All). 좌상단 상자에서 전환.
- **Sidebar 접힘**: 사용자의 첫 방문 후에도 기본값은 **펼침**. 초보자가 아이콘만으로 헤매지 않도록.
- **Topbar**의 검색창은 클릭 시 커맨드 팔레트로 확장.

### 5.2 스페이싱 스케일

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (Tailwind 기본에서 `5, 10, 14`만 제외하여 통일).

### 5.3 라운딩 & 그림자
- 카드: `rounded-2xl` (16px).
- 버튼: `rounded-xl` (12px).
- 입력: `rounded-lg` (10px).
- 그림자는 다크 모드에서 거의 쓰지 않는다. **배경 톤 차이**로 깊이를 표현. 꼭 필요하면 `0 8px 24px rgba(0,0,0,.35)` 수준의 아주 은은한 값.

---

## 6. 핵심 컴포넌트 사양

### 6.1 Sidebar
- 상단: 워크스페이스 스위처(드롭다운).
- 중단: Primary Nav — `대시보드`, `상품`, `주문`, `재고`, `정산`, `채널 연결`, `설정`. 아이콘 + 한글 레이블 병기 (아이콘 단독 금지).
- 하단: `빠른 작업` 섹션 — `+ 상품 등록`, `↻ 전체 동기화`. 프로필/알림은 최하단.
- 활성 항목은 `--accent-iris` 좌측 2px 인디케이터 + 배경 `--bg-surface-2`.

### 6.2 Command Palette (`⌘K`)
- Arc처럼 중앙 상단 절반 높이에 띄운다.
- 섹션: `이동`, `동작`, `최근`, `도움말`.
- 모든 라우트와 주요 액션(예: "상품 CSV 업로드", "쿠팡 재고 강제 동기화")이 여기에서 실행 가능해야 한다.
- 키보드 탐색 필수 (↑↓ Enter Esc). 포커스 트랩.

### 6.3 채널 배지
상품·주문 리스트에서 채널 식별을 위한 **컬러 도트 + 약어**:
- Cafe24 → `C24`, 민트 계열.
- Naver → `N`, 네이버 그린 톤이되 채도 낮춘 버전.
- Coupang → `CP`, 코랄 낮춤.

> 각 플랫폼 공식 브랜드 컬러의 **원색은 쓰지 않는다**. 우리 팔레트에 어울리도록 명도·채도를 20~30% 낮춰 일관성 유지.

### 6.4 동기화 상태 표시
- 상태 아이콘: ✓ 동기 / ↻ 진행 중(회전) / ⚠ 대기 / ⨯ 실패.
- 행 단위로 hover 시 마지막 동기화 시각·에러 메시지 툴팁.
- 실패 행은 좌측 2px `--state-error` 라인 + 행 우측에 `재시도` 버튼.

### 6.5 Data Table
- 가상 스크롤 (`@tanstack/react-virtual`), 10k 행도 부드럽게.
- 컬럼 고정(sticky), 리사이즈, 재정렬 지원.
- 선택 시 상단에 **플로팅 액션바** 등장 (선택 개수 · 일괄 동작 · 닫기).
- 빈 상태는 항상 일러스트 + 1차 행동 버튼 제공.

### 6.6 Form
- 모든 입력은 **레이블이 항상 보이는** 방식. 플로팅 레이블 금지 (초보자 혼란).
- 에러는 입력 아래에 붉은 텍스트 + 아이콘. 포커스 이동 자동.
- 저장은 **낙관적 업데이트**하되, 실패 시 스낵바로 되돌림 알림.

### 6.7 토스트 / 스낵바
- 우측 하단 스택. 4초 기본, 에러는 사용자가 닫을 때까지 유지.
- 모든 파괴적 액션(삭제, 대량 변경)은 `실행 취소` 버튼을 5초간 제공.

---

## 7. 온보딩 (초보자 편의성의 핵심)

첫 로그인 시 다음 순서로 가이드:

1. **환영 모달** — 3스텝 카드(연결 → 동기화 → 통합 관리). Skip 가능하지만 기본은 진행.
2. **채널 연결 위저드** — 각 채널의 API 키·토큰 발급 방법을 스크린샷과 함께 안내. 복사 버튼 포함.
3. **샘플 데이터 시드** — 실제 연결이 없더라도 데모 상품 10개·주문 5개를 주입해 대시보드를 비어 보이지 않게.
4. **체크리스트 위젯** — 대시보드 우상단에 "시작하기 4/6" 진행도. 완료 전까지 접을 수는 있어도 사라지지 않음.

---

## 8. 접근성 (A11y)

- 모든 인터랙티브 요소 키보드 도달 가능. `:focus-visible` 링은 `--ring-focus` 2px + 2px 오프셋.
- 색만으로 상태를 전달하지 않는다 (아이콘 · 텍스트 병기).
- 폼 에러는 `aria-describedby`로 연결.
- 모달은 `role="dialog"` + `aria-modal` + 포커스 트랩.
- `prefers-reduced-motion: reduce`를 감지해 애니메이션 지속시간을 0으로.
- 본문 명도 대비는 WCAG AA (4.5:1) 이상, 큰 텍스트 3:1 이상 유지.

---

## 9. 반응형

| 폭 | 레이아웃 |
|---|---|
| ≥ 1280px | 사이드바 펼침 기본 |
| 1024–1279px | 사이드바 자동 접힘 (아이콘 모드) |
| 768–1023px | 사이드바 오버레이 (햄버거 토글) |
| < 768px | 모바일 전용 뷰. 테이블은 카드 리스트로 자동 변환 |

> 1인 셀러가 이동 중 주문을 확인하는 케이스가 많다. **모바일에서도 주문 처리와 재고 변경은 반드시 가능**해야 한다 (상품 신규 등록은 PC 권장).

---

## 10. 폴더 구조 (`apps/web/`)

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/               # 인증 필요 영역
│   │   ├── layout.tsx       # Sidebar + Topbar 쉘
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── inventory/
│   │   ├── channels/
│   │   └── settings/
│   ├── api/                 # Route handlers (BFF 용도만)
│   └── layout.tsx
├── components/
│   ├── primitives/          # shadcn 베이스 (Button, Input, Dialog 등)
│   ├── patterns/            # DataTable, CommandPalette, ChannelBadge …
│   └── layout/              # Sidebar, Topbar, Shell
├── features/                # 도메인별 UI 번들 (products/, orders/, …)
├── lib/
│   ├── api/                 # 서버 API 클라이언트 (OpenAPI 기반)
│   ├── hooks/
│   └── utils/
├── stores/                  # Zustand
├── styles/
│   ├── globals.css          # 토큰 정의 (3.1 ~ 3.2)
│   └── tailwind.css
└── tests/
```

---

## 11. 상태 관리 규칙

- **서버 상태 = TanStack Query.** 서버에서 온 데이터를 로컬 state로 복사하지 않는다.
- **UI 전용 상태 = Zustand.** 모달 오픈 여부, 사이드바 접힘, 필터 바 등.
- **URL 상태 = `nuqs`.** 검색어·필터·페이지는 쿼리스트링에 반영 → 공유·뒤로가기 친화.
- form 제출 후 서버에서 변경된 리소스는 `queryClient.invalidateQueries`로 무효화. **낙관적 업데이트 시 롤백 핸들러 필수.**

---

## 12. 성능 예산

| 항목 | 목표 |
|---|---|
| LCP (대시보드) | < 1.8s (4G) |
| INP | < 200ms |
| 번들 (initial) | < 180KB gzip |
| 테이블 10k 행 스크롤 | 60fps 유지 |

- 상품·주문 상세처럼 크기가 큰 페이지는 `next/dynamic`으로 분할.
- 차트 라이브러리는 대시보드 라우트에서만 로드.

---

## 13. 재현성 & 하네스 엔지니어링 (프론트엔드)

> `CLAUDE.md` §14의 원칙을 **프론트엔드에 특화**해 적용한다. 디자인 시스템은 **시각적 결정성**이 생명이라, 여기서 흔들리면 UX가 직접 무너진다.

### 13.1 환경 고정

- **`.nvmrc`** — Node LTS 정확한 버전. `.python-version`과 함께 리포지토리 루트에 커밋.
- **`pnpm-lock.yaml`** 커밋 필수. `npm`·`yarn` 락파일과 공존 금지.
- **`package.json` → `engines`** — Node·pnpm 메이저 버전 명시, 부팅 시 `engines-strict=true`로 강제 (`.npmrc`).
- **간접 의존성도 고정** — Tailwind 플러그인, shadcn 템플릿 버전도 명시적으로. `^`·`~` 같은 느슨한 레인지 대신 정확한 버전 선호.
- **Playwright 브라우저 고정** — `@playwright/test`가 관리하는 revision을 락파일 + `pnpm exec playwright install --with-deps`로 CI에서 동일 설치.
- **빌드 컨테이너** — `apps/web/Dockerfile`에 베이스 이미지 다이제스트(sha256) 고정. 로컬·CI·프로덕션 빌드 환경이 같은 바이너리로 수렴.

### 13.2 디자인 토큰 싱크 (Single Source of Truth)

**시각 재현성의 핵심은 "토큰이 한 곳에서 정의되어 세 곳에 반영되는 것".**

```
FRONTEND.md §3  ←→  styles/globals.css  ←→  tailwind.config.ts
     (스펙)          (CSS 변수 본체)        (Tailwind 매핑)
```

- 이 셋은 항상 **1:1 매핑**되어야 한다.
- 새 토큰은 **문서 먼저 → CSS → Tailwind 설정** 순서로 추가. 역순 금지.
- `make doctor`는 세 지점의 토큰 이름·값을 비교해 불일치 시 실패.
- 임의 hex 값은 린트 규칙(`biome`의 `noColorFunctions` + 커스텀 룰)으로 소스 레벨에서 차단.

### 13.3 스토리북 & 비주얼 리그레션

- **모든 공개 컴포넌트는 Storybook 스토리 필수.** 스토리 없는 컴포넌트는 머지 불가.
- `stories/`는 **최소 3가지 상태**(기본·호버·비활성/에러)를 다룬다.
- PR마다 **Chromatic**(또는 Playwright 스크린샷 diff)으로 시각 회귀 검토.
- 폰트·색·간격 변경이 **의도된 것만** 승인. 의도치 않은 diff는 곧 회귀.
- 스토리북 자체 의존성도 `pnpm-lock`에 고정.

### 13.4 E2E 결정성 (Playwright)

라이브 API·현재 시각·랜덤 값을 테스트에 유입시키지 않는다.

- **데이터:** `scripts/seed-e2e.ts`로 **고정 시드**(`SEED=42`) 생성. 매 테스트 시작 시 `db-reset` 훅.
- **시각:** `page.clock.setFixedTime("2026-01-01T00:00:00+09:00")`로 고정. 상대 시간 표시(`3분 전`) 테스트 필수.
- **애니메이션:** 테스트 모드에서 전역 CSS `* { animation-duration: 0 !important; transition-duration: 0 !important; }` 주입, 또는 `prefers-reduced-motion: reduce` 강제.
- **네트워크:** **MSW** 또는 `page.route()`로 전부 모킹. E2E에서 실제 외부 API 호출 **절대 금지**.
- **선택자:** `data-testid` 우선. 텍스트 기반 선택자는 i18n·문구 변경에 깨지므로 핵심 플로우엔 금지.
- **폰트 로딩:** `document.fonts.ready` 대기 유틸을 각 테스트 시작 시 호출. 폰트 스와프로 레이아웃 흔들림 제거.

### 13.5 빌드 결정성

- **`next build` 산출물 해시**는 같은 커밋·같은 Node·같은 `pnpm-lock`에서 동일해야 한다. CI에 해시 로그 남기고 회귀 감지.
- **빌드에 유입되는 환경 변수는 `NEXT_PUBLIC_*` 접두사만.** 그 외는 런타임에서만 사용, 빌드 결과에 박히지 않도록.
- **`next.config.ts`**는 `reactStrictMode: true`, `swcMinify: true`, 이미지 도메인 화이트리스트 등 결정적 설정을 명시.
- **소스맵**은 프로덕션에서 `hidden-source-map`. 파일명 해시는 콘텐츠 기반.

### 13.6 로케일·포맷 결정성

사용자 브라우저의 기본 로케일에 의존하면 테스트·스크린샷이 흔들린다.

- **날짜 포맷:** `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ... })`를 래핑한 `utils/format/date.ts`만 사용. `toLocaleString()` 직접 호출 금지.
- **숫자·금액:** `Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })` 래퍼.
- **날짜 라이브러리:** `date-fns` 단일 채택. `moment`·`dayjs` 병행 금지.
- **텍스트:** `next-intl` 키 기반. 하드코딩 문자열 금지. 기본 로케일 `ko`, 보조 `en`.

### 13.7 Golden Path (프론트엔드 전용)

프론트 작업에서 흔히 헷갈리는 선택은 이 표 하나에서 끝낸다. `CLAUDE.md §15.4`의 프론트엔드 연장선.

| 상황 | 정답 | 금지 |
|---|---|---|
| 스타일링 | Tailwind 유틸 + 시맨틱 토큰 | 인라인 `style={}`, 임의 hex, `!important` |
| 새 컴포넌트 | `components/primitives/` 확인 → shadcn 래핑 | 처음부터 새로 작성 |
| 서버 상태 | TanStack Query | `useEffect` + `fetch` |
| UI 상태 | Zustand | 전역 Context로 상태 공유 |
| URL 상태 | `nuqs` | `useState` + `router.push`로 수동 싱크 |
| 폼 | React Hook Form + Zod | 수동 state + 수동 검증 |
| 아이콘 | `lucide-react` | 커스텀 SVG 인라인 (로고 등 예외 명시) |
| 이미지 | `next/image` | `<img>` (내부 리소스) |
| 링크 | `next/link` | `<a href>` (내부 라우팅) |
| 날짜·숫자 포맷 | `utils/format/*` 래퍼 | `Intl` 직접 호출, `toLocaleString` |
| 텍스트 | `next-intl` 키 | 하드코딩 문자열 |
| 단위 테스트 | Vitest + React Testing Library | Jest |
| E2E | Playwright | Cypress, WebDriver |
| 포매터 | Biome | Prettier |
| 컴포넌트 카탈로그 | Storybook | 임시 데모 페이지로 대체 |
| 토큰 변경 | §3 문서 먼저 → CSS → Tailwind | CSS만 수정 후 문서 지연 반영 |
| **변경 가능한 UI 상수** (페이지 사이즈, 폴링 주기, 토스트 노출 시간, 기본 정렬) | **서버에서 `AppConfig` 조회** → `/api/v1/config/ui` 엔드포인트로 주입 | 컴포넌트에 `const PAGE_SIZE = 20` 하드코딩 |
| **기능 플래그 분기** | `useFeatureFlag("new_dashboard_v2")` (서버 `AppConfig.features` 경유) | `if (process.env.NEXT_PUBLIC_NEW_UI) ...` |
| **환경별 동작 차이** | 서버에서 결정해 내려받음 | 프론트에서 `process.env.NODE_ENV` 분기 |
| **채널별 UI 차이** | 서버가 내려주는 `ChannelCapabilities`(CLAUDE.md §6.3) 참조 | `if (channel === "cafe24") ...` |
| **온보딩 카피·이메일 템플릿·에러 메시지 문구** | 서버 `app_settings` + `next-intl` | 컴포넌트 JSX에 문자열 직접 |
| **빌드 타임 상수** (API 버전 경로 `/v1`, JWT 알고리즘 등) | 하드코딩 허용 (CLAUDE.md §9.8) | 남용 금지 — 의심되면 DB로 |

### 13.8 자가 검증 (`make doctor` — 프론트 영역)

`CLAUDE.md §15.5`의 `make doctor`가 프론트에 대해서도 다음을 검사한다:

- [ ] `.nvmrc` ↔ 실제 Node 버전
- [ ] `pnpm-lock.yaml` 최신 (`pnpm install --frozen-lockfile` 통과)
- [ ] `FRONTEND.md §3` 토큰 ↔ `styles/globals.css` ↔ `tailwind.config.ts` 3자 일치
- [ ] `FRONTEND.md §10` 폴더 구조 ↔ 실제 `apps/web/` 트리
- [ ] Storybook이 모든 공개 컴포넌트에 대해 스토리 보유
- [ ] `next build` 성공 + 번들 사이즈 예산(§12) 초과 없음
- [ ] 린트 규칙: 임의 hex 사용 0건, 하드코딩 문자열 0건
- [ ] `process.env.NEXT_PUBLIC_*` 참조가 **빌드 필수 항목**(SENTRY_DSN 등)으로만 제한됨
- [ ] 컴포넌트·훅 내부에 `const XXX = 숫자|문자열` 형태의 **UI 상수 정의 0건** (ESLint 커스텀 룰)

### 13.9 재현성 셀프 체크리스트

PR 제출 전 스스로 확인:

- [ ] 새 hex 값, 임의 px/rem이 섞여 있지 않은가? → 토큰만 사용
- [ ] 사용자에게 보이는 문자열이 하드코딩되어 있지 않은가? → `next-intl` 키
- [ ] 날짜·숫자 포맷이 로케일 독립적인가? → `utils/format/*` 경유
- [ ] 테스트에서 `new Date()`, `Math.random()`을 직접 호출하지 않았는가?
- [ ] 애니메이션이 E2E 테스트에서 자동 비활성화되는가?
- [ ] 새 컴포넌트에 Storybook 스토리를 추가했는가?
- [ ] 토큰·패턴·규칙 추가 시 `FRONTEND.md`도 함께 수정했는가?
- [ ] 사용자 고유 데이터(locale, timezone)가 UI 결과에 새어들지 않는가?
- [ ] **페이지 사이즈·폴링 주기·토스트 노출 시간 같은 UI 상수를 컴포넌트에 박지 않았는가?** → 서버 `AppConfig`
- [ ] **기능 분기를 `process.env.NEXT_PUBLIC_*`로 하지 않았는가?** → 서버 기능 플래그 경유
- [ ] **채널별·테넌트별 분기를 프론트에서 하드코딩하지 않았는가?** → 서버가 내려주는 Capability·정책 참조
- [ ] 새 상수·임계값 추가 시 `CLAUDE.md §9.11` 체크리스트를 통과했는가?

### 13.10 안티 패턴 (프론트엔드)

- ❌ `style={{ color: '#123456' }}` — 토큰만 허용
- ❌ `className="!text-red-500"` — `!important`로 토큰 덮어쓰기
- ❌ `new Date().toLocaleString()` — 래퍼 경유 필수
- ❌ `setInterval(()=>{...}, 1000)`으로 시간 기반 UX — 테스트 비결정
- ❌ Storybook 없는 복잡 인터랙션 컴포넌트 머지
- ❌ `localStorage`·`sessionStorage`에 비결정 값 저장 후 렌더 의존 (SSR 미스매치)
- ❌ `window.navigator.language`로 로케일 분기 — `next-intl` 결정 경로만
- ❌ E2E 테스트에서 `page.waitForTimeout(1000)` — 상태 기반 대기 사용
- ❌ **컴포넌트·훅에 `const PAGE_SIZE = 20`, `const POLL_MS = 5000` 같은 UI 상수 박기** — 서버 `AppConfig` 경유
- ❌ **`if (process.env.NEXT_PUBLIC_FEATURE_X) ...`** — 서버 기능 플래그(`useFeatureFlag`) 경유
- ❌ **`if (channel === "cafe24") { showExtraButton() }`** — 서버가 내려주는 Capability 기반 렌더
- ❌ **토스트 메시지·에러 카피·버튼 레이블을 JSX에 직접 박기** — `next-intl` 키 또는 서버 `app_settings`
- ❌ **`MAX_UPLOAD_SIZE = 10 * 1024 * 1024` 같은 도메인 제약을 프론트에 박기** — 서버에서 내려받거나 API 에러로 처리

---

## 14. Claude Code 작업 시 행동 규칙 (프론트 한정)

1. **출력 언어는 한국어다.** `CLAUDE.md §0.1`을 승계. 계획·리뷰·커밋 메시지 모두 한국어.
2. **`FRONTEND.md` 전체 스캔 후 시작.** 단 한 줄의 수정·생성 전에도. 계획 단계에서 *"§3 토큰, §6.5 DataTable 패턴, §13.7 Golden Path를 적용합니다"* 처럼 **참조 섹션을 한국어로 명시**.
3. **새 컴포넌트는 `components/primitives/` 먼저 확인 → 없으면 확장 → 그래도 없으면 신규 생성.** shadcn 컴포넌트를 그대로 두지 말고 우리 토큰에 맞게 래핑.
4. **임의의 색상 hex 사용 금지.** 반드시 `--navy-*`, `--accent-*` 토큰을 거친다. 새 색이 필요하면 먼저 §3 팔레트를 갱신하라.
5. **임의의 em/px 금지.** Tailwind 스페이싱 스케일(§5.2) 또는 정의된 값 사용.
6. **아이콘 단독 버튼을 만들지 마라.** 최소한 `aria-label` + 툴팁 + 가능하면 시각적 레이블.
7. **비어 있는 상태를 비워두지 마라.** 모든 리스트·테이블·대시보드 카드는 empty state 일러스트 + 안내문 + 1차 CTA.
8. **복잡한 상호작용은 Storybook에 먼저 독립 구현**한 뒤 본 페이지에 통합. 스토리 없는 복잡 컴포넌트는 반려.
9. **서버 컴포넌트가 기본이다.** `"use client"`를 추가할 때는 그 이유를 컴포넌트 상단 주석으로 남긴다.
10. **접근성 체크리스트를 통과하지 않으면 PR을 내지 마라.** (§8 항목 참조)
11. **문서를 코드와 함께 수정하라.** 토큰·패턴·상태 규칙이 바뀌면 **같은 커밋 안에서** `FRONTEND.md`를 고친다. "나중에 문서화"는 금지. §0에서 승계한 Doc-as-Code 원칙.
12. **Golden Path(§13.7)를 따르라.** 벗어나는 선택을 하고 싶으면 먼저 표를 갱신하는 PR을 올려 합의를 받아라.
13. **재현성을 깨는 코드를 쓰지 마라.** `new Date()`, `Math.random()`, 라이브 API 호출, 로케일 의존 포맷을 컴포넌트·테스트에 직접 박지 마라. §13.6·§13.7의 래퍼를 경유한다. PR 제출 전 §13.9 셀프 체크리스트를 통과시킨다.
14. **UI 상수를 컴포넌트에 박지 마라.** 페이지 사이즈·폴링 주기·토스트 노출 시간·재시도 횟수·기본 정렬 등은 서버 `AppConfig`에서 조회해 주입. 새 상수를 추가하기 전에 `CLAUDE.md §9.11` 체크리스트를 돌려라.
15. **기능·채널·환경 분기를 프론트에서 하지 마라.** `process.env.NEXT_PUBLIC_*`로 분기, `if (channel === "...")` 분기, `if (env === "prod")` 분기는 전부 반려. 서버 기능 플래그·Capability·정책을 내려받아 **데이터가 UI를 결정**하게 한다.
16. **하드코딩 전에 `CLAUDE.md §9.8`의 세 조건을 통과했는지 확인하라.** 빌드 타임 불변 상수(API 버전 경로, JWT 알고리즘 등)만 예외. 그 외는 서버 또는 `next-intl`.

---

## 15. 해야 할 일 (초기 스프린트)

**기반 세팅 (재현성 · 하네스):**
- [ ] `.nvmrc`, `package.json → engines`, `.npmrc(engines-strict=true)` 확정.
- [ ] `make doctor` 프론트 영역 구현 (§13.8 검사 항목 전부).
- [ ] 디자인 토큰 3자 싱크: `FRONTEND.md §3` ↔ `globals.css` ↔ `tailwind.config.ts`.
- [ ] 린트 규칙: 임의 hex·하드코딩 문자열 차단 + UI 상수 박제 금지 (Biome 커스텀 룰).
- [ ] `utils/format/{date,number,currency}.ts` 래퍼 + `Intl` 로케일 고정.
- [ ] Storybook 초기화 + Chromatic(또는 Playwright 스크린샷) 파이프라인.

**설정 주입 (Configuration-as-Data 프론트 통합):**
- [ ] `GET /api/v1/config/ui` — 프론트가 부팅 시 받는 UI 설정 엔드포인트 (페이지 사이즈, 폴링 주기, 기능 플래그, 채널 Capabilities 등).
- [ ] `<ConfigProvider>` — 서버 응답을 React Context로 주입, TanStack Query로 주기적 재검증.
- [ ] `useConfig()` / `useFeatureFlag(key)` / `useChannelCapability(ch, cap)` 훅 — 이 세 가지 외에 `process.env.NEXT_PUBLIC_*` 직접 참조 린트로 차단.
- [ ] `next-intl` 메시지 카탈로그 초기화 — 기본 `ko`, 보조 `en`, 하드코딩 문자열 린트 경고.

**디자인 시스템 · 레이아웃:**
- [ ] 디자인 토큰(`styles/globals.css`)과 Tailwind preset 세팅.
- [ ] `Shell` (Sidebar + Topbar) 레이아웃.
- [ ] `CommandPalette` 스켈레톤 + 라우트 바인딩.
- [ ] `DataTable` 패턴 (가상화 포함, 페이지 사이즈는 `useConfig()`에서).
- [ ] `ChannelBadge`, `SyncStatus` 원자 컴포넌트.
- [ ] 온보딩 3스텝 위저드 (카피는 `app_settings`·`next-intl`).
- [ ] 다크/라이트 토글 (기본 다크).

**테스트:**
- [ ] Playwright 기본 플로우(로그인 → 대시보드 → 상품 리스트) + 시드 데이터 결정성 확보.
- [ ] 모든 공개 컴포넌트 Storybook 스토리 + 비주얼 회귀 베이스라인.
- [ ] `ConfigProvider`의 다양한 설정 조합 스냅샷 (기능 플래그 on/off 등).

---

요약: **"Arc의 감성 · 셀러의 언어."** 멋 부리기보다 **방금 가입한 1인 셀러가 주문을 처리해 내도록** 돕는 것이 이 프론트엔드의 성공 기준입니다.
