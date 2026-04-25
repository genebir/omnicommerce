#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  OmniCommerce — 전체 환경 설치 스크립트 (install.sh)
#
#  지원 환경:
#    ✓ macOS 12+  (Intel / Apple Silicon)
#    ✓ Ubuntu 20.04+ / Debian 11+
#    ✓ RHEL 8+ / CentOS Stream / Fedora / Rocky / AlmaLinux
#    ✓ Arch Linux / Manjaro
#    ✓ Windows 10/11 → WSL2(Ubuntu) 환경에서 실행
#
#  사용법:
#    chmod +x install.sh && ./install.sh
#    curl 파이프:  curl -fsSL <url> | bash
#
#  필수 전제 조건:
#    - curl 또는 wget
#    - git (없으면 자동 설치 시도)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
LOGFILE="$ROOT_DIR/.install.log"

# ── 색상 (터미널 여부 자동 판별) ─────────────────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; DIM=''; NC=''
fi

log()    { echo -e "${CYAN}▸${NC} $1" | tee -a "$LOGFILE"; }
ok()     { echo -e "${GREEN}✓${NC} $1" | tee -a "$LOGFILE"; }
warn()   { echo -e "${YELLOW}⚠${NC}  $1" | tee -a "$LOGFILE"; }
err()    { echo -e "${RED}✗${NC} $1" | tee -a "$LOGFILE" >&2; }
die()    { err "$1"; echo -e "${DIM}로그: $LOGFILE${NC}"; exit 1; }
info()   { echo -e "${DIM}  $1${NC}" | tee -a "$LOGFILE"; }
blank()  { echo ""; }

STEP=0
step() {
  STEP=$((STEP + 1))
  blank
  echo -e "${BOLD}${CYAN}━━ [${STEP}] $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOGFILE"
}

# ── 버전 비교 헬퍼 ────────────────────────────────────────────────────────────
# 사용: version_ge "현재버전" "최소버전"
# macOS BSD sort는 -V 미지원 → Python으로 비교 (어차피 uv가 Python을 관리)
version_ge() {
  local cur="$1" req="$2"
  # GNU sort -V가 있으면 사용, 없으면 Python fallback
  if sort --version 2>/dev/null | grep -q GNU; then
    printf '%s\n%s\n' "$req" "$cur" | sort -V -C 2>/dev/null
  else
    python3 -c "
import sys
from packaging.version import Version
try:
    sys.exit(0 if Version('$cur') >= Version('$req') else 1)
except Exception:
    # packaging 없으면 문자열 비교 fallback
    parts_cur = [int(x) for x in '$cur'.split('.')[:3]]
    parts_req = [int(x) for x in '$req'.split('.')[:3]]
    sys.exit(0 if parts_cur >= parts_req else 1)
" 2>/dev/null || {
      # Python도 실패하면 단순 major 버전 비교
      local cur_major req_major
      cur_major="$(echo "$cur" | cut -d. -f1)"
      req_major="$(echo "$req" | cut -d. -f1)"
      [ "${cur_major:-0}" -ge "${req_major:-0}" ]
    }
  fi
}

# ── 명령어 존재 여부 ──────────────────────────────────────────────────────────
has() { command -v "$1" &>/dev/null; }

