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
#
# 사용법:
#   ./scripts/install/install-prerequisites.sh [옵션]
#
# 옵션:
#   --check-only    설치 없이 현재 상태만 확인
#   --force         이미 설치된 항목도 재설치
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

# 옵션 파싱
CHECK_ONLY=false
FORCE_INSTALL=false

for arg in "$@"; do
    case $arg in
        --check-only)
            CHECK_ONLY=true
            ;;
        --force)
            FORCE_INSTALL=true
            ;;
    esac
done

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
    if [ "$CHECK_ONLY" = true ]; then
        echo "  모드: 상태 확인만 (--check-only)"
        echo ""
    fi
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

# Git 설치 확인 및 설치
check_and_install_git() {
    log_step "Git 확인 중..."
    
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | awk '{print $3}')
        log_success "Git이 이미 설치되어 있습니다: v${GIT_VERSION}"
        
        if [ "$FORCE_INSTALL" = false ]; then
            return 0
        fi
        log_info "강제 재설치 모드 (--force)"
    else
        log_warn "Git이 설치되어 있지 않습니다."
    fi
    
    if [ "$CHECK_ONLY" = true ]; then
        log_error "Git 설치가 필요합니다."
        return 1
    fi
    
    log_info "Git 설치 중..."
    
    case "$OS_TYPE" in
        macos)
            if command -v brew &> /dev/null; then
                brew install git
            else
                log_info "Xcode Command Line Tools 설치 중..."
                xcode-select --install 2>/dev/null || true
            fi
            ;;
        amazon)
            sudo yum install -y git
            ;;
        ubuntu)
            sudo apt-get update
            sudo apt-get install -y git
            ;;
        *)
            log_error "Git을 수동으로 설치해주세요."
            return 1
            ;;
    esac
    
    if command -v git &> /dev/null; then
        log_success "Git 설치 완료: $(git --version)"
    else
        log_error "Git 설치 실패"
        return 1
    fi
}

# Node.js 버전 확인 (20.x 이상인지)
check_node_version() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    
    NODE_CURRENT=$(node -v | tr -d 'v')
    NODE_MAJOR=$(echo "$NODE_CURRENT" | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -ge 20 ]; then
        return 0
    else
        return 1
    fi
}

