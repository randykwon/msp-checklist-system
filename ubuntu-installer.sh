#!/bin/bash

# Ubuntu MSP Checklist 통합 설치 스크립트 v3.0
# Ubuntu 22.04 LTS / 24.04 LTS 지원
# 모든 설치, 설정, 서비스 관리 기능을 하나로 통합

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 전역 변수
INSTALL_DIR="/opt/msp-checklist-system"
REPO_URL="https://github.com/randykwon/msp-checklist-system.git"
LOG_FILE="/tmp/msp-install-$(date +%Y%m%d_%H%M%S).log"
SCRIPT_VERSION="3.0"

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$LOG_FILE"; }

# 배너 출력
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Ubuntu MSP Checklist 통합 설치 스크립트 v${SCRIPT_VERSION}          ║"
    echo "║                                                            ║"
    echo "║  🔧 Node.js 20.x + better-sqlite3 지원                   ║"
    echo "║  💾 2GB 스왑 메모리 자동 설정                            ║"
    echo "║  📦 AI 조언 및 가상증빙예제 캐시 사전 로딩               ║"
    echo "║  🌐 NGINX 리버스 프록시 설정 (선택)                      ║"
    echo "║  🔄 Systemd 서비스 자동 시작 설정 (선택)                 ║"
    echo "║  🚀 메인(3010) + Admin(3011) 서버 자동 시작              ║"
    echo "║  📦 Ubuntu 22.04 / 24.04 LTS 지원                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 도움말 출력
show_help() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --full          전체 설치 (NGINX + Systemd 포함)"
    echo "  --minimal       최소 설치 (앱만 설치)"
    echo "  --nginx         NGINX 리버스 프록시 설정"
    echo "  --systemd       Systemd 서비스 설정"
    echo "  --update        기존 설치 업데이트"
    echo "  --status        서버 상태 확인"
    echo "  --restart       서버 재시작"
    echo "  --stop          서버 중지"
    echo "  --uninstall     완전 제거"
    echo "  --help          도움말 표시"
    echo ""
    echo "예제:"
    echo "  $0              대화형 설치"
    echo "  $0 --full       전체 설치 (자동)"
    echo "  $0 --minimal    최소 설치 (자동)"
    echo ""
}

# 오류 핸들러
cleanup_on_error() {
    log_error "설치 중 오류가 발생했습니다."
    log_info "로그 파일: $LOG_FILE"
    exit 1
}

trap cleanup_on_error ERR

# 시스템 요구사항 검증
check_system() {
    log_step "시스템 요구사항 검증 중..."
    
    # OS 확인
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        log_info "OS: $NAME $VERSION"
        
        if [[ "$ID" != "ubuntu" ]]; then
            log_error "이 스크립트는 Ubuntu에서만 실행할 수 있습니다."
            exit 1
        fi
        
        # 버전 확인 (22.04 또는 24.04)
        VERSION_NUM=$(echo "$VERSION_ID" | cut -d'.' -f1)
        if [[ "$VERSION_NUM" -lt 22 ]]; then
            log_warning "Ubuntu 22.04 이상을 권장합니다. 현재: $VERSION_ID"
        fi
    else
        log_error "OS 정보를 확인할 수 없습니다."
        exit 1
    fi
    
    # 메모리 확인
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_MB=$((MEMORY_KB / 1024))
    log_info "시스템 메모리: ${MEMORY_MB}MB"
    
    # 디스크 공간 확인
    DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
    DISK_GB=$((DISK_AVAILABLE / 1024 / 1024))
    log_info "사용 가능한 디스크: ${DISK_GB}GB"
    
    if [ $DISK_GB -lt 2 ]; then
        log_error "최소 2GB 디스크 공간이 필요합니다."
        exit 1
    fi
    
    # 네트워크 확인
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log_error "인터넷 연결이 필요합니다."
        exit 1
    fi
    
    log_success "시스템 요구사항 검증 완료"
}

