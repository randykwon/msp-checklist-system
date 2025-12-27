#!/bin/bash

# MSP Checklist - GitHub 변경사항만 다운로드
# 사용법: sudo ./pull-changes.sh

set -o pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} ⚠️ $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} ❌ $1"; }

# 프로젝트 디렉토리
PROJECT_DIR="/opt/msp-checklist-system"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   GitHub 변경사항 다운로드${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# 프로젝트 디렉토리 확인
if [ ! -d "$PROJECT_DIR/.git" ]; then
    log_error "Git 저장소가 없습니다: $PROJECT_DIR"
    log_info "전체 설치를 먼저 실행하세요: sudo ./msp-deployment-suite-refined.sh"
    exit 1
fi

cd "$PROJECT_DIR"

# 현재 상태 저장
BEFORE_COMMIT=$(git rev-parse --short HEAD)
log_info "현재 버전: $BEFORE_COMMIT"

# 로컬 변경사항 처리
if [ -n "$(git status --porcelain)" ]; then
    log_warning "로컬 변경사항 발견 - stash 처리"
    git stash
fi

# 원격 저장소 fetch
log_info "원격 저장소 확인 중..."
git fetch origin

# 변경사항 비교
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log_success "이미 최신 버전입니다!"
    exit 0
fi

# 변경된 파일 표시
echo ""
log_info "변경된 파일:"
git diff --name-only HEAD origin/main | while read file; do
    echo "  📄 $file"
done
echo ""

# Pull 실행
log_info "변경사항 다운로드 중..."
git pull origin main

# 결과 표시
AFTER_COMMIT=$(git rev-parse --short HEAD)
log_success "업데이트 완료: $BEFORE_COMMIT → $AFTER_COMMIT"

# 실행 권한 부여
chmod +x *.sh 2>/dev/null || true

echo ""
log_info "빌드가 필요하면 실행하세요: sudo ./update-and-build.sh"
echo ""
