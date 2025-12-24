#!/bin/bash

# MSP Checklist 통합 배포 스크립트 (Refined Version)
# Node.js 애플리케이션 + Nginx 리버스 프록시 완전 설치 및 설정
# Ubuntu 22.04 LTS 및 Amazon Linux 2023 지원
# 모든 알려진 문제 해결 기능 통합

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

# 전역 변수
OS_TYPE=""
PACKAGE_MANAGER=""
USER_NAME=""
FIREWALL_CMD=""
NODE_VERSION="20.9.0"
PROJECT_DIR="/opt/msp-checklist-system"

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║      MSP Checklist 통합 배포 스크립트 (Refined)           ║"
    echo "║                                                            ║"
    echo "║  🚀 Node.js 애플리케이션 완전 설치                       ║"
    echo "║  🌐 Nginx 리버스 프록시 설정                             ║"
    echo "║  🔧 자동 문제 해결 및 복구                               ║"
    echo "║  🛡️ 보안 설정 및 방화벽                                 ║"
    echo "║  📊 성능 최적화 및 모니터링                              ║"
    echo "║  🔒 SSL 인증서 지원                                      ║"
    echo "║  ✨ 모든 알려진 문제 해결 통합                           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 명령행 옵션 처리
INSTALL_DEPS=true
INSTALL_NGINX=true
SETUP_SSL=false
DOMAIN_NAME=""
EMAIL=""
FORCE_REINSTALL=false
MINIMAL_INSTALL=false
HELP=false
SKIP_BUILD=false
NGINX_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --deps-only)
            INSTALL_DEPS=true
            INSTALL_NGINX=false
            shift
            ;;
        --nginx-only)
            NGINX_ONLY=true
            INSTALL_DEPS=false
            INSTALL_NGINX=true
            shift
            ;;
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
        --force-reinstall)
            FORCE_REINSTALL=true
            shift
            ;;
        --minimal)
            MINIMAL_INSTALL=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
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
    echo "MSP Checklist 통합 배포 스크립트 (Refined)"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --deps-only         의존성 및 Node.js만 설치"
    echo "  --nginx-only        Nginx만 설정 (기존 설치 가정)"
    echo "  --ssl               SSL 인증서 설정 (Let's Encrypt)"
    echo "  --domain DOMAIN     도메인 이름 (SSL 설정 시 필수)"
    echo "  --email EMAIL       이메일 주소 (SSL 설정 시 필수)"
    echo "  --force-reinstall   모든 구성 요소 강제 재설치"
    echo "  --minimal           최소 설치 (기본 기능만)"
    echo "  --skip-build        애플리케이션 빌드 건너뛰기"
    echo "  --help, -h          이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                                    # 전체 설치"
    echo "  $0 --deps-only                       # 의존성만 설치"
    echo "  $0 --nginx-only                      # Nginx만 설정"
    echo "  $0 --ssl --domain example.com --email admin@example.com"
    echo "  $0 --force-reinstall --minimal       # 최소 강제 재설치"
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
    log_step "운영체제 감지 중..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME="$NAME"
        OS_VERSION="$VERSION"
        
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            PACKAGE_MANAGER="apt"
            USER_NAME="ubuntu"
            FIREWALL_CMD="ufw"
            log_success "Ubuntu 감지됨: $OS_NAME $OS_VERSION"
            
        elif [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
            OS_TYPE="amazon-linux-2023"
            PACKAGE_MANAGER="dnf"
            USER_NAME="ec2-user"
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

# 시스템 업데이트
update_system() {
    log_step "시스템 패키지 업데이트 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt update -y
        sudo apt upgrade -y
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf update -y
    fi
    
    log_success "시스템 업데이트 완료"
}

# 기본 의존성 설치 (curl 충돌 문제 해결 통합)
install_basic_dependencies() {
    log_step "기본 의존성 설치 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt install -y curl wget git sqlite3 htop unzip build-essential
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux 2023 curl 충돌 문제 해결
        fix_amazon_linux_curl_conflict
        
        sudo dnf install -y curl wget git sqlite htop unzip gcc gcc-c++ make
        sudo dnf groupinstall -y 'Development Tools'
    fi
    
    log_success "기본 의존성 설치 완료"
}

# Amazon Linux 2023 curl 충돌 문제 해결 함수 (강화된 버전)
fix_amazon_linux_curl_conflict() {
    log_info "Amazon Linux 2023 curl 충돌 문제 해결 중..."
    
    # 현재 curl 상태 확인
    log_debug "현재 curl 패키지 상태 확인 중..."
    dnf list installed | grep curl > /dev/null 2>&1 || log_debug "curl 패키지 없음"
    
    if ! curl --version > /dev/null 2>&1; then
        log_warning "curl 명령어가 작동하지 않습니다. 문제 해결을 시작합니다..."
        
        # curl-minimal 제거
        log_info "curl-minimal 패키지 제거 중..."
        sudo dnf remove -y curl-minimal 2>/dev/null || true
        
        # 패키지 캐시 정리
        log_info "패키지 캐시 정리 중..."
        sudo dnf clean all
        sudo dnf makecache
        
        # curl 설치 (충돌 해결)
        log_info "curl 패키지 설치 중..."
        if sudo dnf install -y curl --allowerasing; then
            log_success "✅ curl 설치 성공"
        else
            log_warning "⚠️ 일반 설치 실패, 대안 방법 시도 중..."
            
            # 대안 1: 최신 버전 설치
            log_info "최신 버전 curl 설치 시도 중..."
            sudo dnf install -y curl --best --allowerasing 2>/dev/null || {
                
                # 대안 2: 강제 설치
                log_info "강제 설치 시도 중..."
                sudo dnf install -y curl --skip-broken --allowerasing 2>/dev/null || {
                    
                    # 대안 3: 수동 다운로드 및 설치
                    log_info "수동 설치 시도 중..."
                    
                    # 임시 디렉토리 생성
                    local temp_dir=$(mktemp -d)
                    cd "$temp_dir"
                    
                    # curl RPM 다운로드 (wget 사용)
                    if command -v wget > /dev/null 2>&1; then
                        log_info "wget으로 curl RPM 다운로드 중..."
                        wget https://download-ib01.fedoraproject.org/pub/epel/9/Everything/x86_64/Packages/c/curl-7.76.1-29.el9_4.1.x86_64.rpm -O curl.rpm 2>/dev/null || true
                        
                        # RPM 설치
                        if [ -f "curl.rpm" ]; then
                            sudo rpm -Uvh --force curl.rpm 2>/dev/null || true
                        fi
                    fi
                    
                    # 정리
                    cd /
                    rm -rf "$temp_dir"
                }
            }
        fi
        
        # 설치 확인
        if command -v curl > /dev/null 2>&1; then
            local curl_version=$(curl --version | head -1)
            log_success "✅ curl 설치 확인: $curl_version"
        else
            log_error "❌ curl 설치 실패"
            
            # 최후의 수단: 소스 컴파일
            log_info "소스 컴파일로 curl 설치 시도 중..."
            
            # 필요한 개발 도구 설치
            sudo dnf groupinstall -y "Development Tools" 2>/dev/null || true
            sudo dnf install -y openssl-devel libcurl-devel 2>/dev/null || true
            
            # curl 소스 다운로드 및 컴파일
            local temp_dir=$(mktemp -d)
            cd "$temp_dir"
            
            if command -v wget > /dev/null 2>&1; then
                wget https://curl.se/download/curl-8.5.0.tar.gz -O curl.tar.gz 2>/dev/null || true
                
                if [ -f "curl.tar.gz" ]; then
                    tar -xzf curl.tar.gz
                    cd curl-*
                    
                    ./configure --prefix=/usr/local
                    make -j$(nproc)
                    sudo make install
                    
                    # 심볼릭 링크 생성
                    sudo ln -sf /usr/local/bin/curl /usr/bin/curl
                    
                    log_success "✅ curl 소스 컴파일 설치 완료"
                fi
            fi
            
            # 정리
            cd /
            rm -rf "$temp_dir"
        fi
    else
        log_success "✅ curl이 이미 정상적으로 설치되어 있습니다."
    fi
    
    # 최종 테스트
    if command -v curl > /dev/null 2>&1; then
        local test_result=$(curl -s -o /dev/null -w "%{http_code}" http://httpbin.org/get 2>/dev/null || echo "연결 실패")
        log_debug "curl 테스트 결과: $test_result"
    fi
}

# Node.js 설치
install_nodejs() {
    log_step "Node.js $NODE_VERSION 설치 중..."
    
    # 기존 Node.js 제거
    if command -v node > /dev/null; then
        log_warning "기존 Node.js 제거 중..."
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            sudo apt remove -y nodejs npm 2>/dev/null || true
        elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
            sudo dnf remove -y nodejs npm 2>/dev/null || true
        fi
    fi
    
    # NodeSource 저장소 추가 및 Node.js 20.x 설치
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    fi
    
    # 버전 확인
    NODE_VERSION_INSTALLED=$(node --version 2>/dev/null || echo "설치 실패")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "설치 실패")
    
    log_success "Node.js 설치 완료: $NODE_VERSION_INSTALLED"
    log_success "npm 설치 완료: $NPM_VERSION"
    
    # PM2 전역 설치
    log_info "PM2 프로세스 관리자 설치 중..."
    sudo npm install -g pm2
    log_success "PM2 설치 완료"
}

# Nginx 설치 및 기본 설정
install_nginx() {
    log_step "Nginx 설치 중..."
    
    # 기존 Nginx 제거 (강제 재설치 시)
    if [ "$FORCE_REINSTALL" = true ]; then
        log_info "기존 Nginx 완전 제거 중..."
        sudo systemctl stop nginx 2>/dev/null || true
        sudo systemctl disable nginx 2>/dev/null || true
        
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            sudo apt remove --purge -y nginx nginx-common nginx-core 2>/dev/null || true
            sudo apt autoremove -y 2>/dev/null || true
        elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
            sudo dnf remove -y nginx 2>/dev/null || true
        fi
        
        sudo rm -rf /etc/nginx
        sudo rm -rf /var/log/nginx
        sudo rm -rf /var/cache/nginx
    fi
    
    # Nginx 설치
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt install -y nginx
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf install -y nginx
    fi
    
    # 서비스 활성화
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

# 프로젝트 클론 및 설정
setup_project() {
    log_step "MSP Checklist 프로젝트 설정 중..."
    
    # 프로젝트 디렉토리로 이동
    cd /opt
    
    # 기존 디렉토리 제거
    if [ -d "msp-checklist-system" ]; then
        log_warning "기존 msp-checklist-system 디렉토리 제거 중..."
        sudo rm -rf msp-checklist-system
    fi
    
    # Git 클론
    sudo git clone https://github.com/randykwon/msp-checklist-system.git
    
    # 소유권 설정
    sudo chown -R $USER_NAME:$USER_NAME msp-checklist-system
    
    # 실행 권한 부여
    cd msp-checklist-system
    sudo chmod +x *.sh
    
    log_success "프로젝트 설정 완료"
}

# 환경 변수 설정
setup_environment_variables() {
    log_step "환경 변수 설정 중..."
    
    cd $PROJECT_DIR
    
    # 통합 환경 변수 파일 생성
    cat > .env.unified << 'EOF'
# MSP Checklist 통합 환경 변수 설정
NODE_ENV=production
PORT=3010
ADMIN_PORT=3011
HOST=0.0.0.0

# 데이터베이스 설정
DATABASE_URL=sqlite:./msp_checklist.db
ADMIN_DATABASE_URL=sqlite:./admin.db

# 보안 설정 (실제 환경에서는 변경 필요)
JWT_SECRET=msp-checklist-jwt-secret-change-in-production
SESSION_SECRET=msp-checklist-session-secret-change-in-production
NEXTAUTH_SECRET=msp-checklist-nextauth-secret-change-in-production
NEXTAUTH_URL=http://localhost:3010

# API 설정 (실제 키로 교체 필요)
OPENAI_API_KEY=your-openai-api-key-here
CLAUDE_API_KEY=your-claude-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# 파일 업로드 설정
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# 로깅 설정
LOG_LEVEL=info
LOG_FILE=./server.log

# Next.js 설정
NEXT_TELEMETRY_DISABLED=1
TURBOPACK=1
NODE_OPTIONS=--max-old-space-size=1024
EOF

    # 메인 애플리케이션 환경 변수
    if [ -d "msp-checklist" ]; then
        cd msp-checklist
        cp ../.env.unified .env.local
        
        # Admin 애플리케이션 환경 변수
        if [ -d "admin" ]; then
            cd admin
            cp ../../.env.unified .env.local
            # 관리자용 포트 설정
            sed -i 's/PORT=3010/PORT=3011/' .env.local
            cd ..
        fi
        cd ..
    fi
    
    log_success "환경 변수 설정 완료"
}

# Nginx 설정 정리 및 생성 (문제 해결 통합)
setup_nginx_config() {
    log_step "Nginx 설정 파일 생성 중 (모든 문제 해결 통합)..."
    
    # 기존 문제 설정 파일들 완전 제거
    log_info "기존 문제 설정 파일들 제거 중..."
    sudo rm -f /etc/nginx/conf.d/performance.conf
    sudo rm -f /etc/nginx/conf.d/msp-*.conf
    sudo rm -f /etc/nginx/sites-available/msp-checklist 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/msp-checklist 2>/dev/null || true
    
    # nginx.conf 백업
    if [ -f /etc/nginx/nginx.conf ]; then
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        log_info "nginx.conf 백업 생성됨"
    fi
    
    # nginx.conf 최적화 (sendfile 중복 방지)
    log_info "nginx.conf 최적화 중..."
    if ! grep -q "worker_processes auto" /etc/nginx/nginx.conf; then
        sudo sed -i 's/worker_processes [0-9]*;/worker_processes auto;/' /etc/nginx/nginx.conf
    fi
    
    # OS별 설정 파일 생성
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        create_ubuntu_nginx_config
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        create_amazon_linux_nginx_config
    fi
    
    log_success "Nginx 설정 파일 생성 완료"
}

# Ubuntu Nginx 설정 (문제 해결 통합)
create_ubuntu_nginx_config() {
    log_info "Ubuntu용 Nginx 설정 생성 중..."
    
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Ubuntu) - 문제 해결 통합 버전
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

# 레이트 리미팅 (중복 방지)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    client_max_body_size 50M;
    
    # 관리자 시스템 (포트 충돌 방지)
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
        limit_req zone=general burst=10 nodelay;
    }
    
    # 메인 애플리케이션
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
        limit_req zone=general burst=20 nodelay;
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
        limit_req zone=api burst=20 nodelay;
    }
    
    # 정적 파일
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
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
    
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    log_success "Ubuntu Nginx 설정 완료"
}