# 스왑 메모리 설정
setup_swap() {
    log_step "스왑 메모리 설정 중..."
    
    # 현재 스왑 확인
    CURRENT_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
    
    if [ "$CURRENT_SWAP" -ge 1024 ]; then
        log_info "충분한 스왑 메모리가 이미 설정되어 있습니다: ${CURRENT_SWAP}MB"
        return 0
    fi
    
    if [ -f /swapfile ]; then
        log_info "스왑 파일이 이미 존재합니다."
        sudo swapon /swapfile 2>/dev/null || true
        return 0
    fi
    
    # t2.micro 등 메모리가 적은 인스턴스를 위해 2GB 스왑 생성
    log_info "2GB 스왑 파일 생성 중... (약 1-2분 소요)"
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=128M count=16 2>/dev/null
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # 영구 설정
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab > /dev/null
    fi
    
    log_success "2GB 스왑 메모리 설정 완료"
}

# 시스템 패키지 설치
install_packages() {
    log_step "시스템 패키지 설치 중..."
    
    # 시스템 업데이트
    sudo apt update -y
    sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
    
    # 필수 패키지 설치
    sudo DEBIAN_FRONTEND=noninteractive apt install -y \
        git \
        curl \
        wget \
        build-essential \
        python3 \
        make \
        g++ \
        gcc \
        sqlite3 \
        ca-certificates \
        gnupg
    
    log_success "시스템 패키지 설치 완료"
}

# Node.js 20.x 설치
install_nodejs() {
    log_step "Node.js 20.x 설치 중..."
    
    # 기존 Node.js 확인
    if command -v node > /dev/null 2>&1; then
        CURRENT_NODE=$(node --version | cut -d'.' -f1 | tr -d 'v')
        if [ "$CURRENT_NODE" -ge 20 ]; then
            log_info "Node.js $(node --version)가 이미 설치되어 있습니다."
            return 0
        fi
        log_info "기존 Node.js 제거 중..."
        sudo apt remove -y nodejs npm 2>/dev/null || true
    fi
    
    # NodeSource GPG 키 추가
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
    
    # NodeSource 저장소 추가 (Node.js 20.x)
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list > /dev/null
    
    sudo apt update
    sudo apt install -y nodejs
    
    # 버전 확인
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_info "Node.js: $NODE_VERSION, npm: $NPM_VERSION"
    
    # npm 설정 최적화
    npm config set registry https://registry.npmjs.org/
    npm config set fetch-timeout 600000
    npm config set fetch-retries 5
    
    log_success "Node.js 설치 완료"
}

# 프로젝트 설정
setup_project() {
    log_step "프로젝트 설정 중..."
    
    # 기존 프로세스 종료
    sudo pkill -f "node.*msp" 2>/dev/null || true
    sudo pkill -f "next" 2>/dev/null || true
    sleep 2
    
    # 디렉토리 설정
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown -R $USER:$USER "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Git 저장소 설정
    if [ -d ".git" ]; then
        log_info "기존 저장소 업데이트 중..."
        git fetch origin
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
        git pull origin main 2>/dev/null || git pull origin master
    else
        log_info "저장소 클론 중..."
        # 기존 파일 백업
        if [ "$(ls -A 2>/dev/null)" ]; then
            BACKUP_DIR="/tmp/msp-backup-$(date +%Y%m%d_%H%M%S)"
            mkdir -p "$BACKUP_DIR"
            mv * "$BACKUP_DIR/" 2>/dev/null || true
            mv .* "$BACKUP_DIR/" 2>/dev/null || true
            log_info "기존 파일 백업: $BACKUP_DIR"
        fi
        git clone "$REPO_URL" .
    fi
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null || true
    
    log_success "프로젝트 설정 완료"
}

# 의존성 설치
install_dependencies() {
    log_step "의존성 설치 중... (약 5-10분 소요)"
    
    cd "$INSTALL_DIR"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    # 루트 의존성 설치
    log_info "루트 의존성 설치 중..."
    npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
    
    # MSP 체크리스트 의존성 설치
    log_info "MSP 체크리스트 의존성 설치 중..."
    cd msp-checklist
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
    
    # Admin 의존성 설치
    log_info "Admin 시스템 의존성 설치 중..."
    cd admin
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
    
    cd "$INSTALL_DIR"
    log_success "의존성 설치 완료"
}

