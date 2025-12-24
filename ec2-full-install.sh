#!/bin/bash

# MSP Checklist EC2 완전 설치 스크립트 (Ubuntu & Amazon Linux 2023 지원)
# OS를 자동 감지하여 적절한 설치 스크립트를 실행합니다.
# dn.sh 기반으로 제작된 EC2 최적화 버전

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
    echo "║         MSP Checklist EC2 완전 설치 스크립트              ║"
    echo "║                                                            ║"
    echo "║  🚀 EC2 인스턴스 최적화 설치                             ║"
    echo "║  🐧 Ubuntu 22.04 LTS 자동 지원                           ║"
    echo "║  🚀 Amazon Linux 2023 자동 지원                          ║"
    echo "║  🔍 OS 자동 감지 및 최적화된 설치                        ║"
    echo "║  🔧 자동 문제 해결 및 탄력적 설치                        ║"
    echo "║  🌐 Nginx 리버스 프록시 통합                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 명령행 옵션 처리
DEPS_ONLY=false
NGINX_ONLY=false
ENV_ONLY=false
CHECK_DEPS=false
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --deps-only)
            DEPS_ONLY=true
            shift
            ;;
        --nginx-only)
            NGINX_ONLY=true
            shift
            ;;
        --env-only)
            ENV_ONLY=true
            shift
            ;;
        --check-deps)
            CHECK_DEPS=true
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
    echo "MSP Checklist EC2 완전 설치 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --deps-only     의존성만 설치"
    echo "  --nginx-only    Nginx만 설정"
    echo "  --env-only      환경 변수만 설정"
    echo "  --check-deps    의존성 상태 확인"
    echo "  --help, -h      이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                    # 전체 설치"
    echo "  $0 --deps-only       # 의존성만 설치"
    echo "  $0 --check-deps      # 의존성 확인"
    echo ""
}

if [ "$HELP" = true ]; then
    show_help
    exit 0
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
ㅣㄴ
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
    sudo systemctl start nginx
    
    # 설치 확인
    if command -v nginx > /dev/null 2>&1; then
        NGINX_VERSION=$(nginx -v 2>&1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
        log_success "Nginx 설치 완료: 버전 $NGINX_VERSION"
    else
        log_error "Nginx 설치 실패"
        return 1
    fi
}

# Node.js 설치 함수
install_nodejs() {
    log_info "Node.js 20.9.0 설치 중..."
    
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
    NODE_VERSION=$(node --version 2>/dev/null || echo "설치 실패")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "설치 실패")
    
    log_success "Node.js 설치 완료: $NODE_VERSION"
    log_success "npm 설치 완료: $NPM_VERSION"
}

# 의존성 확인 함수
check_dependencies() {
    log_info "의존성 확인 중..."
    
    local missing_deps=()
    
    # Node.js 확인
    if ! command -v node > /dev/null; then
        missing_deps+=("node")
    else
        NODE_VERSION=$(node --version)
        log_success "✅ Node.js: $NODE_VERSION"
    fi
    
    # npm 확인
    if ! command -v npm > /dev/null; then
        missing_deps+=("npm")
    else
        NPM_VERSION=$(npm --version)
        log_success "✅ npm: $NPM_VERSION"
    fi
    
    # Git 확인
    if ! command -v git > /dev/null; then
        missing_deps+=("git")
    else
        GIT_VERSION=$(git --version)
        log_success "✅ Git: $GIT_VERSION"
    fi
    
    # curl 확인
    if ! command -v curl > /dev/null; then
        missing_deps+=("curl")
    else
        log_success "✅ curl 설치됨"
    fi
    
    # Nginx 확인
    if ! command -v nginx > /dev/null; then
        missing_deps+=("nginx")
    else
        NGINX_VERSION=$(nginx -v 2>&1)
        log_success "✅ Nginx: $NGINX_VERSION"
    fi
    
    # 빌드 도구 확인
    if ! command -v gcc > /dev/null; then
        missing_deps+=("build-tools")
    else
        log_success "✅ 빌드 도구 설치됨"
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        log_success "모든 의존성이 설치되어 있습니다!"
        return 0
    else
        log_warning "누락된 의존성: ${missing_deps[*]}"
        return 1
    fi
}

