#!/bin/bash

# ============================================================================
# Nginx SSL 설정 스크립트 (Let's Encrypt)
# 
# 이 스크립트는 Let's Encrypt를 사용하여 SSL 인증서를 설정합니다.
# 사전 요구사항:
#   - Nginx 설치 (install-nginx.sh)
#   - Node.js 연동 설정 (setup-nginx-node.sh)
#   - 도메인이 서버 IP를 가리키고 있어야 함
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 기본값
DOMAIN=""
EMAIL=""
MAIN_PORT=3010
ADMIN_PORT=3011

# 사용법
show_usage() {
    echo "사용법: $0 -d DOMAIN [옵션]"
    echo ""
    echo "필수 옵션:"
    echo "  -d, --domain DOMAIN     도메인 이름 (필수)"
    echo ""
    echo "선택 옵션:"
    echo "  -e, --email EMAIL       Let's Encrypt 알림 이메일"
    echo "  -m, --main-port PORT    메인 앱 포트 (기본값: 3010)"
    echo "  -a, --admin-port PORT   Admin 앱 포트 (기본값: 3011)"
    echo "  -h, --help              도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0 -d example.com"
    echo "  $0 -d example.com -e admin@example.com"
    exit 0
}

# 옵션 파싱
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--domain) DOMAIN="$2"; shift ;;
        -e|--email) EMAIL="$2"; shift ;;
        -m|--main-port) MAIN_PORT="$2"; shift ;;
        -a|--admin-port) ADMIN_PORT="$2"; shift ;;
        -h|--help) show_usage ;;
        *) log_error "알 수 없는 옵션: $1"; show_usage ;;
    esac
    shift
done

# 도메인 필수 확인
if [ -z "$DOMAIN" ]; then
    log_error "도메인을 지정해야 합니다."
    show_usage
fi

# 배너
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              Nginx SSL 설정 스크립트                          ║"
echo "║                  (Let's Encrypt)                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    log_error "이 스크립트는 root 권한이 필요합니다."
    echo "다음 명령어로 실행하세요: sudo $0 -d $DOMAIN"
    exit 1
fi

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
    else
        OS_ID="unknown"
    fi
    log_info "OS: $OS_ID"
    
    # Nginx 설정 파일 경로 결정
    if [ "$OS_ID" = "ubuntu" ]; then
        NGINX_CONF="/etc/nginx/sites-available/msp-checklist"
    else
        NGINX_CONF="/etc/nginx/conf.d/msp-checklist.conf"
    fi
}

# ACME challenge 경로 추가 (인증서 발급을 위해)
add_acme_location() {
    log_info "ACME challenge 경로 설정 중..."
    
    # 웹루트 디렉토리 생성
    mkdir -p /var/www/html/.well-known/acme-challenge
    chown -R nginx:nginx /var/www/html 2>/dev/null || chown -R www-data:www-data /var/www/html 2>/dev/null || true
    chmod -R 755 /var/www/html
    
    # 기존 설정에 ACME location이 없으면 추가
    if [ -f "$NGINX_CONF" ] && ! grep -q "\.well-known/acme-challenge" "$NGINX_CONF"; then
        # location / 블록 앞에 ACME location 추가
        sed -i '/location \/ {/i\
    # ACME challenge for Let'\''s Encrypt\
    location /.well-known/acme-challenge/ {\
        root /var/www/html;\
        allow all;\
    }\
' "$NGINX_CONF"
        
        log_success "ACME challenge 경로 추가됨"
        
        # Nginx 재시작
        nginx -t && systemctl reload nginx
    else
        log_info "ACME challenge 경로가 이미 설정되어 있습니다"
    fi
}

# Certbot 설치
install_certbot() {
    log_info "Certbot 설치 중..."
    
    case "$OS_ID" in
        amzn|amazon)
            dnf install -y certbot python3-certbot-nginx
            ;;
        ubuntu)
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
            ;;
        *)
            log_error "지원되지 않는 OS입니다: $OS_ID"
            exit 1
            ;;
    esac
    
    log_success "Certbot 설치 완료"
}