# 환경 변수 설정
setup_environment() {
    log_step "환경 변수 설정 중..."
    
    cd "$INSTALL_DIR"
    
    # 루트 .env 파일 확인
    if [ -f ".env.example" ] && [ ! -f ".env" ]; then
        cp .env.example .env
        log_info "루트 .env 파일 생성됨"
    fi
    
    # MSP 체크리스트 환경 변수
    if [ ! -f "msp-checklist/.env.local" ]; then
        cat > msp-checklist/.env.local << 'EOF'
# MSP Checklist 환경 변수
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# LLM 설정 (필요시 수정)
LLM_PROVIDER=bedrock
# AWS Bedrock 사용 시 AWS 자격 증명 필요
# OPENAI_API_KEY=your-api-key-here
EOF
        log_info "MSP 체크리스트 환경 변수 파일 생성됨"
    fi
    
    # Admin 환경 변수
    if [ ! -f "msp-checklist/admin/.env.local" ]; then
        cat > msp-checklist/admin/.env.local << 'EOF'
# Admin 시스템 환경 변수
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
MAIN_APP_URL=http://localhost:3010
EOF
        log_info "Admin 환경 변수 파일 생성됨"
    fi
    
    log_success "환경 변수 설정 완료"
}

# 캐시 사전 로딩
preload_cache() {
    log_step "AI 조언 및 가상증빙예제 캐시 사전 로딩 중..."
    
    cd "$INSTALL_DIR"
    
    # 캐시 파일 경로
    ADVICE_CACHE="msp_data/7.x/advice_cache_20251218_232330.json"
    EVIDENCE_CACHE="msp_data/7.x/virtual_evidence_cache_2025-12-19T02-58-55.json"
    
    # 캐시 디렉토리 생성
    mkdir -p msp-checklist/cache
    mkdir -p msp-checklist/data
    
    # 캐시 파일 복사
    if [ -f "$ADVICE_CACHE" ]; then
        cp "$ADVICE_CACHE" msp-checklist/cache/
        log_info "조언 캐시 파일 복사 완료"
    else
        log_warning "조언 캐시 파일을 찾을 수 없습니다: $ADVICE_CACHE"
    fi
    
    if [ -f "$EVIDENCE_CACHE" ]; then
        cp "$EVIDENCE_CACHE" msp-checklist/cache/
        log_info "가상증빙예제 캐시 파일 복사 완료"
    else
        log_warning "가상증빙예제 캐시 파일을 찾을 수 없습니다: $EVIDENCE_CACHE"
    fi
    
    # Node.js 스크립트로 캐시 로딩 (SQLite DB에 로딩)
    if [ -f "msp-checklist/scripts/preload-cache.js" ]; then
        log_info "캐시 데이터를 데이터베이스에 로딩 중..."
        cd msp-checklist
        
        if node scripts/preload-cache.js 2>&1 | tee -a "$LOG_FILE"; then
            log_success "캐시 데이터베이스 로딩 완료"
        else
            log_warning "캐시 데이터베이스 로딩 실패 (서비스는 정상 작동합니다)"
        fi
        
        cd "$INSTALL_DIR"
    fi
    
    log_success "캐시 사전 로딩 완료"
}

# 애플리케이션 빌드
build_application() {
    log_step "애플리케이션 빌드 중... (약 5-10분 소요)"
    
    cd "$INSTALL_DIR"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # MSP 체크리스트 빌드
    log_info "MSP 체크리스트 빌드 중..."
    cd msp-checklist
    rm -rf .next 2>/dev/null || true
    
    if npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log_success "MSP 체크리스트 빌드 성공"
    else
        log_error "MSP 체크리스트 빌드 실패"
        exit 1
    fi
    
    # Admin 빌드
    log_info "Admin 시스템 빌드 중..."
    cd admin
    rm -rf .next 2>/dev/null || true
    
    if npm run build 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Admin 시스템 빌드 성공"
    else
        log_error "Admin 시스템 빌드 실패"
        exit 1
    fi
    
    cd "$INSTALL_DIR"
    log_success "애플리케이션 빌드 완료"
}