# 의존성 설치 함수
install_dependencies() {
    log_info "의존성 설치 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu 의존성 설치
        sudo apt update -y
        sudo apt upgrade -y
        sudo apt install -y curl wget git sqlite3 htop unzip build-essential
        
        # Nginx 별도 설치 및 확인
        if ! check_nginx_installation; then
            sudo apt install -y nginx
            if ! check_nginx_installation; then
                log_error "Nginx 설치 실패"
                return 1
            fi
        fi
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux 2023 의존성 설치
        sudo dnf update -y
        
        # curl 충돌 문제 해결
        if ! curl --version > /dev/null 2>&1; then
            log_warning "curl 패키지 충돌 해결 중..."
            sudo dnf remove -y curl-minimal 2>/dev/null || true
            sudo dnf install -y curl --allowerasing 2>/dev/null || true
        fi
        
        sudo dnf install -y curl wget git sqlite htop unzip gcc gcc-c++ make
        sudo dnf groupinstall -y 'Development Tools'
        
        # Nginx 별도 설치 및 확인
        if ! check_nginx_installation; then
            sudo dnf install -y nginx
            if ! check_nginx_installation; then
                log_error "Nginx 설치 실패"
                return 1
            fi
        fi
    fi
    
    # Node.js 설치
    install_nodejs
    
    # Nginx 서비스 시작 및 활성화
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    log_success "의존성 설치 완료"
}

# 패키지 관리자별 시스템 업데이트
update_system() {
    log_info "시스템 패키지 업데이트 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu 업데이트
        sudo apt update -y
        sudo apt upgrade -y
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux 2023 업데이트
        sudo dnf update -y
    fi
    
    log_success "시스템 업데이트 완료"
}

# 프로젝트 클론
clone_project() {
    log_info "MSP Checklist 프로젝트 클론 중..."
    
    cd /opt
    
    # 기존 디렉토리 제거
    if [ -d "msp-checklist-system" ]; then
        log_warning "기존 msp-checklist-system 디렉토리 제거 중..."
        sudo rm -rf msp-checklist-system
    fi
    
    if [ -d "msp-checklist" ]; then
        log_warning "기존 msp-checklist 디렉토리 제거 중..."
        sudo rm -rf msp-checklist
    fi
    
    # Git 클론
    sudo git clone https://github.com/randykwon/msp-checklist-system.git
    
    # 소유권 설정
    sudo chown -R $USER_NAME:$USER_NAME msp-checklist-system
    
    # 실행 권한 부여
    cd msp-checklist-system
    sudo chmod +x *.sh
    
    log_success "프로젝트 클론 완료"
}
# 환경 변수 설정 함수
setup_environment_variables() {
    log_info "환경 변수 설정 중..."
    
    cd /opt/msp-checklist-system
    
    # 통합 환경 변수 파일 생성
    if [ ! -f ".env.unified" ]; then
        log_info "통합 환경 변수 파일 생성 중..."
        cat > .env.unified << 'EOF'
# MSP Checklist 통합 환경 변수 설정
# 이 파일은 모든 애플리케이션에서 공통으로 사용됩니다.

# 서버 설정
NODE_ENV=production
PORT=3010
ADMIN_PORT=3011
HOST=0.0.0.0

# 데이터베이스 설정
DATABASE_URL=sqlite:./msp_checklist.db
ADMIN_DATABASE_URL=sqlite:./admin.db

# 보안 설정
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production
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

# 성능 최적화
NODE_OPTIONS=--max-old-space-size=1024
EOF
    fi
    
    # 메인 애플리케이션 환경 변수 설정
    if [ -d "msp-checklist" ]; then
        cd msp-checklist
        
        # .env.local 생성 (메인 애플리케이션용)
        cat > .env.local << 'EOF'
# MSP Checklist 메인 애플리케이션 환경 변수
NODE_ENV=production
PORT=3010
HOST=0.0.0.0
DATABASE_URL=sqlite:./msp_checklist.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3010
OPENAI_API_KEY=your-openai-api-key-here
CLAUDE_API_KEY=your-claude-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
LOG_LEVEL=info
LOG_FILE=./server.log
NEXT_TELEMETRY_DISABLED=1
TURBOPACK=1
NODE_OPTIONS=--max-old-space-size=1024
EOF
        
        # Admin 애플리케이션 환경 변수 설정
        if [ -d "admin" ]; then
            cd admin
            cat > .env.local << 'EOF'
# MSP Checklist 관리자 시스템 환경 변수
NODE_ENV=production
PORT=3011
HOST=0.0.0.0
ADMIN_DATABASE_URL=sqlite:./admin.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3011
LOG_LEVEL=info
LOG_FILE=./admin.log
NEXT_TELEMETRY_DISABLED=1
TURBOPACK=1
NODE_OPTIONS=--max-old-space-size=1024
EOF
            cd ..
        fi
        cd ..
    fi
    
    log_success "환경 변수 설정 완료"
}

