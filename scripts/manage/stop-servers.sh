#!/bin/bash

# ============================================================================
# MSP Checklist System - 서버 중지 스크립트
# ============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              MSP Checklist - 서버 중지                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# PID 파일로 종료
if [ -f "$PROJECT_DIR/main-server.pid" ]; then
    PID=$(cat "$PROJECT_DIR/main-server.pid")
    kill $PID 2>/dev/null && log_success "메인 서버 종료됨 (PID: $PID)"
    rm -f "$PROJECT_DIR/main-server.pid"
fi

if [ -f "$PROJECT_DIR/admin-server.pid" ]; then
    PID=$(cat "$PROJECT_DIR/admin-server.pid")
    kill $PID 2>/dev/null && log_success "Admin 서버 종료됨 (PID: $PID)"
    rm -f "$PROJECT_DIR/admin-server.pid"
fi

# 포트로 프로세스 종료
pkill -f "next.*$MAIN_PORT" 2>/dev/null || true
pkill -f "next.*$ADMIN_PORT" 2>/dev/null || true

log_success "모든 서버가 중지되었습니다."
