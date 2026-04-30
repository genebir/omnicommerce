#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT_DIR/.dev.pids"
cd "$ROOT_DIR"

# ── 색상 (NO_COLOR 환경변수 존중 + tty 아닐 때 비활성화) ───────────────────
if [ -n "${NO_COLOR:-}" ] || [ ! -t 1 ]; then
  RED='' GREEN='' YELLOW='' CYAN='' NC=''
else
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
fi

log()  { echo -e "${CYAN}▸${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }

# ── OS 감지 + PATH 보강 (macOS/Linux/WSL/MSYS/Cygwin) ───────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin)
    [ -x "/opt/homebrew/bin/brew" ] && eval "$(/opt/homebrew/bin/brew shellenv)"
    [ -x "/usr/local/bin/brew" ]    && eval "$(/usr/local/bin/brew shellenv)"
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    export PNPM_HOME="${PNPM_HOME:-$HOME/Library/pnpm}"
    [ -d "$PNPM_HOME" ] && export PATH="$PNPM_HOME:$PATH"
    ;;
  Linux)
    # WSL2 포함. pnpm setup이 ~/.local/share/pnpm을 기본 PNPM_HOME으로 잡음.
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
    [ -d "$PNPM_HOME" ] && export PATH="$PNPM_HOME:$PATH"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    # Git Bash on Windows. docker는 Windows 호스트에 설치돼 있어야 한다.
    warn "Git Bash/MSYS 환경 감지 — Docker Desktop이 실행 중이어야 합니다."
    export PATH="$HOME/.local/bin:$PATH"
    ;;
esac

usage() {
  echo "사용법: ./start.sh [옵션]"
  echo ""
  echo "옵션:"
  echo "  -d, --detach    백그라운드에서 실행"
  echo "  -h, --help      도움말 표시"
  echo ""
  echo "종료: ./stop.sh 또는 포그라운드 모드에서 Ctrl+C"
}

DETACH=false
for arg in "$@"; do
  case "$arg" in
    -d|--detach) DETACH=true ;;
    -h|--help)   usage; exit 0 ;;
    *)           err "알 수 없는 옵션: $arg"; usage; exit 1 ;;
  esac
done

# ── docker compose v1/v2 자동 감지 ─────────────────────────────────────────
# v2(권장): `docker compose` (sub-command). v1: `docker-compose`(별도 바이너리).
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

DOCKER_COMPOSE="$(detect_compose)"
if [ -z "$DOCKER_COMPOSE" ]; then
  err "docker compose(v2) 또는 docker-compose(v1)를 찾을 수 없습니다."
  err "Docker Desktop 또는 docker-compose-plugin을 설치하세요."
  exit 1
fi

# v2가 --wait 플래그를 지원하는지 (v2.1.1+). 미지원이면 healthcheck 폴링으로 대체.
SUPPORTS_WAIT=false
if [ "$DOCKER_COMPOSE" = "docker compose" ]; then
  if docker compose up --help 2>/dev/null | grep -q -- '--wait'; then
    SUPPORTS_WAIT=true
  fi
fi

# ── 0. .env 보장 (파이썬/alembic 호출 전 필수) ──────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
  if [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    warn ".env 파일이 없어 .env.example에서 자동 복사했습니다."
    warn "프로덕션 환경이라면 JWT_SIGNING_SECRET, FERNET_KEY 등 시크릿을 반드시 변경하세요."
  else
    err ".env 파일이 없고 .env.example도 찾을 수 없습니다."
    err "직접 .env 파일을 생성한 뒤 다시 실행하세요."
    exit 1
  fi
else
  ok ".env 확인"
fi

# ── 1. PIDFILE 확인 (stale PID 자동 정리) ───────────────────────────────────
if [ -f "$PIDFILE" ]; then
  # shellcheck source=/dev/null
  source "$PIDFILE" 2>/dev/null || true
  ALIVE=false
  for var in API_PID WEB_PID ARQ_PID; do
    pid="${!var:-}"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      ALIVE=true
      break
    fi
  done
  if [ "$ALIVE" = true ]; then
    err "이미 실행 중입니다. 먼저 ./stop.sh 를 실행하세요."
    exit 1
  else
    warn "이전 실행의 PID 파일을 발견했지만 프로세스가 없습니다. 자동 정리 후 계속합니다."
    rm -f "$PIDFILE"
  fi
fi

# ── 2. 필수 도구 확인 ────────────────────────────────────────────────────────
for cmd in docker uv pnpm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "'$cmd' 를 찾을 수 없습니다. 설치 후 다시 시도하세요."
    case "$cmd" in
      uv)   err "  → curl -LsSf https://astral.sh/uv/install.sh | sh" ;;
      pnpm) err "  → npm install -g pnpm  또는  brew install pnpm" ;;
    esac
    exit 1
  fi
done