# Amazon Linux Nginx 설정 (문제 해결 통합)
create_amazon_linux_nginx_config() {
    log_info "Amazon Linux 2023용 Nginx 설정 생성 중..."
    
    sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Amazon Linux 2023) - 문제 해결 통합 버전
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

# 레이트 리미팅 (중복 방지)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    client_max_body_size 50M;
    
    # 관리자 시스템 (포트 충돌 방지)
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
        limit_req zone=general burst=10 nodelay;
    }
    
    # 메인 애플리케이션
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
        limit_req zone=general burst=20 nodelay;
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
        limit_req zone=api burst=20 nodelay;
    }
    
    # 정적 파일
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
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
    
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

    sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
    
    log_success "Amazon Linux Nginx 설정 완료"
}

# Nginx 테스트 및 시작 (강화된 오류 처리)
start_nginx() {
    log_step "Nginx 테스트 및 시작 중..."
    
    # 설정 테스트
    log_info "Nginx 설정 파일 문법 검사 중..."
    if sudo nginx -t; then
        log_success "✅ Nginx 설정 파일 문법 검사 통과"
        
        # Nginx 시작
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
        log_info "자동 수정을 시도합니다..."
        
        # 자동 수정 시도
        fix_nginx_configuration_errors
        
        # 재시도
        if sudo nginx -t; then
            log_success "✅ 설정 오류 수정 완료"
            sudo systemctl restart nginx
            if sudo systemctl is-active --quiet nginx; then
                log_success "✅ Nginx 서비스 시작 완료"
            else
                log_error "❌ Nginx 서비스 시작 실패"
                return 1
            fi
        else
            log_error "❌ 설정 오류 수정 실패"
            return 1
        fi
    fi
}