# ── sudo 사용 가능 여부 (root면 불필요) ──────────────────────────────────────
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if has sudo; then
    SUDO="sudo"
  else
    warn "sudo를 찾을 수 없습니다. root 권한이 필요한 단계는 실패할 수 있습니다."
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 0. 로그 초기화 + 헤더
# ─────────────────────────────────────────────────────────────────────────────
echo "" > "$LOGFILE"
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   OmniCommerce  —  환경 설치 스크립트  ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  설치 로그: ${DIM}$LOGFILE${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. OS / 아키텍처 감지
# ─────────────────────────────────────────────────────────────────────────────
step "OS 감지"

OS="$(uname -s)"
ARCH="$(uname -m)"
DISTRO=""
DISTRO_FAMILY=""   # debian | rhel | arch | unknown
PKG_INSTALL=""

case "$OS" in
  Darwin)
    DISTRO="macOS"
    DISTRO_FAMILY="darwin"
    ok "macOS 감지 (아키텍처: $ARCH)"
    ;;
  Linux)
    # WSL 감지
    if grep -qi microsoft /proc/version 2>/dev/null; then
      warn "WSL 환경 감지 — Linux 경로로 진행합니다"
    fi

    if [ -f /etc/os-release ]; then
      # shellcheck source=/dev/null
      . /etc/os-release
      DISTRO="${NAME:-Linux}"
      case "${ID_LIKE:-} ${ID:-}" in
        *debian*|*ubuntu*)
          DISTRO_FAMILY="debian"
          PKG_INSTALL="$SUDO apt-get install -y"
          ;;
        *rhel*|*centos*|*fedora*|*rocky*|*alma*)
          DISTRO_FAMILY="rhel"
          if has dnf; then
            PKG_INSTALL="$SUDO dnf install -y"
          else
            PKG_INSTALL="$SUDO yum install -y"
          fi
          ;;
        *arch*)
          DISTRO_FAMILY="arch"
          PKG_INSTALL="$SUDO pacman -S --noconfirm"
          ;;
        *)
          DISTRO_FAMILY="unknown"
          warn "알 수 없는 Linux 배포판. 일부 자동 설치가 건너뛰어질 수 있습니다."
          ;;
      esac
    fi
    ok "Linux 감지: $DISTRO ($DISTRO_FAMILY 계열, 아키텍처: $ARCH)"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    blank
    err "Windows 네이티브 환경(Git Bash / MSYS2)이 감지되었습니다."
    echo ""
    echo -e "  Windows에서는 ${BOLD}WSL2${NC} 환경에서 실행하세요:"
    echo ""
    echo "  1. PowerShell (관리자)에서:  wsl --install"
    echo "  2. Ubuntu 터미널 열기"
    echo "  3. 이 스크립트를 다시 실행:  bash install.sh"
    echo ""
    exit 1
    ;;
  *)
    die "지원하지 않는 OS: $OS"
    ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
# 2. 기본 도구 확인 (curl, git)
# ─────────────────────────────────────────────────────────────────────────────
step "기본 도구 확인"

# curl
if ! has curl; then
  log "curl 설치 중..."
  case "$DISTRO_FAMILY" in
    debian)  $SUDO apt-get update -qq && $PKG_INSTALL curl ;;
    rhel)    $PKG_INSTALL curl ;;
    arch)    $PKG_INSTALL curl ;;
    darwin)  die "curl이 없습니다. Xcode Command Line Tools를 먼저 설치하세요: xcode-select --install" ;;
    *)       die "curl을 찾을 수 없습니다. 직접 설치 후 다시 실행하세요." ;;
  esac
fi
ok "curl $(curl --version | head -1 | awk '{print $2}')"

# git
if ! has git; then
  log "git 설치 중..."
  case "$DISTRO_FAMILY" in
    debian)  $SUDO apt-get update -qq && $PKG_INSTALL git ;;
    rhel)    $PKG_INSTALL git ;;
    arch)    $PKG_INSTALL git ;;
    darwin)  die "git이 없습니다. Xcode Command Line Tools를 먼저 설치하세요: xcode-select --install" ;;
    *)       die "git을 찾을 수 없습니다. 직접 설치 후 다시 실행하세요." ;;
  esac
