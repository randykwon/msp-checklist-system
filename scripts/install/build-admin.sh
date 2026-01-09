#!/bin/bash
#===============================================================================
# MSP 어드바이저 - Admin 앱 빌드 스크립트
# 
# Admin 앱만 빌드합니다.
# Shared 패키지가 이미 빌드되어 있어야 합니다.
#
# 사용법:
#   ./scripts/install/build-admin.sh [옵션]
#
# 옵션:
#   --with-shared   Shared 패키지도 함께 빌드
#===============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SHARED_DIR="$PROJECT_ROOT/msp-checklist/packages/shared"
ADMIN_DIR="$PROJECT_ROOT/msp-checklist/admin"

# 옵션 파싱
WITH_SHARED=false
for arg in "$@"; do
    case $arg in
        --with-shared)
            WITH_SHARED=true
            ;;
    esac
done

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Shared 패키지 빌드 (옵션)
if [ "$WITH_SHARED" = true ]; then
    echo -e "${BLUE}[INFO]${NC} Shared 패키지 빌드 중..."
    cd "$SHARED_DIR"
    npm install
    npm run build
    echo -e "${GREEN}[✓]${NC} Shared 패키지 빌드 완료"
fi

# Shared 패키지 확인
if [ ! -d "$SHARED_DIR/dist" ]; then
    echo -e "${YELLOW}[WARN]${NC} Shared 패키지가 빌드되지 않았습니다."
    echo -e "${BLUE}[INFO]${NC} Shared 패키지 빌드 중..."
    cd "$SHARED_DIR"
    npm install
    npm run build
fi

# Admin 앱 빌드
echo -e "${BLUE}[INFO]${NC} Admin 앱 빌드 중..."
cd "$ADMIN_DIR"

# 의존성 설치
npm install

# Next.js 빌드
npm run build

echo -e "${GREEN}[✓]${NC} Admin 앱 빌드 완료"
echo ""
echo "  서버 시작: ./scripts/server-admin.sh start"
echo ""