# nvm 로드
load_nvm() {
    # sudo로 실행 시 원래 사용자 확인
    if [ -n "$SUDO_USER" ]; then
        REAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    else
        REAL_HOME="$HOME"
    fi
    
    # 여러 위치에서 nvm 찾기
    if [ -s "$REAL_HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$REAL_HOME/.nvm"
        \. "$NVM_DIR/nvm.sh"
    elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        \. "$NVM_DIR/nvm.sh"
    elif [ -s "/home/ec2-user/.nvm/nvm.sh" ]; then
        export NVM_DIR="/home/ec2-user/.nvm"
        \. "$NVM_DIR/nvm.sh"
    fi
    
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
}

# Node.js 20 확인 및 설치
check_and_install_nodejs() {
    log_step "Node.js ${NODE_VERSION}.x 확인 중..."
    
    # 기존 nvm 로드 시도
    load_nvm
    
    # 현재 Node.js 버전 확인
    if command -v node &> /dev/null; then
        NODE_CURRENT=$(node -v)
        NODE_MAJOR=$(echo "$NODE_CURRENT" | cut -d'.' -f1 | tr -d 'v')
        
        if [ "$NODE_MAJOR" -ge 20 ]; then
            log_success "Node.js가 이미 설치되어 있습니다: ${NODE_CURRENT} (요구사항 충족)"
            
            if [ "$FORCE_INSTALL" = false ]; then
                return 0
            fi
            log_info "강제 재설치 모드 (--force)"
        else
            log_warn "Node.js ${NODE_CURRENT} 설치됨 - 20.x 이상 필요"
        fi
    else
        log_warn "Node.js가 설치되어 있지 않습니다."
    fi
    
    if [ "$CHECK_ONLY" = true ]; then
        log_error "Node.js 20.x 설치가 필요합니다."
        return 1
    fi
    
    # nvm 설치 (없는 경우)
    if ! command -v nvm &> /dev/null; then
        if [ ! -d "$HOME/.nvm" ]; then
            log_info "nvm 설치 중..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash
        fi
        
        # nvm 로드
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    fi
    
    if ! command -v nvm &> /dev/null; then
        log_error "nvm 설치 실패. 수동으로 설치해주세요."
        return 1
    fi
    
    # Node.js 20 설치
    log_info "Node.js ${NODE_VERSION} 설치 중..."
    nvm install ${NODE_VERSION}
    nvm use ${NODE_VERSION}
    nvm alias default ${NODE_VERSION}
    
    # 설치 확인
    if check_node_version; then
        log_success "Node.js $(node -v) 설치 완료"
        log_success "npm $(npm -v) 설치 완료"
    else
        log_error "Node.js 20.x 설치 실패"
        return 1
    fi
}

# macOS 패키지 설치
install_macos_packages() {
    log_step "macOS 빌드 도구 설치 중..."
    
    if [ "$CHECK_ONLY" = true ]; then
        return 0
    fi
    
    # Homebrew 확인 및 설치
    if ! command -v brew &> /dev/null; then
        log_info "Homebrew 설치 중..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        log_success "Homebrew가 이미 설치되어 있습니다."
    fi
    
    log_success "macOS 빌드 도구 설치 완료"
}

# Amazon Linux 패키지 설치
install_amazon_packages() {
    log_step "Amazon Linux 빌드 도구 설치 중..."
    
    if [ "$CHECK_ONLY" = true ]; then
        return 0
    fi
    
    sudo yum update -y
    sudo yum install -y curl wget tar gzip gcc-c++ make python3
    
    log_success "Amazon Linux 빌드 도구 설치 완료"
}

# Ubuntu 패키지 설치
install_ubuntu_packages() {
    log_step "Ubuntu 빌드 도구 설치 중..."
    
    if [ "$CHECK_ONLY" = true ]; then
        return 0
    fi
    
    sudo apt-get update
    sudo apt-get install -y curl wget tar gzip build-essential python3
    
    log_success "Ubuntu 빌드 도구 설치 완료"
}

# Node.js 설치 (nvm 사용) - 레거시 함수, check_and_install_nodejs로 대체
install_nodejs() {
    check_and_install_nodejs
}

# PM2 설치
install_pm2() {
    log_step "PM2 확인 중..."
    
    # nvm 로드
    load_nvm
    
    if command -v pm2 &> /dev/null; then
        log_success "PM2가 이미 설치되어 있습니다: v$(pm2 -v)"
        
        if [ "$FORCE_INSTALL" = false ]; then
            return 0
        fi
        log_info "강제 재설치 모드 (--force)"
    else
        log_warn "PM2가 설치되어 있지 않습니다."
    fi
    
    if [ "$CHECK_ONLY" = true ]; then
        log_error "PM2 설치가 필요합니다."
        return 1
    fi
    
    log_info "PM2 설치 중..."
    npm install -g pm2
    
    if command -v pm2 &> /dev/null; then
        log_success "PM2 설치 완료: v$(pm2 -v)"
    else
        log_error "PM2 설치 실패"
        return 1
    fi
}

# 설치 검증
verify_installation() {
    log_step "설치 검증 중..."
    
    # nvm 로드
    load_nvm
    
    local errors=0
    local warnings=0
    
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │  소프트웨어 상태                                            │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    
    # Git 확인
    if command -v git &> /dev/null; then
        printf "  │  %-12s ${GREEN}✓${NC} %-42s │\n" "Git" "$(git --version | awk '{print $3}')"
    else
        printf "  │  %-12s ${RED}✗${NC} %-42s │\n" "Git" "설치되지 않음"
        errors=$((errors + 1))
    fi
    
    # Node.js 확인
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        NODE_MAJOR=$(echo "$NODE_VER" | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_MAJOR" -ge 20 ]; then
            printf "  │  %-12s ${GREEN}✓${NC} %-42s │\n" "Node.js" "${NODE_VER} (요구사항 충족)"
        else
            printf "  │  %-12s ${YELLOW}!${NC} %-42s │\n" "Node.js" "${NODE_VER} (20.x 이상 필요)"
            warnings=$((warnings + 1))
        fi
    else
        printf "  │  %-12s ${RED}✗${NC} %-42s │\n" "Node.js" "설치되지 않음"
        errors=$((errors + 1))
    fi
    
    # npm 확인
    if command -v npm &> /dev/null; then
        printf "  │  %-12s ${GREEN}✓${NC} %-42s │\n" "npm" "$(npm -v)"
    else
        printf "  │  %-12s ${RED}✗${NC} %-42s │\n" "npm" "설치되지 않음"
        errors=$((errors + 1))
    fi
    
    # nvm 확인
    if command -v nvm &> /dev/null || [ -d "$HOME/.nvm" ]; then
        NVM_VER=$(nvm --version 2>/dev/null || echo "설치됨")
        printf "  │  %-12s ${GREEN}✓${NC} %-42s │\n" "nvm" "${NVM_VER}"
    else
        printf "  │  %-12s ${YELLOW}!${NC} %-42s │\n" "nvm" "설치되지 않음 (선택사항)"
    fi
    
    # PM2 확인
    if command -v pm2 &> /dev/null; then
        printf "  │  %-12s ${GREEN}✓${NC} %-42s │\n" "PM2" "$(pm2 -v)"
    else
        printf "  │  %-12s ${RED}✗${NC} %-42s │\n" "PM2" "설치되지 않음"
        errors=$((errors + 1))
    fi
    
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    
    if [ $errors -gt 0 ]; then
        log_error "설치 검증 실패: $errors 개의 필수 항목이 누락되었습니다."
        return 1
    elif [ $warnings -gt 0 ]; then
        log_warn "설치 완료되었으나 $warnings 개의 경고가 있습니다."
        return 0
    fi
    
    log_success "모든 필수 소프트웨어가 올바르게 설치되었습니다!"
}

# 완료 메시지
print_completion() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    if [ "$CHECK_ONLY" = true ]; then
        echo -e "║  ${GREEN}상태 확인 완료!${NC}                                            ║"
    else
        echo -e "║  ${GREEN}필수 소프트웨어 설치 완료!${NC}                                  ║"
    fi
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ "$CHECK_ONLY" = false ]; then
        echo "  설치된 소프트웨어:"
        echo "    • Git"
        echo "    • Node.js ${NODE_VERSION}.x"
        echo "    • npm"
        echo "    • PM2 (프로세스 관리자)"
        echo ""
    fi
    
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
    
    # Git 확인 및 설치
    check_and_install_git || true
    
    # OS별 빌드 도구 설치
    if [ "$CHECK_ONLY" = false ]; then
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
                log_warn "빌드 도구 설치를 건너뜁니다. 수동으로 curl, gcc를 설치해주세요."
                ;;
        esac
    fi
    
    # Node.js 확인 및 설치
    check_and_install_nodejs || true
    
    # PM2 설치
    install_pm2 || true
    
    # 최종 검증
    verify_installation
    print_completion
}

# 스크립트 실행
main "$@"
