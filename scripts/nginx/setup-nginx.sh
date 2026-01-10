#!/bin/bash
#===============================================================================
# MSP 어드바이저 - Nginx 설정 스크립트
#
# 사용법:
#   ./setup-nginx.sh                    # 기본 설정 (mychecker.com)
#   ./setup-nginx.sh --domain example.com  # 도메인 지정
#   ./setup-nginx.sh --ssl              # SSL 인증서 발급 포함
#   ./setup-nginx.sh --uninstall        # Nginx 설정 제거
#
# 요구사항:
#   - Amazon Linux 2023 / Amazon Linux 2 / Ubuntu
#   - sudo 권한
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 기본 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_TEMPLATE="${SCRIPT_DIR}/msp-checklist.conf"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_CONF_FILE="${NGINX_CONF_DIR}/msp-checklist.conf"
DEFAULT_DOMAIN="mychecker.com"

# 옵션 파싱
DOMAIN=""
ENABLE_SSL=false
UNINSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --ssl)
            ENABLE_SSL=true
            shift
            ;;
        --uninstall)
            UNINSTALL=true
            shift
            ;;
        --help|-h)
            echo "사용법: $0 [옵션]"
            echo ""
            echo "옵션:"
            echo "  --domain <도메인>  서버 도메인 설정 (기본: mychecker.com)"
            echo "  --ssl              Let's Encrypt SSL 인증서 발급"
            echo "  --uninstall        Nginx 설정 제거"
            echo "  --help             도움말 표시"
            exit 0
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            exit 1
            ;;
    esac
done

# 도메인 기본값
DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          MSP 어드바이저 - Nginx 설정 스크립트                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            amzn)
                OS_TYPE="amazon"
                PKG_MANAGER="yum"
                ;;
            ubuntu|debian)
                OS_TYPE="ubuntu"
                PKG_MANAGER="apt-get"
                ;;
            *)
                OS_TYPE="linux"
                PKG_MANAGER="yum"
                ;;
        esac
    else
        log_error "지원되지 않는 운영체제입니다."
        exit 1
    fi
    log_info "OS 감지: $OS_TYPE"
}

# Nginx 설치
install_nginx() {
    log_info "Nginx 설치 확인 중..."
    
    if command -v nginx &> /dev/null; then
        log_success "Nginx가 이미 설치되어 있습니다: $(nginx -v 2>&1)"
        return 0
    fi
    
    log_info "Nginx 설치 중..."
    
    if [ "$PKG_MANAGER" = "yum" ]; then
        sudo yum install -y nginx
    else
        sudo apt-get update
        sudo apt-get install -y nginx
    fi
    
    log_success "Nginx 설치 완료"
}

# Nginx 설정 파일 복사
setup_nginx_config() {
    log_info "Nginx 설정 파일 구성 중..."
    
    # 템플릿 파일 확인
    if [ ! -f "$CONF_TEMPLATE" ]; then
        log_error "설정 템플릿 파일을 찾을 수 없습니다: $CONF_TEMPLATE"
        exit 1
    fi
    
    # 기존 설정 백업
    if [ -f "$NGINX_CONF_FILE" ]; then
        BACKUP_FILE="${NGINX_CONF_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        sudo cp "$NGINX_CONF_FILE" "$BACKUP_FILE"
        log_info "기존 설정 백업: $BACKUP_FILE"
    fi
    
    # 도메인 치환하여 복사
    sudo sed "s/mychecker.com/${DOMAIN}/g" "$CONF_TEMPLATE" > /tmp/msp-checklist.conf
    sudo mv /tmp/msp-checklist.conf "$NGINX_CONF_FILE"
    
    # 생성 날짜 업데이트
    sudo sed -i "s/Generated:.*/Generated: $(date)/" "$NGINX_CONF_FILE"
    
    log_success "Nginx 설정 파일 생성: $NGINX_CONF_FILE"
    log_info "도메인: $DOMAIN"
}

