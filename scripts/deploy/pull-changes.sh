#!/bin/bash

# =============================================================================
# MSP Checklist - GitHub 변경사항 가져오기 스크립트
# 변경된 파일만 가져오고 변경 내역을 표시합니다.
# =============================================================================
# 사용법: ./pull-changes.sh [옵션]
#   --show-diff    변경 내용 상세 표시
#   --dry-run      실제 pull 없이 변경사항만 확인
#   -h, --help     도움말 표시
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 옵션 변수
SHOW_DIFF=false
DRY_RUN=false

# 옵션 파싱
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --show-diff) SHOW_DIFF=true ;;
        --dry-run) DRY_RUN=true ;;
        -h|--help)
            echo "GitHub 변경사항 가져오기 스크립트"
            echo ""
            echo "사용법: $0 [옵션]"
            echo ""
            echo "옵션:"
            echo "  --show-diff    변경 내용 상세 표시"
            echo "  --dry-run      실제 pull 없이 변경사항만 확인"
            echo "  -h, --help     도움말 표시"
            exit 0
            ;;
        *) log_error "알 수 없는 옵션: $1"; exit 1 ;;
    esac
    shift
done

# 배너
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           GitHub 변경사항 가져오기                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 프로젝트 디렉토리 감지
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Git 저장소 확인
if [ ! -d ".git" ]; then
    log_error "Git 저장소가 아닙니다: $SCRIPT_DIR"
    exit 1
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
log_info "브랜치: $CURRENT_BRANCH"

# 현재 커밋 정보
BEFORE_COMMIT=$(git rev-parse --short HEAD)
BEFORE_COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null)
log_info "현재 커밋: $BEFORE_COMMIT - $BEFORE_COMMIT_MSG"

# 로컬 변경사항 확인
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    log_warning "로컬 변경사항이 있습니다:"
    git status --short | head -10 | sed 's/^/  /'
    LOCAL_CHANGES=$(git status --short | wc -l)
    if [ "$LOCAL_CHANGES" -gt 10 ]; then
        echo "  ... 외 $((LOCAL_CHANGES - 10))개 파일"
    fi
    echo ""
fi

# 원격 저장소에서 정보 가져오기
log_info "원격 저장소 확인 중..."
git fetch origin --quiet

# 원격 커밋 정보
REMOTE_COMMIT=$(git rev-parse --short origin/$CURRENT_BRANCH 2>/dev/null || git rev-parse --short origin/main 2>/dev/null)
REMOTE_COMMIT_MSG=$(git log -1 --pretty=format:"%s" origin/$CURRENT_BRANCH 2>/dev/null || git log -1 --pretty=format:"%s" origin/main 2>/dev/null)

# 변경사항 확인
if [ "$BEFORE_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo ""
    log_success "이미 최신 상태입니다!"
    echo ""
    echo -e "  현재 커밋: ${GREEN}$BEFORE_COMMIT${NC}"
    echo -e "  메시지: $BEFORE_COMMIT_MSG"
    exit 0
fi

# 변경된 파일 목록
echo ""
echo -e "${CYAN}━━━ 변경된 파일 목록 ━━━${NC}"
echo ""

# 파일 변경 통계
CHANGED_FILES=$(git diff --name-only $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null)
ADDED_FILES=$(git diff --name-status $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | grep "^A" | wc -l)
MODIFIED_FILES=$(git diff --name-status $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | grep "^M" | wc -l)
DELETED_FILES=$(git diff --name-status $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | grep "^D" | wc -l)
RENAMED_FILES=$(git diff --name-status $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | grep "^R" | wc -l)

# 파일 목록 표시 (색상으로 구분)
git diff --name-status $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | while read status file rest; do
    case $status in
        A) echo -e "  ${GREEN}+ 추가${NC}    $file" ;;
        M) echo -e "  ${YELLOW}~ 수정${NC}    $file" ;;
        D) echo -e "  ${RED}- 삭제${NC}    $file" ;;
        R*) echo -e "  ${MAGENTA}→ 이름변경${NC} $file → $rest" ;;
        *) echo -e "  ${BLUE}? $status${NC}  $file" ;;
    esac