# 방화벽 설정
setup_firewall() {
    log_step "방화벽 설정 중..."
    
    # ufw 설치 확인
    if ! command -v ufw > /dev/null 2>&1; then
        sudo apt install -y ufw
    fi
    
    # 방화벽 설정
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3010/tcp
    sudo ufw allow 3011/tcp
    sudo ufw reload
    
    log_success "방화벽 설정 완료 (포트 80, 443, 3010, 3011 허용)"
}

# NGINX 설치 및 설정
setup_nginx() {
    log_step "NGINX 리버스 프록시 설정 중..."
    
    # NGINX 설치
    if ! command -v nginx > /dev/null 2>&1; then
        sudo apt install -y nginx
    fi
    
    # 공용 IP 확인
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "localhost")
    
    # NGINX 설정 파일 생성
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << EOF
# MSP Checklist System - NGINX Configuration

# 메인 서비스 (포트 80 -> 3010)
server {
    listen 80;
    server_name $PUBLIC_IP _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://127.0.0.1:3010;
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
    
    # Admin 서비스 (/admin -> 3011)
    location /admin {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # 심볼릭 링크 생성
    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # NGINX 설정 테스트
    if sudo nginx -t 2>&1; then
        sudo systemctl enable nginx
        sudo systemctl restart nginx
        log_success "NGINX 설정 완료"
    else
        log_error "NGINX 설정 오류"
        return 1
    fi
}

# Systemd 서비스 설정
setup_systemd() {
    log_step "Systemd 서비스 설정 중..."
    
    # 메인 서비스 파일 생성
    sudo tee /etc/systemd/system/msp-main.service > /dev/null << EOF
[Unit]
Description=MSP Checklist Main Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/msp-checklist
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
StandardOutput=append:$INSTALL_DIR/main-server.log
StandardError=append:$INSTALL_DIR/main-server.log
Environment=NODE_ENV=production
Environment=PORT=3010

[Install]
WantedBy=multi-user.target
EOF
    
    # Admin 서비스 파일 생성
    sudo tee /etc/systemd/system/msp-admin.service > /dev/null << EOF
[Unit]
Description=MSP Checklist Admin Service
After=network.target msp-main.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/msp-checklist/admin
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
StandardOutput=append:$INSTALL_DIR/admin-server.log
StandardError=append:$INSTALL_DIR/admin-server.log
Environment=NODE_ENV=production
Environment=PORT=3011

[Install]
WantedBy=multi-user.target
EOF
    
    # Systemd 리로드 및 서비스 활성화
    sudo systemctl daemon-reload
    sudo systemctl enable msp-main.service
    sudo systemctl enable msp-admin.service
    
    log_success "Systemd 서비스 설정 완료"
}

# 서버 시작 (일반 모드)
start_servers() {
    log_step "서버 시작 중..."
    
    cd "$INSTALL_DIR"
    
    # 기존 프로세스 종료
    sudo pkill -f "node.*msp" 2>/dev/null || true
    sudo pkill -f "next.*start" 2>/dev/null || true
    sleep 2
    
    # 서버 시작 스크립트 실행
    if [ -f "restart-servers.sh" ]; then
        chmod +x restart-servers.sh
        ./restart-servers.sh
    else
        # 수동 시작
        log_info "메인 서버 시작 중..."
        cd msp-checklist
        nohup npm run start > ../main-server.log 2>&1 &
        echo $! > ../main-server.pid
        
        log_info "Admin 서버 시작 중..."
        cd admin
        nohup npm run start > ../../admin-server.log 2>&1 &
        echo $! > ../../admin-server.pid
        cd "$INSTALL_DIR"
    fi
    
    # 서버 시작 대기
    log_info "서버 시작 대기 중... (15초)"
    sleep 15
    
    check_server_status
}

# 서버 시작 (Systemd 모드)
start_servers_systemd() {
    log_step "Systemd로 서버 시작 중..."
    
    sudo systemctl start msp-main.service
    sleep 5
    sudo systemctl start msp-admin.service
    sleep 10
    
    check_server_status
}

# 서버 상태 확인
check_server_status() {
    log_step "서버 상태 확인 중..."
    
    local main_ok=false
    local admin_ok=false
    
    if curl -s http://localhost:3010 > /dev/null 2>&1; then
        log_success "메인 서버 (포트 3010) 정상 실행 중"
        main_ok=true
    else
        log_warning "메인 서버 상태를 확인할 수 없습니다."
    fi
    
    if curl -s http://localhost:3011 > /dev/null 2>&1; then
        log_success "Admin 서버 (포트 3011) 정상 실행 중"
        admin_ok=true
    else
        log_warning "Admin 서버 상태를 확인할 수 없습니다."
    fi
    
    # Systemd 상태 확인
    if systemctl is-active --quiet msp-main.service 2>/dev/null; then
        log_info "msp-main.service: active"
    fi
    if systemctl is-active --quiet msp-admin.service 2>/dev/null; then
        log_info "msp-admin.service: active"
    fi
    
    if [ "$main_ok" = true ] && [ "$admin_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# 서버 중지
stop_servers() {
    log_step "서버 중지 중..."
    
    # Systemd 서비스 중지
    sudo systemctl stop msp-admin.service 2>/dev/null || true
    sudo systemctl stop msp-main.service 2>/dev/null || true
    
    # 프로세스 종료
    sudo pkill -f "node.*msp" 2>/dev/null || true
    sudo pkill -f "next.*start" 2>/dev/null || true
    
    # PID 파일 정리
    rm -f "$INSTALL_DIR/main-server.pid" 2>/dev/null || true
    rm -f "$INSTALL_DIR/admin-server.pid" 2>/dev/null || true
    
    log_success "서버 중지 완료"
}

# 서버 재시작
restart_servers() {
    stop_servers
    sleep 2
    
    # Systemd 서비스가 설정되어 있으면 사용
    if systemctl is-enabled --quiet msp-main.service 2>/dev/null; then
        start_servers_systemd
    else
        start_servers
    fi
}

# 업데이트
update_installation() {
    log_step "기존 설치 업데이트 중..."
    
    cd "$INSTALL_DIR"
    
    # 서버 중지
    stop_servers
    
    # 코드 업데이트
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
    git pull origin main 2>/dev/null || git pull origin master
    
    # 의존성 업데이트
    install_dependencies
    
    # 캐시 로딩
    preload_cache
    
    # 빌드
    build_application
    
    # 서버 시작
    if systemctl is-enabled --quiet msp-main.service 2>/dev/null; then
        start_servers_systemd
    else
        start_servers
    fi
    
    log_success "업데이트 완료"
}

# 완전 제거
uninstall() {
    log_step "MSP Checklist 시스템 제거 중..."
    
    read -p "정말로 제거하시겠습니까? 모든 데이터가 삭제됩니다. (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "제거가 취소되었습니다."
        exit 0
    fi
    
    # 서버 중지
    stop_servers
    
    # Systemd 서비스 제거
    sudo systemctl disable msp-main.service 2>/dev/null || true
    sudo systemctl disable msp-admin.service 2>/dev/null || true
    sudo rm -f /etc/systemd/system/msp-main.service
    sudo rm -f /etc/systemd/system/msp-admin.service
    sudo systemctl daemon-reload
    
    # NGINX 설정 제거
    sudo rm -f /etc/nginx/sites-enabled/msp-checklist
    sudo rm -f /etc/nginx/sites-available/msp-checklist
    sudo systemctl reload nginx 2>/dev/null || true
    
    # 설치 디렉토리 제거
    sudo rm -rf "$INSTALL_DIR"
    
    log_success "MSP Checklist 시스템이 완전히 제거되었습니다."
}

# 설치 완료 메시지
show_completion() {
    # 공용 IP 확인
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 🎉 설치 완료! 🎉                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🌐 서비스 접속 주소:"
    if [ "$NGINX_INSTALLED" = true ]; then
        echo "   메인 서비스: http://$PUBLIC_IP"
        echo "   관리자 시스템: http://$PUBLIC_IP/admin"
    else
        echo "   메인 서비스: http://$PUBLIC_IP:3010"
        echo "   관리자 시스템: http://$PUBLIC_IP:3011"
    fi
    echo ""
    echo "🔧 유용한 명령어:"
    echo "   서버 상태 확인: $0 --status"
    echo "   서버 재시작: $0 --restart"
    echo "   서버 중지: $0 --stop"
    echo "   업데이트: $0 --update"
    if [ "$SYSTEMD_INSTALLED" = true ]; then
        echo "   서비스 로그: journalctl -u msp-main -f"
    else
        echo "   로그 확인: tail -f $INSTALL_DIR/main-server.log"
    fi
    echo ""
    echo "📝 다음 단계:"
    echo "   1. AWS 보안 그룹에서 포트 허용 (80, 3010, 3011)"
    echo "   2. 환경 변수 설정: nano $INSTALL_DIR/.env"
    echo "   3. 관리자 계정 생성: cd $INSTALL_DIR && node create-admin.cjs"
    echo ""
    echo "📋 설치 로그: $LOG_FILE"
    echo ""
}

# 대화형 설치 메뉴
interactive_install() {
    show_banner
    
    echo "설치 옵션을 선택하세요:"
    echo ""
    echo "  1) 전체 설치 (NGINX + Systemd 포함) - 권장"
    echo "  2) 최소 설치 (앱만 설치)"
    echo "  3) 취소"
    echo ""
    read -p "선택 (1-3): " choice
    
    case $choice in
        1)
            INSTALL_NGINX=true
            INSTALL_SYSTEMD=true
            ;;
        2)
            INSTALL_NGINX=false
            INSTALL_SYSTEMD=false
            ;;
        3)
            echo "설치가 취소되었습니다."
            exit 0
            ;;
        *)
            echo "잘못된 선택입니다."
            exit 1
            ;;
    esac
    
    run_installation
}