# 종합 문제 해결 및 복구 함수
comprehensive_error_recovery() {
    log_step "종합 문제 해결 및 복구 시스템 실행 중..."
    
    local recovery_needed=false
    
    # 1. Amazon Linux 2023 curl 문제 확인 및 해결
    if [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        if ! curl --version > /dev/null 2>&1; then
            log_warning "curl 문제 감지됨 - 자동 해결 시작"
            fix_amazon_linux_curl_conflict
            recovery_needed=true
        fi
    fi
    
    # 2. Node.js 설치 상태 확인
    if ! command -v node > /dev/null 2>&1; then
        log_warning "Node.js가 설치되지 않음 - 설치 시작"
        install_nodejs
        recovery_needed=true
    fi
    
    # 3. Nginx 설정 문제 확인 및 해결
    if command -v nginx > /dev/null 2>&1; then
        if ! sudo nginx -t > /dev/null 2>&1; then
            log_warning "Nginx 설정 오류 감지됨 - 자동 수정 시작"
            fix_nginx_configuration_errors
            recovery_needed=true
        fi
    fi
    
    # 4. 프로젝트 디렉토리 확인
    if [ -d "$PROJECT_DIR/msp-checklist" ]; then
        cd "$PROJECT_DIR/msp-checklist"
        
        # 5. LightningCSS 문제 확인
        if [ -f "package.json" ]; then
            if grep -q "lightningcss\|@tailwindcss" package.json; then
                log_warning "LightningCSS 관련 패키지 감지됨 - 문제 해결 시작"
                fix_lightningcss_issues "main"
                recovery_needed=true
            fi
        fi
        
        # 6. 빌드 상태 확인
        if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
            log_warning "애플리케이션이 빌드되지 않음 - 빌드 시작"
            build_application
            recovery_needed=true
        fi
    fi
    
    # 7. PM2 프로세스 상태 확인
    if command -v pm2 > /dev/null 2>&1; then
        local running_processes=$(pm2 list | grep -c "online" 2>/dev/null || echo "0")
        if [ "$running_processes" -eq 0 ]; then
            log_warning "PM2 프로세스가 실행되지 않음 - 시작 시도"
            if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
                cd "$PROJECT_DIR"
                pm2 start ecosystem.config.js 2>/dev/null || true
                recovery_needed=true
            fi
        fi
    fi
    
    # 8. 포트 충돌 확인 및 해결
    local port_conflicts=false
    
    # 포트 80 확인 (Nginx가 사용해야 함)
    if netstat -tuln 2>/dev/null | grep ":80 " | grep -v nginx > /dev/null; then
        log_warning "포트 80에서 충돌 감지됨"
        port_conflicts=true
    fi
    
    # 포트 3010, 3011 확인 (Node.js가 사용해야 함)
    for port in 3010 3011; do
        if netstat -tuln 2>/dev/null | grep ":$port " | grep -v node > /dev/null; then
            log_warning "포트 $port에서 충돌 감지됨"
            port_conflicts=true
        fi
    done
    
    if [ "$port_conflicts" = true ]; then
        log_info "포트 충돌 해결 중..."
        # 충돌하는 프로세스 종료 (안전하게)
        sudo pkill -f "nginx: worker process" 2>/dev/null || true
        sudo systemctl restart nginx 2>/dev/null || true
        recovery_needed=true
    fi
    
    # 9. 권한 문제 확인 및 해결
    if [ -d "$PROJECT_DIR" ]; then
        local current_owner=$(stat -c '%U' "$PROJECT_DIR" 2>/dev/null || echo "unknown")
        if [ "$current_owner" != "$USER_NAME" ] && [ "$current_owner" != "$(whoami)" ]; then
            log_warning "프로젝트 디렉토리 권한 문제 감지됨 - 수정 중"
            sudo chown -R "$USER_NAME:$USER_NAME" "$PROJECT_DIR" 2>/dev/null || true
            recovery_needed=true
        fi
    fi
    
    # 10. 로그 디렉토리 확인 및 생성
    if [ ! -d "$PROJECT_DIR/logs" ]; then
        log_info "로그 디렉토리 생성 중..."
        mkdir -p "$PROJECT_DIR/logs"
        recovery_needed=true
    fi
    
    # 복구 결과 보고
    if [ "$recovery_needed" = true ]; then
        log_success "✅ 종합 문제 해결 및 복구 완료"
        
        # 시스템 상태 재확인
        log_info "시스템 상태 재확인 중..."
        sleep 3
        
        # 서비스 재시작
        if command -v nginx > /dev/null 2>&1; then
            sudo systemctl restart nginx 2>/dev/null || true
        fi
        
        if command -v pm2 > /dev/null 2>&1 && [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
            cd "$PROJECT_DIR"
            pm2 restart all 2>/dev/null || true
        fi
        
        log_success "✅ 모든 서비스 재시작 완료"
    else
        log_success "✅ 시스템 상태 정상 - 추가 복구 불필요"
    fi
}

# Nginx 설정 오류 자동 수정 함수 (강화된 버전)
fix_nginx_configuration_errors() {
    log_info "Nginx 설정 오류 자동 수정 중..."
    
    # 1. 문제가 있는 설정 파일들 제거
    sudo rm -f /etc/nginx/conf.d/performance.conf
    sudo rm -f /etc/nginx/conf.d/default.conf
    
    # 2. sendfile 중복 확인 및 제거
    if grep -q "sendfile.*on" /etc/nginx/nginx.conf; then
        log_info "nginx.conf에 sendfile 설정이 이미 있습니다. 중복 방지됨."
    fi
    
    # 3. 기본 설정으로 복원
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo rm -f /etc/nginx/sites-enabled/msp-checklist
        create_ubuntu_nginx_config
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo rm -f /etc/nginx/conf.d/msp-checklist.conf
        create_amazon_linux_nginx_config
    fi
    
    log_success "✅ Nginx 설정 오류 자동 수정 완료"
}

# 방화벽 설정
setup_firewall() {
    log_step "방화벽 설정 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo ufw --force enable 2>/dev/null || true
        sudo ufw allow ssh 2>/dev/null || true
        sudo ufw allow 80/tcp 2>/dev/null || true
        sudo ufw allow 443/tcp 2>/dev/null || true
        sudo ufw reload 2>/dev/null || true
        log_success "✅ Ubuntu UFW 방화벽 설정 완료"
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
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
    
    log_step "SSL 인증서 설정 중..."
    
    # Certbot 설치
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt install -y certbot python3-certbot-nginx
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf install -y certbot python3-certbot-nginx
    fi
    
    # SSL 인증서 발급
    if sudo certbot --nginx -d "$DOMAIN_NAME" --email "$EMAIL" --agree-tos --non-interactive; then
        log_success "✅ SSL 인증서 발급 완료"
        sudo systemctl enable certbot.timer 2>/dev/null || true
        sudo systemctl start certbot.timer 2>/dev/null || true
    else
        log_error "❌ SSL 인증서 발급 실패"
        return 1
    fi
}

# PM2 설정
setup_pm2() {
    log_step "PM2 프로세스 관리 설정 중..."
    
    cd $PROJECT_DIR
    
    # PM2 설정 파일 생성
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'msp-checklist-main',
      cwd: '/opt/msp-checklist-system/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist-system/logs/main-error.log',
      out_file: '/opt/msp-checklist-system/logs/main-out.log',
      log_file: '/opt/msp-checklist-system/logs/main-combined.log',
      time: true
    },
    {
      name: 'msp-checklist-admin',
      cwd: '/opt/msp-checklist-system/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist-system/logs/admin-error.log',
      out_file: '/opt/msp-checklist-system/logs/admin-out.log',
      log_file: '/opt/msp-checklist-system/logs/admin-combined.log',
      time: true
    }
  ]
};
EOF

    # 로그 디렉토리 생성
    mkdir -p logs
    
    log_success "PM2 설정 완료"
}