fi
ok "git $(git --version | awk '{print $3}')"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Homebrew (macOS 전용)
# ─────────────────────────────────────────────────────────────────────────────
if [ "$DISTRO_FAMILY" = "darwin" ]; then
  step "Homebrew 확인"

  # Apple Silicon / Intel PATH 보강
  [ -x "/opt/homebrew/bin/brew" ] && eval "$(/opt/homebrew/bin/brew shellenv)"
  [ -x "/usr/local/bin/brew" ]    && eval "$(/usr/local/bin/brew shellenv)"

  if ! has brew; then
    log "Homebrew 설치 중 (시간이 걸릴 수 있습니다)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
      >> "$LOGFILE" 2>&1 || die "Homebrew 설치 실패. 로그를 확인하세요: $LOGFILE"

    # 설치 후 PATH 재적용
    [ -x "/opt/homebrew/bin/brew" ] && eval "$(/opt/homebrew/bin/brew shellenv)"
    [ -x "/usr/local/bin/brew" ]    && eval "$(/usr/local/bin/brew shellenv)"
    ok "Homebrew 설치 완료"
  else
    ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Docker 확인 / 설치
# ─────────────────────────────────────────────────────────────────────────────
step "Docker 확인"

install_docker_linux() {
  log "Docker Engine 설치 중 (공식 스크립트)..."
  curl -fsSL https://get.docker.com | $SUDO sh >> "$LOGFILE" 2>&1 \
    || die "Docker 설치 실패. 로그를 확인하세요: $LOGFILE"

  # 현재 사용자를 docker 그룹에 추가
  if [ "$(id -u)" -ne 0 ]; then
    $SUDO usermod -aG docker "$USER" >> "$LOGFILE" 2>&1 || true
    warn "docker 그룹에 추가되었습니다. 반영하려면 로그아웃 후 재로그인이 필요합니다."
    warn "현재 세션에서는 'newgrp docker' 실행 또는 sudo를 사용하세요."
  fi

  # systemd가 있으면 Docker 서비스 시작
  if has systemctl; then
    $SUDO systemctl enable --now docker >> "$LOGFILE" 2>&1 || true
  fi

  ok "Docker 설치 완료"
}

if ! has docker; then
  case "$DISTRO_FAMILY" in
    darwin)
      log "Docker Desktop 설치 중 (brew --cask docker)..."
      brew install --cask docker >> "$LOGFILE" 2>&1 \
        || die "Docker Desktop 설치 실패. https://docs.docker.com/desktop/mac/install/ 에서 수동 설치하세요."
      ok "Docker Desktop 설치 완료"
      warn "Docker Desktop을 처음 실행해야 합니다: Applications > Docker 실행"
      ;;
    debian|rhel|arch)
      install_docker_linux
      ;;
    *)
      warn "Docker를 자동으로 설치할 수 없습니다."
      warn "수동 설치: https://docs.docker.com/engine/install/"
      ;;
  esac
else
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
fi

# docker compose (v2 플러그인) 확인
if ! docker compose version &>/dev/null 2>&1; then
  if has docker-compose; then
    warn "docker compose v1(레거시)이 감지되었습니다. v2로 업그레이드를 권장합니다."
    warn "  https://docs.docker.com/compose/migrate/"
  else
    die "docker compose를 찾을 수 없습니다. Docker를 최신 버전으로 업데이트하세요."
  fi
fi
ok "Docker Compose $(docker compose version --short 2>/dev/null || docker-compose --version | awk '{print $3}' | tr -d ',')"

# Docker 데몬 실행 여부 확인
DOCKER_RUNNING=false
if docker info &>/dev/null 2>&1; then
  DOCKER_RUNNING=true
  ok "Docker 데몬 실행 중"
else
  warn "Docker 데몬이 실행 중이지 않습니다."
  case "$DISTRO_FAMILY" in
    darwin)
      warn "Docker Desktop을 실행하고 메뉴바 아이콘이 나타날 때까지 기다린 뒤 다시 시도하세요."
      ;;
    *)
      log "Docker 서비스 시작 시도..."
      if has systemctl; then
        $SUDO systemctl start docker >> "$LOGFILE" 2>&1 && DOCKER_RUNNING=true \
          || warn "Docker 서비스 자동 시작 실패. '$SUDO systemctl start docker'를 직접 실행하세요."
      elif has service; then
        $SUDO service docker start >> "$LOGFILE" 2>&1 && DOCKER_RUNNING=true \
          || warn "Docker 서비스 자동 시작 실패."
      fi
      ;;
  esac
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. uv (Python 패키지 매니저 + Python 3.14 관리)
# ─────────────────────────────────────────────────────────────────────────────
step "uv + Python 3.14"

