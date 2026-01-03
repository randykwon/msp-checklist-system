#!/bin/bash

# =============================================================================
# MSP Checklist - Nginx 설치 및 설정 스크립트
# Ubuntu 22.04/24.04 / Amazon Linux 2023 호환
# =============================================================================

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

# 변수
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS_TYPE=""
DOMAIN=""
EMAIL=""
SETUP_SSL=false

# 도움말
show_help() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --ssl                 SSL 인증서 설정 (Let's Encrypt)"
    echo "  --domain DOMAIN       도메인 이름 (SSL 설정 시 필수)"
    echo "  --email EMAIL         이메일 주소 (SSL 설정 시 필수)"
    echo "  -h, --help            도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                           # 기본 HTTP 설정"
    echo "  $0 --ssl --domain example.com --email admin@example.com"
    exit 0
}

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --ssl)
            SETUP_SSL=true
            shift
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            ;;
    esac
done

# SSL 설정 시 도메인/이메일 확인
if [ "$SETUP_SSL" = true ]; then
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_error "SSL 설정 시 --domain과 --email이 필요합니다"
        show_help
    fi
fi

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           MSP Checklist - Nginx 설치 스크립트                 ║"
echo "║                                                               ║"
echo "║  🌐 Nginx 리버스 프록시 설정                                  ║"
echo "║  📍 메인: localhost:3010 → http://IP/                         ║"
echo "║  📍 관리자: localhost:3011 → http://IP/admin                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    log_error "root 권한으로 실행해주세요: sudo $0"
    exit 1
fi

# OS 감지
detect_os() {
    log_info "운영체제 감지 중..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            log_success "Ubuntu $VERSION_ID 감지됨"
        elif [[ "$ID" == "amzn" ]]; then
            OS_TYPE="amazon"
            log_success "Amazon Linux $VERSION_ID 감지됨"
        else
            log_error "지원되지 않는 OS: $ID"
            log_info "지원 OS: Ubuntu 22.04/24.04, Amazon Linux 2023"
            exit 1
        fi
    else
        log_error "OS를 감지할 수 없습니다"
        exit 1
    fi
}

# Nginx 설치
install_nginx() {
    log_info "Nginx 설치 확인 중..."
    
    if command -v nginx &> /dev/null; then
        NGINX_VERSION=$(nginx -v 2>&1 | grep -oP 'nginx/\K[0-9.]+')
        log_success "Nginx 이미 설치됨 (버전: $NGINX_VERSION)"
        return 0
    fi
    
    log_info "Nginx 설치 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        apt update -qq
        apt install -y nginx
    else
        dnf install -y nginx
    fi
    
    systemctl enable nginx
    log_success "Nginx 설치 완료"
}

# 기존 설정 백업 및 정리
cleanup_configs() {
    log_info "기존 설정 정리 중..."
    
    # 백업 디렉토리 생성
    BACKUP_DIR="/etc/nginx/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 기존 설정 백업
    if [ -f /etc/nginx/conf.d/msp-checklist.conf ]; then
        cp /etc/nginx/conf.d/msp-checklist.conf "$BACKUP_DIR/"
        log_info "기존 설정 백업: $BACKUP_DIR"
    fi
    
    # 기존 설정 제거
    rm -f /etc/nginx/conf.d/default.conf
    rm -f /etc/nginx/conf.d/msp-*.conf
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/msp-checklist 2>/dev/null || true
    rm -f /etc/nginx/sites-available/msp-checklist 2>/dev/null || true
    
    log_success "기존 설정 정리 완료"
}