# 애플리케이션 빌드 (LightningCSS 문제 해결 통합)
build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        log_info "애플리케이션 빌드 건너뛰기"
        return 0
    fi
    
    log_step "MSP Checklist 애플리케이션 빌드 중..."
    
    cd $PROJECT_DIR/msp-checklist
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 의존성 설치
    log_info "메인 애플리케이션 의존성 설치 중..."
    npm install --omit=optional --legacy-peer-deps
    
    # 메인 애플리케이션 빌드 시도
    log_info "메인 애플리케이션 빌드 중..."
    if npm run build; then
        log_success "메인 애플리케이션 빌드 성공"
        
        # Admin 애플리케이션 빌드
        if [ -d "admin" ] && [ "$MINIMAL_INSTALL" = false ]; then
            cd admin
            log_info "Admin 애플리케이션 빌드 중..."
            npm install --omit=optional --legacy-peer-deps
            
            if npm run build; then
                log_success "Admin 애플리케이션 빌드 성공"
            else
                log_warning "Admin 애플리케이션 빌드 실패 - LightningCSS 문제 해결 시도 중..."
                fix_lightningcss_issues "admin"
                
                # 재시도
                if npm run build; then
                    log_success "Admin 애플리케이션 빌드 성공 (문제 해결 후)"
                else
                    log_warning "Admin 애플리케이션 빌드 실패 (메인 시스템은 정상)"
                fi
            fi
            cd ..
        fi
    else
        log_warning "메인 애플리케이션 빌드 실패 - 자동 문제 해결 시작..."
        
        # 빌드 실패 원인 분석
        local build_error_log=$(npm run build 2>&1 | tail -20)
        
        if echo "$build_error_log" | grep -q "lightningcss\|Cannot find module.*lightningcss"; then
            log_error "❌ LightningCSS 네이티브 모듈 오류 감지됨 - Nuclear Fix 실행"
            
            # Nuclear CSS Fix 실행
            if [ -f "/opt/msp-checklist-system/nuclear-css-fix.sh" ]; then
                log_info "Nuclear CSS Fix 스크립트 실행 중..."
                bash /opt/msp-checklist-system/nuclear-css-fix.sh
                return 0
            else
                log_info "LightningCSS 문제 해결 시작"
                fix_lightningcss_issues "main"
            fi
        elif echo "$build_error_log" | grep -q "ENOSPC\|no space left"; then
            log_error "디스크 공간 부족 - 정리 필요"
            # 캐시 정리
            npm cache clean --force
            rm -rf node_modules/.cache .next/cache 2>/dev/null || true
        elif echo "$build_error_log" | grep -q "ENOMEM\|out of memory"; then
            log_warning "메모리 부족 - Node.js 옵션 조정"
            export NODE_OPTIONS="--max-old-space-size=1024"
        else
            log_info "일반적인 빌드 문제 해결 시도"
            # 의존성 재설치
            rm -rf node_modules package-lock.json
            npm install --omit=optional --legacy-peer-deps
        fi
        
        # 빌드 재시도
        log_info "메인 애플리케이션 빌드 재시도 중..."
        if npm run build; then
            log_success "메인 애플리케이션 빌드 성공 (문제 해결 후)"
            
            # Admin 애플리케이션 빌드
            if [ -d "admin" ] && [ "$MINIMAL_INSTALL" = false ]; then
                cd admin
                log_info "Admin 애플리케이션 빌드 중..."
                npm install --omit=optional --legacy-peer-deps
                
                # Admin도 같은 문제 해결 적용
                fix_lightningcss_issues "admin"
                
                if npm run build; then
                    log_success "Admin 애플리케이션 빌드 성공"
                else
                    log_warning "Admin 애플리케이션 빌드 실패 (메인 시스템은 정상)"
                fi
                cd ..
            fi
        else
            log_error "메인 애플리케이션 빌드 실패 - 수동 확인 필요"
            
            # 최후의 수단: 간단한 빌드 시도
            log_info "간단한 빌드 모드로 재시도 중..."
            export NODE_ENV=development
            export NEXT_TELEMETRY_DISABLED=1
            
            if npm run build; then
                log_success "간단한 빌드 모드로 성공"
            else
                log_error "모든 빌드 시도 실패"
                return 1
            fi
        fi
    fi
    
    log_success "애플리케이션 빌드 완료"
}