# PATH 보강 (uv 기본 설치 경로)
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

REQUIRED_PYTHON="3.14"

install_uv() {
  log "uv 설치 중..."
  curl -LsSf https://astral.sh/uv/install.sh | sh >> "$LOGFILE" 2>&1 \
    || die "uv 설치 실패. 로그를 확인하세요: $LOGFILE"
  # 설치 후 PATH 재적용
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
  ok "uv 설치 완료: $(uv --version)"
}

if ! has uv; then
  install_uv
else
  ok "uv $(uv --version)"
fi

# Python 3.14 설치 (uv python)
log "Python $REQUIRED_PYTHON 확인..."
if ! uv python list 2>/dev/null | grep -q "cpython-${REQUIRED_PYTHON}"; then
  log "Python $REQUIRED_PYTHON 설치 중 (uv python install)..."
  uv python install "$REQUIRED_PYTHON" >> "$LOGFILE" 2>&1 \
    || die "Python $REQUIRED_PYTHON 설치 실패."
  ok "Python $REQUIRED_PYTHON 설치 완료"
else
  ok "Python $REQUIRED_PYTHON 이미 설치됨"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. Node.js 24 + pnpm 10
# ─────────────────────────────────────────────────────────────────────────────
step "Node.js 24 + pnpm"

REQUIRED_NODE="24.0.0"
REQUIRED_PNPM="10.0.0"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# ── nvm 설치 / 로드 ────────────────────────────────────────────────────────
load_nvm() {
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  return 1
}

install_nvm() {
  local NVM_VERSION="0.40.3"
  log "nvm v${NVM_VERSION} 설치 중..."
  curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh" | bash \
    >> "$LOGFILE" 2>&1 || die "nvm 설치 실패."
  load_nvm || die "nvm 로드 실패."
  ok "nvm $(nvm --version) 설치 완료"
}

# nvm이 없거나 로드 안 되면 설치
if ! load_nvm; then
  install_nvm
fi

# Node.js 버전 확인 + 설치
NODE_OK=false
if has node; then
  CURRENT_NODE="$(node --version | tr -d 'v')"
  if version_ge "$CURRENT_NODE" "$REQUIRED_NODE"; then
    ok "Node.js v$CURRENT_NODE (>= $REQUIRED_NODE)"
    NODE_OK=true
  else
    warn "Node.js v$CURRENT_NODE — $REQUIRED_NODE 이상 필요"
  fi
fi

if [ "$NODE_OK" = false ]; then
  log "Node.js $REQUIRED_NODE 설치 중 (nvm)..."
  if load_nvm; then
    nvm install "$REQUIRED_NODE" >> "$LOGFILE" 2>&1 \
      || die "Node.js $REQUIRED_NODE 설치 실패."
    nvm use "$REQUIRED_NODE" >> "$LOGFILE" 2>&1
    nvm alias default "$REQUIRED_NODE" >> "$LOGFILE" 2>&1 || true
    ok "Node.js $(node --version) 설치 완료"
  else
    # nvm 없이 직접 설치 시도 (Linux 패키지 매니저)
    case "$DISTRO_FAMILY" in
      debian)
        log "NodeSource 저장소를 통해 Node.js 24 설치 중..."
        curl -fsSL https://deb.nodesource.com/setup_24.x | $SUDO bash - >> "$LOGFILE" 2>&1
        $PKG_INSTALL nodejs >> "$LOGFILE" 2>&1 \
          || die "Node.js 설치 실패."
        ok "Node.js $(node --version) 설치 완료"
        ;;
      rhel)
        log "NodeSource 저장소를 통해 Node.js 24 설치 중..."
        curl -fsSL https://rpm.nodesource.com/setup_24.x | $SUDO bash - >> "$LOGFILE" 2>&1
        $PKG_INSTALL nodejs >> "$LOGFILE" 2>&1 \
          || die "Node.js 설치 실패."
        ok "Node.js $(node --version) 설치 완료"
        ;;
      arch)
        $PKG_INSTALL nodejs npm >> "$LOGFILE" 2>&1 \
          || die "Node.js 설치 실패."
        ok "Node.js $(node --version) 설치 완료"
        ;;
      *)
        die "Node.js $REQUIRED_NODE 이상이 필요합니다. 수동 설치: https://nodejs.org"
        ;;
    esac
  fi