# ── 프로세스 트리 종료 (pgrep -P 재귀, macOS/Linux 호환) ─────────────────────
kill_tree() {
  local pid="$1"
  local children
  children=$(pgrep -P "$pid" 2>/dev/null || true)
  for child in $children; do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  echo ""
  log "전체 종료 중..."
  [ -n "${API_PID:-}" ] && { kill_tree "$API_PID"; ok "API 서버 종료"; }
  [ -n "${WEB_PID:-}" ] && { kill_tree "$WEB_PID"; ok "Web 서버 종료"; }
  [ -n "${ARQ_PID:-}" ] && { kill_tree "$ARQ_PID"; ok "ARQ 워커 종료"; }
  wait 2>/dev/null || true
  log "Docker 컨테이너 종료..."
  $DOCKER_COMPOSE down >/dev/null 2>&1 && ok "Docker 종료"
  rm -f "$PIDFILE"
  echo ""
  ok "모든 서비스 종료 완료"
}
trap cleanup EXIT INT TERM

echo ""
echo -e "${CYAN}━━━ OmniCommerce 개발 환경 시작 ━━━${NC}"
echo ""

# ── 포트 충돌 경고 (lsof / ss / netstat / /proc/net/tcp 자동 fallback) ─────
check_port() {
  local port="$1" label="$2"
  local in_use=false

  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      in_use=true
    fi
  elif command -v ss >/dev/null 2>&1; then
    if ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}\$"; then
      in_use=true
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -an 2>/dev/null | grep -E "LISTEN" | awk '{print $4}' | grep -qE "[:.]${port}\$"; then
      in_use=true
    fi
  elif [ -r /proc/net/tcp ]; then
    # /proc/net/tcp 4번째 컬럼이 0A(LISTEN), 2번째가 LocalAddress(포트는 hex).
    local hex_port
    hex_port=$(printf '%04X' "$port")
    if awk -v p=":$hex_port" '$4=="0A" && index($2, p)>0 {found=1; exit} END {exit !found}' /proc/net/tcp; then
      in_use=true
    fi
  else
    # 포트 검사 도구가 전혀 없으면 검사 자체를 건너뛴다(non-fatal).
    return 0
  fi

  if [ "$in_use" = true ]; then
    warn "포트 $port ($label) 가 이미 사용 중입니다 — 충돌이 발생할 수 있습니다"
  fi
}
check_port 8000 "API"
check_port 3000 "Web"
check_port 5433 "DB"

# ── 3. Docker (PostgreSQL + Redis) ──────────────────────────────────────────
log "Docker 컨테이너 시작..."
if [ "$SUPPORTS_WAIT" = true ]; then
  $DOCKER_COMPOSE up -d --wait
else
  # 구버전 docker compose v1 또는 v2 < 2.1.1 — healthcheck 폴링으로 대체
  $DOCKER_COMPOSE up -d
  log "컨테이너 healthy 대기 중 (최대 60초)..."
  deadline=$(( $(date +%s) + 60 ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    # postgres healthcheck가 통과하면 OK로 간주(가장 무거운 의존)
    if $DOCKER_COMPOSE ps --status running 2>/dev/null | grep -q postgres; then
      sleep 2
      break
    fi
    sleep 1
  done
fi
ok "PostgreSQL + Redis 준비 완료"

# ── 4. DB 초기 설정 + 마이그레이션 + 시드 (모두 멱등) ───────────────────────
# setup.py는 각 단계별로 존재 여부를 확인하므로 재실행해도 안전합니다.
log "DB 설정 확인 (유저·스키마·마이그레이션·시드)..."
uv run python setup.py
ok "DB 설정 완료"

# ── 5. API 서버 (FastAPI, port 8000) ────────────────────────────────────────
echo ""
log "API 서버 시작 (http://localhost:8000)..."
cd "$ROOT_DIR/apps/api"
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!
cd "$ROOT_DIR"

# ── 6. ARQ 워커 ─────────────────────────────────────────────────────────────
log "ARQ 워커 시작..."
cd "$ROOT_DIR/apps/api"
uv run python -m arq src.infra.queue.worker.WorkerSettings &
ARQ_PID=$!
cd "$ROOT_DIR"

# ── 7. Web 프론트엔드 (Next.js, port 3000) ──────────────────────────────────
log "Web 서버 시작 (http://localhost:3000)..."
cd "$ROOT_DIR/apps/web"
if [ ! -d "node_modules" ]; then
  log "node_modules 없음 — pnpm install 실행 중..."
  pnpm install --frozen-lockfile
fi
pnpm dev &
WEB_PID=$!
cd "$ROOT_DIR"

# PID 파일 기록 (stop.sh 에서 사용)
cat > "$PIDFILE" <<EOF
API_PID=$API_PID
WEB_PID=$WEB_PID
ARQ_PID=$ARQ_PID
DOCKER_COMPOSE="$DOCKER_COMPOSE"
EOF

sleep 3
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}API${NC}   http://localhost:8000"
echo -e "  ${GREEN}Web${NC}   http://localhost:3000"
echo -e "  ${GREEN}DB${NC}    localhost:5433"
echo -e "  ${GREEN}Redis${NC} localhost:6379"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DETACH" = true ]; then
  trap - EXIT INT TERM
  ok "백그라운드 실행 중 — 종료하려면 ./stop.sh"
  echo ""
else
  echo -e "  Ctrl+C 로 전체 종료"
  echo ""
  wait
fi
