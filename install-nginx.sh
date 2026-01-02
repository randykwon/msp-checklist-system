#!/bin/bash

# ============================================================================
# Nginx 설치 스크립트
# 
# 이 스크립트는 Nginx만 설치합니다.
# Node.js 앱 연동 설정은 setup-nginx-node.sh를 사용하세요.
#
# 지원 OS: Amazon Linux 2023, Ubuntu 20.04/22.04/24.04
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 배너
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Nginx 설치 스크립트                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    log_error "이 스크립트는 root 권한이 필요합니다."
    echo "다음 명령어로 실행하세요: sudo $0"
    exit 1
fi

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
    else
        log_error "지원되지 않는 운영체제입니다."
        exit 1
    fi
    
    log_info "감지된 OS: $OS_ID $OS_VERSION"
}

# Amazon Linux 2023에 Nginx 설치
install_nginx_amazon_linux() {
    log_info "Amazon Linux 2023에 Nginx 설치 중..."
    
    dnf install -y nginx
    
    log_success "Nginx 설치 완료"
}

# Ubuntu에 Nginx 설치
install_nginx_ubuntu() {
    log_info "Ubuntu에 Nginx 설치 중..."
    
    apt-get update
    apt-get install -y nginx
    
    log_success "Nginx 설치 완료"
}

# Nginx 서비스 시작 및 활성화
start_nginx() {
    log_info "Nginx 서비스 시작 중..."
    
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx 서비스 시작됨"
}

# 방화벽 설정
configure_firewall() {
    log_info "방화벽 설정 중..."
    
    if command -v firewall-cmd &> /dev/null; then
        # firewalld (Amazon Linux, CentOS, RHEL)
        firewall-cmd --permanent --add-service=http 2>/dev/null || true
        firewall-cmd --permanent --add-service=https 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        log_success "firewalld 설정 완료"
    elif command -v ufw &> /dev/null; then
        # ufw (Ubuntu)
        ufw allow 'Nginx Full' 2>/dev/null || true
        log_success "ufw 설정 완료"
    else
        log_warning "방화벽이 감지되지 않았습니다. 수동으로 포트 80, 443을 열어주세요."
    fi
}

# 설치 확인
verify_installation() {
    log_info "설치 확인 중..."
    
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx 설치 실패"
        exit 1
    fi
    
    NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
    log_success "Nginx 버전: $NGINX_VERSION"
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx 서비스 상태: 실행 중"
    else
        log_warning "Nginx 서비스 상태: 중지됨"
    fi
}

# 메인 실행
main() {
    detect_os
    
    case "$OS_ID" in
        amzn|amazon)
            install_nginx_amazon_linux
            ;;
        ubuntu)
            install_nginx_ubuntu
            ;;
        *)
            log_error "지원되지 않는 OS입니다: $OS_ID"
            log_info "지원 OS: Amazon Linux 2023, Ubuntu"
            exit 1
            ;;
    esac
    
    start_nginx
    configure_firewall
    verify_installation
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Nginx 설치 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. Node.js 앱 연동: sudo ./setup-nginx-node.sh"
    echo "  2. SSL 설정: sudo ./setup-nginx-ssl.sh (선택사항)"
    echo ""
    echo "유용한 명령어:"
    echo "  - 상태 확인: sudo systemctl status nginx"
    echo "  - 재시작: sudo systemctl restart nginx"
    echo "  - 설정 테스트: sudo nginx -t"
    echo ""
}

main "$@"
