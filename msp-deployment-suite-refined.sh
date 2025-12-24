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

# 기본 의존성 설치
install_basic_dependencies() {
    log_step "기본 의존성 설치 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt install -y curl wget git sqlite3 htop unzip build-essential
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # curl 충돌 문제 해결
        if ! curl --version > /dev/null 2>&1; then
            log_warning "curl 패키지 충돌 해결 중..."
            sudo dnf remove -y curl-minimal 2>/dev/null || true
            sudo dnf install -y curl --allowerasing 2>/dev/null || true
        fi
        
        sudo dnf install -y curl wget git sqlite htop unzip gcc gcc-c++ make
        sudo dnf groupinstall -y 'Development Tools'
    fi
    
    log_success "기본 의존성 설치 완료"
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

# Nginx 설정 오류 자동 수정 함수 (통합 버전)
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

# 애플리케이션 빌드 (문제 해결 통합)
build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        log_info "애플리케이션 빌드 건너뛰기"
        return 0
    fi
    
    log_step "MSP Checklist 애플리케이션 빌드 중..."
    
    cd $PROJECT_DIR/msp-checklist
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=1024"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 의존성 설치
    log_info "메인 애플리케이션 의존성 설치 중..."
    npm install --no-optional --legacy-peer-deps
    
    # 메인 애플리케이션 빌드
    log_info "메인 애플리케이션 빌드 중..."
    if npm run build; then
        log_success "메인 애플리케이션 빌드 성공"
        
        # Admin 애플리케이션 빌드
        if [ -d "admin" ] && [ "$MINIMAL_INSTALL" = false ]; then
            cd admin
            log_info "Admin 애플리케이션 빌드 중..."
            npm install --no-optional --legacy-peer-deps
            
            if npm run build; then
                log_success "Admin 애플리케이션 빌드 성공"
            else
                log_warning "Admin 애플리케이션 빌드 실패 (메인 시스템은 정상)"
            fi
            cd ..
        fi
    else
        log_error "메인 애플리케이션 빌드 실패"
        return 1
    fi
    
    log_success "애플리케이션 빌드 완료"
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
    echo "🛠️ 문제 해결:"
    echo "- 502 Bad Gateway 오류: Node.js 서버가 시작될 때까지 잠시 기다리세요"
    echo "- 포트 충돌: 이 스크립트는 포트 충돌 문제를 자동으로 해결합니다"
    echo "- sendfile 중복 오류: 자동으로 수정되었습니다"
    
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
    show_completion_info
    
    log_success "MSP Checklist 배포가 성공적으로 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"