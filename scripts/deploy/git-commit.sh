#!/bin/bash

# ============================================================================
# Git 커밋 및 푸시 스크립트
# 
# 사용법:
#   ./git-commit.sh "커밋 메시지"
#   ./git-commit.sh                    # 대화형 모드
# ============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 프로젝트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              Git 커밋 및 푸시 스크립트                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Git 저장소 확인
if [ ! -d ".git" ]; then
    log_error "Git 저장소가 아닙니다."
    exit 1
fi

# 현재 브랜치
BRANCH=$(git branch --show-current)
log_info "현재 브랜치: $BRANCH"

# 변경사항 확인
echo ""
log_info "변경된 파일:"
git status --short

CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$CHANGED" -eq 0 ]; then
    log_warning "커밋할 변경사항이 없습니다."
    exit 0
fi

echo ""
log_info "변경된 파일 수: $CHANGED"

# 커밋 메시지
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    echo ""
    read -p "커밋 메시지를 입력하세요: " COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="update: $(date '+%Y-%m-%d %H:%M')"
        log_warning "기본 메시지 사용: $COMMIT_MSG"
    fi
fi

# 커밋 확인
echo ""
echo -e "${YELLOW}커밋 메시지: $COMMIT_MSG${NC}"
read -p "커밋하시겠습니까? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    log_warning "커밋 취소됨"
    exit 0
fi

# Git 작업 수행
log_info "변경사항 스테이징..."
git add -A

log_info "커밋 중..."
git commit -m "$COMMIT_MSG"

log_info "푸시 중..."
git push origin "$BRANCH"

echo ""
log_success "커밋 및 푸시 완료!"
echo ""
echo "최근 커밋:"
git log --oneline -3