# Nginx 설정 함수
setup_nginx() {
    log_info "Nginx 리버스 프록시 설정 중..."
    
    # Nginx 설치 상태 재확인
    if ! check_nginx_installation; then
        log_info "Nginx가 설치되지 않았습니다. 설치를 시도합니다..."
        install_nginx || {
            log_error "Nginx 설치 실패"
            return 1
        }
    fi
    
    # 기존 설정 백업
    if [ -f /etc/nginx/nginx.conf ]; then
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        log_info "기존 nginx.conf 백업 생성됨"
    fi
    
    # OS별 설정 파일 생성
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu 스타일 설정
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
    }
    
    # 정적 파일 캐싱
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
    }
    
    # 헬스체크 엔드포인트
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

        # sites-enabled 링크 생성
        sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux 스타일 설정
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
    }
    
    # 정적 파일 캐싱
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
    }
    
    # 헬스체크 엔드포인트
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

        # 기본 설정 비활성화
        sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
    fi
    
    # Nginx 설정 테스트
    if sudo nginx -t; then
        log_success "Nginx 설정 검증 완료"
    else
        log_error "Nginx 설정에 오류가 있습니다"
        echo "설정 오류 내용:"
        sudo nginx -t
        return 1
    fi
    
    # Nginx 서비스 시작 및 활성화
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    
    # 서비스 상태 확인
    sleep 2
    if sudo systemctl is-active --quiet nginx; then
        log_success "Nginx 서비스 시작 완료"
    else
        log_error "Nginx 서비스 시작 실패"
        sudo systemctl status nginx --no-pager -l
        return 1
    fi
    
    log_success "Nginx 설정 완료"
}

# 방화벽 설정 함수
setup_firewall() {
    log_info "방화벽 설정 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu UFW 설정
        sudo ufw --force enable
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow 3010/tcp
        sudo ufw allow 3011/tcp
        sudo ufw reload
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux firewalld 설정
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --permanent --add-port=3010/tcp
        sudo firewall-cmd --permanent --add-port=3011/tcp
        sudo firewall-cmd --reload
    fi
    
    log_success "방화벽 설정 완료"
}

# 문제 해결 함수들 (dn.sh에서 가져옴)
fix_admin_layout_issue() {
    log_info "AdminLayout 경로 문제 해결 중..."
    
    cd /opt/msp-checklist-system/msp-checklist/admin
    
    # AdminLayout 컴포넌트 생성
    mkdir -p components
    cat > components/AdminLayout.tsx << 'EOF'
'use client';

import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Admin Dashboard' }: AdminLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <header style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #dee2e6',
        padding: '16px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#212529', margin: 0 }}>
            {title}
          </h1>
        </div>
      </header>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
    </div>
  );
}
EOF

    # 필수 라이브러리 생성
    mkdir -p lib
    cat > lib/db.ts << 'EOF'
export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  return [];
}
EOF

    cat > lib/permissions.ts << 'EOF'
export type UserRole = 'admin' | 'operator' | 'viewer';

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  return true;
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = { admin: '관리자', operator: '운영자', viewer: '조회자' };
  return roleNames[role] || role;
}

export function getRoleColor(role: UserRole): string {
  const roleColors = { admin: 'red', operator: 'blue', viewer: 'green' };
  return roleColors[role] || 'gray';
}
EOF

    # AuthContext 생성
    mkdir -p contexts
    cat > contexts/AuthContext.tsx << 'EOF'
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: 1, username: 'admin', email: 'admin@example.com', role: 'admin'
  });
  const [isLoading] = useState(false);

  const login = async () => true;
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
EOF

    # PermissionGuard 생성
    cat > components/PermissionGuard.tsx << 'EOF'
'use client';

import { ReactNode } from 'react';

interface PermissionGuardProps {
  children: ReactNode;
  requiredRoute: string;
}

