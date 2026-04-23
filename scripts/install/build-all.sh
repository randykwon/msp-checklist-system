#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 전체 빌드 스크립트
# 
# 빌드 순서:
#   1. Shared 패키지 (@msp/shared)
#   2. 메인 앱 (msp-checklist)
#   3. Admin 앱 (msp-checklist/admin)
#
# 사용법:
#   ./scripts/install/build-all.sh [옵션]
#
# 옵션:
#   --clean     node_modules 및 빌드 캐시 삭제 후 빌드
#   --skip-main 메인 앱 빌드 건너뛰기
#   --skip-admin Admin 앱 빌드 건너뛰기
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MSP_DIR="$PROJECT_ROOT/msp-checklist"
SHARED_DIR="$MSP_DIR/packages/shared"
ADMIN_DIR="$MSP_DIR/admin"

# 옵션 파싱
CLEAN_BUILD=false
SKIP_MAIN=false
SKIP_ADMIN=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_BUILD=true
            ;;
        --skip-main)
            SKIP_MAIN=true
            ;;
        --skip-admin)
            SKIP_ADMIN=true
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
    echo "║          MSP 어드바이저 - 전체 빌드 스크립트                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  프로젝트 루트: $PROJECT_ROOT"
    echo "  MSP 디렉토리:  $MSP_DIR"
    echo ""
}

# nvm 로드
load_nvm() {
    # sudo로 실행 시 원래 사용자 확인
    if [ -n "$SUDO_USER" ]; then
        REAL_USER="$SUDO_USER"
        REAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    else
        REAL_USER="$USER"
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
    elif [ -s "/root/.nvm/nvm.sh" ]; then
        export NVM_DIR="/root/.nvm"
        \. "$NVM_DIR/nvm.sh"
    fi
    
    if command -v nvm &> /dev/null; then
        # Node.js 20 사용
        nvm use 20 &> /dev/null || nvm use default &> /dev/null || true
        log_info "Node.js 버전: $(node -v)"
        
        # 버전 확인
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_MAJOR" -lt 20 ]; then
            log_warn "Node.js 20.x 이상이 필요합니다. 현재: $(node -v)"
            log_info "Node.js 20 설치 중..."
            nvm install 20
            nvm use 20
            log_success "Node.js $(node -v) 설치 완료"
        fi
    else
        log_warn "nvm을 찾을 수 없습니다. 시스템 Node.js 사용: $(node -v 2>/dev/null || echo 'not found')"
        log_warn "sudo 없이 스크립트를 실행하거나, 먼저 install-prerequisites.sh를 실행하세요."
    fi
}

# 디렉토리 확인
check_directories() {
    log_step "디렉토리 확인 중..."
    
    if [ ! -d "$MSP_DIR" ]; then
        log_error "msp-checklist 디렉토리를 찾을 수 없습니다: $MSP_DIR"
        exit 1
    fi
    
    if [ ! -d "$SHARED_DIR" ]; then
        log_error "shared 패키지 디렉토리를 찾을 수 없습니다: $SHARED_DIR"
        exit 1
    fi
    
    if [ ! -d "$ADMIN_DIR" ]; then
        log_error "admin 디렉토리를 찾을 수 없습니다: $ADMIN_DIR"
        exit 1
    fi
    
    log_success "모든 디렉토리 확인 완료"
}

# 클린 빌드
clean_build() {
    if [ "$CLEAN_BUILD" = true ]; then
        log_step "클린 빌드: 기존 빌드 파일 삭제 중..."
        
        # Shared 패키지
        rm -rf "$SHARED_DIR/node_modules" "$SHARED_DIR/dist"
        
        # 메인 앱
        rm -rf "$MSP_DIR/node_modules" "$MSP_DIR/.next"
        
        # Admin 앱
        rm -rf "$ADMIN_DIR/node_modules" "$ADMIN_DIR/.next"
        
        log_success "클린 빌드 준비 완료"
    fi
}

# Shared 패키지 빌드
build_shared() {
    log_step "1/3 Shared 패키지 빌드 중..."
    
    cd "$SHARED_DIR"
    
    # 의존성 설치
    log_info "Shared 패키지 의존성 설치 중..."
    npm install
    
    # TypeScript 빌드
    log_info "Shared 패키지 TypeScript 컴파일 중..."
    npm run build
    
    # 빌드 결과 확인
    if [ -d "$SHARED_DIR/dist" ]; then
        log_success "Shared 패키지 빌드 완료"
    else
        log_error "Shared 패키지 빌드 실패: dist 디렉토리가 없습니다."
        exit 1
    fi
}

# 메인 앱 빌드
build_main() {
    if [ "$SKIP_MAIN" = true ]; then
        log_warn "메인 앱 빌드 건너뛰기"
        return
    fi
    
    log_step "2/3 메인 앱 빌드 중..."
    
    cd "$MSP_DIR"
    
    # 의존성 설치
    log_info "메인 앱 의존성 설치 중..."
    npm install
    
    # Next.js 빌드
    log_info "메인 앱 Next.js 빌드 중..."
    npm run build
    
    # 빌드 결과 확인
    if [ -d "$MSP_DIR/.next" ]; then
        log_success "메인 앱 빌드 완료"
    else
        log_error "메인 앱 빌드 실패: .next 디렉토리가 없습니다."
        exit 1
    fi
}

# Admin 앱 빌드
build_admin() {
    if [ "$SKIP_ADMIN" = true ]; then
        log_warn "Admin 앱 빌드 건너뛰기"
        return
    fi
    
    log_step "3/3 Admin 앱 빌드 중..."
    
    cd "$ADMIN_DIR"
    
    # 의존성 설치 (shared 패키지 링크 포함)
    log_info "Admin 앱 의존성 설치 중..."
    npm install
    
    # Next.js 빌드
    log_info "Admin 앱 Next.js 빌드 중..."
    npm run build
    
    # 빌드 결과 확인
    if [ -d "$ADMIN_DIR/.next" ]; then
        log_success "Admin 앱 빌드 완료"
    else
        log_error "Admin 앱 빌드 실패: .next 디렉토리가 없습니다."
        exit 1
    fi
}

# 빌드 결과 요약
print_summary() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo -e "║  ${GREEN}빌드 완료!${NC}                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  빌드된 컴포넌트:"
    
    if [ -d "$SHARED_DIR/dist" ]; then
        echo -e "    ${GREEN}✓${NC} @msp/shared 패키지"
    fi
    
    if [ -d "$MSP_DIR/.next" ] && [ "$SKIP_MAIN" = false ]; then
        echo -e "    ${GREEN}✓${NC} 메인 앱 (포트 3010)"
    fi
    
    if [ -d "$ADMIN_DIR/.next" ] && [ "$SKIP_ADMIN" = false ]; then
        echo -e "    ${GREEN}✓${NC} Admin 앱 (포트 3011)"
    fi
    
    echo ""
    echo "  서버 시작:"
    echo "    ./scripts/server-all.sh start"
    echo ""
    echo "  또는 개별 시작:"
    echo "    ./scripts/server-main.sh start"
    echo "    ./scripts/server-admin.sh start"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# 메인 실행
main() {
    print_header
    load_nvm
    check_directories
    clean_build
    build_shared
    build_main
    build_admin
    print_summary
}

# 스크립트 실행
main "$@"
