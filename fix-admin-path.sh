#!/bin/bash

# MSP Checklist Admin 경로 수정 스크립트
# 설치 스크립트의 admin 디렉토리 경로 문제를 해결합니다.

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

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist Admin 경로 수정 스크립트            ║"
echo "║                                                            ║"
echo "║  설치 스크립트의 admin 디렉토리 경로 문제를 해결합니다.   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 현재 디렉토리 확인
if [ ! -f "amazon-linux-robust-install.sh" ]; then
    log_error "MSP Checklist 루트 디렉토리에서 실행해주세요."
    exit 1
fi

log_info "admin 디렉토리 경로 문제 수정 중..."

# 수정할 파일 목록
FILES=(
    "amazon-linux-robust-install.sh"
    "amazon-linux-install.sh"
    "amazon-linux-reinstall.sh"
    "amazon-linux-quick-setup.sh"
    "ubuntu-robust-install.sh"
    "ubuntu-quick-setup.sh"
)

# 각 파일에서 경로 수정
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        log_info "$file 수정 중..."
        
        # ../admin을 admin으로 변경
        sed -i 's|cd ../admin|cd admin|g' "$file"
        
        # 환경 변수 경로도 수정 (필요한 경우)
        sed -i 's|admin/\.env\.local|msp-checklist/admin/.env.local|g' "$file"
        sed -i 's|admin/package\.json|msp-checklist/admin/package.json|g' "$file"
        
        log_success "$file 수정 완료"
    else
        log_warning "$file 파일을 찾을 수 없습니다."
    fi
done

# 프로젝트 구조 확인
log_info "프로젝트 구조 확인 중..."

if [ -d "msp-checklist" ]; then
    log_success "msp-checklist 디렉토리 존재"
    
    if [ -d "msp-checklist/admin" ]; then
        log_success "msp-checklist/admin 디렉토리 존재"
        
        if [ -f "msp-checklist/admin/package.json" ]; then
            log_success "관리자 시스템 package.json 존재"
        else
            log_warning "관리자 시스템 package.json이 없습니다."
        fi
    else
        log_error "msp-checklist/admin 디렉토리가 없습니다."
        log_info "프로젝트를 다시 클론해야 할 수 있습니다."
    fi
else
    log_error "msp-checklist 디렉토리가 없습니다."
    log_info "프로젝트를 먼저 클론해주세요."
fi

echo ""
log_success "admin 경로 수정이 완료되었습니다!"
echo ""
echo "이제 설치 스크립트를 다시 실행할 수 있습니다:"
echo "  ./amazon-linux-robust-install.sh"
echo "  또는"
echo "  ./ubuntu-robust-install.sh"