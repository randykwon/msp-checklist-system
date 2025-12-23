#!/bin/bash

# Amazon Linux 2023 일반적인 문제 해결 스크립트
# 배포 중 발생할 수 있는 일반적인 문제들을 자동으로 해결합니다.

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

echo -e "${BLUE}MSP Checklist - Amazon Linux 2023 문제 해결 스크립트${NC}"
echo "============================================================"
echo ""

# 1. npm 설정 최적화
log_info "1. npm 설정 최적화 중..."
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
npm config set registry https://registry.npmjs.org/
npm config set fund false
npm config set audit false
log_success "npm 설정 최적화 완료"

# 2. Node.js 메모리 설정
log_info "2. Node.js 메모리 설정 중..."
export NODE_OPTIONS="--max-old-space-size=2048"
echo 'export NODE_OPTIONS="--max-old-space-size=2048"' >> ~/.bashrc
log_success "Node.js 메모리 설정 완료"

# 3. 기존 설치 정리
log_info "3. 기존 설치 정리 중..."
if [ -d "msp-checklist/node_modules" ]; then
    log_info "메인 앱 node_modules 정리 중..."
    rm -rf msp-checklist/node_modules msp-checklist/package-lock.json
fi

if [ -d "msp-checklist/admin/node_modules" ]; then
    log_info "관리자 앱 node_modules 정리 중..."
    rm -rf msp-checklist/admin/node_modules msp-checklist/admin/package-lock.json
fi

# npm 캐시 정리
npm cache clean --force
log_success "기존 설치 정리 완료"

# 4. 시스템 의존성 확인 및 설치
log_info "4. 시스템 의존성 확인 중..."

# Python 및 빌드 도구 확인
if ! command -v python3 &> /dev/null; then
    log_info "Python3 설치 중..."
    sudo dnf install -y python3 python3-pip
fi

if ! command -v gcc &> /dev/null; then
    log_info "빌드 도구 설치 중..."
    sudo dnf groupinstall -y "Development Tools"
fi

# SQLite 개발 라이브러리 설치 (better-sqlite3용)
sudo dnf install -y sqlite-devel

log_success "시스템 의존성 확인 완료"

# 5. 의존성 재설치 (재시도 로직 포함)
log_info "5. 의존성 재설치 중..."

# 루트 프로젝트 의존성
log_info "루트 프로젝트 의존성 설치 중..."
RETRY_COUNT=0
MAX_RETRIES=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npm install; then
        log_success "루트 프로젝트 의존성 설치 완료"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_warning "설치 실패. 5초 후 재시도... ($RETRY_COUNT/$MAX_RETRIES)"
            sleep 5
            npm cache clean --force
        else
            log_error "루트 프로젝트 의존성 설치 실패"
            exit 1
        fi
    fi
done

# 메인 앱 의존성
log_info "메인 앱 의존성 설치 중..."
cd msp-checklist

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npm install --no-optional --legacy-peer-deps; then
        log_success "메인 앱 의존성 설치 완료"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_warning "설치 실패. 5초 후 재시도... ($RETRY_COUNT/$MAX_RETRIES)"
            sleep 5
            npm cache clean --force
        else
            log_error "메인 앱 의존성 설치 실패"
            exit 1
        fi
    fi
done

# 관리자 앱 의존성
log_info "관리자 앱 의존성 설치 중..."
cd admin

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npm install --no-optional --legacy-peer-deps; then
        log_success "관리자 앱 의존성 설치 완료"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_warning "설치 실패. 5초 후 재시도... ($RETRY_COUNT/$MAX_RETRIES)"
            sleep 5
            npm cache clean --force
        else
            log_error "관리자 앱 의존성 설치 실패"
            exit 1
        fi
    fi
done

cd ../..

# 6. 환경 변수 파일 생성
log_info "6. 환경 변수 파일 확인 중..."