# SSL 인증서 발급
obtain_certificate() {
    log_info "SSL 인증서 발급 중..."
    log_info "도메인: $DOMAIN"
    
    # Certbot 옵션 구성
    CERTBOT_OPTS="--nginx -d $DOMAIN --non-interactive --agree-tos"
    
    if [ -n "$EMAIL" ]; then
        CERTBOT_OPTS="$CERTBOT_OPTS --email $EMAIL"
    else
        CERTBOT_OPTS="$CERTBOT_OPTS --register-unsafely-without-email"
        log_warning "이메일이 지정되지 않았습니다. 인증서 만료 알림을 받지 못합니다."
    fi
    
    # 인증서 발급 시도
    if ! certbot $CERTBOT_OPTS; then
        log_error "Certbot 인증서 발급 실패"
        echo ""
        echo "문제 해결 방법:"
        echo "  1. 도메인($DOMAIN)이 이 서버 IP를 가리키는지 확인"
        echo "  2. AWS 보안 그룹에서 포트 80, 443이 열려있는지 확인"
        echo "  3. 방화벽에서 포트 80, 443이 허용되어 있는지 확인"
        echo ""
        echo "수동으로 다시 시도:"
        echo "  sudo certbot --nginx -d $DOMAIN"
        exit 1
    fi
    
    log_success "SSL 인증서 발급 완료"
}

# SSL 설정 최적화
optimize_ssl_config() {
    log_info "SSL 설정 최적화 중..."
    
    # SSL 최적화 설정 추가 (Certbot이 기본 설정을 추가하므로 추가 최적화만)
    cat > /etc/nginx/conf.d/ssl-params.conf << 'EOF'
# SSL 최적화 설정
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS (주석 해제하여 활성화 - 주의: 한번 활성화하면 되돌리기 어려움)
# add_header Strict-Transport-Security "max-age=63072000" always;
EOF

    log_success "SSL 설정 최적화 완료"
}

# 자동 갱신 설정
setup_auto_renewal() {
    log_info "인증서 자동 갱신 설정 중..."
    
    # Certbot 타이머 확인 및 활성화
    if systemctl list-timers | grep -q certbot; then
        log_success "자동 갱신 타이머가 이미 활성화되어 있습니다."
    else
        # 수동으로 cron job 추가
        (crontab -l 2>/dev/null | grep -v certbot; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        log_success "자동 갱신 cron job 추가됨"
    fi
    
    # 갱신 테스트
    log_info "갱신 테스트 실행 중..."
    certbot renew --dry-run
    log_success "갱신 테스트 통과"
}

# Nginx 재시작
restart_nginx() {
    log_info "Nginx 재시작 중..."
    
    nginx -t
    systemctl restart nginx
    
    log_success "Nginx 재시작 완료"
}

# 완료 메시지
show_complete() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  SSL 설정 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "HTTPS 접속 URL:"
    echo "  📱 메인 앱:  https://$DOMAIN/"
    echo "  🔧 Admin:   https://$DOMAIN/admin"
    echo ""
    echo "인증서 정보:"
    echo "  - 위치: /etc/letsencrypt/live/$DOMAIN/"
    echo "  - 자동 갱신: 활성화됨"
    echo "  - 만료일 확인: sudo certbot certificates"
    echo ""
    echo "유용한 명령어:"
    echo "  - 인증서 갱신: sudo certbot renew"
    echo "  - 인증서 상태: sudo certbot certificates"
    echo "  - Nginx 재시작: sudo systemctl restart nginx"
    echo ""
}

# 메인 실행
main() {
    detect_os
    install_certbot
    add_acme_location
    obtain_certificate
    optimize_ssl_config
    setup_auto_renewal
    restart_nginx
    show_complete
}

main "$@"