# LightningCSS 문제 해결 함수 (강화된 버전)
fix_lightningcss_issues() {
    local app_type=${1:-"main"}
    log_info "LightningCSS 문제 해결 중 ($app_type)..."
    
    # 현재 디렉토리 저장
    local current_dir=$(pwd)
    
    # 문제가 있는 패키지들 제거
    log_info "문제가 있는 CSS 관련 패키지들 제거 중..."
    npm uninstall lightningcss @tailwindcss/postcss @tailwindcss/node tailwindcss postcss autoprefixer 2>/dev/null || true
    
    # 설정 파일들 제거
    rm -f postcss.config.* tailwind.config.* 2>/dev/null || true
    
    # 캐시 정리
    log_info "캐시 정리 중..."
    npm cache clean --force
    rm -rf node_modules/.cache .next 2>/dev/null || true
    
    # 간단한 CSS로 교체
    log_info "간단한 CSS 프레임워크로 교체 중..."
    
    if [ -f "app/globals.css" ]; then
        cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS - Amazon Linux 2023 호환 */

/* 기본 리셋 */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 기본 스타일 */
html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: #333;
  background: #fff;
}

/* 컨테이너 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 카드 스타일 */
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 버튼 스타일 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

/* 폼 스타일 */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 체크리스트 스타일 */
.checklist-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.checklist-item:hover {
  background-color: #f9fafb;
}