# 설치 실행
run_installation() {
    log_info "설치 로그: $LOG_FILE"
    
    START_TIME=$(date +%s)
    
    # 기본 설치 단계
    check_system
    setup_swap
    install_packages
    install_nodejs
    setup_project
    install_dependencies
    setup_environment
    preload_cache
    build_application
    setup_firewall
    
    # 선택적 설치
    NGINX_INSTALLED=false
    SYSTEMD_INSTALLED=false
    
    if [ "$INSTALL_NGINX" = true ]; then
        setup_nginx
        NGINX_INSTALLED=true
    fi
    
    if [ "$INSTALL_SYSTEMD" = true ]; then
        setup_systemd
        start_servers_systemd
        SYSTEMD_INSTALLED=true
    else
        start_servers
    fi
    
    # 완료 시간 계산
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    log_success "설치 완료! (소요 시간: ${MINUTES}분 ${SECONDS}초)"
    
    show_completion
}

# 메인 함수
main() {
    # 명령줄 인자 처리
    case "${1:-}" in
        --full)
            show_banner
            INSTALL_NGINX=true
            INSTALL_SYSTEMD=true
            run_installation
            ;;
        --minimal)
            show_banner
            INSTALL_NGINX=false
            INSTALL_SYSTEMD=false
            run_installation
            ;;
        --nginx)
            setup_nginx
            ;;
        --systemd)
            setup_systemd
            ;;
        --update)
            update_installation
            ;;
        --status)
            check_server_status
            ;;
        --restart)
            restart_servers
            ;;
        --stop)
            stop_servers
            ;;
        --uninstall)
            uninstall
            ;;
        --help|-h)
            show_help
            ;;
        "")
            interactive_install
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
