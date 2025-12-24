#!/bin/bash

# Quick Admin Port Fix - 빠른 Admin 포트 3011 수정
# 현재 실행 중인 Admin 서버를 포트 3011로 즉시 변경

echo "⚡ Quick Admin Port Fix - 포트 3011로 즉시 변경"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""

# 1. 현재 실행 중인 Admin 서버 종료
log_info "1. 현재 Admin 서버 종료 중..."

# 포트 3001에서 실행 중인 프로세스 종료
PID_3001=$(lsof -t -i :3001 2>/dev/null || echo "")
if [ -n "$PID_3001" ]; then
    log_info "포트 3001 프로세스 종료 중... (PID: $PID_3001)"
    kill -TERM $PID_3001 2>/dev/null || true
    sleep 2
    kill -KILL $PID_3001 2>/dev/null || true
    log_success "✅ 포트 3001 프로세스 종료 완료"
fi

# PM2 Admin 프로세스 종료
pm2 stop msp-checklist-admin 2>/dev/null || true
pm2 delete msp-checklist-admin 2>/dev/null || true

echo ""

# 2. Admin 디렉토리에서 포트 3011로 직접 시작
log_info "2. Admin 서버를 포트 3011에서 시작 중..."

ADMIN_DIR="/opt/msp-checklist-system/msp-checklist/admin"
if [ -d "$ADMIN_DIR" ]; then
    cd "$ADMIN_DIR"
    
    # 환경 변수 설정
    export NODE_ENV=production
    export PORT=3011
    export HOST=0.0.0.0
    export NEXT_TELEMETRY_DISABLED=1
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    # 포트 3011로 강제 시작
    log_info "포트 3011에서 Admin 서버 시작 중..."
    
    # 백그라운드로 시작
    PORT=3011 npm start > /tmp/admin-3011.log 2>&1 &
    ADMIN_PID=$!
    
    echo $ADMIN_PID > /tmp/admin-3011.pid
    log_success "✅ Admin 서버 시작됨 (PID: $ADMIN_PID)"
    
    # 시작 대기
    log_info "서버 시작 대기 중..."
    sleep 5
    
    # 포트 확인
    if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
        log_success "🎉 Admin 서버가 포트 3011에서 실행 중입니다!"
        
        # HTTP 테스트
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
            log_success "✅ HTTP 응답 성공! (HTTP $HTTP_CODE)"
        else
            log_info "⏳ HTTP 응답 대기 중... (HTTP $HTTP_CODE)"
        fi
        
        echo ""
        echo "📋 접속 정보:"
        echo "  🌐 직접 접속: http://localhost:3011"
        echo "  🔗 Nginx 프록시: http://localhost/admin"
        echo ""
        echo "🔧 관리 명령어:"
        echo "  📊 로그 확인: tail -f /tmp/admin-3011.log"
        echo "  🛑 서버 중지: kill $ADMIN_PID"
        echo "  🔄 재시작: ./quick-admin-port-fix.sh"
        
    else
        log_error "❌ 포트 3011에서 서버 시작 실패"
        
        # 로그 확인
        if [ -f "/tmp/admin-3011.log" ]; then
            echo ""
            log_info "오류 로그:"
            tail -10 /tmp/admin-3011.log
        fi
    fi
    
else
    log_error "❌ Admin 디렉토리를 찾을 수 없습니다: $ADMIN_DIR"
    exit 1
fi

echo ""
echo "⚡ Quick Admin Port Fix 완료!"