fi

# ── pnpm ───────────────────────────────────────────────────────────────────
PNPM_OK=false
if has pnpm; then
  CURRENT_PNPM="$(pnpm --version)"
  if version_ge "$CURRENT_PNPM" "$REQUIRED_PNPM"; then
    ok "pnpm v$CURRENT_PNPM (>= $REQUIRED_PNPM)"
    PNPM_OK=true
  else
    warn "pnpm v$CURRENT_PNPM — $REQUIRED_PNPM 이상 필요. 업그레이드 중..."
  fi
fi

if [ "$PNPM_OK" = false ]; then
  log "pnpm $REQUIRED_PNPM+ 설치 중..."
  if has corepack; then
    corepack enable pnpm >> "$LOGFILE" 2>&1 \
      && corepack prepare pnpm@latest --activate >> "$LOGFILE" 2>&1 \
      && ok "pnpm $(pnpm --version) 설치 완료 (corepack)"
  elif has npm; then
    npm install -g pnpm@latest >> "$LOGFILE" 2>&1 \
      && ok "pnpm $(pnpm --version) 설치 완료 (npm)"
  elif has curl; then
    curl -fsSL https://get.pnpm.io/install.sh | sh - >> "$LOGFILE" 2>&1 \
      && ok "pnpm 설치 완료 (curl)"
    # pnpm 설치 경로 보강
    export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
    [ "$DISTRO_FAMILY" = "darwin" ] && PNPM_HOME="${PNPM_HOME:-$HOME/Library/pnpm}"
    export PATH="$PNPM_HOME:$PATH"
  else
    die "pnpm을 설치할 수 없습니다. 수동 설치: https://pnpm.io/installation"
  fi
fi

# pnpm PATH 보강 (macOS)
if [ "$DISTRO_FAMILY" = "darwin" ]; then
  PNPM_HOME="${PNPM_HOME:-$HOME/Library/pnpm}"
  [ -d "$PNPM_HOME" ] && export PATH="$PNPM_HOME:$PATH"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. psql 클라이언트 (setup.py 실행 필요)
# ─────────────────────────────────────────────────────────────────────────────
step "PostgreSQL 클라이언트 도구"

if ! has psql; then
  log "psql 클라이언트 설치 중..."
  case "$DISTRO_FAMILY" in
    darwin)  brew install libpq && brew link --force libpq >> "$LOGFILE" 2>&1 ;;
    debian)  $SUDO apt-get update -qq && $PKG_INSTALL postgresql-client >> "$LOGFILE" 2>&1 ;;
    rhel)    $PKG_INSTALL postgresql >> "$LOGFILE" 2>&1 ;;
    arch)    $PKG_INSTALL postgresql-libs >> "$LOGFILE" 2>&1 ;;
    *)       warn "psql을 찾을 수 없습니다. setup.py의 DB 시드 단계가 실패할 수 있습니다." ;;
  esac
  has psql && ok "psql 설치 완료" || warn "psql 설치 실패 — DB 시드는 수동으로 실행하세요"
else
  ok "psql $(psql --version | awk '{print $3}')"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 8. 프로젝트 의존성 설치
# ─────────────────────────────────────────────────────────────────────────────
step "Python 의존성 설치 (uv sync)"

