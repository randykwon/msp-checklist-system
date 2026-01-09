#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 필수 소프트웨어 설치 스크립트
# 
# 지원 OS:
#   - Amazon Linux 2023 / Amazon Linux 2
#   - Ubuntu 20.04 / 22.04
#   - macOS (Homebrew 사용)
#
# 설치 항목:
#   - Node.js 20.x (nvm 사용)
#   - Git
#   - 빌드 도구 (gcc, make 등)
#   - PM2 (프로세스 관리자)
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 설정
NODE_VERSION="20"
NVM_VERSION="0.39.7"

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 헤더 출력
print_header() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║     MSP 어드바이저 - 필수 소프트웨어 설치                     ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# OS 감지
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS_TYPE="macos"
        log_info "macOS 감지됨"
    elif [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            amzn)
                OS_TYPE="amazon"
                log_info "Amazon Linux 감지됨: $VERSION"
                ;;
            ubuntu)
                OS_TYPE="ubuntu"
                log_info "Ubuntu 감지됨: $VERSION"
                ;;
            *)
                OS_TYPE="linux"
                log_warn "알 수 없는 Linux 배포판: $ID"
                ;;
        esac
    else
        log_error "지원되지 않는 운영체제입니다."
        exit 1
    fi
}

# 시스템 요구사항 확인
check_requirements() {
    log_step "시스템 요구사항 확인 중..."
    
    # 메모리 확인
    if [[ "$OS_TYPE" == "macos" ]]; then
        TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024)}')
    else
        TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    fi
    
    if [ "$TOTAL_MEM" -lt 1800 ]; then
        log_warn "메모리가 2GB 미만입니다 (${TOTAL_MEM}MB). 성능 문제가 발생할 수 있습니다."
    else
        log_success "메모리: ${TOTAL_MEM}MB"
    fi
    
    # 디스크 확인
    if [[ "$OS_TYPE" == "macos" ]]; then
        DISK_FREE=$(df -m / | awk 'NR==2 {print $4}')
    else
        DISK_FREE=$(df -m / | awk 'NR==2 {print $4}')
    fi
    
    if [ "$DISK_FREE" -lt 5000 ]; then
        log_warn "디스크 여유 공간이 5GB 미만입니다 (${DISK_FREE}MB)."
    else
        log_success "디스크 여유 공간: ${DISK_FREE}MB"
    fi
}

# macOS 패키지 설치
install_macos_packages() {
    log_step "macOS 패키지 설치 중..."
    
    # Homebrew 확인 및 설치
    if ! command -v brew &> /dev/null; then
        log_info "Homebrew 설치 중..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Git 설치
    if ! command -v git &> /dev/null; then
        brew install git
    fi
    
    log_success "macOS 패키지 설치 완료"
}

# Amazon Linux 패키지 설치
install_amazon_packages() {
    log_step "Amazon Linux 패키지 설치 중..."
    
    sudo yum update -y
    sudo yum install -y git curl wget tar gzip gcc-c++ make python3
    
    log_success "Amazon Linux 패키지 설치 완료"
}

# Ubuntu 패키지 설치
install_ubuntu_packages() {
    log_step "Ubuntu 패키지 설치 중..."
    
    sudo apt-get update
    sudo apt-get install -y git curl wget tar gzip build-essential python3
    
    log_success "Ubuntu 패키지 설치 완료"
}

# Node.js 설치 (nvm 사용)
install_nodejs() {
    log_step "Node.js ${NODE_VERSION} 설치 중..."
    
    # nvm 설치
    if [ ! -d "$HOME/.nvm" ]; then
        log_info "nvm 설치 중..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash
    else
        log_info "nvm이 이미 설치되어 있습니다."
    fi
    
    # nvm 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    # Node.js 설치
    if ! nvm ls ${NODE_VERSION} &> /dev/null; then
        log_info "Node.js ${NODE_VERSION} 설치 중..."
        nvm install ${NODE_VERSION}
    fi
    
    nvm use ${NODE_VERSION}
    nvm alias default ${NODE_VERSION}
    
    # 버전 확인
    log_success "Node.js $(node -v) 설치 완료"
    log_success "npm $(npm -v) 설치 완료"
}

# PM2 설치
install_pm2() {
    log_step "PM2 설치 중..."
    
    # nvm 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        log_success "PM2 설치 완료"
    else
        log_info "PM2가 이미 설치되어 있습니다: $(pm2 -v)"
    fi
}

# 설치 검증
verify_installation() {
    log_step "설치 검증 중..."
    
    # nvm 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    local errors=0
    
    # Git 확인
    if command -v git &> /dev/null; then
        log_success "Git: $(git --version)"
    else
        log_error "Git이 설치되지 않았습니다."
        errors=$((errors + 1))
    fi
    
    # Node.js 확인
    if command -v node &> /dev/null; then
        log_success "Node.js: $(node -v)"
    else
        log_error "Node.js가 설치되지 않았습니다."
        errors=$((errors + 1))
    fi
    
    # npm 확인
    if command -v npm &> /dev/null; then
        log_success "npm: $(npm -v)"
    else
        log_error "npm이 설치되지 않았습니다."
        errors=$((errors + 1))
    fi
    
    # PM2 확인
    if command -v pm2 &> /dev/null; then
        log_success "PM2: $(pm2 -v)"
    else
        log_error "PM2가 설치되지 않았습니다."
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ]; then
        log_error "설치 검증 실패: $errors 개의 오류가 있습니다."
        return 1
    fi
    
    log_success "모든 필수 소프트웨어가 설치되었습니다!"
}

# 완료 메시지
print_completion() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo -e "║  ${GREEN}필수 소프트웨어 설치 완료!${NC}                                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  설치된 소프트웨어:"
    echo "    • Node.js ${NODE_VERSION}.x"
    echo "    • npm"
    echo "    • PM2 (프로세스 관리자)"
    echo "    • Git"
    echo ""
    echo "  다음 단계:"
    echo "    1. 새 터미널을 열거나 다음 명령 실행:"
    echo "       source ~/.bashrc  (또는 source ~/.zshrc)"
    echo ""
    echo "    2. 프로젝트 빌드 스크립트 실행:"
    echo "       ./scripts/install/build-all.sh"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# 메인 실행
main() {
    print_header
    detect_os
    check_requirements
    
    case "$OS_TYPE" in
        macos)
            install_macos_packages
            ;;
        amazon)
            install_amazon_packages
            ;;
        ubuntu)
            install_ubuntu_packages
            ;;
        *)
            log_warn "패키지 설치를 건너뜁니다. 수동으로 git, curl, gcc를 설치해주세요."
            ;;
    esac
    
    install_nodejs
    install_pm2
    verify_installation
    print_completion
}

# 스크립트 실행
main "$@"
