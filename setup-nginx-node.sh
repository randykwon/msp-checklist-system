#!/bin/bash

# Nginx + Node.js 연동 설정 스크립트
# Ubuntu 22.04 LTS 및 Amazon Linux 2023 지원

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           Nginx + Node.js 연동 설정 스크립트              ║"
    echo "║                                                            ║"
    echo "║  🌐 Nginx 리버스 프록시 설정                             ║"
    echo "║  🚀 Node.js 서버 연동                                    ║"
    echo "║  🔒 SSL 인증서 지원                                      ║"
    echo "║  🛡️ 보안 설정 및 방화벽                                 ║"
    echo "║  📊 성능 최적화                                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 명령행 옵션 처리
INSTALL_NGINX=true
SETUP_SSL=false
DOMAIN_NAME=""
EMAIL=""
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --ssl)
            SETUP_SSL=true
            shift
            ;;
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --no-install)
            INSTALL_NGINX=false
            shift
            ;;
        --help|-h)
            HELP=true
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            HELP=true
            shift
            ;;
    esac
done

# 도움말 표시
show_help() {
    echo "Nginx + Node.js 연동 설정 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --ssl               SSL 인증서 설정 (Let's Encrypt)"
    echo "  --domain DOMAIN     도메인 이름 (SSL 설정 시 필수)"
    echo "  --email EMAIL       이메일 주소 (SSL 설정 시 필수)"
    echo "  --no-install        Nginx 설치 건너뛰기 (이미 설치된 경우)"
    echo "  --help, -h          이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                                    # 기본 설정"
    echo "  $0 --ssl --domain example.com --email admin@example.com"
    echo "  $0 --no-install                      # 설정만 업데이트"
    echo ""
}

if [ "$HELP" = true ]; then
    show_help
    exit 0
fi

# SSL 설정 시 필수 매개변수 확인
if [ "$SETUP_SSL" = true ]; then
    if [ -z "$DOMAIN_NAME" ] || [ -z "$EMAIL" ]; then
        log_error "SSL 설정을 위해서는 --domain과 --email 옵션이 필요합니다."
        show_help
        exit 1
    fi
fi

