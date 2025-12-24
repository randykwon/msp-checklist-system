#!/bin/bash

# 디렉토리 구조 통일 스크립트
# msp-checklist와 msp-checklist-system을 msp-checklist-system으로 통일합니다.

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
echo "║         디렉토리 구조 통일 스크립트                       ║"
echo "║                                                            ║"
echo "║  msp-checklist-system으로 통일합니다.                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 현재 위치 확인
cd /opt
log_info "현재 위치: $(pwd)"

# 현재 디렉토리 상태 확인
log_info "현재 디렉토리 상태:"
ls -la

# 1. 모든 관련 프로세스 중지
log_info "모든 관련 프로세스 중지 중..."
sudo pkill -f "msp" 2>/dev/null || true
sudo pkill -f "next" 2>/dev/null || true
sudo pkill -f "npm" 2>/dev/null || true
sleep 3

# 2. 디렉토리 구조 분석
if [ -d "msp-checklist-system" ] && [ -d "msp-checklist" ]; then
    log_warning "두 디렉토리가 모두 존재합니다. 통합이 필요합니다."
    
    # msp-checklist-system을 메인으로 사용
    MAIN_DIR="msp-checklist-system"
    OLD_DIR="msp-checklist"
    
elif [ -d "msp-checklist-system" ]; then
    log_info "msp-checklist-system만 존재합니다."
    MAIN_DIR="msp-checklist-system"
    OLD_DIR=""
    
elif [ -d "msp-checklist" ]; then
    log_info "msp-checklist만 존재합니다. msp-checklist-system으로 이름 변경합니다."
    
    # msp-checklist를 msp-checklist-system으로 이름 변경
    sudo mv msp-checklist msp-checklist-system
    MAIN_DIR="msp-checklist-system"
    OLD_DIR=""
    
else
    log_error "MSP Checklist 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# 3. 중복 디렉토리가 있는 경우 통합
