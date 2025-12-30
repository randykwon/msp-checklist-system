#!/bin/bash

# Ubuntu MSP Checklist 설치 스크립트 v2.0
# Ubuntu 22.04 LTS / 24.04 LTS 지원
# 안정적인 설치를 위한 통합 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 전역 변수
INSTALL_DIR="/opt/msp-checklist-system"
REPO_URL="https://github.com/randykwon/msp-checklist-system.git"
LOG_FILE="/tmp/msp-install-$(date +%Y%m%d_%H%M%S).log"

log_info() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$LOG_FILE"; }

# 배너 출력
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║       Ubuntu MSP Checklist 설치 스크립트 v2.0            ║"
    echo "║                                                            ║"
    echo "║  🔧 Node.js 20.x + better-sqlite3 지원                   ║"
    echo "║  💾 2GB 스왑 메모리 자동 설정 (t2.micro 지원)            ║"
    echo "║  🚀 메인(3010) + Admin(3011) 서버 자동 시작              ║"
    echo "║  📦 Ubuntu 22.04 / 24.04 LTS 지원                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
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
    else
        log_info "저장소 클론 중..."
        # 기존 파일 백업
        if [ "$(ls -A 2>/dev/null)" ]; then
            BACKUP_DIR="/tmp/msp-backup-$(date +%Y%m%d_%H%M%S)"
            mkdir -p "$BACKUP_DIR"
            mv * "$BACKUP_DIR/" 2>/dev/null || true
            mv .* "$BACKUP_DIR/" 2>/dev/null || true
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
LLM_PROVIDER=openai
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
    sudo ufw allow 3010/tcp
    sudo ufw allow 3011/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw reload
    
    log_success "방화벽 설정 완료 (포트 3010, 3011, 80, 443 허용)"
}

# 서버 시작
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
        
        log_info "Admin 서버 시작 중..."
        cd admin
        nohup npm run start > ../../admin-server.log 2>&1 &
        cd "$INSTALL_DIR"
    fi
    
    # 서버 시작 대기
    log_info "서버 시작 대기 중... (15초)"
    sleep 15
    
    # 상태 확인
    if curl -s http://localhost:3010 > /dev/null 2>&1; then
        log_success "메인 서버 (포트 3010) 정상 실행 중"
    else
        log_warning "메인 서버 상태를 확인할 수 없습니다."
    fi
    
    if curl -s http://localhost:3011 > /dev/null 2>&1; then
        log_success "Admin 서버 (포트 3011) 정상 실행 중"
    else
        log_warning "Admin 서버 상태를 확인할 수 없습니다."
    fi
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
    echo "   메인 서비스: http://$PUBLIC_IP:3010"
    echo "   관리자 시스템: http://$PUBLIC_IP:3011"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "   서버 상태 확인: cd $INSTALL_DIR && ./server-status.sh"
    echo "   서버 재시작: cd $INSTALL_DIR && ./restart-servers.sh"
    echo "   로그 확인: tail -f $INSTALL_DIR/main-server.log"
    echo ""
    echo "📝 다음 단계:"
    echo "   1. AWS 보안 그룹에서 포트 3010, 3011 인바운드 허용"
    echo "   2. 환경 변수 설정: nano $INSTALL_DIR/.env"
    echo "   3. 관리자 계정 생성: cd $INSTALL_DIR && node create-admin.cjs"
    echo ""
    echo "📋 설치 로그: $LOG_FILE"
    echo ""
}

# 메인 함수
main() {
    show_banner
    
    log_info "설치 로그: $LOG_FILE"
    
    # 사용자 확인
    read -p "Ubuntu 설치를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치가 취소되었습니다."
        exit 0
    fi
    
    START_TIME=$(date +%s)
    
    # 설치 단계 실행
    check_system
    setup_swap
    install_packages
    install_nodejs
    setup_project
    install_dependencies
    setup_environment
    build_application
    setup_firewall
    start_servers
    
    # 완료 시간 계산
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    log_success "설치 완료! (소요 시간: ${MINUTES}분 ${SECONDS}초)"
    
    show_completion
}

# 스크립트 실행
main "$@"