# OS 감지 함수
detect_os() {
    log_info "운영체제 감지 중..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME="$NAME"
        OS_VERSION="$VERSION"
        
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            PACKAGE_MANAGER="apt"
            FIREWALL_CMD="ufw"
            log_success "Ubuntu 감지됨: $OS_NAME $OS_VERSION"
            
        elif [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
            OS_TYPE="amazon-linux-2023"
            PACKAGE_MANAGER="dnf"
            FIREWALL_CMD="firewalld"
            log_success "Amazon Linux 2023 감지됨: $OS_NAME $OS_VERSION"
            
        else
            log_error "지원되지 않는 운영체제입니다: $OS_NAME"
            echo "지원되는 OS:"
            echo "- Ubuntu 22.04 LTS"
            echo "- Amazon Linux 2023"
            exit 1
        fi
    else
        log_error "/etc/os-release 파일을 찾을 수 없습니다."
        exit 1
    fi
}

# Nginx 설치 상태 확인
check_nginx_installation() {
    log_info "Nginx 설치 상태 확인 중..."
    
    if command -v nginx > /dev/null 2>&1; then
        NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
        log_success "✅ Nginx 설치됨: 버전 $NGINX_VERSION"
        return 0
    else
        log_warning "❌ Nginx가 설치되지 않음"
        return 1
    fi
}

# Nginx 설치
install_nginx() {
    log_info "Nginx 설치 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt update
        sudo apt install -y nginx
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf update -y
        sudo dnf install -y nginx
    fi
    
    # Nginx 서비스 활성화
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    log_success "Nginx 설치 완료"
}

# Node.js 서버 상태 확인
check_nodejs_servers() {
    log_info "Node.js 서버 상태 확인 중..."
    
    # 포트 3010 (메인 서버) 확인
    if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
        log_success "✅ 메인 서버 (포트 3010) 실행 중"
        MAIN_SERVER_RUNNING=true
    else
        log_warning "⚠️ 메인 서버 (포트 3010) 실행되지 않음"
        MAIN_SERVER_RUNNING=false
    fi
    
    # 포트 3011 (관리자 서버) 확인
    if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
        log_success "✅ 관리자 서버 (포트 3011) 실행 중"
        ADMIN_SERVER_RUNNING=true
    else
        log_warning "⚠️ 관리자 서버 (포트 3011) 실행되지 않음"
        ADMIN_SERVER_RUNNING=false
    fi
    
    # PM2 프로세스 확인
    if command -v pm2 > /dev/null 2>&1; then
        PM2_PROCESSES=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
        if [ "$PM2_PROCESSES" -gt 0 ]; then
            log_success "✅ PM2 프로세스 $PM2_PROCESSES개 실행 중"
        else
            log_warning "⚠️ PM2 프로세스 실행되지 않음"
        fi
    else
        log_warning "⚠️ PM2가 설치되지 않음"
    fi
}

# Nginx 설정 파일 생성
create_nginx_config() {
    log_info "Nginx 설정 파일 생성 중..."
    
    # 백업 생성
    if [ -f /etc/nginx/nginx.conf ]; then
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        log_info "기존 nginx.conf 백업 생성됨"
    fi
    
    # MSP Checklist용 Nginx 설정 생성
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << EOF
# MSP Checklist Nginx 설정
# 메인 서버: 포트 3010
# 관리자 서버: 포트 3011

# 업스트림 서버 정의
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

# 메인 서버 설정
server {
    listen 80;
    server_name ${DOMAIN_NAME:-_};
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # 클라이언트 최대 업로드 크기
    client_max_body_size 50M;
    
    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 관리자 시스템 라우팅
    location /admin {
        # /admin 경로를 /로 리다이렉트하여 관리자 서버로 전달
        rewrite ^/admin(/.*)?\$ \$1 break;
        
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Extensions \$http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key \$http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version \$http_sec_websocket_version;
    }
    
    # 관리자 정적 파일
    location /admin/_next/ {
        rewrite ^/admin(/.*)?\$ \$1 break;
        proxy_pass http://msp_admin;
        proxy_set_header Host \$host;
        
        # 캐싱 설정
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 메인 애플리케이션 (기본)
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Extensions \$http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key \$http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version \$http_sec_websocket_version;
    }
    
    # Next.js 정적 파일 최적화
    location /_next/static/ {
        proxy_pass http://msp_main;
        proxy_set_header Host \$host;
        
        # 장기 캐싱
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 이미지 및 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://msp_main;
        proxy_set_header Host \$host;
        
        # 캐싱 설정
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # API 라우트 최적화
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # API 응답 캐싱 비활성화
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # 헬스체크 엔드포인트
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 로봇 차단 (선택사항)
    location /robots.txt {
        return 200 "User-agent: *\nDisallow: /admin/\n";
        add_header Content-Type text/plain;
    }
    
    # 보안: 숨겨진 파일 접근 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}

# 직접 포트 접근 리다이렉트 (선택사항)
server {
    listen 3010;
    server_name ${DOMAIN_NAME:-_};
    return 301 http://\$host\$request_uri;
}

server {
    listen 3011;
    server_name ${DOMAIN_NAME:-_};
    return 301 http://\$host/admin\$request_uri;
}
EOF

    # Ubuntu의 경우 sites-enabled 링크 생성
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
        
        # 기본 사이트 비활성화
        sudo rm -f /etc/nginx/sites-enabled/default
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux의 경우 conf.d에 복사
        sudo cp /etc/nginx/sites-available/msp-checklist /etc/nginx/conf.d/msp-checklist.conf
        
        # 기본 설정 비활성화
        sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
    fi
    
    log_success "Nginx 설정 파일 생성 완료"
}

# Nginx 설정 테스트 및 재시작
restart_nginx() {
    log_info "Nginx 설정 테스트 및 재시작 중..."
    
    # 설정 파일 문법 검사
    if sudo nginx -t; then
        log_success "✅ Nginx 설정 파일 문법 검사 통과"
        
        # Nginx 재시작
        sudo systemctl reload nginx
        sudo systemctl restart nginx
        
        # 상태 확인
        if sudo systemctl is-active --quiet nginx; then
            log_success "✅ Nginx 서비스 재시작 완료"
        else
            log_error "❌ Nginx 서비스 재시작 실패"
            sudo systemctl status nginx
            return 1
        fi
    else
        log_error "❌ Nginx 설정 파일에 오류가 있습니다"
        echo ""
        echo "설정 파일 확인:"
        sudo nginx -t
        return 1
    fi
}

# 방화벽 설정
setup_firewall() {
    log_info "방화벽 설정 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu UFW 설정
        sudo ufw --force enable
        sudo ufw allow ssh
        sudo ufw allow 'Nginx Full'
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Node.js 포트는 로컬에서만 접근 가능하도록 설정
        sudo ufw deny 3010
        sudo ufw deny 3011
        
        sudo ufw reload
        log_success "✅ Ubuntu UFW 방화벽 설정 완료"
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux firewalld 설정
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        
        # Node.js 포트는 차단 (Nginx를 통해서만 접근)
        sudo firewall-cmd --permanent --remove-port=3010/tcp 2>/dev/null || true
        sudo firewall-cmd --permanent --remove-port=3011/tcp 2>/dev/null || true
        
        sudo firewall-cmd --reload
        log_success "✅ Amazon Linux firewalld 방화벽 설정 완료"
    fi
}

# SSL 인증서 설정 (Let's Encrypt)
setup_ssl_certificate() {
    if [ "$SETUP_SSL" = false ]; then
        return 0
    fi
    
    log_info "SSL 인증서 설정 중..."
    
    # Certbot 설치
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf install -y certbot python3-certbot-nginx
    fi
    
    # SSL 인증서 발급
    log_info "도메인 $DOMAIN_NAME에 대한 SSL 인증서 발급 중..."
    
    if sudo certbot --nginx -d "$DOMAIN_NAME" --email "$EMAIL" --agree-tos --non-interactive; then
        log_success "✅ SSL 인증서 발급 완료"
        
        # 자동 갱신 설정
        sudo systemctl enable certbot.timer
        sudo systemctl start certbot.timer
        
        log_success "✅ SSL 인증서 자동 갱신 설정 완료"
    else
        log_error "❌ SSL 인증서 발급 실패"
        log_warning "수동으로 다음 명령어를 실행하세요:"
        echo "sudo certbot --nginx -d $DOMAIN_NAME --email $EMAIL"
        return 1
    fi
}

# 성능 최적화 설정
optimize_nginx_performance() {
    log_info "Nginx 성능 최적화 설정 중..."
    
    # nginx.conf 최적화 설정 추가
    sudo tee /etc/nginx/conf.d/performance.conf > /dev/null << 'EOF'
# Nginx 성능 최적화 설정

# 워커 프로세스 수 (CPU 코어 수에 맞춤)
worker_processes auto;

# 워커 연결 수
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

# HTTP 설정
http {
    # 파일 전송 최적화
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # 타임아웃 설정
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # 압축 설정
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 버퍼 크기 최적화
    client_body_buffer_size 128k;
    client_max_body_size 50m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # 로그 최적화
    access_log /var/log/nginx/access.log combined buffer=16k flush=2m;
    error_log /var/log/nginx/error.log warn;
    
    # 보안 설정
    server_tokens off;
    
    # 레이트 리미팅
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}
EOF

    log_success "✅ Nginx 성능 최적화 설정 완료"
}

# 모니터링 및 로그 설정
setup_monitoring() {
    log_info "모니터링 및 로그 설정 중..."
    
    # 로그 디렉토리 생성
    sudo mkdir -p /var/log/nginx
    sudo mkdir -p /var/log/msp-checklist
    
    # 로그 로테이션 설정
    sudo tee /etc/logrotate.d/msp-checklist > /dev/null << 'EOF'
/var/log/nginx/msp-checklist-*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

    # 상태 확인 스크립트 생성
    sudo tee /usr/local/bin/check-msp-status.sh > /dev/null << 'EOF'
#!/bin/bash

echo "=== MSP Checklist 시스템 상태 ==="
echo ""

# Nginx 상태
echo "🌐 Nginx 상태:"
if systemctl is-active --quiet nginx; then
    echo "  ✅ Nginx: 실행 중"
else
    echo "  ❌ Nginx: 중지됨"
fi

# Node.js 서버 상태
echo ""
echo "🚀 Node.js 서버 상태:"
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    echo "  ✅ 메인 서버 (포트 3010): 실행 중"
else
    echo "  ❌ 메인 서버 (포트 3010): 중지됨"
fi

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    echo "  ✅ 관리자 서버 (포트 3011): 실행 중"
else
    echo "  ❌ 관리자 서버 (포트 3011): 중지됨"
fi

# PM2 상태
echo ""
echo "📊 PM2 프로세스:"
if command -v pm2 > /dev/null 2>&1; then
    pm2 list
else
    echo "  ⚠️ PM2가 설치되지 않음"
fi

# 디스크 사용량
echo ""
echo "💾 디스크 사용량:"
df -h / | tail -1

# 메모리 사용량
echo ""
echo "🧠 메모리 사용량:"
free -h | head -2

echo ""
echo "=== 상태 확인 완료 ==="
EOF

    sudo chmod +x /usr/local/bin/check-msp-status.sh
    
    log_success "✅ 모니터링 및 로그 설정 완료"
}

# 연결 테스트
test_connection() {
    log_info "연결 테스트 중..."
    
    # 로컬 연결 테스트
    echo ""
    echo "🔍 로컬 연결 테스트:"
    
    # Nginx 테스트
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
        log_success "✅ Nginx (포트 80): 응답 정상"
    else
        log_warning "⚠️ Nginx (포트 80): 응답 없음"
    fi
    
    # 메인 서버 직접 테스트
    if [ "$MAIN_SERVER_RUNNING" = true ]; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200\|301\|302"; then
            log_success "✅ 메인 서버 (포트 3010): 응답 정상"
        else
            log_warning "⚠️ 메인 서버 (포트 3010): 응답 없음"
        fi
    fi
    
    # 관리자 서버 직접 테스트
    if [ "$ADMIN_SERVER_RUNNING" = true ]; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 | grep -q "200\|301\|302"; then
            log_success "✅ 관리자 서버 (포트 3011): 응답 정상"
        else
            log_warning "⚠️ 관리자 서버 (포트 3011): 응답 없음"
        fi
    fi
    
    # 공용 IP 확인
    if command -v curl > /dev/null; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "확인 불가")
    else
        PUBLIC_IP="확인 불가"
    fi
    
    echo ""
    echo "🌐 외부 접속 정보:"
    echo "  - 공용 IP: $PUBLIC_IP"
    if [ "$DOMAIN_NAME" != "" ]; then
        echo "  - 도메인: $DOMAIN_NAME"
        if [ "$SETUP_SSL" = true ]; then
            echo "  - HTTPS: https://$DOMAIN_NAME"
        else
            echo "  - HTTP: http://$DOMAIN_NAME"
        fi
    else
        echo "  - HTTP: http://$PUBLIC_IP"
    fi
    echo "  - 관리자: http://$PUBLIC_IP/admin"
}

# 설치 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Nginx 설정 완료! 🎉                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "Nginx + Node.js 연동 설정이 완료되었습니다!"
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    if [ "$DOMAIN_NAME" != "" ]; then
        if [ "$SETUP_SSL" = true ]; then
            echo "  - 메인 서비스: https://$DOMAIN_NAME"
            echo "  - 관리자 시스템: https://$DOMAIN_NAME/admin"
        else
            echo "  - 메인 서비스: http://$DOMAIN_NAME"
            echo "  - 관리자 시스템: http://$DOMAIN_NAME/admin"
        fi
    else
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
        echo "  - 메인 서비스: http://$PUBLIC_IP"
        echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
    fi
    
    echo ""
    echo "🔧 유용한 명령어:"
    echo "  - 시스템 상태 확인: sudo /usr/local/bin/check-msp-status.sh"
    echo "  - Nginx 상태: sudo systemctl status nginx"
    echo "  - Nginx 재시작: sudo systemctl restart nginx"
    echo "  - Nginx 설정 테스트: sudo nginx -t"
    echo "  - 로그 확인: sudo tail -f /var/log/nginx/msp-checklist-access.log"
    echo "  - 에러 로그: sudo tail -f /var/log/nginx/msp-checklist-error.log"
    
    echo ""
    echo "📝 다음 단계:"
    echo "1. AWS 보안 그룹에서 포트 80, 443 인바운드 규칙 확인"
    echo "2. Node.js 서버가 실행 중인지 확인"
    echo "3. 도메인 DNS 설정 (도메인 사용 시)"
    if [ "$SETUP_SSL" = false ] && [ "$DOMAIN_NAME" != "" ]; then
        echo "4. SSL 인증서 설정: $0 --ssl --domain $DOMAIN_NAME --email your@email.com"
    fi
    
    echo ""
    echo "🔒 보안 권장사항:"
    echo "- 포트 3010, 3011은 직접 접근이 차단되어 있습니다"
    echo "- Nginx를 통해서만 접근 가능합니다"
    echo "- SSL 인증서 설정을 권장합니다"
    
    echo ""
}

# 메인 실행 함수
main() {
    # 배너 출력
    show_banner
    
    # 사용자 확인
    read -p "Nginx + Node.js 연동 설정을 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설정이 취소되었습니다."
        exit 0
    fi
    
    # OS 감지
    detect_os
    
    # Nginx 설치 확인 및 설치
    if [ "$INSTALL_NGINX" = true ]; then
        if ! check_nginx_installation; then
            install_nginx
        fi
    else
        if ! check_nginx_installation; then
            log_error "Nginx가 설치되지 않았습니다. --no-install 옵션을 제거하거나 수동으로 설치하세요."
            exit 1
        fi
    fi
    
    # Node.js 서버 상태 확인
    check_nodejs_servers
    
    # Nginx 설정 생성
    create_nginx_config
    
    # 성능 최적화 설정
    optimize_nginx_performance
    
    # Nginx 재시작
    restart_nginx
    
    # 방화벽 설정
    setup_firewall
    
    # SSL 인증서 설정 (옵션)
    setup_ssl_certificate
    
    # 모니터링 설정
    setup_monitoring
    
    # 연결 테스트
    test_connection
    
    # 완료 정보 표시
    show_completion_info
    
    log_success "Nginx + Node.js 연동 설정이 성공적으로 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"