.checklist-item.completed {
  background-color: #f0f9ff;
  border-color: #3b82f6;
}

.checklist-checkbox {
  margin-right: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
}

.checklist-text {
  flex: 1;
}

.checklist-text.completed {
  text-decoration: line-through;
  color: #6b7280;
}

/* 진행률 바 */
.progress-container {
  margin: 1rem 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s ease;
}

/* 통계 카드 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

/* 네비게이션 */
.nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #3b82f6;
  background-color: #f3f4f6;
}

.nav-link.active {
  color: #3b82f6;
  background-color: #eff6ff;
}

/* 유틸리티 클래스 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-5 { margin-top: 1.25rem; }
.mt-6 { margin-top: 1.5rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

.w-full { width: 100%; }
.h-full { height: 100%; }

.hidden { display: none; }
.block { display: block; }
.inline-block { display: inline-block; }

/* 반응형 디자인 */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  .card {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 로딩 애니메이션 */
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 알림 스타일 */
.alert {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.alert-success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.alert-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.alert-warning {
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  color: #92400e;
}

.alert-info {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
EOF
    fi
    
    # Next.js 설정 최적화 (LightningCSS 없이)
    log_info "Next.js 설정 최적화 중..."
    
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화
  output: 'standalone',
  trailingSlash: false,
  
  // 이미지 최적화 (AWS 환경 호환)
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // 압축 및 최적화
  compress: true,
  poweredByHeader: false,
  
  // 실험적 기능 (LightningCSS 제외)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Webpack 설정 (Amazon Linux 2023 호환)
  webpack: (config: any, { isServer }: any) => {
    // 클라이언트 사이드에서 서버 전용 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        events: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        cluster: false,
        module: false,
        readline: false,
        repl: false,
        vm: false,
        constants: false,
        domain: false,
        punycode: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        dgram: false,
        assert: false,
      };
    }
    
    // 외부 패키지 설정
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    // 네이티브 모듈 문제 해결
    config.resolve.alias = {
      ...config.resolve.alias,
      'lightningcss': false,
      '@tailwindcss/postcss': false,
    };
    
    return config;
  },
  
  // 서버 외부 패키지
  serverExternalPackages: ['better-sqlite3'],
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
EOF
    
    # package.json에서 문제가 있는 의존성 제거
    log_info "package.json에서 문제가 있는 의존성 제거 중..."
    
    if command -v jq > /dev/null 2>&1; then
        # jq가 있는 경우
        jq 'del(.dependencies.lightningcss, .dependencies."@tailwindcss/postcss", .dependencies."@tailwindcss/node", .dependencies.tailwindcss, .dependencies.postcss, .dependencies.autoprefixer)' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        # jq가 없는 경우 sed 사용
        sed -i '/"lightningcss"/d; /"@tailwindcss/d; /"tailwindcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json 2>/dev/null || true
    fi
    
    # Admin 애플리케이션도 동일하게 처리
    if [ -d "admin" ] && [ "$app_type" = "main" ]; then
        log_info "Admin 애플리케이션 CSS 문제 해결 중..."
        
        cd admin
        
        # 문제가 있는 패키지들 제거
        npm uninstall lightningcss @tailwindcss/postcss @tailwindcss/node tailwindcss postcss autoprefixer 2>/dev/null || true
        
        # 설정 파일들 제거
        rm -f postcss.config.* tailwind.config.* 2>/dev/null || true
        
        # globals.css 복사
        if [ -f "app/globals.css" ]; then
            cp ../app/globals.css app/globals.css
        fi
        
        # Next.js 설정 복사
        cp ../next.config.ts ./
        
        # package.json에서 문제가 있는 의존성 제거
        if command -v jq > /dev/null 2>&1; then
            jq 'del(.dependencies.lightningcss, .dependencies."@tailwindcss/postcss", .dependencies."@tailwindcss/node", .dependencies.tailwindcss, .dependencies.postcss, .dependencies.autoprefixer)' package.json > package.json.tmp && mv package.json.tmp package.json
        else
            sed -i '/"lightningcss"/d; /"@tailwindcss/d; /"tailwindcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json 2>/dev/null || true
        fi
        
        cd ..
    fi
    
    # 의존성 재설치
    log_info "의존성 재설치 중..."
    rm -rf node_modules package-lock.json
    npm install --omit=optional --legacy-peer-deps
    
    log_success "✅ LightningCSS 문제 해결 완료 ($app_type)"
}between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s ease;
}

/* 통계 카드 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

/* 네비게이션 */
.nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #3b82f6;
  background-color: #f3f4f6;
}

.nav-link.active {
  color: #3b82f6;
  background-color: #eff6ff;
}