if [ ! -z "$OLD_DIR" ] && [ -d "$OLD_DIR" ]; then
    log_info "중복 디렉토리 통합 중..."
    
    # 백업 생성
    sudo cp -r "$OLD_DIR" "${OLD_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "백업 생성: ${OLD_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 중요한 파일들을 msp-checklist-system으로 복사 (덮어쓰지 않음)
    if [ -f "$OLD_DIR/.env" ]; then
        sudo cp -n "$OLD_DIR/.env" "$MAIN_DIR/" 2>/dev/null || true
    fi
    
    if [ -d "$OLD_DIR/msp-checklist" ]; then
        # 설정 파일들 복사
        if [ -f "$OLD_DIR/msp-checklist/.env.local" ]; then
            sudo cp -n "$OLD_DIR/msp-checklist/.env.local" "$MAIN_DIR/msp-checklist/" 2>/dev/null || true
        fi
        
        if [ -f "$OLD_DIR/msp-checklist/admin/.env.local" ]; then
            sudo mkdir -p "$MAIN_DIR/msp-checklist/admin"
            sudo cp -n "$OLD_DIR/msp-checklist/admin/.env.local" "$MAIN_DIR/msp-checklist/admin/" 2>/dev/null || true
        fi
    fi
    
    # 오래된 디렉토리 제거
    sudo rm -rf "$OLD_DIR"
    log_success "중복 디렉토리 정리 완료"
fi

# 4. 디렉토리 권한 설정
log_info "디렉토리 권한 설정 중..."
sudo chown -R $USER:$USER "$MAIN_DIR"
log_success "권한 설정 완료"

# 5. 모든 스크립트의 경로 업데이트
log_info "스크립트 경로 업데이트 중..."

# 현재 디렉토리의 모든 스크립트 파일 찾기
SCRIPT_FILES=$(find . -maxdepth 1 -name "*.sh" -type f)

for script in $SCRIPT_FILES; do
    if [ -f "$script" ]; then
        log_info "스크립트 업데이트 중: $script"
        
        # 백업 생성
        sudo cp "$script" "${script}.backup"
        
        # 경로 업데이트
        sudo sed -i 's|/opt/msp-checklist[^-]|/opt/msp-checklist-system|g' "$script"
        sudo sed -i 's|INSTALL_DIR="/opt/msp-checklist"|INSTALL_DIR="/opt/msp-checklist-system"|g' "$script"
        sudo sed -i 's|cd /opt/msp-checklist/msp-checklist|cd /opt/msp-checklist-system/msp-checklist|g' "$script"
        
        log_success "스크립트 업데이트 완료: $script"
    fi
done

# 6. msp-checklist-system 내부의 스크립트도 업데이트
if [ -d "$MAIN_DIR" ]; then
    cd "$MAIN_DIR"
    
    INTERNAL_SCRIPTS=$(find . -maxdepth 1 -name "*.sh" -type f)
    for script in $INTERNAL_SCRIPTS; do
        if [ -f "$script" ]; then
            log_info "내부 스크립트 업데이트 중: $script"
            
            # 백업 생성
            cp "$script" "${script}.backup"
            
            # 경로 업데이트
            sed -i 's|/opt/msp-checklist[^-]|/opt/msp-checklist-system|g' "$script"
            sed -i 's|INSTALL_DIR="/opt/msp-checklist"|INSTALL_DIR="/opt/msp-checklist-system"|g' "$script"
            
            log_success "내부 스크립트 업데이트 완료: $script"
        fi
    done
    
    cd /opt
fi

# 7. 심볼릭 링크 생성 (호환성을 위해)
log_info "호환성을 위한 심볼릭 링크 생성 중..."
if [ ! -L "msp-checklist" ] && [ ! -d "msp-checklist" ]; then
    sudo ln -s msp-checklist-system msp-checklist
    log_success "심볼릭 링크 생성 완료: msp-checklist -> msp-checklist-system"
fi

# 8. 최종 상태 확인
log_info "최종 디렉토리 상태:"
ls -la

# 9. 구조 검증
log_info "디렉토리 구조 검증 중..."
if [ -d "msp-checklist-system/msp-checklist" ]; then
    log_success "✅ msp-checklist-system/msp-checklist 존재"
else
    log_error "❌ msp-checklist-system/msp-checklist 없음"
fi

if [ -d "msp-checklist-system/msp-checklist/admin" ]; then
    log_success "✅ msp-checklist-system/msp-checklist/admin 존재"
else
    log_error "❌ msp-checklist-system/msp-checklist/admin 없음"
fi

# 10. 환경 변수 업데이트 가이드
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                디렉토리 구조 통일 완료!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "디렉토리 구조가 msp-checklist-system으로 통일되었습니다!"
echo ""
echo "📁 통일된 구조:"
echo "  /opt/msp-checklist-system/          # 메인 디렉토리"
echo "  ├── msp-checklist/                  # MSP 체크리스트 앱"
echo "  │   ├── admin/                      # 관리자 시스템"
echo "  │   ├── app/                        # Next.js 앱"
echo "  │   └── ...                         # 기타 파일들"
echo "  ├── *.sh                            # 설치/관리 스크립트들"
echo "  └── ...                             # 기타 파일들"
echo ""
echo "🔗 호환성:"
echo "  /opt/msp-checklist -> /opt/msp-checklist-system (심볼릭 링크)"
echo ""
echo "📝 다음 단계:"
echo "1. 빌드 스크립트 실행:"
echo "   cd /opt/msp-checklist-system"
echo "   ./nuclear-css-fix.sh"
echo ""
echo "2. 또는 완전 설치 스크립트 실행:"
echo "   cd /opt/msp-checklist-system"
echo "   ./amazon-linux-2023-complete-installer.sh"
echo ""
echo "3. 서버 시작:"
echo "   cd /opt/msp-checklist-system"
echo "   ./restart-servers.sh"

echo ""
log_info "디렉토리 구조 통일이 완료되었습니다! 🎉"