#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 완전 삭제 스크립트
#
# 사용법:
#   ./uninstall.sh           # 대화형 모드 (확인 후 삭제)
#   ./uninstall.sh --force   # 강제 삭제 (확인 없이)
#   ./uninstall.sh --keep-db # DB 파일만 보존하고 삭제
#
# 삭제 항목:
#   - PM2 프로세스 및 설정
#   - 설치 디렉토리 (/opt/msp-checklist-system)
#   - 로그 파일
#   - (선택) 데이터베이스 파일
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 설정
INSTALL_DIR="/opt/msp-checklist-system"
BACKUP_DIR="$HOME/msp-backup-$(date +%Y%m%d_%H%M%S)"

# 옵션 파싱
FORCE_MODE=false
KEEP_DB=false

for arg in "$@"; do
    case $arg in
        --force)
            FORCE_MODE=true
            ;;
        --keep-db)
            KEEP_DB=true
            ;;
        --help|-h)
            echo "사용법: $0 [옵션]"
            echo ""
            echo "옵션:"
            echo "  --force    확인 없이 강제 삭제"
            echo "  --keep-db  DB 파일을 백업 후 삭제"
            echo "  --help     도움말 표시"
            exit 0
            ;;
    esac
done

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          MSP 어드바이저 - 완전 삭제 스크립트                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# 설치 확인
if [ ! -d "$INSTALL_DIR" ]; then
    log_warn "설치 디렉토리를 찾을 수 없습니다: $INSTALL_DIR"
    log_info "이미 삭제되었거나 설치되지 않았습니다."
    exit 0
fi

# 삭제 대상 표시
echo "삭제 대상:"
echo "  - PM2 프로세스: msp-main, msp-admin"
echo "  - 설치 디렉토리: $INSTALL_DIR"
if [ "$KEEP_DB" = true ]; then
    echo "  - DB 파일: 백업 후 보존 ($BACKUP_DIR)"
else
    echo "  - DB 파일: 삭제됨"
fi
echo ""

# 확인 (--force가 아닌 경우)
if [ "$FORCE_MODE" = false ]; then
    echo -e "${RED}⚠️  경고: 이 작업은 되돌릴 수 없습니다!${NC}"
    echo ""
    read -p "정말로 삭제하시겠습니까? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "삭제가 취소되었습니다."
        exit 0
    fi
    echo ""
fi

# 1. PM2 프로세스 중지 및 삭제
log_info "PM2 프로세스 중지 중..."

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if command -v pm2 &> /dev/null; then
    pm2 stop msp-main 2>/dev/null || true
    pm2 stop msp-admin 2>/dev/null || true
    pm2 delete msp-main 2>/dev/null || true
    pm2 delete msp-admin 2>/dev/null || true
    pm2 save --force 2>/dev/null || true
    log_success "PM2 프로세스 삭제 완료"
else
    log_warn "PM2가 설치되어 있지 않습니다."
fi

# 2. DB 백업 (--keep-db 옵션)
if [ "$KEEP_DB" = true ]; then
    log_info "데이터베이스 백업 중..."
    mkdir -p "$BACKUP_DIR"
    
    # DB 파일 백업
    [ -f "$INSTALL_DIR/msp-checklist/msp-assessment.db" ] && \
        cp "$INSTALL_DIR/msp-checklist/msp-assessment.db" "$BACKUP_DIR/"
    [ -f "$INSTALL_DIR/msp-checklist/advice-cache.db" ] && \
        cp "$INSTALL_DIR/msp-checklist/advice-cache.db" "$BACKUP_DIR/"
    [ -f "$INSTALL_DIR/msp-checklist/virtual-evidence-cache.db" ] && \
        cp "$INSTALL_DIR/msp-checklist/virtual-evidence-cache.db" "$BACKUP_DIR/"
    
    # 환경 설정 백업
    [ -f "$INSTALL_DIR/msp-checklist/.env.local" ] && \
        cp "$INSTALL_DIR/msp-checklist/.env.local" "$BACKUP_DIR/"
    [ -f "$INSTALL_DIR/msp-checklist/admin/.env.local" ] && \
        cp "$INSTALL_DIR/msp-checklist/admin/.env.local" "$BACKUP_DIR/admin.env.local"
    
    # 증빙 파일 백업
    if [ -d "$INSTALL_DIR/msp-checklist/evidence-files" ]; then
        cp -r "$INSTALL_DIR/msp-checklist/evidence-files" "$BACKUP_DIR/"
    fi
    
    log_success "백업 완료: $BACKUP_DIR"
fi

# 3. 설치 디렉토리 삭제
log_info "설치 디렉토리 삭제 중..."
sudo rm -rf "$INSTALL_DIR"
log_success "설치 디렉토리 삭제 완료"

# 4. PM2 startup 설정 제거
log_info "PM2 시작 설정 제거 중..."
if command -v pm2 &> /dev/null; then
    pm2 unstartup 2>/dev/null || true
fi
log_success "PM2 시작 설정 제거 완료"

# 5. Swap 파일 제거 (선택적)
if [ -f /swapfile ]; then
    echo ""
    if [ "$FORCE_MODE" = false ]; then
        read -p "Swap 파일(/swapfile)도 삭제하시겠습니까? (yes/no): " REMOVE_SWAP
    else
        REMOVE_SWAP="no"
    fi
    
    if [ "$REMOVE_SWAP" = "yes" ]; then
        log_info "Swap 파일 제거 중..."
        sudo swapoff /swapfile 2>/dev/null || true
        sudo rm -f /swapfile
        sudo sed -i '/\/swapfile/d' /etc/fstab 2>/dev/null || true
        log_success "Swap 파일 제거 완료"
    fi
fi

# 완료 메시지
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}MSP 어드바이저 삭제 완료!${NC}                                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$KEEP_DB" = true ]; then
    echo "  백업 위치: $BACKUP_DIR"
    echo ""
    echo "  백업된 파일:"
    ls -la "$BACKUP_DIR" 2>/dev/null || true
    echo ""
fi

echo "  삭제된 항목:"
echo "    ✓ PM2 프로세스 (msp-main, msp-admin)"
echo "    ✓ 설치 디렉토리 ($INSTALL_DIR)"
echo "    ✓ PM2 시작 설정"
echo ""

# 추가 정리 안내
echo "  추가 정리 (선택사항):"
echo "    - nvm 삭제: rm -rf ~/.nvm"
echo "    - PM2 삭제: npm uninstall -g pm2"
echo ""
echo "═══════════════════════════════════════════════════════════════"
