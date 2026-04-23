#!/bin/bash

# ============================================================================
# MSP Checklist System - 서버 상태 확인 스크립트
# ============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              MSP Checklist - 서버 상태                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 포트 상태 확인
check_port() {
    local port=$1
    local name=$2
    
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null | grep -qE "200|302"; then
        echo -e "  $name (포트 $port): ${GREEN}● 실행 중${NC}"
    else
        echo -e "  $name (포트 $port): ${RED}○ 중지됨${NC}"
    fi
}

echo "서비스 상태:"
check_port $MAIN_PORT "메인 앱"
check_port $ADMIN_PORT "Admin 앱"

# Nginx 상태
echo ""
echo "Nginx 상태:"
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "  Nginx: ${GREEN}● 실행 중${NC}"
else
    echo -e "  Nginx: ${YELLOW}○ 중지됨 또는 미설치${NC}"
fi

# 프로세스 확인
echo ""
echo "Node.js 프로세스:"
ps aux | grep -E "next.*($MAIN_PORT|$ADMIN_PORT)" | grep -v grep || echo "  실행 중인 프로세스 없음"

# 디스크 사용량
echo ""
echo "디스크 사용량:"
df -h / | tail -1 | awk '{print "  사용: " $3 " / " $2 " (" $5 ")"}'
