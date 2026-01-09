#!/bin/bash
#===============================================================================
# MSP 어드바이저 - Shared 패키지 빌드 스크립트
# 
# @msp/shared 패키지만 빌드합니다.
# Admin 앱에서 shared 패키지 변경 후 빠르게 빌드할 때 사용합니다.
#
# 사용법:
#   ./scripts/install/build-shared.sh
#===============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SHARED_DIR="$PROJECT_ROOT/msp-checklist/packages/shared"

echo -e "${BLUE}[INFO]${NC} Shared 패키지 빌드 중..."

# nvm 로드 및 Node.js 20 확인
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
    elif [ -s "/root/.nvm/nvm.sh" ]; then
        export NVM_DIR="/root/.nvm"
        \. "$NVM_DIR/nvm.sh"
    fi
    
    if command -v nvm &> /dev/null; then
        nvm use 20 &> /dev/null || nvm use default &> /dev/null || true
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_MAJOR" -lt 20 ]; then
            echo -e "${BLUE}[INFO]${NC} Node.js 20 설치 중..."
            nvm install 20
            nvm use 20
        fi
    fi
    echo -e "${BLUE}[INFO]${NC} Node.js 버전: $(node -v)"
}

load_nvm

cd "$SHARED_DIR"

# 의존성 설치 (필요시)
if [ ! -d "node_modules" ]; then
    npm install
fi

# TypeScript 빌드
npm run build

echo -e "${GREEN}[✓]${NC} Shared 패키지 빌드 완료"
echo ""
echo "  빌드 결과: $SHARED_DIR/dist"
echo ""
