#!/bin/bash

# MSP Checklist 서버 설치 스크립트
# EC2 환경에서 안전하게 의존성을 설치합니다.

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
echo "║         MSP Checklist 서버 설치 스크립트                  ║"
echo "║                                                            ║"
echo "║  Node.js 20.9.0 환경에 최적화된 의존성 설치               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Node.js 버전 확인
NODE_VERSION=$(node --version)
log_info "현재 Node.js 버전: $NODE_VERSION"

if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
    log_error "Node.js 20.9.0 이상이 필요합니다. 현재 버전: $NODE_VERSION"
    exit 1
fi

# npm 설정 최적화
log_info "npm 설정 최적화 중..."
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
npm config set registry https://registry.npmjs.org/

# 기존 설치 정리
log_info "기존 설치 파일 정리 중..."
rm -rf node_modules package-lock.json

# npm 캐시 정리
log_info "npm 캐시 정리 중..."
npm cache clean --force

# 의존성 설치 (여러 시도)
log_info "의존성 설치 시작..."

INSTALL_SUCCESS=false
MAX_ATTEMPTS=3

for attempt in $(seq 1 $MAX_ATTEMPTS); do
    log_info "설치 시도 $attempt/$MAX_ATTEMPTS..."
    
    if npm install --no-optional --legacy-peer-deps; then
        INSTALL_SUCCESS=true
        break
    else
        log_warning "설치 시도 $attempt 실패. 재시도 중..."
        sleep 5
        
        # 캐시 다시 정리
        npm cache clean --force
        rm -rf node_modules package-lock.json
    fi
done

if [ "$INSTALL_SUCCESS" = false ]; then
    log_error "모든 설치 시도가 실패했습니다."
    log_info "수동 설치를 시도해보세요:"
    echo "  npm install --no-optional --legacy-peer-deps --verbose"
    exit 1
fi

log_success "의존성 설치 완료!"

# 설치 검증
log_info "설치 검증 중..."
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    log_success "설치 검증 완료"
else
    log_error "설치 검증 실패"
    exit 1
fi

# Next.js 빌드 테스트
log_info "Next.js 빌드 테스트 중..."
if npm run build; then
    log_success "빌드 테스트 성공"
else
    log_warning "빌드 테스트 실패 - 런타임에서 다시 시도하세요"
fi

echo ""
log_success "MSP Checklist 서버 설치가 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 환경 변수 설정: cp .env.local.example .env.local"
echo "2. 환경 변수 편집: nano .env.local"
echo "3. 서버 시작: cd .. && ./restart-server.sh"
echo ""