cd "$ROOT_DIR/apps/api"
log "uv sync --all-extras 실행 중..."
# --all-extras: ruff, mypy 등 dev 의존성 포함
# --frozen 없이 실행 — lock 파일 상태와 무관하게 항상 최신 의존성 반영 (멱등)
uv sync --all-extras >> "$LOGFILE" 2>&1 \
  || { warn "uv sync --all-extras 실패. 기본 sync 재시도..."; uv sync >> "$LOGFILE" 2>&1; }
ok "Python 의존성 설치 완료"
cd "$ROOT_DIR"

step "Node.js 의존성 설치 (pnpm install)"

cd "$ROOT_DIR/apps/web"
log "pnpm install 실행 중..."
# --frozen-lockfile 없이 실행 — lock 파일과 package.json이 다를 때도 정상 동작 (멱등)
pnpm install >> "$LOGFILE" 2>&1 \
  || { warn "pnpm install 실패. 캐시 없이 재시도..."; pnpm install --no-frozen-lockfile >> "$LOGFILE" 2>&1; }
ok "Node.js 의존성 설치 완료"
cd "$ROOT_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 9. .env 파일 생성
# ─────────────────────────────────────────────────────────────────────────────
step ".env 설정"

ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

if [ -f "$ENV_FILE" ]; then
  ok ".env 파일 이미 존재 (건너뜀)"
elif [ -f "$ENV_EXAMPLE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  ok ".env.example → .env 복사 완료"
  warn "프로덕션 배포 전에 .env 파일의 시크릿 값을 반드시 변경하세요:"
  info "  JWT_SIGNING_SECRET, SESSION_SECRET, FERNET_KEY 등"
else
  warn ".env.example 파일을 찾을 수 없습니다. .env를 수동으로 생성하세요."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 10. Docker 컨테이너 시작 + DB 초기 설정
# ─────────────────────────────────────────────────────────────────────────────
step "Docker 컨테이너 시작 (PostgreSQL + Redis)"

if [ "$DOCKER_RUNNING" = true ]; then
  cd "$ROOT_DIR"
  log "docker compose up -d 실행 중..."
  # --wait: healthcheck 통과 대기 (Docker Compose v2.1.1+). 미지원 버전엔 fallback.
  if docker compose up -d --wait >> "$LOGFILE" 2>&1; then
    ok "PostgreSQL + Redis 준비 완료 (--wait)"
  else
    warn "--wait 미지원 버전. 수동 대기로 전환..."
    docker compose up -d >> "$LOGFILE" 2>&1 \
      || die "Docker 컨테이너 시작 실패. 로그를 확인하세요: $LOGFILE"

    log "PostgreSQL 준비 대기 중..."
    RETRY=0
    MAX_RETRY=15
    until docker compose exec -T postgres pg_isready -U postgres &>/dev/null 2>&1; do
      RETRY=$((RETRY + 1))
      [ $RETRY -ge $MAX_RETRY ] && { warn "PostgreSQL 대기 시간 초과."; break; }
      sleep 2
    done
    [ $RETRY -lt $MAX_RETRY ] && ok "PostgreSQL 준비 완료"
  fi

  step "DB 초기 설정 (setup.py — 멱등)"
  cd "$ROOT_DIR"
  # .env 없으면 먼저 생성 (setup.py도 settings를 로드하므로 필요)
  [ ! -f ".env" ] && [ -f ".env.example" ] && cp ".env.example" ".env" && warn ".env를 .env.example에서 자동 생성했습니다."
  log "python setup.py 실행 중..."
  uv run python setup.py >> "$LOGFILE" 2>&1 \
    || warn "DB 설정 중 오류가 발생했습니다. 수동으로 'python setup.py'를 실행하세요."
  ok "DB 초기 설정 완료"
else
  warn "Docker 데몬이 실행 중이지 않아 DB 설정을 건너뜁니다."
  warn "Docker를 시작한 후 수동으로 실행하세요:"
  info "  docker compose up -d"
  info "  python setup.py"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. 쉘 프로필 PATH 업데이트
# ─────────────────────────────────────────────────────────────────────────────
step "쉘 프로필 PATH 설정"

detect_shell_profile() {
  local shell_name
  shell_name="$(basename "${SHELL:-bash}")"
  case "$shell_name" in
    zsh)
      echo "${ZDOTDIR:-$HOME}/.zshrc"
      ;;
    bash)
      if [ -f "$HOME/.bash_profile" ]; then
        echo "$HOME/.bash_profile"
      else
        echo "$HOME/.bashrc"
      fi
      ;;
    fish)
      echo "$HOME/.config/fish/config.fish"
      ;;
    *)
      echo "$HOME/.profile"
      ;;
  esac
}

