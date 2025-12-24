#!/bin/bash

# MSP Checklist Nginx 완전 설정 스크립트
# 모든 문제 해결 기능 통합 버전
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
    echo "║         MSP Checklist Nginx 완전 설정 스크립트            ║"
    echo "║                                                            ║"
    echo "║  🌐 Nginx 리버스 프록시 설정                             ║"
    echo "║  🚀 Node.js 서버 연동                                    ║"
    echo "║  🔧 자동 문제 해결 및 복구                               ║"
    echo "║  🛡️ 보안 설정 및 방화벽                                 ║"
    echo "║  📊 성능 최적화                                          ║"
    echo "║  🔒 SSL 인증서 지원                                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 명령행 옵션 처리
INSTALL_NGINX=true
SETUP_SSL=false
DOMAIN_NAME=""
EMAIL=""
FORCE_REINSTALL=false
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
        --force-reinstall)
            FORCE_REINSTALL=true
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
    echo "MSP Checklist Nginx 완전 설정 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --ssl               SSL 인증서 설정 (Let's Encrypt)"
    echo "  --domain DOMAIN     도메인 이름 (SSL 설정 시 필수)"
    echo "  --email EMAIL       이메일 주소 (SSL 설정 시 필수)"
    echo "  --no-install        Nginx 설치 건너뛰기 (이미 설치된 경우)"
    echo "  --force-reinstall   Nginx 강제 재설치"
    echo "  --help, -h          이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                                    # 기본 설정"
    echo "  $0 --ssl --domain example.com --email admin@example.com"
    echo "  $0 --force-reinstall                 # 강제 재설치"
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

# 기존 Nginx 완전 제거 함수
complete_nginx_removal() {
    log_info "기존 Nginx 완전 제거 중..."
    
    # 서비스 중지
    sudo systemctl stop nginx 2>/dev/null || true
    sudo systemctl disable nginx 2>/dev/null || true
    
    # 패키지 제거
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt remove --purge -y nginx nginx-common nginx-core 2>/dev/null || true
        sudo apt autoremove -y 2>/dev/null || true
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf remove -y nginx 2>/dev/null || true
    fi
    
    # 설정 파일 제거
    sudo rm -rf /etc/nginx
    sudo rm -rf /var/log/nginx
    sudo rm -rf /var/cache/nginx
    sudo rm -rf /run/nginx.pid
    
    log_success "기존 Nginx 완전 제거 완료"
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

# Nginx 설치 함수
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
    
    # 설치 확인
    if command -v nginx > /dev/null 2>&1; then
        NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
        log_success "Nginx 설치 완료: 버전 $NGINX_VERSION"
    else
        log_error "Nginx 설치 실패"
        return 1
    fi
}

# 모든 문제 설정 파일 정리 함수
cleanup_problematic_configs() {
    log_info "문제가 있는 설정 파일들 정리 중..."
    
    # 모든 문제 설정 파일 제거
    sudo rm -f /etc/nginx/conf.d/performance.conf
    sudo rm -f /etc/nginx/conf.d/msp-*.conf
    sudo rm -f /etc/nginx/sites-available/msp-checklist 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/msp-checklist 2>/dev/null || true
    
    # 기본 설정 비활성화
    if [ -f /etc/nginx/conf.d/default.conf ]; then
        sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
    fi
    
    if [ -f /etc/nginx/sites-enabled/default ]; then
        sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    fi
    
    log_success "문제 설정 파일 정리 완료"
}

# nginx.conf 백업 및 최적화
optimize_nginx_conf() {
    log_info "nginx.conf 백업 및 최적화 중..."
    
    # 백업 생성
    if [ -f /etc/nginx/nginx.conf ]; then
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        log_info "nginx.conf 백업 생성됨"
    fi
    
    # worker_processes 최적화
    if ! grep -q "worker_processes auto" /etc/nginx/nginx.conf; then
        sudo sed -i 's/worker_processes [0-9]*;/worker_processes auto;/' /etc/nginx/nginx.conf
        log_info "worker_processes를 auto로 설정"
    fi
    
    # events 블록 최적화
    if ! grep -q "use epoll" /etc/nginx/nginx.conf; then
        sudo sed -i '/events {/,/}/ {
            /worker_connections/a\    use epoll;\n    multi_accept on;
        }' /etc/nginx/nginx.conf 2>/dev/null || true
        log_info "events 블록 최적화 완료"
    fi
    
    log_success "nginx.conf 최적화 완료"
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
        if [ "$PM2_PROCESSES" -gt 0 ] 2>/dev/null; then
            log_success "✅ PM2 프로세스 $PM2_PROCESSES개 실행 중"
        else
            log_warning "⚠️ PM2 프로세스 실행되지 않음"
        fi
    else
        log_warning "⚠️ PM2가 설치되지 않음"
    fi
}

