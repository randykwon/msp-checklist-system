#!/bin/bash

# Nginx + Node.js 설정 검증 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "🔍 MSP 체크리스트 시스템 설정 검증"
echo "=================================="
echo ""

# 1. 시스템 요구사항 확인
log_info "1. 시스템 요구사항 확인 중..."

# Node.js 버전 확인
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 20 ]; then
        log_success "Node.js $NODE_VERSION (요구사항: v20.9.0+)"
    else
        log_error "Node.js 버전이 낮습니다: $NODE_VERSION (요구사항: v20.9.0+)"
    fi
else
    log_error "Node.js가 설치되지 않았습니다"
fi

# PM2 확인
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    log_success "PM2 $PM2_VERSION 설치됨"
else
    log_error "PM2가 설치되지 않았습니다"
fi

# Nginx 확인
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d' ' -f3)
    log_success "Nginx $NGINX_VERSION 설치됨"
else
    log_error "Nginx가 설치되지 않았습니다"
fi

echo ""

# 2. 포트 사용 확인
log_info "2. 포트 사용 상태 확인 중..."

check_port() {
    local port=$1
    local service=$2
    
    if sudo netstat -tlnp | grep ":$port " > /dev/null; then
        local process=$(sudo netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f2)
        log_success "포트 $port: $service ($process)"
    else
        log_warning "포트 $port: $service (사용되지 않음)"
    fi
}

check_port 80 "HTTP (Nginx)"
check_port 443 "HTTPS (Nginx)"
check_port 3010 "메인 애플리케이션"
check_port 3011 "관리자 애플리케이션"

echo ""

# 3. Nginx 설정 확인
log_info "3. Nginx 설정 확인 중..."

if sudo nginx -t &> /dev/null; then
    log_success "Nginx 설정 문법 검사 통과"
else
    log_error "Nginx 설정 오류 발견"
    sudo nginx -t
fi

# Nginx 서비스 상태
if systemctl is-active --quiet nginx; then
    log_success "Nginx 서비스 실행 중"
else
    log_error "Nginx 서비스가 실행되지 않음"
fi

# Nginx 설정 파일 확인
if [ -f "/etc/nginx/sites-available/msp-checklist.conf" ] || [ -f "/etc/nginx/conf.d/msp-checklist.conf" ]; then
    log_success "MSP 체크리스트 Nginx 설정 파일 존재"
else
    log_warning "MSP 체크리스트 Nginx 설정 파일이 없습니다"
fi

echo ""

# 4. PM2 프로세스 확인
log_info "4. PM2 프로세스 확인 중..."

if pm2 list | grep -q "msp-main"; then
    MAIN_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="msp-main") | .pm2_env.status' 2>/dev/null || echo "unknown")
    if [ "$MAIN_STATUS" = "online" ]; then
        log_success "메인 애플리케이션: 실행 중"
    else
        log_error "메인 애플리케이션: $MAIN_STATUS"
    fi
else
    log_warning "메인 애플리케이션이 PM2에 등록되지 않음"
fi

if pm2 list | grep -q "msp-admin"; then
    ADMIN_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="msp-admin") | .pm2_env.status' 2>/dev/null || echo "unknown")
    if [ "$ADMIN_STATUS" = "online" ]; then
        log_success "관리자 애플리케이션: 실행 중"
    else
        log_error "관리자 애플리케이션: $ADMIN_STATUS"
    fi
else
    log_warning "관리자 애플리케이션이 PM2에 등록되지 않음"
fi

echo ""

# 5. 애플리케이션 접근성 테스트
log_info "5. 애플리케이션 접근성 테스트 중..."

# 로컬 접근 테스트
if curl -s --max-time 5 http://localhost:3010 > /dev/null; then
    log_success "메인 애플리케이션 (포트 3010): 접근 가능"
else
    log_error "메인 애플리케이션 (포트 3010): 접근 불가"
fi

if curl -s --max-time 5 http://localhost:3011 > /dev/null; then
    log_success "관리자 애플리케이션 (포트 3011): 접근 가능"
else
    log_error "관리자 애플리케이션 (포트 3011): 접근 불가"
fi

