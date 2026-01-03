#!/bin/bash

# ============================================================================
# MSP Checklist System - 전체 설치 스크립트
# 
# 이 스크립트는 다음을 설치합니다:
#   - Node.js 20.x (NVM 사용)
#   - 프로젝트 의존성
#   - 애플리케이션 빌드
#
# 지원 OS: Amazon Linux 2023, Ubuntu 20.04/22.04/24.04
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
PROJECT_DIR="${PROJECT_DIR:-/opt/msp-checklist-system}"
NODE_VERSION="20"

# 배너
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist System - 전체 설치 스크립트             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    log_error "이 스크립트는 root 권한이 필요합니다."
    echo "다음 명령어로 실행하세요: sudo $0"
    exit 1
fi

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
    else
        log_error "지원되지 않는 운영체제입니다."
        exit 1
    fi
    log_info "감지된 OS: $OS_ID $OS_VERSION"
}

# 시스템 패키지 설치
install_system_packages() {
    log_info "시스템 패키지 설치 중..."
    
    case "$OS_ID" in
        amzn|amazon)
            dnf update -y
            dnf install -y git curl wget tar gzip gcc-c++ make
            ;;
        ubuntu)
            apt-get update
            apt-get install -y git curl wget tar gzip build-essential
            ;;
        *)
            log_error "지원되지 않는 OS: $OS_ID"
            exit 1
            ;;
    esac
    
    log_success "시스템 패키지 설치 완료"
}

# NVM 및 Node.js 설치
install_nodejs() {
    log_info "Node.js $NODE_VERSION 설치 중..."
    
    # NVM 설치
    if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    
    # NVM 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Node.js 설치
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION
    
    log_success "Node.js $(node -v) 설치 완료"
}

# 프로젝트 클론 또는 업데이트
setup_project() {
    log_info "프로젝트 설정 중..."
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        log_info "기존 프로젝트 업데이트 중..."
        cd "$PROJECT_DIR"
        git pull origin main || git pull origin master
    else
        log_info "프로젝트 클론 중..."
        mkdir -p "$(dirname $PROJECT_DIR)"
        git clone https://github.com/your-repo/msp-checklist-system.git "$PROJECT_DIR"
        cd "$PROJECT_DIR"
    fi
    
    log_success "프로젝트 설정 완료"
}

# 의존성 설치 및 빌드
build_application() {
    log_info "애플리케이션 빌드 중..."
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    # 메인 앱 빌드
    log_info "메인 앱 의존성 설치 중..."
    npm install --legacy-peer-deps
    
    log_info "메인 앱 빌드 중..."
    npm run build
    log_success "메인 앱 빌드 완료"
    
    # Admin 앱 빌드
    if [ -d "admin" ]; then
        log_info "Admin 앱 의존성 설치 중..."
        cd admin
        npm install --legacy-peer-deps
        
        log_info "Admin 앱 빌드 중..."
        npm run build
        log_success "Admin 앱 빌드 완료"
        cd ..
    fi
}

# 완료 메시지
show_complete() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  설치 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. 서버 시작: cd $PROJECT_DIR && ./scripts/manage/start-servers.sh"
    echo "  2. Nginx 설정: sudo ./scripts/nginx/setup-nginx.sh"
    echo "  3. 자동 시작 설정: sudo ./scripts/manage/setup-autostart.sh"
    echo ""
}

# 메인 실행
main() {
    detect_os
    install_system_packages
    install_nodejs
    setup_project
    build_application
    show_complete
}

main "$@"
