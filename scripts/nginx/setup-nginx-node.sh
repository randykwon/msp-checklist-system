#!/bin/bash

# ============================================================================
# Nginx + Node.js 앱 연동 설정 스크립트
# 
# 이 스크립트는 Nginx를 Node.js 앱의 리버스 프록시로 설정합니다.
# Nginx가 설치되어 있어야 합니다. (install-nginx.sh 먼저 실행)
#
# 기본 설정:
#   - 메인 앱: localhost:3010 → /
#   - Admin 앱: localhost:3011 → /admin
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
MAIN_PORT=3010
ADMIN_PORT=3011
DOMAIN="_"
SERVER_NAME="_"

# 사용법
show_usage() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  -d, --domain DOMAIN     도메인 이름 (예: example.com)"
    echo "  -m, --main-port PORT    메인 앱 포트 (기본값: 3010)"
    echo "  -a, --admin-port PORT   Admin 앱 포트 (기본값: 3011)"
    echo "  -h, --help              도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                              # 기본 설정으로 실행"
    echo "  $0 -d example.com               # 도메인 지정"
    echo "  $0 -m 3000 -a 3001              # 포트 변경"
    exit 0
}

# 옵션 파싱
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--domain) DOMAIN="$2"; SERVER_NAME="$2"; shift ;;
        -m|--main-port) MAIN_PORT="$2"; shift ;;
        -a|--admin-port) ADMIN_PORT="$2"; shift ;;
        -h|--help) show_usage ;;
        *) log_error "알 수 없는 옵션: $1"; show_usage ;;
    esac
    shift
done

# 배너
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           Nginx + Node.js 연동 설정 스크립트                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    log_error "이 스크립트는 root 권한이 필요합니다."
    echo "다음 명령어로 실행하세요: sudo $0"
    exit 1
fi

# Nginx 설치 확인
check_nginx() {
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx가 설치되어 있지 않습니다."
        echo "먼저 install-nginx.sh를 실행하세요: sudo ./install-nginx.sh"
        exit 1
    fi
    log_success "Nginx 확인됨"
}

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
    else
        OS_ID="unknown"
    fi
    
    # Nginx 설정 디렉토리 결정
    if [ "$OS_ID" = "ubuntu" ]; then
        NGINX_CONF_DIR="/etc/nginx/sites-available"
        NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
        USE_SITES_ENABLED=true
    else
        NGINX_CONF_DIR="/etc/nginx/conf.d"
        NGINX_ENABLED_DIR=""
        USE_SITES_ENABLED=false
    fi
    
    log_info "OS: $OS_ID, 설정 디렉토리: $NGINX_CONF_DIR"
}

# 설정 정보 표시
show_config() {
    echo ""
    echo -e "${CYAN}설정 정보:${NC}"
    echo "  - 도메인: ${DOMAIN:-'모든 도메인'}"
    echo "  - 메인 앱: localhost:$MAIN_PORT → /"
    echo "  - Admin 앱: localhost:$ADMIN_PORT → /admin"
    echo ""
}