# Nginx 설정 생성 (HTTP)
create_http_config() {
    log_info "Nginx HTTP 설정 생성 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        CONFIG_FILE="/etc/nginx/sites-available/msp-checklist"
        LINK_FILE="/etc/nginx/sites-enabled/msp-checklist"
    else
        CONFIG_FILE="/etc/nginx/conf.d/msp-checklist.conf"
    fi
    
    cat > "$CONFIG_FILE" << 'NGINX_CONFIG'
# MSP Checklist Nginx 설정
# 자동 생성됨 - 수동 수정 시 백업 권장

upstream msp_main {
    server 127.0.0.1:3010;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # 업로드 크기 제한 (50MB)
    client_max_body_size 50M;
    
    # 버퍼 설정
    client_body_buffer_size 10M;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
    
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 관리자 시스템 (/admin)
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        rewrite ^/admin$ / break;
        
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 관리자 정적 파일
    location /admin/_next/ {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 관리자 API
    location /admin/api/ {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # 메인 애플리케이션 (기본)
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Next.js 정적 파일
    location /_next/static/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 라우트
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # 헬스체크
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
    
    # 숨김 파일 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-access.log;
    error_log /var/log/nginx/msp-error.log;
}
NGINX_CONFIG

    # Ubuntu의 경우 심볼릭 링크 생성
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        ln -sf "$CONFIG_FILE" "$LINK_FILE"
    fi
    
    log_success "Nginx 설정 파일 생성 완료: $CONFIG_FILE"
}

# SSL 인증서 설치
setup_ssl() {
    if [ "$SETUP_SSL" != true ]; then
        return 0
    fi
    
    log_info "SSL 인증서 설정 중..."
    
    # Certbot 설치
    if ! command -v certbot &> /dev/null; then
        log_info "Certbot 설치 중..."
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            apt install -y certbot python3-certbot-nginx
        else
            dnf install -y certbot python3-certbot-nginx
        fi
    fi
    
    # 인증서 발급
    log_info "Let's Encrypt 인증서 발급 중..."
    certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect
    
    # 자동 갱신 설정
    systemctl enable certbot.timer 2>/dev/null || true
    systemctl start certbot.timer 2>/dev/null || true
    
    log_success "SSL 인증서 설정 완료"
}

# Nginx 테스트 및 재시작
restart_nginx() {
    log_info "Nginx 설정 테스트 중..."
    
    if nginx -t 2>&1; then
        log_success "설정 테스트 통과"
        
        systemctl stop nginx 2>/dev/null || true
        sleep 1
        systemctl start nginx
        
        if systemctl is-active --quiet nginx; then
            log_success "Nginx 시작 완료"
        else
            log_error "Nginx 시작 실패"
            systemctl status nginx --no-pager
            exit 1
        fi
    else
        log_error "설정 테스트 실패"
        nginx -t
        exit 1
    fi
}

# 방화벽 설정
setup_firewall() {
    log_info "방화벽 설정 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
            ufw allow 80/tcp 2>/dev/null || true
            ufw allow 443/tcp 2>/dev/null || true
            log_success "UFW 방화벽 설정 완료"
        fi
    else
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-service=http 2>/dev/null || true
            firewall-cmd --permanent --add-service=https 2>/dev/null || true
            firewall-cmd --reload 2>/dev/null || true
            log_success "firewalld 방화벽 설정 완료"
        fi
    fi
}

# 연결 테스트
test_connection() {
    log_info "연결 테스트 중..."
    sleep 2
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    # 헬스체크
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
    if [[ "$HEALTH" == "200" ]]; then
        log_success "헬스체크: OK (HTTP 200)"
    else
        log_warning "헬스체크: HTTP $HEALTH"
    fi
    
    # 메인 앱
    MAIN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
    if [[ "$MAIN" =~ ^[23] ]]; then
        log_success "메인 앱: HTTP $MAIN"
    elif [[ "$MAIN" == "502" ]]; then
        log_warning "메인 앱: HTTP 502 (Node.js 서버 시작 필요)"
    else
        log_warning "메인 앱: HTTP $MAIN"
    fi
    
    # 관리자 앱
    ADMIN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ "$ADMIN" =~ ^[23] ]]; then
        log_success "관리자 앱: HTTP $ADMIN"
    elif [[ "$ADMIN" == "502" ]]; then
        log_warning "관리자 앱: HTTP 502 (Node.js 서버 시작 필요)"
    else
        log_warning "관리자 앱: HTTP $ADMIN"
    fi
    
    echo "═══════════════════════════════════════════════════════════════"
}

# 완료 메시지
show_complete() {
    # IP 주소 확인
    PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || \
                curl -s --connect-timeout 2 http://ipinfo.io/ip 2>/dev/null || \
                hostname -I 2>/dev/null | awk '{print $1}' || \
                echo "YOUR_SERVER_IP")
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ Nginx 설정 완료!                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🌐 접속 URL:${NC}"
    if [ "$SETUP_SSL" = true ]; then
        echo "   메인 서비스:    https://$DOMAIN/"
        echo "   관리자 시스템:  https://$DOMAIN/admin"
    else
        echo "   메인 서비스:    http://$PUBLIC_IP/"
        echo "   관리자 시스템:  http://$PUBLIC_IP/admin"
    fi
    echo ""
    echo -e "${CYAN}🔧 관리 명령어:${NC}"
    echo "   상태 확인:      sudo systemctl status nginx"
    echo "   재시작:         sudo systemctl restart nginx"
    echo "   설정 테스트:    sudo nginx -t"
    echo "   로그 확인:      sudo tail -f /var/log/nginx/msp-error.log"
    echo ""
    echo -e "${CYAN}📝 다음 단계:${NC}"
    echo "   1. Node.js 서버 시작: ./restart-servers.sh"
    echo "   2. AWS 보안 그룹에서 포트 80 (및 443) 인바운드 허용 확인"
    echo "   3. 브라우저에서 접속 테스트"
    echo ""
    
    if [ "$SETUP_SSL" != true ]; then
        echo -e "${YELLOW}💡 SSL 인증서 설정:${NC}"
        echo "   sudo $0 --ssl --domain your-domain.com --email your@email.com"
        echo ""
    fi
}

# 메인 실행
main() {
    detect_os
    install_nginx
    cleanup_configs
    create_http_config
    restart_nginx
    setup_ssl
    setup_firewall
    test_connection
    show_complete
}

main "$@"
