#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT_DIR/.dev.pids"
cd "$ROOT_DIR"

# ── 색상 (NO_COLOR 환경변수 존중 + tty 아닐 때 비활성화) ───────────────────
if [ -n "${NO_COLOR:-}" ] || [ ! -t 1 ]; then
  GREEN='' CYAN='' YELLOW='' NC=''
else
  GREEN='\033[0;32m'
  CYAN='\033[0;36m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
fi

log()  { echo -e "${CYAN}▸${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# ── docker compose v1/v2 자동 감지 (start.sh와 동일) ───────────────────────
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

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

echo ""
echo -e "${CYAN}━━━ OmniCommerce 개발 환경 종료 ━━━${NC}"
echo ""

# ── 1. 앱 프로세스 종료 ──────────────────────────────────────────────────────
DOCKER_COMPOSE=""
if [ -f "$PIDFILE" ]; then
  # shellcheck source=/dev/null
  source "$PIDFILE"

  for entry in "API_PID:API 서버" "WEB_PID:Web 서버" "ARQ_PID:ARQ 워커"; do
    var="${entry%%:*}"
    label="${entry#*:}"
    pid="${!var:-}"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid"
      wait "$pid" 2>/dev/null || true
      ok "$label 종료 (PID $pid)"
    else
      warn "$label 이미 종료됨"
    fi
  done

  rm -f "$PIDFILE"
else
  warn "PID 파일 없음 — 프로세스가 실행 중이 아닙니다"
fi

# ── 2. Docker 컨테이너 종료 ──
# PIDFILE이 DOCKER_COMPOSE를 기록했으면 그 값을 우선 사용, 아니면 자동 감지.
if [ -z "$DOCKER_COMPOSE" ]; then
  DOCKER_COMPOSE="$(detect_compose)"
fi
if [ -n "$DOCKER_COMPOSE" ]; then
  log "Docker 컨테이너 종료..."
  $DOCKER_COMPOSE down >/dev/null 2>&1 && ok "Docker 종료"
else
  warn "docker compose를 찾을 수 없음 — Docker 종료 단계 건너뜀"
fi

echo ""
ok "모든 서비스 종료 완료"
echo ""