# Nginx를 통한 접근 테스트
if curl -s --max-time 5 http://localhost > /dev/null; then
    log_success "Nginx 프록시 (포트 80): 접근 가능"
else
    log_error "Nginx 프록시 (포트 80): 접근 불가"
fi

echo ""

# 6. 방화벽 설정 확인
log_info "6. 방화벽 설정 확인 중..."

# OS 감지
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
fi

if [[ "$OS" == *"Ubuntu"* ]]; then
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            log_success "UFW 방화벽 활성화됨"
            if ufw status | grep -q "Nginx Full"; then
                log_success "Nginx Full 규칙 허용됨"
            else
                log_warning "Nginx Full 규칙이 설정되지 않음"
            fi
        else
            log_warning "UFW 방화벽이 비활성화됨"
        fi
    fi
else
    if command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            log_success "firewalld 방화벽 활성화됨"
            if firewall-cmd --list-services | grep -q "http"; then
                log_success "HTTP 서비스 허용됨"
            else
                log_warning "HTTP 서비스가 허용되지 않음"
            fi
            if firewall-cmd --list-services | grep -q "https"; then
                log_success "HTTPS 서비스 허용됨"
            else
                log_warning "HTTPS 서비스가 허용되지 않음"
            fi
        else
            log_warning "firewalld 방화벽이 비활성화됨"
        fi
    fi
fi

echo ""

# 7. SSL 인증서 확인
log_info "7. SSL 인증서 확인 중..."

if command -v certbot &> /dev/null; then
    log_success "Certbot 설치됨"
    
    # 인증서 목록 확인
    CERT_COUNT=$(sudo certbot certificates 2>/dev/null | grep -c "Certificate Name:" || echo "0")
    if [ "$CERT_COUNT" -gt 0 ]; then
        log_success "$CERT_COUNT개의 SSL 인증서 발견"
    else
        log_warning "SSL 인증서가 설정되지 않음"
    fi
else
    log_warning "Certbot이 설치되지 않음"
fi

echo ""

# 8. 로그 파일 확인
log_info "8. 로그 파일 확인 중..."

check_log_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        local size=$(du -h "$file" | cut -f1)
        log_success "$description: $file ($size)"
    else
        log_warning "$description: $file (없음)"
    fi
}

check_log_file "/var/log/nginx/msp-checklist-access.log" "Nginx 접근 로그"
check_log_file "/var/log/nginx/msp-checklist-error.log" "Nginx 에러 로그"
check_log_file "/opt/msp-checklist/logs/main-combined.log" "메인 앱 로그"
check_log_file "/opt/msp-checklist/logs/admin-combined.log" "관리자 앱 로그"

echo ""

# 9. 디스크 및 메모리 사용량 확인
log_info "9. 시스템 리소스 확인 중..."

# 디스크 사용량
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    log_success "디스크 사용량: ${DISK_USAGE}% (양호)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    log_warning "디스크 사용량: ${DISK_USAGE}% (주의)"
else
    log_error "디스크 사용량: ${DISK_USAGE}% (위험)"
fi

# 메모리 사용량
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    log_success "메모리 사용량: ${MEMORY_USAGE}% (양호)"
elif [ "$MEMORY_USAGE" -lt 90 ]; then
    log_warning "메모리 사용량: ${MEMORY_USAGE}% (주의)"
else
    log_error "메모리 사용량: ${MEMORY_USAGE}% (위험)"
fi

echo ""

# 10. 요약
log_info "10. 검증 요약"

echo ""
echo "🔧 권장 사항:"
echo "- 정기적으로 시스템 업데이트를 수행하세요"
echo "- PM2 로그를 모니터링하세요: pm2 logs"
echo "- Nginx 로그를 확인하세요: sudo tail -f /var/log/nginx/msp-checklist-*.log"
echo "- SSL 인증서 자동 갱신을 설정하세요"
echo "- 정기적인 백업을 수행하세요"
echo ""

echo "🚀 유용한 명령어:"
echo "- PM2 상태: pm2 status"
echo "- PM2 모니터링: pm2 monit"
echo "- Nginx 재시작: sudo systemctl restart nginx"
echo "- 헬스 체크: ./health-check.sh"
echo "- 실시간 모니터링: ./monitor.sh"
echo ""

log_success "검증 완료!"