# MSP Checklist 설정 파일 생성 (OS별)
create_msp_config() {
    log_info "MSP Checklist 설정 파일 생성 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu 스타일 설정
        create_ubuntu_config
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux 스타일 설정
        create_amazon_linux_config
    fi
    
    log_success "MSP Checklist 설정 파일 생성 완료"
}

# Ubuntu 설정 생성
create_ubuntu_config() {
    # sites-available 디렉토리 생성
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Ubuntu)
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

# 레이트 리미팅
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
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
        rewrite ^/admin(/.*)$ $1 break;
        
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 레이트 리미팅
        limit_req zone=general burst=10 nodelay;
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
        proxy_cache_bypass $http_upgrade;
        
        # 레이트 리미팅
        limit_req zone=general burst=20 nodelay;
    }
    
    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
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
        
        # API 레이트 리미팅
        limit_req zone=api burst=20 nodelay;
    }
    
    # 헬스체크
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 보안: 숨겨진 파일 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

    # sites-enabled 링크 생성
    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
}

# Amazon Linux 설정 생성
create_amazon_linux_config() {
    sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Amazon Linux 2023)
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

# 레이트 리미팅
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
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
        rewrite ^/admin(/.*)$ $1 break;
        
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        
        # 레이트 리미팅
        limit_req zone=general burst=10 nodelay;
    }
    
    # 관리자 정적 파일
    location /admin/_next/ {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
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
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        
        # 레이트 리미팅
        limit_req zone=general burst=20 nodelay;
    }
    
    # Next.js 정적 파일 최적화
    location /_next/static/ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 이미지 및 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # API 라우트 최적화
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        
        # API 레이트 리미팅
        limit_req zone=api burst=20 nodelay;
    }
    
    # 로그인 API 특별 제한
    location ~ ^/api/(auth|login) {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 로그인 레이트 리미팅
        limit_req zone=login burst=5 nodelay;
    }
    
    # 헬스체크 엔드포인트
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 로봇 차단
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
EOF
}

# Nginx 설정 테스트 및 재시작
test_and_restart_nginx() {
    log_info "Nginx 설정 테스트 및 재시작 중..."
    
    # 설정 파일 문법 검사
    if sudo nginx -t; then
        log_success "✅ Nginx 설정 파일 문법 검사 통과"
        
        # Nginx 재시작
        sudo systemctl stop nginx 2>/dev/null || true
        sleep 2
        sudo systemctl start nginx
        
        # 상태 확인
        sleep 3
        if sudo systemctl is-active --quiet nginx; then
            log_success "✅ Nginx 서비스 시작 완료"
        else
            log_error "❌ Nginx 서비스 시작 실패"
            sudo systemctl status nginx --no-pager -l
            return 1
        fi
    else
        log_error "❌ Nginx 설정 파일에 오류가 있습니다"
        echo ""
        echo "설정 오류 내용:"
        sudo nginx -t
        return 1
    fi
}

# 방화벽 설정
setup_firewall() {
    log_info "방화벽 설정 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu UFW 설정
        sudo ufw --force enable 2>/dev/null || true
        sudo ufw allow ssh 2>/dev/null || true
        sudo ufw allow 80/tcp 2>/dev/null || true
        sudo ufw allow 443/tcp 2>/dev/null || true
        sudo ufw reload 2>/dev/null || true
        log_success "✅ Ubuntu UFW 방화벽 설정 완료"
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux firewalld 설정 (선택적)
        if command -v firewall-cmd > /dev/null 2>&1; then
            sudo systemctl enable firewalld 2>/dev/null || true
            sudo systemctl start firewalld 2>/dev/null || true
            sudo firewall-cmd --permanent --add-service=ssh 2>/dev/null || true
            sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
            sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
            sudo firewall-cmd --reload 2>/dev/null || true
            log_success "✅ Amazon Linux firewalld 방화벽 설정 완료"
        else
            log_warning "⚠️ firewalld가 설치되지 않음 (선택사항)"
        fi
    fi
}