PROFILE="$(detect_shell_profile)"

append_if_missing() {
  local line="$1" file="$2"
  if [ -f "$file" ] && grep -qF "$line" "$file" 2>/dev/null; then
    return 0
  fi
  printf '\n%s\n' "$line" >> "$file"
}

if [ -f "$PROFILE" ] || touch "$PROFILE" 2>/dev/null; then
  # uv PATH
  append_if_missing 'export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"' "$PROFILE"

  # nvm
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    append_if_missing "export NVM_DIR=\"\$HOME/.nvm\"" "$PROFILE"
    append_if_missing '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' "$PROFILE"
  fi

  # pnpm (macOS)
  if [ "$DISTRO_FAMILY" = "darwin" ] && [ -d "$HOME/Library/pnpm" ]; then
    append_if_missing 'export PNPM_HOME="$HOME/Library/pnpm"' "$PROFILE"
    append_if_missing 'export PATH="$PNPM_HOME:$PATH"' "$PROFILE"
  fi

  ok "PATH 설정을 $PROFILE 에 추가했습니다"
else
  warn "쉘 프로필($PROFILE) 수정 실패. PATH를 수동으로 설정하세요."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 12. 최종 검증
# ─────────────────────────────────────────────────────────────────────────────
step "설치 검증"

check_tool() {
  local name="$1" cmd="$2"
  if eval "$cmd" &>/dev/null 2>&1; then
    local ver
    ver="$(eval "$cmd" 2>/dev/null | head -1)"
    ok "$name: $ver"
    return 0
  else
    warn "$name: 설치되지 않았거나 PATH에 없음"
    return 1
  fi
}

check_tool "Docker"  "docker --version"
check_tool "uv"      "uv --version"
check_tool "Python"  "uv run python --version"
check_tool "Node.js" "node --version"
check_tool "pnpm"    "pnpm --version"

# ─────────────────────────────────────────────────────────────────────────────
# 완료 메시지
# ─────────────────────────────────────────────────────────────────────────────
blank
echo -e "${BOLD}${GREEN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║      설치 완료! 🎉                     ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

if [ "$DOCKER_RUNNING" = true ]; then
  echo -e "  다음 명령으로 개발 서버를 시작하세요:"
  blank
  echo -e "  ${BOLD}./start.sh${NC}           # 전체 서비스 시작"
  echo -e "  ${BOLD}./start.sh --detach${NC}  # 백그라운드 실행"
  blank
  echo -e "  서버 주소:"
  echo -e "  ${CYAN}  API  →  http://localhost:8000${NC}"
  echo -e "  ${CYAN}  Web  →  http://localhost:3000${NC}"
else
  blank
  echo -e "  ${YELLOW}⚠  Docker를 먼저 시작한 뒤 아래를 실행하세요:${NC}"
  blank
  echo -e "  ${BOLD}docker compose up -d${NC}   # DB + Redis 시작"
  echo -e "  ${BOLD}python setup.py${NC}         # DB 초기 설정"
  echo -e "  ${BOLD}./start.sh${NC}             # 개발 서버 시작"
fi

blank
echo -e "  새 터미널에서 PATH를 적용하려면:"
echo -e "  ${BOLD}source $PROFILE${NC}"
blank
echo -e "  ${DIM}설치 전체 로그: $LOGFILE${NC}"
blank