done

# 통계 표시
TOTAL_FILES=$((ADDED_FILES + MODIFIED_FILES + DELETED_FILES + RENAMED_FILES))
echo ""
echo -e "${CYAN}━━━ 변경 통계 ━━━${NC}"
echo ""
echo -e "  📊 총 ${TOTAL_FILES}개 파일 변경"
[ "$ADDED_FILES" -gt 0 ] && echo -e "     ${GREEN}+ $ADDED_FILES개 추가${NC}"
[ "$MODIFIED_FILES" -gt 0 ] && echo -e "     ${YELLOW}~ $MODIFIED_FILES개 수정${NC}"
[ "$DELETED_FILES" -gt 0 ] && echo -e "     ${RED}- $DELETED_FILES개 삭제${NC}"
[ "$RENAMED_FILES" -gt 0 ] && echo -e "     ${MAGENTA}→ $RENAMED_FILES개 이름변경${NC}"

# 커밋 로그 표시
echo ""
echo -e "${CYAN}━━━ 새로운 커밋 ━━━${NC}"
echo ""
git log --oneline $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | head -10 | while read line; do
    echo -e "  ${GREEN}●${NC} $line"
done
COMMIT_COUNT=$(git log --oneline $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null | wc -l)
if [ "$COMMIT_COUNT" -gt 10 ]; then
    echo "  ... 외 $((COMMIT_COUNT - 10))개 커밋"
fi

# 상세 diff 표시 (옵션)
if [ "$SHOW_DIFF" = true ]; then
    echo ""
    echo -e "${CYAN}━━━ 변경 내용 상세 ━━━${NC}"
    echo ""
    git diff --stat $BEFORE_COMMIT..$REMOTE_COMMIT 2>/dev/null
fi

# Dry run 모드
if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warning "Dry run 모드 - 실제 pull을 수행하지 않습니다"
    echo ""
    echo "실제 pull을 수행하려면: $0"
    exit 0
fi

# Pull 확인
echo ""
echo "═══════════════════════════════════════════════════════════════"
read -p "변경사항을 가져오시겠습니까? (Y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Nn]$ ]]; then
    log_info "취소되었습니다"
    exit 0
fi

# 로컬 변경사항 stash
if [ -n "$(git status --porcelain)" ]; then
    log_info "로컬 변경사항 임시 저장 중..."
    git stash push -m "auto-stash-$(date +%Y%m%d_%H%M%S)"
    STASHED=true
fi

# Pull 실행
log_info "변경사항 가져오는 중..."
if git pull origin $CURRENT_BRANCH 2>/dev/null || git pull origin main; then
    AFTER_COMMIT=$(git rev-parse --short HEAD)
    echo ""
    log_success "Pull 완료!"
    echo ""
    echo -e "  이전: ${YELLOW}$BEFORE_COMMIT${NC} - $BEFORE_COMMIT_MSG"
    echo -e "  현재: ${GREEN}$AFTER_COMMIT${NC} - $(git log -1 --pretty=format:'%s')"
else
    log_error "Pull 실패"
    exit 1
fi

# Stash 복원 안내
if [ "$STASHED" = true ]; then
    echo ""
    log_info "로컬 변경사항이 stash에 저장되었습니다"
    echo "  복원하려면: git stash pop"
fi

# 실행 권한 부여
chmod +x *.sh 2>/dev/null || true

# 빌드 필요 여부 확인
echo ""
echo "═══════════════════════════════════════════════════════════════"

# 소스 파일 변경 확인
if echo "$CHANGED_FILES" | grep -qE "\.(ts|tsx|js|jsx|css|json)$"; then
    log_warning "소스 파일이 변경되었습니다. 빌드가 필요할 수 있습니다."
    echo ""
    echo "  빌드 및 재시작: ./deploy-update.sh --skip-build 후 필요시 빌드"
    echo "  전체 업데이트:  ./deploy-update.sh"
else
    log_info "설정/문서 파일만 변경되었습니다. 빌드가 필요하지 않을 수 있습니다."
fi

echo ""