# SSL 인증서 설정
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
        sudo systemctl enable certbot.timer 2>/dev/null || true
        sudo systemctl start certbot.timer 2>/dev/null || true
        
        log_success "✅ SSL 인증서 자동 갱신 설정 완료"
    else
        log_error "❌ SSL 인증서 발급 실패"
        log_warning "수동으로 다음 명령어를 실행하세요:"
        echo "sudo certbot --nginx -d $DOMAIN_NAME --email $EMAIL"
        return 1
    fi
}

# 연결 테스트
test_connections() {
    log_info "연결 테스트 중..."
    
    # 잠시 대기 (서비스 안정화)
    sleep 3
    
    echo ""
    echo "🔍 연결 테스트 결과:"
    
    # Nginx 포트 80 테스트
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "502" ]]; then
        log_warning "⚠️ HTTP 502 (Bad Gateway) - Node.js 서버가 실행되지 않음"
        echo "  → 이는 정상입니다. Node.js 서버를 시작하면 해결됩니다."
    elif [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 응답 테스트 통과 (HTTP $HTTP_CODE)"
    else
        log_warning "⚠️ HTTP 응답: $HTTP_CODE"
    fi
    
    # 관리자 페이지 테스트
    ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ "$ADMIN_CODE" == "502" ]]; then
        log_warning "⚠️ 관리자 페이지 502 (Bad Gateway) - Node.js 서버가 실행되지 않음"
    elif [[ "$ADMIN_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ 관리자 페이지 응답 테스트 통과 (HTTP $ADMIN_CODE)"
    else
        log_warning "⚠️ 관리자 페이지 응답: $ADMIN_CODE"
    fi
    
    # 헬스체크 테스트
    HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
    if [[ "$HEALTH_CODE" == "200" ]]; then
        log_success "✅ 헬스체크 엔드포인트 정상 (HTTP $HEALTH_CODE)"
    else
        log_warning "⚠️ 헬스체크 응답: $HEALTH_CODE"
    fi
    
    # 포트 확인
    echo ""
    echo "🔌 포트 사용 상황:"
    if sudo netstat -tuln | grep -q ":80 "; then
        log_success "✅ 포트 80 (HTTP) 리스닝 중"
    else
        log_warning "⚠️ 포트 80 리스닝 안됨"
    fi
    
    if [ "$MAIN_SERVER_RUNNING" = true ]; then
        log_success "✅ 포트 3010 (메인 서버) 실행 중"
    else
        log_warning "⚠️ 포트 3010 (메인 서버) 실행되지 않음"
    fi
    
    if [ "$ADMIN_SERVER_RUNNING" = true ]; then
        log_success "✅ 포트 3011 (관리자 서버) 실행 중"
    else
        log_warning "⚠️ 포트 3011 (관리자 서버) 실행되지 않음"
    fi
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
    create 644 nginx nginx
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

    # 상태 확인 스크립트 생성
    sudo tee /usr/local/bin/msp-nginx-status.sh > /dev/null << 'EOF'
#!/bin/bash

echo "=== MSP Checklist Nginx 상태 ==="
echo ""

# Nginx 상태
echo "🌐 Nginx 상태:"
if systemctl is-active --quiet nginx; then
    echo "  ✅ Nginx: 실행 중"
    echo "  📊 프로세스: $(pgrep nginx | wc -l)개"
else
    echo "  ❌ Nginx: 중지됨"
fi

# 포트 상태
echo ""
echo "🔌 포트 상태:"
netstat -tuln | grep -E ':80|:3010|:3011' | while read line; do
    echo "  $line"
done

# 최근 로그
echo ""
echo "📝 최근 에러 로그 (5줄):"
tail -5 /var/log/nginx/error.log 2>/dev/null || echo "  에러 로그 없음"

echo ""
echo "=== 상태 확인 완료 ==="
EOF

    sudo chmod +x /usr/local/bin/msp-nginx-status.sh
    
    log_success "✅ 모니터링 및 로그 설정 완료"
}

# 설치 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Nginx 설정 완료! 🎉                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist Nginx 설정이 성공적으로 완료되었습니다!"
    
    # 공용 IP 확인
    if command -v curl > /dev/null; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    else
        PUBLIC_IP="YOUR_SERVER_IP"
    fi
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    if [ "$DOMAIN_NAME" != "" ]; then
        if [ "$SETUP_SSL" = true ]; then
            echo "  - 메인 서비스: https://$DOMAIN_NAME"
            echo "  - 관리자 시스템: https://$DOMAIN_NAME/admin"
            echo "  - 헬스체크: https://$DOMAIN_NAME/health"
        else
            echo "  - 메인 서비스: http://$DOMAIN_NAME"
            echo "  - 관리자 시스템: http://$DOMAIN_NAME/admin"
            echo "  - 헬스체크: http://$DOMAIN_NAME/health"
        fi
    else
        echo "  - 메인 서비스: http://$PUBLIC_IP"
        echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
        echo "  - 헬스체크: http://$PUBLIC_IP/health"
    fi
    
    echo ""
    echo "🔧 유용한 명령어:"
    echo "  - 시스템 상태 확인: sudo /usr/local/bin/msp-nginx-status.sh"
    echo "  - Nginx 상태: sudo systemctl status nginx"
    echo "  - Nginx 재시작: sudo systemctl restart nginx"
    echo "  - 설정 테스트: sudo nginx -t"
    echo "  - 로그 확인: sudo tail -f /var/log/nginx/msp-checklist-error.log"
    
    echo ""
    echo "📝 다음 단계:"
    echo "1. Node.js 서버 시작:"
    if [ -f "test-server.js" ]; then
        echo "   node test-server.js &  # 테스트 서버"
    fi
    echo "   cd /opt/msp-checklist-system/msp-checklist && npm start  # 실제 서버"
    echo ""
    echo "2. AWS 보안 그룹에서 포트 80, 443 인바운드 규칙 확인"
    echo ""
    echo "3. 브라우저에서 접속 테스트"
    
    if [ "$SETUP_SSL" = false ] && [ "$DOMAIN_NAME" != "" ]; then
        echo ""
        echo "4. SSL 인증서 설정 (선택사항):"
        echo "   $0 --ssl --domain $DOMAIN_NAME --email your@email.com"
    fi
    
    echo ""
    echo "🔒 보안 권장사항:"
    echo "- 포트 3010, 3011은 직접 접근이 차단되어 있습니다"
    echo "- Nginx를 통해서만 접근 가능합니다"
    if [ "$SETUP_SSL" = false ]; then
        echo "- SSL 인증서 설정을 권장합니다"
    fi
    
    echo ""
}

# 메인 실행 함수
main() {
    # 배너 출력
    show_banner
    
    # 사용자 확인
    read -p "MSP Checklist Nginx 완전 설정을 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설정이 취소되었습니다."
        exit 0
    fi
    
    # OS 감지
    detect_os
    
    # 강제 재설치 옵션
    if [ "$FORCE_REINSTALL" = true ]; then
        complete_nginx_removal
        INSTALL_NGINX=true
    fi
    
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
    
    # 문제 설정 파일 정리
    cleanup_problematic_configs
    
    # nginx.conf 최적화
    optimize_nginx_conf
    
    # MSP 설정 파일 생성
    create_msp_config
    
    # Nginx 테스트 및 재시작
    test_and_restart_nginx
    
    # 방화벽 설정
    setup_firewall
    
    # SSL 인증서 설정 (옵션)
    setup_ssl_certificate
    
    # 모니터링 설정
    setup_monitoring
    
    # 연결 테스트
    test_connections
    
    # 완료 정보 표시
    show_completion_info
    
    log_success "MSP Checklist Nginx 완전 설정이 성공적으로 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"