# Nginx 설정 파일 생성
create_nginx_config() {
    log_info "Nginx 설정 파일 생성 중..."
    
    if [ "$USE_SITES_ENABLED" = true ]; then
        CONF_FILE="$NGINX_CONF_DIR/msp-checklist"
    else
        CONF_FILE="$NGINX_CONF_DIR/msp-checklist.conf"
    fi
    
    # 기존 설정 백업
    if [ -f "$CONF_FILE" ]; then
        BACKUP_FILE="${CONF_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$CONF_FILE" "$BACKUP_FILE"
        log_info "기존 설정 백업: $BACKUP_FILE"
    fi
    
    cat > "$CONF_FILE" << EOF
# MSP Checklist System - Nginx Configuration
# Generated: $(date)
# Main App: http://localhost:$MAIN_PORT
# Admin App: http://localhost:$ADMIN_PORT

# Upstream 정의
upstream msp_main {
    server 127.0.0.1:$MAIN_PORT;
    keepalive 64;
}

upstream msp_admin {
    server 127.0.0.1:$ADMIN_PORT;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;

    # 클라이언트 요청 크기 제한 (파일 업로드용)
    client_max_body_size 100M;

    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Admin 앱 (/admin 경로)
    location /admin {
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Admin 정적 파일
    location /admin/_next {
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 메인 앱 (기본 경로)
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # 헬스 체크 엔드포인트
    location /nginx-health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

    log_success "설정 파일 생성: $CONF_FILE"
    
    # Ubuntu: sites-enabled에 심볼릭 링크 생성
    if [ "$USE_SITES_ENABLED" = true ]; then
        # 기본 설정 비활성화
        rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
        
        # 새 설정 활성화
        ln -sf "$CONF_FILE" "$NGINX_ENABLED_DIR/msp-checklist"
        log_success "설정 활성화됨"
    fi
}

# Nginx 설정 테스트
test_nginx_config() {
    log_info "Nginx 설정 테스트 중..."
    
    if nginx -t 2>&1; then
        log_success "설정 테스트 통과"
    else
        log_error "설정 테스트 실패"
        exit 1
    fi
}

# Nginx 재시작
restart_nginx() {
    log_info "Nginx 재시작 중..."
    
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx 재시작 완료"
    else
        log_error "Nginx 재시작 실패"
        systemctl status nginx
        exit 1
    fi
}

# 연결 테스트
test_connection() {
    log_info "연결 테스트 중..."
    
    sleep 2
    
    # Nginx 헬스 체크
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/nginx-health | grep -q "200"; then
        log_success "Nginx 헬스 체크: OK"
    else
        log_warning "Nginx 헬스 체크: 응답 없음 (정상일 수 있음)"
    fi
    
    # 메인 앱 체크
    MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$MAIN_PORT 2>/dev/null || echo "000")
    if [ "$MAIN_STATUS" = "200" ] || [ "$MAIN_STATUS" = "302" ]; then
        log_success "메인 앱 (포트 $MAIN_PORT): 응답 OK"
    else
        log_warning "메인 앱 (포트 $MAIN_PORT): 응답 없음 (앱이 실행 중인지 확인하세요)"
    fi
    
    # Admin 앱 체크
    ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$ADMIN_PORT 2>/dev/null || echo "000")
    if [ "$ADMIN_STATUS" = "200" ] || [ "$ADMIN_STATUS" = "302" ]; then
        log_success "Admin 앱 (포트 $ADMIN_PORT): 응답 OK"
    else
        log_warning "Admin 앱 (포트 $ADMIN_PORT): 응답 없음 (앱이 실행 중인지 확인하세요)"
    fi
}

# 완료 메시지
show_complete() {
    # IP 주소 감지
    IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    IP=${IP:-localhost}
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Nginx + Node.js 연동 설정 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "접속 URL:"
    echo "  📱 메인 앱:  http://$IP/"
    echo "  🔧 Admin:   http://$IP/admin"
    echo ""
    if [ "$DOMAIN" != "_" ]; then
        echo "  도메인 설정 시:"
        echo "  📱 메인 앱:  http://$DOMAIN/"
        echo "  🔧 Admin:   http://$DOMAIN/admin"
        echo ""
    fi
    echo "유용한 명령어:"
    echo "  - Nginx 상태: sudo systemctl status nginx"
    echo "  - Nginx 재시작: sudo systemctl restart nginx"
    echo "  - 로그 확인: sudo tail -f /var/log/nginx/msp-checklist-error.log"
    echo ""
    echo "다음 단계:"
    echo "  - SSL 설정: sudo ./setup-nginx-ssl.sh -d $DOMAIN"
    echo ""
}

# 메인 실행
main() {
    check_nginx
    detect_os
    show_config
    create_nginx_config
    test_nginx_config
    restart_nginx
    test_connection
    show_complete
}

main "$@"