if [ ! -f "msp-checklist/.env.local" ]; then
    if [ -f "msp-checklist/.env.local.example" ]; then
        cp msp-checklist/.env.local.example msp-checklist/.env.local
        log_success "메인 앱 환경 변수 파일 생성"
    else
        log_warning "메인 앱 .env.local.example 파일이 없습니다."
    fi
fi

if [ ! -f "msp-checklist/admin/.env.local" ]; then
    if [ -f "msp-checklist/admin/.env.local.example" ]; then
        cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local
        log_success "관리자 앱 환경 변수 파일 생성"
    else
        log_warning "관리자 앱 .env.local.example 파일이 없습니다."
    fi
fi

# 7. 빌드 테스트
log_info "7. 빌드 테스트 중..."

cd msp-checklist

# 메인 앱 빌드
log_info "메인 앱 빌드 중..."
if npm run build; then
    log_success "메인 앱 빌드 성공"
else
    log_error "메인 앱 빌드 실패"
    exit 1
fi

# 관리자 앱 빌드
log_info "관리자 앱 빌드 중..."
cd admin
if npm run build; then
    log_success "관리자 앱 빌드 성공"
else
    log_error "관리자 앱 빌드 실패"
    exit 1
fi

cd ../..

# 8. 권한 설정
log_info "8. 권한 설정 중..."
chmod +x *.sh 2>/dev/null || true
chmod +x deploy/*.sh 2>/dev/null || true
chmod 664 msp-checklist/*.db 2>/dev/null || true
chmod 664 msp-checklist/admin/*.db 2>/dev/null || true
log_success "권한 설정 완료"

# 9. 포트 확인
log_info "9. 포트 사용 확인 중..."
if netstat -tlnp | grep -q ":3010"; then
    log_warning "포트 3010이 이미 사용 중입니다."
    echo "사용 중인 프로세스:"
    netstat -tlnp | grep ":3010"
fi

if netstat -tlnp | grep -q ":3011"; then
    log_warning "포트 3011이 이미 사용 중입니다."
    echo "사용 중인 프로세스:"
    netstat -tlnp | grep ":3011"
fi

# 10. 시스템 리소스 확인
log_info "10. 시스템 리소스 확인 중..."
echo "메모리 사용량:"
free -h
echo ""
echo "디스크 사용량:"
df -h
echo ""

# 메모리 부족 경고
AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEM" -lt 1024 ]; then
    log_warning "사용 가능한 메모리가 1GB 미만입니다 (${AVAILABLE_MEM}MB)."
    log_warning "빌드 중 메모리 부족 오류가 발생할 수 있습니다."
fi

# 11. 테스트 실행
log_info "11. 간단한 테스트 실행 중..."

cd msp-checklist

# Node.js 버전 확인
NODE_VERSION=$(node --version)
if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
    log_error "Node.js 버전이 20.9.0 미만입니다: $NODE_VERSION"
    exit 1
else
    log_success "Node.js 버전 확인: $NODE_VERSION"
fi

# 패키지 설치 확인
if [ -d "node_modules" ] && [ -d "admin/node_modules" ]; then
    log_success "모든 의존성이 정상적으로 설치되었습니다."
else
    log_error "의존성 설치가 완전하지 않습니다."
    exit 1
fi

cd ..

# 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                문제 해결 완료! ✅                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "Amazon Linux 2023 환경에서 MSP Checklist 배포 준비가 완료되었습니다!"

echo ""
echo "다음 단계:"
echo "1. 서버 시작: cd msp-checklist && npm run dev"
echo "2. 또는 프로덕션 배포: ./deploy/amazon-linux-2023-deploy.sh"
echo "3. 브라우저에서 http://your-server-ip:3010 접속"

echo ""
echo "문제가 계속 발생하는 경우:"
echo "- 로그 확인: tail -f server.log"
echo "- 메모리 확인: free -h"
echo "- 포트 확인: netstat -tlnp | grep :301"
echo "- 이 스크립트 재실행: ./deploy/fix-amazon-linux-issues.sh"

echo ""
log_success "배포 준비 완료! 🚀"