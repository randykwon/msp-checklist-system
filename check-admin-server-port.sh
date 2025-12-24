#!/bin/bash

# Admin Server Port 3011 확인 스크립트
# Admin 서버가 포트 3011로 제대로 설정되어 있는지 확인

echo "🔍 Admin Server 포트 3011 설정 확인 중..."

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
echo "=== Admin Server 포트 3011 설정 확인 ==="
echo ""

# 1. PM2 프로세스 상태 확인
log_info "1. PM2 프로세스 상태 확인"
if command -v pm2 > /dev/null; then
    pm2 list
    echo ""
    
    # Admin 프로세스 확인
    ADMIN_PROCESS=$(pm2 list | grep "msp-checklist-admin" || echo "")
    if [ -n "$ADMIN_PROCESS" ]; then
        log_success "✅ Admin 프로세스 발견됨"
        echo "$ADMIN_PROCESS"
    else
        log_warning "⚠️ Admin 프로세스가 PM2에서 발견되지 않음"
    fi
else
    log_error "❌ PM2가 설치되지 않음"
fi

echo ""

# 2. 포트 3011 리스닝 상태 확인
log_info "2. 포트 3011 리스닝 상태 확인"
if netstat -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 포트 3011이 리스닝 중입니다"
    netstat -tuln | grep ":3011 "
elif ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 포트 3011이 리스닝 중입니다"
    ss -tuln | grep ":3011 "
else
    log_warning "⚠️ 포트 3011이 리스닝되지 않음"
fi

echo ""

# 3. 포트 3011을 사용하는 프로세스 확인
log_info "3. 포트 3011을 사용하는 프로세스 확인"
PORT_PROCESS=$(lsof -i :3011 2>/dev/null || echo "")
if [ -n "$PORT_PROCESS" ]; then
    log_success "✅ 포트 3011을 사용하는 프로세스 발견됨"
    echo "$PORT_PROCESS"
else
    log_warning "⚠️ 포트 3011을 사용하는 프로세스 없음"
fi

echo ""

# 4. Admin 디렉토리 및 설정 파일 확인
log_info "4. Admin 디렉토리 및 설정 파일 확인"
PROJECT_DIR="/opt/msp-checklist-system/msp-checklist"
ADMIN_DIR="$PROJECT_DIR/admin"

if [ -d "$ADMIN_DIR" ]; then
    log_success "✅ Admin 디렉토리 존재: $ADMIN_DIR"
    
    # Admin package.json 확인
    if [ -f "$ADMIN_DIR/package.json" ]; then
        log_info "Admin package.json 내용:"
        cat "$ADMIN_DIR/package.json" | grep -A 5 -B 5 "scripts\|name\|version" || echo "스크립트 섹션 없음"
    else
        log_warning "⚠️ Admin package.json 파일 없음"
    fi
    
    echo ""
    
    # Admin .env.local 확인
    if [ -f "$ADMIN_DIR/.env.local" ]; then
        log_info "Admin .env.local 포트 설정:"
        grep -i "port" "$ADMIN_DIR/.env.local" || echo "포트 설정 없음"
    else
        log_warning "⚠️ Admin .env.local 파일 없음"
    fi
    
else
    log_error "❌ Admin 디렉토리 없음: $ADMIN_DIR"
fi

echo ""

# 5. PM2 ecosystem.config.js 확인
log_info "5. PM2 ecosystem.config.js 확인"
ECOSYSTEM_FILE="/opt/msp-checklist-system/ecosystem.config.js"
if [ -f "$ECOSYSTEM_FILE" ]; then
    log_success "✅ ecosystem.config.js 파일 존재"
    log_info "Admin 관련 설정:"
    grep -A 20 -B 5 "msp-checklist-admin\|PORT.*3011" "$ECOSYSTEM_FILE" || echo "Admin 설정 없음"
else
    log_warning "⚠️ ecosystem.config.js 파일 없음"
fi

echo ""

# 6. Nginx 설정에서 Admin 프록시 확인
log_info "6. Nginx Admin 프록시 설정 확인"
if [ -f "/etc/nginx/sites-available/msp-checklist" ]; then
    log_info "Ubuntu Nginx 설정에서 Admin 관련 부분:"
    grep -A 10 -B 5 "admin\|3011" "/etc/nginx/sites-available/msp-checklist" || echo "Admin 설정 없음"
elif [ -f "/etc/nginx/conf.d/msp-checklist.conf" ]; then
    log_info "Amazon Linux Nginx 설정에서 Admin 관련 부분:"
    grep -A 10 -B 5 "admin\|3011" "/etc/nginx/conf.d/msp-checklist.conf" || echo "Admin 설정 없음"
else
    log_warning "⚠️ Nginx MSP Checklist 설정 파일 없음"
fi

echo ""

# 7. HTTP 연결 테스트
log_info "7. Admin 서버 HTTP 연결 테스트"

# 직접 포트 3011 테스트
log_info "포트 3011 직접 연결 테스트:"
DIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 2>/dev/null || echo "000")
if [[ "$DIRECT_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ 포트 3011 직접 연결 성공 (HTTP $DIRECT_CODE)"
else
    log_warning "⚠️ 포트 3011 직접 연결 실패 (HTTP $DIRECT_CODE)"
fi

# Nginx를 통한 /admin 경로 테스트
log_info "Nginx /admin 경로 테스트:"
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
if [[ "$ADMIN_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ /admin 경로 연결 성공 (HTTP $ADMIN_CODE)"
else
    log_warning "⚠️ /admin 경로 연결 실패 (HTTP $ADMIN_CODE)"
fi

echo ""

# 8. 종합 진단 및 권장사항
log_info "8. 종합 진단 및 권장사항"
echo ""

# 포트 3011 상태 종합
if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    if [[ "$DIRECT_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "🎉 Admin 서버가 포트 3011에서 정상 작동 중입니다!"
    else
        log_warning "⚠️ 포트 3011은 리스닝 중이지만 HTTP 응답에 문제가 있습니다"
        echo "   권장사항: PM2 로그 확인 - pm2 logs msp-checklist-admin"
    fi
else
    log_error "❌ Admin 서버가 포트 3011에서 실행되지 않고 있습니다"
    echo ""
    echo "🔧 문제 해결 방법:"
    echo "1. PM2로 Admin 서버 시작:"
    echo "   cd /opt/msp-checklist-system"
    echo "   pm2 start ecosystem.config.js"
    echo ""
    echo "2. Admin 디렉토리에서 직접 시작:"
    echo "   cd /opt/msp-checklist-system/msp-checklist/admin"
    echo "   PORT=3011 npm start"
    echo ""
    echo "3. 로그 확인:"
    echo "   pm2 logs"
    echo "   pm2 logs msp-checklist-admin"
fi

# Nginx 프록시 상태
if [[ "$ADMIN_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "🌐 Nginx Admin 프록시가 정상 작동 중입니다!"
else
    log_warning "⚠️ Nginx Admin 프록시에 문제가 있을 수 있습니다"
    echo "   권장사항: Nginx 설정 확인 및 재시작"
    echo "   sudo nginx -t && sudo systemctl restart nginx"
fi

echo ""
echo "=== Admin Server 포트 3011 확인 완료 ==="