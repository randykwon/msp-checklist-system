#!/bin/bash

# Nginx 설치 및 상태 확인 스크립트

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}🔍 Nginx 설치 및 상태 확인${NC}"
echo "=========================="
echo ""

# 1. OS 정보 확인
log_info "운영체제 정보 확인 중..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "  - OS: $NAME $VERSION"
    echo "  - ID: $ID"
    echo "  - Version ID: $VERSION_ID"
else
    log_warning "OS 정보를 확인할 수 없습니다."
fi

echo ""

# 2. Nginx 설치 상태 확인
log_info "Nginx 설치 상태 확인 중..."

if command -v nginx > /dev/null 2>&1; then
    NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
    log_success "✅ Nginx 설치됨: 버전 $NGINX_VERSION"
    
    # Nginx 바이너리 위치
    NGINX_PATH=$(which nginx)
    echo "  - 바이너리 위치: $NGINX_PATH"
    
    # 설치 방법 추정
    if rpm -q nginx > /dev/null 2>&1; then
        echo "  - 설치 방법: RPM 패키지 (dnf/yum)"
    elif dpkg -l | grep -q nginx > /dev/null 2>&1; then
        echo "  - 설치 방법: DEB 패키지 (apt)"
    else
        echo "  - 설치 방법: 소스 컴파일 또는 기타"
    fi
else
    log_error "❌ Nginx가 설치되지 않음"
    echo ""
    echo "Nginx 설치 방법:"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" ]]; then
            echo "  Ubuntu: sudo apt update && sudo apt install nginx"
        elif [[ "$ID" == "amzn" ]]; then
            echo "  Amazon Linux: sudo dnf install nginx"
        elif [[ "$ID" == "centos" ]] || [[ "$ID" == "rhel" ]]; then
            echo "  CentOS/RHEL: sudo dnf install nginx"
        fi
    fi
    exit 1
fi

echo ""

# 3. Nginx 서비스 상태 확인
log_info "Nginx 서비스 상태 확인 중..."

if systemctl is-active --quiet nginx; then
    log_success "✅ Nginx 서비스 실행 중"
    
    # 서비스 상세 정보
    echo "  - 상태: $(systemctl is-active nginx)"
    echo "  - 활성화: $(systemctl is-enabled nginx)"
    
    # 프로세스 정보
    NGINX_PID=$(pgrep -f "nginx: master" | head -1)
    if [ -n "$NGINX_PID" ]; then
        echo "  - 마스터 프로세스 PID: $NGINX_PID"
        WORKER_COUNT=$(pgrep -f "nginx: worker" | wc -l)
        echo "  - 워커 프로세스 수: $WORKER_COUNT"
    fi
    
else
    log_warning "⚠️ Nginx 서비스가 실행되지 않음"
    echo "  - 상태: $(systemctl is-active nginx)"
    echo "  - 활성화: $(systemctl is-enabled nginx)"
    
    echo ""
    echo "서비스 시작 방법:"
    echo "  sudo systemctl start nginx"
    echo "  sudo systemctl enable nginx"
fi

echo ""

# 4. 포트 확인
log_info "포트 사용 상태 확인 중..."

# 포트 80 확인
if netstat -tuln 2>/dev/null | grep -q ":80 " || ss -tuln 2>/dev/null | grep -q ":80 "; then
    log_success "✅ 포트 80 (HTTP) 리스닝 중"
    PORT_80_PROCESS=$(netstat -tulnp 2>/dev/null | grep ":80 " | awk '{print $7}' | head -1)
    if [ -n "$PORT_80_PROCESS" ]; then
        echo "  - 프로세스: $PORT_80_PROCESS"
    fi
else
    log_warning "⚠️ 포트 80 (HTTP) 리스닝하지 않음"
fi

# 포트 443 확인
if netstat -tuln 2>/dev/null | grep -q ":443 " || ss -tuln 2>/dev/null | grep -q ":443 "; then
    log_success "✅ 포트 443 (HTTPS) 리스닝 중"
    PORT_443_PROCESS=$(netstat -tulnp 2>/dev/null | grep ":443 " | awk '{print $7}' | head -1)
    if [ -n "$PORT_443_PROCESS" ]; then
        echo "  - 프로세스: $PORT_443_PROCESS"
    fi
else
    log_warning "⚠️ 포트 443 (HTTPS) 리스닝하지 않음"
