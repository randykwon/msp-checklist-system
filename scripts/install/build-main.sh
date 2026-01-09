#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 메인 앱 빌드 스크립트
# 
# 메인 앱만 빌드합니다.
#
# 사용법:
#   ./scripts/install/build-main.sh
#===============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MSP_DIR="$PROJECT_ROOT/msp-checklist"

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo -e "${BLUE}[INFO]${NC} 메인 앱 빌드 중..."
cd "$MSP_DIR"

# 의존성 설치
npm install

# Next.js 빌드
npm run build

echo -e "${GREEN}[✓]${NC} 메인 앱 빌드 완료"
echo ""
echo "  서버 시작: ./scripts/server-main.sh start"
echo ""
