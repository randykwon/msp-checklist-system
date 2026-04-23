#!/bin/bash

# ============================================================================
# MSP Checklist System - 서버 중지 스크립트
# ============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              MSP Checklist - 서버 중지                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 포트를 사용하는 프로세스 종료 함수
kill_port_process() {
    local port=$1
    local name=$2
    local pids=""
    
    # lsof로 포트 사용 프로세스 찾기 (macOS/Linux 호환)
    if command -v lsof &> /dev/null; then
        pids=$(lsof -ti :$port 2>/dev/null || true)
    fi
    
    if [ -n "$pids" ]; then
        log_info "$name 포트($port) 사용 프로세스 발견: $pids"
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                kill $pid 2>/dev/null
                log_info "프로세스 $pid 종료 시도 (SIGTERM)"
            fi
        done
        
        # 잠시 대기 후 강제 종료 확인
        sleep 2
        
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                log_warn "프로세스 $pid 강제 종료 (SIGKILL)"
                kill -9 $pid 2>/dev/null || true
            fi
        done
    fi
}

# PID 파일로 종료
if [ -f "$PROJECT_DIR/main-server.pid" ]; then
    PID=$(cat "$PROJECT_DIR/main-server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null && log_success "메인 서버 종료됨 (PID: $PID)"
    else
        log_warn "메인 서버가 이미 종료됨 (PID: $PID)"
    fi
    rm -f "$PROJECT_DIR/main-server.pid"
else
    log_warn "메인 서버 PID 파일 없음"
fi

if [ -f "$PROJECT_DIR/admin-server.pid" ]; then
    PID=$(cat "$PROJECT_DIR/admin-server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null && log_success "Admin 서버 종료됨 (PID: $PID)"
    else
        log_warn "Admin 서버가 이미 종료됨 (PID: $PID)"
    fi
    rm -f "$PROJECT_DIR/admin-server.pid"
else
    log_warn "Admin 서버 PID 파일 없음"
fi

sleep 1

# 포트 기반으로 남은 프로세스 강제 종료
log_info "포트 기반 프로세스 정리 중..."
kill_port_process $MAIN_PORT "메인 서버"
kill_port_process $ADMIN_PORT "Admin 서버"

# Next.js 관련 프로세스 추가 정리
NEXT_PIDS=$(pgrep -f "node.*next" 2>/dev/null | head -20 || true)
if [ -n "$NEXT_PIDS" ]; then
    # msp-checklist 관련 프로세스만 종료
    for pid in $NEXT_PIDS; do
        cmdline=$(ps -p $pid -o args= 2>/dev/null || true)
        if echo "$cmdline" | grep -q "msp-checklist"; then
            log_info "Next.js 프로세스 종료: $pid"
            kill $pid 2>/dev/null || true
        fi
    done
fi

# 최종 확인
sleep 1
MAIN_CHECK=$(lsof -ti :$MAIN_PORT 2>/dev/null || true)
ADMIN_CHECK=$(lsof -ti :$ADMIN_PORT 2>/dev/null || true)

if [ -n "$MAIN_CHECK" ] || [ -n "$ADMIN_CHECK" ]; then
    log_warn "일부 프로세스가 아직 실행 중입니다. 강제 종료 시도..."
    [ -n "$MAIN_CHECK" ] && kill -9 $MAIN_CHECK 2>/dev/null || true
    [ -n "$ADMIN_CHECK" ] && kill -9 $ADMIN_CHECK 2>/dev/null || true
    sleep 1
fi

# 최종 상태 확인
MAIN_FINAL=$(lsof -ti :$MAIN_PORT 2>/dev/null || true)
ADMIN_FINAL=$(lsof -ti :$ADMIN_PORT 2>/dev/null || true)

if [ -z "$MAIN_FINAL" ] && [ -z "$ADMIN_FINAL" ]; then
    log_success "모든 서버가 중지되었습니다."
else
    log_error "일부 프로세스가 종료되지 않았습니다."
    [ -n "$MAIN_FINAL" ] && log_error "포트 $MAIN_PORT: PID $MAIN_FINAL"
    [ -n "$ADMIN_FINAL" ] && log_error "포트 $ADMIN_PORT: PID $ADMIN_FINAL"
    echo ""
    echo "수동으로 종료하려면:"
    [ -n "$MAIN_FINAL" ] && echo "  kill -9 $MAIN_FINAL"
    [ -n "$ADMIN_FINAL" ] && echo "  kill -9 $ADMIN_FINAL"
fi