fi

echo ""

# 5. 설정 파일 확인
log_info "Nginx 설정 파일 확인 중..."

# 메인 설정 파일
if [ -f /etc/nginx/nginx.conf ]; then
    log_success "✅ 메인 설정 파일 존재: /etc/nginx/nginx.conf"
    
    # 설정 파일 문법 검사
    if nginx -t > /dev/null 2>&1; then
        log_success "✅ 설정 파일 문법 검사 통과"
    else
        log_error "❌ 설정 파일 문법 오류"
        echo "  오류 내용:"
        nginx -t 2>&1 | sed 's/^/    /'
    fi
else
    log_error "❌ 메인 설정 파일 없음: /etc/nginx/nginx.conf"
fi

# 추가 설정 파일들
echo ""
echo "📁 설정 파일 구조:"

if [ -d /etc/nginx/conf.d ]; then
    echo "  /etc/nginx/conf.d/:"
    ls -la /etc/nginx/conf.d/ | sed 's/^/    /'
fi

if [ -d /etc/nginx/sites-available ]; then
    echo "  /etc/nginx/sites-available/:"
    ls -la /etc/nginx/sites-available/ | sed 's/^/    /'
fi

if [ -d /etc/nginx/sites-enabled ]; then
    echo "  /etc/nginx/sites-enabled/:"
    ls -la /etc/nginx/sites-enabled/ | sed 's/^/    /'
fi

echo ""

# 6. MSP Checklist 설정 확인
log_info "MSP Checklist 설정 확인 중..."

MSP_CONFIG_FOUND=false

# Ubuntu 스타일 확인
if [ -f /etc/nginx/sites-available/msp-checklist ]; then
    log_success "✅ MSP Checklist 설정 파일 발견: /etc/nginx/sites-available/msp-checklist"
    MSP_CONFIG_FOUND=true
    
    if [ -L /etc/nginx/sites-enabled/msp-checklist ]; then
        log_success "✅ MSP Checklist 설정 활성화됨"
    else
        log_warning "⚠️ MSP Checklist 설정이 활성화되지 않음"
    fi
fi

# Amazon Linux 스타일 확인
if [ -f /etc/nginx/conf.d/msp-checklist.conf ]; then
    log_success "✅ MSP Checklist 설정 파일 발견: /etc/nginx/conf.d/msp-checklist.conf"
    MSP_CONFIG_FOUND=true
fi

if [ "$MSP_CONFIG_FOUND" = false ]; then
    log_warning "⚠️ MSP Checklist 전용 설정 파일이 없음"
fi

echo ""

# 7. 로그 파일 확인
log_info "로그 파일 확인 중..."

if [ -f /var/log/nginx/access.log ]; then
    ACCESS_LOG_SIZE=$(du -h /var/log/nginx/access.log | cut -f1)
    log_success "✅ 액세스 로그: /var/log/nginx/access.log ($ACCESS_LOG_SIZE)"
else
    log_warning "⚠️ 액세스 로그 파일 없음"
fi

if [ -f /var/log/nginx/error.log ]; then
    ERROR_LOG_SIZE=$(du -h /var/log/nginx/error.log | cut -f1)
    log_success "✅ 에러 로그: /var/log/nginx/error.log ($ERROR_LOG_SIZE)"
    
    # 최근 에러 확인
    RECENT_ERRORS=$(tail -10 /var/log/nginx/error.log 2>/dev/null | grep -c "error\|emerg\|alert\|crit" || echo "0")
    if [ "$RECENT_ERRORS" -gt 0 ]; then
        log_warning "⚠️ 최근 에러 로그에 $RECENT_ERRORS개의 오류 발견"
        echo "  최근 오류들:"
        tail -5 /var/log/nginx/error.log 2>/dev/null | grep "error\|emerg\|alert\|crit" | sed 's/^/    /' || echo "    (오류 내용을 읽을 수 없음)"
    fi
else
    log_warning "⚠️ 에러 로그 파일 없음"
fi

# MSP Checklist 전용 로그
if [ -f /var/log/nginx/msp-checklist-access.log ]; then
    MSP_ACCESS_LOG_SIZE=$(du -h /var/log/nginx/msp-checklist-access.log | cut -f1)
    log_success "✅ MSP 액세스 로그: /var/log/nginx/msp-checklist-access.log ($MSP_ACCESS_LOG_SIZE)"