# Nginx 설정 테스트
test_nginx_config() {
    log_info "Nginx 설정 테스트 중..."
    
    if sudo nginx -t; then
        log_success "Nginx 설정 테스트 통과"
    else
        log_error "Nginx 설정 오류! 설정을 확인해주세요."
        exit 1
    fi
}

# Nginx 시작/재시작
restart_nginx() {
    log_info "Nginx 재시작 중..."
    
    # Nginx 활성화
    sudo systemctl enable nginx 2>/dev/null || true
    
    # 재시작
    if sudo systemctl is-active --quiet nginx; then
        sudo systemctl reload nginx
        log_success "Nginx 리로드 완료"
    else
        sudo systemctl start nginx
        log_success "Nginx 시작 완료"
    fi
}

# SSL 인증서 발급 (Let's Encrypt)
setup_ssl() {
    log_info "SSL 인증서 설정 중..."
    
    # Certbot 설치
    if ! command -v certbot &> /dev/null; then
        log_info "Certbot 설치 중..."
        
        if [ "$PKG_MANAGER" = "yum" ]; then
            sudo yum install -y certbot python3-certbot-nginx
        else
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
    fi
    
    # 인증서 발급
    log_info "Let's Encrypt 인증서 발급 중..."
    log_warn "도메인 DNS가 이 서버 IP를 가리키고 있어야 합니다!"
    
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" || {
        log_warn "자동 인증서 발급 실패. 수동으로 실행해주세요:"
        echo "  sudo certbot --nginx -d $DOMAIN"
        return 1
    }
    
    # 자동 갱신 설정
    log_info "인증서 자동 갱신 설정 중..."
    (sudo crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
    
    log_success "SSL 인증서 설정 완료"
}

# Nginx 설정 제거
uninstall_nginx_config() {
    log_info "Nginx 설정 제거 중..."
    
    if [ -f "$NGINX_CONF_FILE" ]; then
        sudo rm -f "$NGINX_CONF_FILE"
        log_success "설정 파일 제거: $NGINX_CONF_FILE"
    else
        log_warn "설정 파일이 존재하지 않습니다."
    fi
    
    # Nginx 리로드
    if sudo systemctl is-active --quiet nginx; then
        sudo nginx -t && sudo systemctl reload nginx
        log_success "Nginx 리로드 완료"
    fi
    
    echo ""
    log_success "Nginx 설정 제거 완료"
    echo ""
    echo "  Nginx 자체를 삭제하려면:"
    echo "    sudo yum remove nginx  # Amazon Linux"
    echo "    sudo apt-get remove nginx  # Ubuntu"
    echo ""
}

# 완료 메시지
print_completion() {
    # 서버 IP 가져오기
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo -e "║  ${GREEN}Nginx 설정 완료!${NC}                                            ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  설정 파일: $NGINX_CONF_FILE"
    echo "  도메인: $DOMAIN"
    echo ""
    echo "  접속 URL:"
    echo "    메인 앱:  http://${DOMAIN}/"
    echo "    Admin:   http://${DOMAIN}/admin/"
    echo ""
    if [ "$ENABLE_SSL" = true ]; then
        echo "    HTTPS:   https://${DOMAIN}/"
        echo ""
    fi
    echo "  서버 IP: $PUBLIC_IP"
    echo ""
    echo "  DNS 설정:"
    echo "    $DOMAIN → $PUBLIC_IP (A 레코드)"
    echo ""
    echo "  Nginx 명령어:"
    echo "    상태 확인:  sudo systemctl status nginx"
    echo "    설정 테스트: sudo nginx -t"
    echo "    리로드:     sudo systemctl reload nginx"
    echo "    로그 확인:  sudo tail -f /var/log/nginx/msp-checklist-error.log"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# 메인 실행
main() {
    detect_os
    
    if [ "$UNINSTALL" = true ]; then
        uninstall_nginx_config
        exit 0
    fi
    
    install_nginx
    setup_nginx_config
    test_nginx_config
    restart_nginx
    
    if [ "$ENABLE_SSL" = true ]; then
        setup_ssl
    fi
    
    print_completion
}

main "$@"