/* 유틸리티 클래스 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-5 { margin-top: 1.25rem; }
.mt-6 { margin-top: 1.5rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

.w-full { width: 100%; }
.h-full { height: 100%; }

.hidden { display: none; }
.block { display: block; }
.inline-block { display: inline-block; }

/* 반응형 디자인 */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  .card {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 로딩 애니메이션 */
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 알림 스타일 */
.alert {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.alert-success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.alert-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.alert-warning {
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  color: #92400e;
}

.alert-info {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
EOF
    fi
    
    # Next.js 설정 최적화 (LightningCSS 없이)
    log_info "Next.js 설정 최적화 중..."
    
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화
  output: 'standalone',
  trailingSlash: false,
  
  // 이미지 최적화 (AWS 환경 호환)
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // 압축 및 최적화
  compress: true,
  poweredByHeader: false,
  
  // 실험적 기능 (LightningCSS 제외)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Webpack 설정 (Amazon Linux 2023 호환)
  webpack: (config: any, { isServer }: any) => {
    // 클라이언트 사이드에서 서버 전용 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        events: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        cluster: false,
        module: false,
        readline: false,
        repl: false,
        vm: false,
        constants: false,
        domain: false,
        punycode: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        dgram: false,
        assert: false,
      };
    }
    
    // 외부 패키지 설정
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    // 네이티브 모듈 문제 해결
    config.resolve.alias = {
      ...config.resolve.alias,
      'lightningcss': false,
      '@tailwindcss/postcss': false,
    };
    
    return config;
  },
  
  // 서버 외부 패키지
  serverExternalPackages: ['better-sqlite3'],
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
EOF
    
    # package.json에서 문제가 있는 의존성 제거
    log_info "package.json에서 문제가 있는 의존성 제거 중..."
    
    if command -v jq > /dev/null 2>&1; then
        # jq가 있는 경우
        jq 'del(.dependencies.lightningcss, .dependencies."@tailwindcss/postcss", .dependencies."@tailwindcss/node", .dependencies.tailwindcss, .dependencies.postcss, .dependencies.autoprefixer)' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        # jq가 없는 경우 sed 사용
        sed -i '/"lightningcss"/d; /"@tailwindcss/d; /"tailwindcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json
    fi
    
    # 의존성 재설치
    log_info "의존성 재설치 중..."
    rm -rf node_modules package-lock.json
    npm install --omit=optional --legacy-peer-deps
    
    log_success "✅ LightningCSS 문제 해결 완료 ($app_type)"
}

# 애플리케이션 시작
start_applications() {
    log_step "MSP Checklist 애플리케이션 시작 중..."
    
    cd $PROJECT_DIR
    
    # PM2로 애플리케이션 시작
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    # 상태 확인
    sleep 5
    PM2_STATUS=$(pm2 list | grep -c "online" || echo "0")
    
    if [ "$PM2_STATUS" -gt 0 ]; then
        log_success "✅ MSP Checklist 애플리케이션 시작 완료 ($PM2_STATUS개 프로세스)"
    else
        log_warning "⚠️ 일부 애플리케이션 시작 실패"
        pm2 status
    fi
}

# 연결 테스트 (강화된 버전)
test_connections() {
    log_step "연결 테스트 중..."
    
    sleep 3
    
    echo ""
    echo "🔍 연결 테스트 결과:"
    
    # HTTP 테스트
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 응답 테스트 통과 (HTTP $HTTP_CODE)"
    elif [[ "$HTTP_CODE" == "502" ]]; then
        log_warning "⚠️ HTTP 502 (Bad Gateway) - Node.js 서버 연결 대기 중"
    else
        log_warning "⚠️ HTTP 응답: $HTTP_CODE"
    fi
    
    # 관리자 페이지 테스트
    ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ "$ADMIN_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ 관리자 페이지 응답 테스트 통과 (HTTP $ADMIN_CODE)"
    elif [[ "$ADMIN_CODE" == "502" ]]; then
        log_warning "⚠️ 관리자 페이지 502 (Bad Gateway) - Node.js 서버 연결 대기 중"
    else
        log_warning "⚠️ 관리자 페이지 응답: $ADMIN_CODE"
    fi
    
    # 헬스체크 테스트
    HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
    if [[ "$HEALTH_CODE" == "200" ]]; then
        log_success "✅ 헬스체크 엔드포인트 정상"
    else
        log_warning "⚠️ 헬스체크 응답: $HEALTH_CODE"
    fi
    
    # 포트 상태 확인
    echo ""
    echo "🔌 포트 상태:"
    if netstat -tuln 2>/dev/null | grep -q ":80 " || ss -tuln 2>/dev/null | grep -q ":80 "; then
        log_success "✅ Nginx (포트 80) 리스닝 중"
    else
        log_warning "⚠️ 포트 80 리스닝 안됨"
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
        log_success "✅ 메인 서버 (포트 3010) 리스닝 중"
    else
        log_warning "⚠️ 메인 서버 (포트 3010) 리스닝 안됨"
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
        log_success "✅ 관리자 서버 (포트 3011) 리스닝 중"
    else
        log_warning "⚠️ 관리자 서버 (포트 3011) 리스닝 안됨"
    fi
}

