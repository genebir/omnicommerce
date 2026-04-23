#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT_DIR/.dev.pids"
cd "$ROOT_DIR"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}▸${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }

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

# 이미 실행 중인지 확인
if [ -f "$PIDFILE" ]; then
  err "이미 실행 중입니다. 먼저 ./stop.sh 를 실행하세요."
  exit 1
fi

cleanup() {
  echo ""
  log "전체 종료 중..."
  [ -n "${API_PID:-}" ]  && kill "$API_PID"  2>/dev/null && ok "API 서버 종료"
  [ -n "${WEB_PID:-}" ]  && kill "$WEB_PID"  2>/dev/null && ok "Web 서버 종료"
  [ -n "${ARQ_PID:-}" ]  && kill "$ARQ_PID"  2>/dev/null && ok "ARQ 워커 종료"
  wait 2>/dev/null
  log "Docker 컨테이너 종료..."
  docker compose down 2>/dev/null && ok "Docker 종료"
  rm -f "$PIDFILE"
  echo ""
  ok "모든 서비스 종료 완료"
}
trap cleanup EXIT INT TERM

echo ""
echo -e "${CYAN}━━━ OmniCommerce 개발 환경 시작 ━━━${NC}"
echo ""

# ── 1. Docker (PostgreSQL + Redis) ──
log "Docker 컨테이너 시작..."
if ! command -v docker &>/dev/null; then
  err "docker가 설치되어 있지 않습니다"
  exit 1
fi
docker compose up -d --wait
ok "PostgreSQL + Redis 준비 완료"

# ── 2. DB 마이그레이션 ──
log "DB 마이그레이션 확인..."
cd "$ROOT_DIR/apps/api"
if uv run alembic current 2>&1 | grep -q "head"; then
  ok "마이그레이션 최신"
else
  log "마이그레이션 적용 중..."
  uv run alembic upgrade head
  ok "마이그레이션 완료"
fi
cd "$ROOT_DIR"

# ── 3. 시드 데이터 ──
SETTINGS_COUNT=$(PGPASSWORD='omni_secure_2026!' psql -h localhost -p 5432 -U omni_user -d omni_commerce -t -A -c "SELECT count(*) FROM app_settings;" 2>/dev/null || echo "0")
if [ "$SETTINGS_COUNT" -eq 0 ]; then
  log "시드 데이터 삽입..."
  python setup.py --seed
  ok "시드 데이터 완료"
else
  ok "시드 데이터 존재 (${SETTINGS_COUNT}건)"
fi

# ── 4. API 서버 (FastAPI, port 8000) ──
echo ""
log "API 서버 시작 (http://localhost:8000)..."
cd "$ROOT_DIR/apps/api"
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!
cd "$ROOT_DIR"

# ── 5. ARQ 워커 ──
log "ARQ 워커 시작..."
cd "$ROOT_DIR/apps/api"
uv run python -m arq src.infra.queue.worker.WorkerSettings &
ARQ_PID=$!
cd "$ROOT_DIR"

# ── 6. Web 프론트엔드 (Next.js, port 3000) ──
log "Web 서버 시작 (http://localhost:3000)..."
cd "$ROOT_DIR/apps/web"
pnpm dev &
WEB_PID=$!
cd "$ROOT_DIR"

# PID 파일 기록 (stop.sh 에서 사용)
cat > "$PIDFILE" <<EOF
API_PID=$API_PID
WEB_PID=$WEB_PID
ARQ_PID=$ARQ_PID
EOF

sleep 3
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}API${NC}   http://localhost:8000"
echo -e "  ${GREEN}Web${NC}   http://localhost:3000"
echo -e "  ${GREEN}DB${NC}    localhost:5432"
echo -e "  ${GREEN}Redis${NC} localhost:6379"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DETACH" = true ]; then
  # 백그라운드 모드: trap 해제 후 즉시 리턴
  trap - EXIT INT TERM
  ok "백그라운드 실행 중 — 종료하려면 ./stop.sh"
  echo ""
else
  echo -e "  Ctrl+C 로 전체 종료"
  echo ""
  wait
fi
