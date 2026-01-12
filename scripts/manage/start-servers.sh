#!/bin/bash

# ============================================================================
# MSP Checklist System - 서버 시작 스크립트
# ============================================================================

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# 프로젝트 디렉토리 감지
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              MSP Checklist - 서버 시작                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 로그 디렉토리 먼저 생성
mkdir -p "$PROJECT_DIR/logs"

# 포트를 사용하는 프로세스 강제 종료 함수
force_kill_port() {
    local port=$1
    local pids=""
    
    if command -v lsof &> /dev/null; then
        pids=$(lsof -ti :$port 2>/dev/null || true)
    fi
    
    if [ -n "$pids" ]; then
        log_warn "포트 $port 사용 중인 프로세스 발견: $pids - 강제 종료"
        for pid in $pids; do
            kill -9 $pid 2>/dev/null || true
        done
        sleep 1
    fi
}

# 기존 프로세스 종료
log_info "기존 프로세스 종료 중..."
pkill -f "next.*$MAIN_PORT" 2>/dev/null || true
pkill -f "next.*$ADMIN_PORT" 2>/dev/null || true
sleep 2

# 포트가 아직 사용 중이면 강제 종료
force_kill_port $MAIN_PORT
force_kill_port $ADMIN_PORT

# 포트 사용 가능 여부 최종 확인
MAIN_CHECK=$(lsof -ti :$MAIN_PORT 2>/dev/null || true)
ADMIN_CHECK=$(lsof -ti :$ADMIN_PORT 2>/dev/null || true)

if [ -n "$MAIN_CHECK" ]; then
    log_error "포트 $MAIN_PORT가 여전히 사용 중입니다 (PID: $MAIN_CHECK)"
    log_error "수동으로 종료하세요: kill -9 $MAIN_CHECK"
    exit 1
fi

if [ -n "$ADMIN_CHECK" ]; then
    log_error "포트 $ADMIN_PORT가 여전히 사용 중입니다 (PID: $ADMIN_CHECK)"
    log_error "수동으로 종료하세요: kill -9 $ADMIN_CHECK"
    exit 1
fi

# NVM 로드 (설치되어 있는 경우)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    log_info "NVM 로드됨"
fi

# Node.js 확인
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되어 있지 않습니다."
    exit 1
fi
log_info "Node.js 버전: $(node -v)"

# 메인 서버 시작
log_info "메인 서버 시작 중 (포트 $MAIN_PORT)..."
cd "$PROJECT_DIR/msp-checklist"

# .next 디렉토리 확인 (빌드 여부)
if [ ! -d ".next" ]; then
    log_warn "빌드가 필요합니다. npm run build 실행 중..."
    npm run build
fi

nohup npm start -- -p $MAIN_PORT > "$PROJECT_DIR/logs/main-server.log" 2>&1 &
MAIN_PID=$!
echo $MAIN_PID > "$PROJECT_DIR/main-server.pid"
log_success "메인 서버 시작됨 (PID: $MAIN_PID)"

sleep 3

# Admin 서버 시작
if [ -d "$PROJECT_DIR/msp-checklist/admin" ]; then
    log_info "Admin 서버 시작 중 (포트 $ADMIN_PORT)..."
    cd "$PROJECT_DIR/msp-checklist/admin"
    
    # .next 디렉토리 확인 (빌드 여부)
    if [ ! -d ".next" ]; then
        log_warn "Admin 빌드가 필요합니다. npm run build 실행 중..."
        npm run build
    fi
    
    nohup npm start -- -p $ADMIN_PORT > "$PROJECT_DIR/logs/admin-server.log" 2>&1 &
    ADMIN_PID=$!
    echo $ADMIN_PID > "$PROJECT_DIR/admin-server.pid"
    log_success "Admin 서버 시작됨 (PID: $ADMIN_PID)"
fi

# 서버 시작 확인
sleep 5
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "서버 상태:"

# 메인 서버 확인
if kill -0 $(cat "$PROJECT_DIR/main-server.pid" 2>/dev/null) 2>/dev/null; then
    echo -e "  메인 앱:  ${GREEN}● 실행 중${NC} - http://localhost:$MAIN_PORT"
else
    echo -e "  메인 앱:  ${RED}○ 시작 실패${NC}"
    echo "  로그 확인: tail -f $PROJECT_DIR/logs/main-server.log"
fi

# Admin 서버 확인
if [ -f "$PROJECT_DIR/admin-server.pid" ]; then
    if kill -0 $(cat "$PROJECT_DIR/admin-server.pid" 2>/dev/null) 2>/dev/null; then
        echo -e "  Admin:   ${GREEN}● 실행 중${NC} - http://localhost:$ADMIN_PORT"
    else
        echo -e "  Admin:   ${RED}○ 시작 실패${NC}"
        echo "  로그 확인: tail -f $PROJECT_DIR/logs/admin-server.log"
    fi
fi

echo ""
echo "로그 확인:"
echo "  tail -f $PROJECT_DIR/logs/main-server.log"
echo "  tail -f $PROJECT_DIR/logs/admin-server.log"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
