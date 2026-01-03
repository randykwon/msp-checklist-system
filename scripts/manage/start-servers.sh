#!/bin/bash

# ============================================================================
# MSP Checklist System - 서버 시작 스크립트
# ============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }

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

# 기존 프로세스 종료
log_info "기존 프로세스 종료 중..."
pkill -f "next.*$MAIN_PORT" 2>/dev/null || true
pkill -f "next.*$ADMIN_PORT" 2>/dev/null || true
sleep 2

# NVM 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 메인 서버 시작
log_info "메인 서버 시작 중 (포트 $MAIN_PORT)..."
cd "$PROJECT_DIR/msp-checklist"
nohup npm start -- -p $MAIN_PORT > "$PROJECT_DIR/logs/main-server.log" 2>&1 &
echo $! > "$PROJECT_DIR/main-server.pid"
log_success "메인 서버 시작됨 (PID: $(cat $PROJECT_DIR/main-server.pid))"

sleep 3

# Admin 서버 시작
if [ -d "$PROJECT_DIR/msp-checklist/admin" ]; then
    log_info "Admin 서버 시작 중 (포트 $ADMIN_PORT)..."
    cd "$PROJECT_DIR/msp-checklist/admin"
    nohup npm start -- -p $ADMIN_PORT > "$PROJECT_DIR/logs/admin-server.log" 2>&1 &
    echo $! > "$PROJECT_DIR/admin-server.pid"
    log_success "Admin 서버 시작됨 (PID: $(cat $PROJECT_DIR/admin-server.pid))"
fi

# 로그 디렉토리 생성
mkdir -p "$PROJECT_DIR/logs"

# 상태 확인
sleep 3
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "서버 상태:"
echo "  메인 앱:  http://localhost:$MAIN_PORT"
echo "  Admin:   http://localhost:$ADMIN_PORT"
echo ""
echo "로그 확인:"
echo "  tail -f $PROJECT_DIR/logs/main-server.log"
echo "  tail -f $PROJECT_DIR/logs/admin-server.log"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