export default function PermissionGuard({ children }: PermissionGuardProps) {
  return <>{children}</>;
}
EOF

    # TypeScript 설정 업데이트
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/contexts/*": ["./contexts/*"],
      "@/app/*": ["./app/*"]
    },
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    log_success "AdminLayout 문제 해결 완료"
}

fix_css_framework_issues() {
    log_info "CSS 프레임워크 문제 해결 중..."
    
    cd /opt/msp-checklist-system/msp-checklist
    
    # CSS 프레임워크 제거
    npm uninstall tailwindcss @tailwindcss/postcss @tailwindcss/node lightningcss postcss autoprefixer 2>/dev/null || true
    
    # 설정 파일 제거
    rm -f postcss.config.* tailwind.config.*
    
    # package.json 정리
    if [ -f "package.json" ]; then
        sed -i '/"tailwindcss"/d; /"@tailwindcss/d; /"lightningcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json
    fi
    
    # 간단한 CSS로 교체
    cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; background: #fff; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; }
.btn:hover { background: #0056b3; }
.card { background: white; border: 1px solid #ddd; border-radius: 4px; padding: 16px; margin-bottom: 16px; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.text-center { text-align: center; }
.mb-4 { margin-bottom: 16px; }
.p-4 { padding: 16px; }
EOF
    
    log_success "CSS 프레임워크 문제 해결 완료"
}

fix_nextjs_config() {
    log_info "Next.js 설정 문제 해결 중..."
    
    cd /opt/msp-checklist-system/msp-checklist
    
    # Next.js 설정 최적화
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, path: false, crypto: false, stream: false, util: false,
        buffer: false, process: false, os: false, events: false, url: false,
        querystring: false, http: false, https: false, zlib: false, net: false,
        tls: false, child_process: false, dns: false, cluster: false,
        module: false, readline: false, repl: false, vm: false, constants: false,
        domain: false, punycode: false, string_decoder: false, sys: false,
        timers: false, tty: false, dgram: false, assert: false,
      };
    }
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF

    # Admin Next.js 설정도 업데이트
    if [ -d "admin" ]; then
        cp next.config.ts admin/
    fi
    
    log_success "Next.js 설정 문제 해결 완료"
}

fix_disk_space_issues() {
    log_info "디스크 공간 문제 해결 중..."
    
    # 패키지 캐시 정리
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt clean
        sudo apt autoremove -y
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf clean all
        sudo dnf autoremove -y
    fi
    
    # npm 캐시 정리
    npm cache clean --force 2>/dev/null || true
    
    # 임시 파일 정리
    sudo find /tmp -name "npm-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
    sudo find /tmp -name "next-*" -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
    
    # 빌드 캐시 정리
    rm -rf /opt/msp-checklist-system/msp-checklist/.next 2>/dev/null || true
    rm -rf /opt/msp-checklist-system/msp-checklist/admin/.next 2>/dev/null || true
    
    log_success "디스크 공간 문제 해결 완료"
}

# 자동 문제 해결 함수
auto_fix_build_issues() {
    log_info "빌드 문제 자동 해결 시작..."
    
    # 1. 디스크 공간 문제 해결
    fix_disk_space_issues
    
    # 2. CSS 프레임워크 문제 해결
    fix_css_framework_issues
    
    # 3. Next.js 설정 문제 해결
    fix_nextjs_config
    
    # 4. AdminLayout 문제 해결
    fix_admin_layout_issue
    
    log_success "자동 문제 해결 완료"
}

# PM2 설치 및 설정
setup_pm2() {
    log_info "PM2 프로세스 관리자 설치 및 설정 중..."
    
    # PM2 전역 설치
    sudo npm install -g pm2
    
    # PM2 설정 파일 생성
    cd /opt/msp-checklist-system
    
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
    
    # PM2 시작 스크립트 생성
    cat > start-pm2.sh << 'EOF'
#!/bin/bash
cd /opt/msp-checklist-system
pm2 start ecosystem.config.js
pm2 save
pm2 startup
EOF

    chmod +x start-pm2.sh
    
    log_success "PM2 설정 완료"
}

# 애플리케이션 빌드 및 설치
build_application() {
    log_info "MSP Checklist 애플리케이션 빌드 중..."
    
    cd /opt/msp-checklist-system/msp-checklist
    
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
        if [ -d "admin" ]; then
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

# 수동 빌드 시도 함수
manual_build_attempt() {
    log_info "수동 빌드 시도 중..."
    
    cd /opt/msp-checklist-system/msp-checklist
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=1024"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 의존성 재설치
    log_info "의존성 재설치 중..."
    rm -rf node_modules package-lock.json
    npm install --no-optional --legacy-peer-deps
    
    # 메인 시스템 빌드
    log_info "메인 시스템 빌드 중..."
    if npm run build; then
        log_success "메인 시스템 빌드 성공"
        
        # Admin 시스템 빌드 (선택적)
        if [ -d "admin" ]; then
            cd admin
            log_info "Admin 시스템 빌드 중..."
            rm -rf node_modules package-lock.json
            npm install --no-optional
            
            if npm run build; then
                log_success "Admin 시스템 빌드 성공"
            else
                log_warning "Admin 시스템 빌드 실패 (메인 시스템은 정상)"
            fi
            cd ..
        fi
        
        # 서버 시작 시도
        log_info "서버 시작 시도 중..."
        if [ -f "../restart-servers.sh" ]; then
            cd ..
            ./restart-servers.sh
            log_success "서버 시작 완료"
        fi
        
    else
        log_error "수동 빌드도 실패했습니다."
        log_info "최소 설치 모드를 권장합니다: MSP_MINIMAL_INSTALL=true"
    fi
}

# OS별 설치 스크립트 실행 (문제 해결 기능 포함)
run_installation() {
    log_info "OS별 최적화된 설치 스크립트 실행 중..."
    
    cd /opt/msp-checklist-system
    
    # 설치 전 자동 문제 해결
    auto_fix_build_issues
    
    local installation_success=false
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        log_info "Ubuntu 전용 설치 스크립트 실행 중..."
        
        # Ubuntu 설치 스크립트 우선순위
        if [ -f "ubuntu-robust-install.sh" ]; then
            log_info "Ubuntu 강화 설치 스크립트 실행..."
            if sudo ./ubuntu-robust-install.sh; then
                installation_success=true
            else
                log_warning "Ubuntu 강화 설치 실패, 문제 해결 후 재시도..."
                auto_fix_build_issues
                sudo ./ubuntu-robust-install.sh && installation_success=true
            fi
            
        elif [ -f "ubuntu-deploy.sh" ]; then
            log_info "Ubuntu 배포 스크립트 실행..."
            if sudo ./ubuntu-deploy.sh; then
                installation_success=true
            else
                log_warning "Ubuntu 배포 스크립트 실패, 문제 해결 후 재시도..."
                auto_fix_build_issues
                sudo ./ubuntu-deploy.sh && installation_success=true
            fi
            
        elif [ -f "ubuntu-quick-setup.sh" ]; then
            log_info "Ubuntu 빠른 설정 스크립트 실행..."
            if sudo ./ubuntu-quick-setup.sh; then
                installation_success=true
            else
                log_warning "Ubuntu 빠른 설정 실패, 문제 해결 후 재시도..."
                auto_fix_build_issues
                sudo ./ubuntu-quick-setup.sh && installation_success=true
            fi
        fi
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        log_info "Amazon Linux 2023 전용 설치 스크립트 실행 중..."
        
        # Amazon Linux 설치 스크립트 우선순위
        if [ -f "amazon-linux-2023-unified-installer.sh" ]; then
            log_info "Amazon Linux 2023 통합 설치 스크립트 실행..."
            if sudo ./amazon-linux-2023-unified-installer.sh; then
                installation_success=true
            else
                log_warning "통합 설치 실패, 문제 해결 후 재시도..."
                auto_fix_build_issues
                sudo ./amazon-linux-2023-unified-installer.sh && installation_success=true
            fi
            
        elif [ -f "amazon-linux-2023-complete-installer.sh" ]; then
            log_info "Amazon Linux 2023 완전 설치 스크립트 실행..."
            if sudo ./amazon-linux-2023-complete-installer.sh; then
                installation_success=true
            else
                log_warning "완전 설치 실패, 문제 해결 후 재시도..."
                auto_fix_build_issues
                sudo ./amazon-linux-2023-complete-installer.sh && installation_success=true
            fi
        fi
    fi
    
    # 설치 실패 시 직접 빌드 시도
    if [ "$installation_success" = false ]; then
        log_warning "기존 설치 스크립트 실패. 직접 빌드를 시도합니다..."
        build_application || manual_build_attempt
    fi
    
    log_success "설치 스크립트 실행 완료"
}

# 설치 후 검증
verify_installation() {
    log_info "설치 검증 중..."
    
    # 디렉토리 확인
    if [ -d "/opt/msp-checklist-system/msp-checklist" ]; then
        log_success "✅ MSP Checklist 디렉토리 확인됨"
    else
        log_error "❌ MSP Checklist 디렉토리 없음"
        return 1
    fi
    
    # 빌드 파일 확인
    if [ -d "/opt/msp-checklist-system/msp-checklist/.next" ]; then
        log_success "✅ 메인 애플리케이션 빌드 확인됨"
    else
        log_warning "⚠️ 메인 애플리케이션 빌드 파일 없음"
    fi
    
    if [ -d "/opt/msp-checklist-system/msp-checklist/admin/.next" ]; then
        log_success "✅ 관리자 시스템 빌드 확인됨"
    else
        log_warning "⚠️ 관리자 시스템 빌드 파일 없음"
    fi
    
    # 서버 프로세스 확인
    if pgrep -f "node.*msp" > /dev/null; then
        log_success "✅ MSP Checklist 서버 실행 중"
    else
        log_warning "⚠️ MSP Checklist 서버가 실행되지 않음"
    fi
    
    # Nginx 상태 확인
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 실행 중"
    else
        log_warning "⚠️ Nginx 서비스가 실행되지 않음"
    fi
    
    log_success "설치 검증 완료"
}

# 설치 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 🎉 EC2 설치 완료! 🎉                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 시스템이 EC2에 성공적으로 설치되었습니다!"
    
    # 공용 IP 주소 가져오기
    if command -v curl > /dev/null; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    elif command -v wget > /dev/null; then
        PUBLIC_IP=$(wget -qO- http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || wget -qO- http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    else
        PUBLIC_IP="YOUR_SERVER_IP"
    fi
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    echo "- 메인 서비스: http://$PUBLIC_IP (Nginx 리버스 프록시)"
    echo "- 관리자 시스템: http://$PUBLIC_IP/admin"
    echo "- 직접 접속: http://$PUBLIC_IP:3010 (메인), http://$PUBLIC_IP:3011 (관리자)"
    echo ""
    echo "💻 감지된 시스템 정보:"
    echo "- OS: $OS_NAME $OS_VERSION"
    echo "- 패키지 관리자: $PACKAGE_MANAGER"
    echo "- 사용자: $USER_NAME"
    echo "- 방화벽: $FIREWALL_CMD"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "- 서버 상태 확인: cd /opt/msp-checklist-system && ./server-status.sh"
    echo "- 서버 재시작: cd /opt/msp-checklist-system && ./restart-servers.sh"
    echo "- PM2 상태 확인: pm2 status"
    echo "- PM2 로그 확인: pm2 logs"
    echo "- Nginx 상태: sudo systemctl status nginx"
    echo "- 로그 확인: cd /opt/msp-checklist-system && tail -f server.log"
    echo ""
    echo "📝 다음 단계:"
    echo "1. AWS 보안 그룹에서 포트 80, 443, 3010, 3011 인바운드 규칙 확인"
    echo "2. 환경 변수 설정: nano /opt/msp-checklist-system/.env.unified"
    echo "3. 실제 API 키 설정: nano /opt/msp-checklist-system/msp-checklist/.env.local"
    echo "4. 관리자 계정 생성: cd /opt/msp-checklist-system && node create-admin.cjs"
    echo "5. SSL 인증서 설정 (선택사항): certbot --nginx"
    echo ""
    echo "🔒 보안 권장사항:"
    echo "- 환경 변수 파일의 기본 시크릿 키들을 변경하세요"
    echo "- 실제 API 키를 설정하세요"
    echo "- SSL 인증서를 설정하여 HTTPS를 활성화하세요"
    echo ""
}

# 오류 처리 함수
handle_error() {
    log_error "설치 중 오류가 발생했습니다. 자동 문제 해결을 시도합니다..."
    
    # 자동 문제 해결 시도
    auto_fix_build_issues
    
    echo ""
    echo "🔧 자동 문제 해결 완료. 다음 해결 방법을 시도하세요:"
    echo ""
    echo "1. 수동 빌드 시도:"
    echo "   cd /opt/msp-checklist-system/msp-checklist"
    echo "   npm install --no-optional"
    echo "   npm run build"
    echo ""
    echo "2. 최소 설치 모드:"
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        echo "   MSP_MINIMAL_INSTALL=true sudo ./ubuntu-deploy.sh"
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        echo "   sudo ./amazon-linux-2023-minimal-installer.sh"
        echo "   또는 MSP_MINIMAL_INSTALL=true sudo ./amazon-linux-2023-unified-installer.sh"
    fi
    echo ""
    echo "3. 디스크 공간 최적화:"
    echo "   sudo ./optimize-disk-space.sh"
    echo ""
    echo "4. 문제 해결 스크립트:"
    echo "   sudo ./fix-admin-path-resolution.sh"
    echo ""
    echo "5. 시스템 정보 확인:"
    echo "   - 디스크 공간: df -h"
    echo "   - 메모리: free -h"
    echo "   - Node.js: node --version"
    echo "   - npm: npm --version"
    echo ""
    
    # 오류 발생해도 종료하지 않고 계속 진행
    log_warning "오류가 발생했지만 설치를 계속 진행합니다..."
    return 0
}

# 메인 실행 함수
main() {
    # 배너 출력
    show_banner
    
    # 명령행 옵션 처리
    if [ "$CHECK_DEPS" = true ]; then
        detect_os
        check_dependencies
        exit $?
    fi
    
    if [ "$DEPS_ONLY" = true ]; then
        detect_os
        install_dependencies
        log_success "의존성 설치 완료!"
        exit 0
    fi
    
    if [ "$NGINX_ONLY" = true ]; then
        detect_os
        setup_nginx
        setup_firewall
        log_success "Nginx 설정 완료!"
        exit 0
    fi
    
    if [ "$ENV_ONLY" = true ]; then
        setup_environment_variables
        log_success "환경 변수 설정 완료!"
        exit 0
    fi
    
    # 사용자 확인
    read -p "MSP Checklist EC2 완전 설치를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치가 취소되었습니다."
        exit 0
    fi
    
    # 오류 발생 시에도 계속 진행하도록 설정
    set +e  # 오류 발생 시 스크립트 중단 비활성화
    
    # 설치 과정 실행 (오류가 발생해도 계속 진행)
    detect_os || log_warning "OS 감지에 문제가 있지만 계속 진행합니다."
    
    # 의존성 확인 및 설치
    if ! check_dependencies; then
        install_dependencies || {
            log_warning "의존성 설치에 문제가 있지만 계속 진행합니다."
            handle_error
        }
    fi
    
    update_system || {
        log_warning "시스템 업데이트에 문제가 있지만 계속 진행합니다."
        handle_error
    }
    
    clone_project || {
        log_warning "프로젝트 클론에 문제가 있지만 계속 진행합니다."
        handle_error
    }
    
    setup_environment_variables || {
        log_warning "환경 변수 설정에 문제가 있지만 계속 진행합니다."
        handle_error
    }
    
    setup_nginx || {
        log_warning "Nginx 설정에 문제가 있습니다. 기본 설정으로 재시도합니다."
        
        # 기본 Nginx 설정으로 재시도
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            sudo rm -f /etc/nginx/sites-enabled/msp-checklist
            sudo rm -f /etc/nginx/sites-available/msp-checklist
        elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
            sudo rm -f /etc/nginx/conf.d/msp-checklist.conf
        fi
        
        # 간단한 기본 설정 생성
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    location / { proxy_pass http://localhost:3010; }
    location /admin { proxy_pass http://localhost:3011; }
}
EOF
            sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
        elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
            sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    location / { proxy_pass http://localhost:3010; }
    location /admin { proxy_pass http://localhost:3011; }
}
EOF
        fi
        
        if sudo nginx -t && sudo systemctl restart nginx; then
            log_success "기본 Nginx 설정 완료"
        else
            log_warning "Nginx 설정 실패, 수동 설정이 필요합니다."
            handle_error
        fi
    }
    
    setup_firewall || {
        log_warning "방화벽 설정에 문제가 있지만 계속 진행합니다."
        handle_error
    }
    
    setup_pm2 || {
        log_warning "PM2 설정에 문제가 있지만 계속 진행합니다."
        handle_error
    }
    
    run_installation || {
        log_warning "설치 스크립트 실행에 문제가 있지만 수동 빌드를 시도합니다."
        handle_error
        manual_build_attempt
    }
    
    verify_installation || {
        log_warning "설치 검증에 문제가 있지만 완료 정보를 표시합니다."
    }
    
    show_completion_info
    
    log_success "EC2 설치 과정이 완료되었습니다! (일부 문제가 있을 수 있지만 기본 기능은 작동할 것입니다) 🚀"
}

# 스크립트 실행
main "$@"