fi

if [ -f /var/log/nginx/msp-checklist-error.log ]; then
    MSP_ERROR_LOG_SIZE=$(du -h /var/log/nginx/msp-checklist-error.log | cut -f1)
    log_success "✅ MSP 에러 로그: /var/log/nginx/msp-checklist-error.log ($MSP_ERROR_LOG_SIZE)"
fi

echo ""

# 8. HTTP 응답 테스트
log_info "HTTP 응답 테스트 중..."

if command -v curl > /dev/null 2>&1; then
    # 로컬 테스트
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 응답 테스트 통과 (HTTP $HTTP_CODE)"
    else
        log_warning "⚠️ HTTP 응답 테스트 실패 (HTTP $HTTP_CODE)"
    fi
    
    # 관리자 페이지 테스트
    ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ "$ADMIN_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ 관리자 페이지 응답 테스트 통과 (HTTP $ADMIN_CODE)"
    else
        log_warning "⚠️ 관리자 페이지 응답 테스트 실패 (HTTP $ADMIN_CODE)"
    fi
else
    log_warning "⚠️ curl이 설치되지 않아 HTTP 테스트를 건너뜁니다"
fi

echo ""

# 9. Node.js 서버 연동 확인
log_info "Node.js 서버 연동 확인 중..."

# 포트 3010 (메인 서버) 확인
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    log_success "✅ 메인 서버 (포트 3010) 실행 중"
else
    log_warning "⚠️ 메인 서버 (포트 3010) 실행되지 않음"
fi

# 포트 3011 (관리자 서버) 확인
if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 관리자 서버 (포트 3011) 실행 중"
else
    log_warning "⚠️ 관리자 서버 (포트 3011) 실행되지 않음"
fi

echo ""

# 10. 방화벽 상태 확인
log_info "방화벽 상태 확인 중..."

if command -v ufw > /dev/null 2>&1; then
    UFW_STATUS=$(ufw status | head -1)
    echo "  - UFW: $UFW_STATUS"
    
    if ufw status | grep -q "80/tcp"; then
        log_success "✅ UFW에서 포트 80 허용됨"
    else
        log_warning "⚠️ UFW에서 포트 80이 허용되지 않음"
    fi
    
elif command -v firewall-cmd > /dev/null 2>&1; then
    if systemctl is-active --quiet firewalld; then
        log_success "✅ firewalld 실행 중"
        
        if firewall-cmd --list-services | grep -q http; then
            log_success "✅ firewalld에서 HTTP 서비스 허용됨"
        else
            log_warning "⚠️ firewalld에서 HTTP 서비스가 허용되지 않음"
        fi
    else
        log_warning "⚠️ firewalld가 실행되지 않음"
    fi
else
    log_warning "⚠️ 방화벽 도구를 찾을 수 없음"
fi

echo ""

# 11. 외부 접속 정보
log_info "외부 접속 정보 확인 중..."

# 공용 IP 확인
if command -v curl > /dev/null 2>&1; then
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "확인 불가")
    echo "  - 공용 IP: $PUBLIC_IP"
else
    echo "  - 공용 IP: 확인 불가 (curl 없음)"
fi

# 로컬 IP 확인
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "확인 불가")
echo "  - 로컬 IP: $LOCAL_IP"

echo ""

# 12. 요약 및 권장사항
echo -e "${BLUE}📋 요약 및 권장사항${NC}"
echo "==================="

if systemctl is-active --quiet nginx && nginx -t > /dev/null 2>&1; then
    log_success "✅ Nginx가 정상적으로 설치되고 실행 중입니다"
else
    log_warning "⚠️ Nginx에 문제가 있습니다"
fi

echo ""
echo "🔧 유용한 명령어:"
echo "  - 상태 확인: sudo systemctl status nginx"
echo "  - 설정 테스트: sudo nginx -t"
echo "  - 재시작: sudo systemctl restart nginx"
echo "  - 로그 확인: sudo tail -f /var/log/nginx/error.log"
echo "  - 종합 테스트: ./test-nginx-setup.sh"

if [ "$PUBLIC_IP" != "확인 불가" ]; then
    echo ""
    echo "🌐 접속 주소:"
    echo "  - 메인 서비스: http://$PUBLIC_IP"
    echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
fi

echo ""
echo "확인 완료!"