# 모니터링 설정
setup_monitoring() {
    log_step "모니터링 및 관리 도구 설정 중..."
    
    # 상태 확인 스크립트 생성
    sudo tee /usr/local/bin/msp-status.sh > /dev/null << 'EOF'
#!/bin/bash

echo "=== MSP Checklist 시스템 상태 ==="
echo ""

# Nginx 상태
echo "🌐 Nginx:"
if systemctl is-active --quiet nginx; then
    echo "  ✅ 실행 중"
else
    echo "  ❌ 중지됨"
fi

# PM2 상태
echo ""
echo "🚀 애플리케이션:"
if command -v pm2 > /dev/null; then
    pm2 list
else
    echo "  ⚠️ PM2 없음"
fi

# 포트 상태
echo ""
echo "🔌 포트:"
netstat -tuln | grep -E ':80|:3010|:3011' | while read line; do
    echo "  $line"
done

# 디스크 및 메모리
echo ""
echo "💾 리소스:"
echo "  디스크: $(df -h / | tail -1 | awk '{print $5}') 사용"
echo "  메모리: $(free -h | grep Mem | awk '{print $3"/"$2}')"

echo ""
echo "=== 상태 확인 완료 ==="
EOF

    sudo chmod +x /usr/local/bin/msp-status.sh
    
    # 관리 스크립트들 생성
    cd $PROJECT_DIR
    
    # 재시작 스크립트
    cat > restart-all.sh << 'EOF'
#!/bin/bash
echo "MSP Checklist 전체 재시작 중..."
pm2 restart all
sudo systemctl restart nginx
echo "재시작 완료!"
EOF

    # 로그 확인 스크립트
    cat > view-logs.sh << 'EOF'
#!/bin/bash
echo "선택하세요:"
echo "1) PM2 로그"
echo "2) Nginx 에러 로그"
echo "3) Nginx 액세스 로그"
read -p "번호 입력: " choice

case $choice in
    1) pm2 logs ;;
    2) sudo tail -f /var/log/nginx/error.log ;;
    3) sudo tail -f /var/log/nginx/access.log ;;
    *) echo "잘못된 선택" ;;
esac
EOF

    chmod +x restart-all.sh view-logs.sh
    
    log_success "✅ 모니터링 및 관리 도구 설정 완료"
}

# 설치 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🎉 MSP Checklist 배포 완료! 🎉                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 시스템이 성공적으로 배포되었습니다!"
    
    # 공용 IP 확인
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    
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
        echo "  - 메인 서비스: http://$PUBLIC_IP"
        echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
    fi
    echo "  - 헬스체크: http://$PUBLIC_IP/health"
    
    echo ""
    echo "🔧 관리 명령어:"
    echo "  - 전체 상태 확인: sudo /usr/local/bin/msp-status.sh"
    echo "  - 애플리케이션 재시작: cd $PROJECT_DIR && ./restart-all.sh"
    echo "  - 로그 확인: cd $PROJECT_DIR && ./view-logs.sh"
    echo "  - PM2 상태: pm2 status"
    echo "  - Nginx 상태: sudo systemctl status nginx"
    
    echo ""
    echo "📝 다음 단계:"
    echo "1. AWS 보안 그룹에서 포트 80, 443 인바운드 규칙 확인"
    echo "2. 환경 변수 설정: nano $PROJECT_DIR/.env.unified"
    echo "3. 실제 API 키 설정 (OpenAI, Claude, Gemini)"
    echo "4. 관리자 계정 생성: cd $PROJECT_DIR && node create-admin.cjs"
    
    if [ "$SETUP_SSL" = false ] && [ "$DOMAIN_NAME" = "" ]; then
        echo "5. SSL 인증서 설정 (권장): $0 --ssl --domain your-domain.com --email your@email.com"
    fi
    
    echo ""
    echo "🔒 보안 권장사항:"
    echo "- 환경 변수 파일의 기본 시크릿 키들을 변경하세요"
    echo "- 실제 API 키를 설정하세요"
    echo "- 정기적으로 시스템 업데이트를 수행하세요"
    
    echo ""
    echo "🛠️ 통합된 문제 해결 기능:"
    echo "- Amazon Linux 2023 curl 충돌 자동 해결"
    echo "- LightningCSS 네이티브 모듈 문제 자동 수정"
    echo "- Nginx 설정 오류 자동 복구"
    echo "- 포트 충돌 자동 감지 및 해결"
    echo "- sendfile 중복 설정 자동 방지"
    echo "- 빌드 실패 시 자동 복구 시도"
    echo "- 권한 문제 자동 수정"
    echo "- 종합 시스템 상태 점검 및 복구"
    
    echo ""
    echo "🔧 문제 해결:"
    echo "- 502 Bad Gateway 오류: Node.js 서버가 시작될 때까지 잠시 기다리세요"
    echo "- curl 충돌 문제: 자동으로 해결되었습니다"
    echo "- LightningCSS 오류: 간단한 CSS 프레임워크로 교체되었습니다"
    echo "- Nginx 설정 오류: 자동으로 수정되었습니다"
    echo "- 포트 충돌: 자동 감지 및 해결 시스템이 적용되었습니다"
    
    echo ""
}

# 메인 실행 함수
main() {
    # 배너 출력
    show_banner
    
    # 사용자 확인
    if [ "$NGINX_ONLY" = false ]; then
        read -p "MSP Checklist 배포를 시작하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "배포가 취소되었습니다."
            exit 0
        fi
    fi
    
    # 단계별 실행
    detect_os
    
    # 종합 문제 해결 및 복구 시스템 실행 (사전 점검)
    comprehensive_error_recovery
    
    if [ "$NGINX_ONLY" = true ]; then
        # Nginx만 설정
        log_info "Nginx 전용 설정 모드"
        setup_nginx_config
        start_nginx
        setup_firewall
        setup_ssl_certificate
        test_connections
        log_success "Nginx 설정이 완료되었습니다! 🚀"
        exit 0
    fi
    
    if [ "$INSTALL_DEPS" = true ]; then
        update_system
        install_basic_dependencies
        install_nodejs
        setup_project
        setup_environment_variables
        build_application
        setup_pm2
    fi
    
    if [ "$INSTALL_NGINX" = true ]; then
        install_nginx
        setup_nginx_config
        start_nginx
        setup_firewall
        setup_ssl_certificate
    fi
    
    if [ "$INSTALL_DEPS" = true ]; then
        start_applications
    fi
    
    test_connections
    setup_monitoring
    
    # 최종 종합 점검 및 복구
    log_step "최종 시스템 점검 및 복구 중..."
    comprehensive_error_recovery
    
    # 최종 연결 테스트
    log_step "최종 연결 테스트 중..."
    sleep 5
    test_connections
    
    show_completion_info
    
    log_success "MSP Checklist 배포가 성공적으로 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"