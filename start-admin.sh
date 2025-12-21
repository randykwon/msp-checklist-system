#!/bin/bash

# MSP 헬퍼 관리자 시스템 시작 스크립트
# 포트 3011에서 실행

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}🔒 $1${NC}"
}

# 헤더 출력
clear
echo "=================================================="
log_header "MSP 헬퍼 관리자 시스템 시작"
echo "=================================================="
echo ""

# 현재 디렉토리 확인
CURRENT_DIR=$(pwd)
log_info "현재 디렉토리: $CURRENT_DIR"

# 관리자 디렉토리 존재 확인
if [ ! -d "msp-checklist/admin" ]; then
    log_error "관리자 디렉토리를 찾을 수 없습니다: msp-checklist/admin"
    log_info "올바른 프로젝트 루트 디렉토리에서 실행해주세요"
    exit 1
fi

# 포트 3011 사용 중인지 확인
if lsof -Pi :3011 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "포트 3011이 이미 사용 중입니다"
    log_info "기존 프로세스를 종료합니다..."
    
    # 포트 사용 중인 프로세스 정보 출력
    PID=$(lsof -ti:3011)
    if [ ! -z "$PID" ]; then
        PROCESS_INFO=$(ps -p $PID -o pid,ppid,cmd --no-headers 2>/dev/null || echo "프로세스 정보 없음")
        log_info "종료할 프로세스: $PROCESS_INFO"
        kill -9 $PID 2>/dev/null || true
        sleep 2
    fi
fi

# 관리자 디렉토리로 이동
cd msp-checklist/admin
log_info "관리자 디렉토리로 이동: $(pwd)"

# package.json 존재 확인
if [ ! -f "package.json" ]; then
    log_error "package.json을 찾을 수 없습니다"
    exit 1
fi

# Node.js 버전 확인
NODE_VERSION=$(node --version 2>/dev/null || echo "설치되지 않음")
NPM_VERSION=$(npm --version 2>/dev/null || echo "설치되지 않음")
log_info "Node.js 버전: $NODE_VERSION"
log_info "NPM 버전: $NPM_VERSION"

# 의존성 설치 확인
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    log_warning "의존성이 설치되지 않았거나 업데이트가 필요합니다"
    log_info "의존성 설치 중..."
    
    if npm install; then
        log_success "의존성 설치 완료"
    else
        log_error "의존성 설치 실패"
        exit 1
    fi
else
    log_success "의존성이 이미 설치되어 있습니다"
fi

# 환경 변수 확인
if [ -f ".env.local" ]; then
    log_success "환경 설정 파일 확인됨: .env.local"
else
    log_warning "환경 설정 파일이 없습니다: .env.local"
    log_info "필요한 경우 .env.local.example을 참고하여 생성하세요"
fi

# 메인 서버 연결 확인
log_info "메인 서버 연결 상태 확인 중..."
if curl -s --connect-timeout 3 http://localhost:3010/api/auth/me > /dev/null 2>&1; then
    log_success "메인 서버 (포트 3010) 연결 확인됨"
else
    log_warning "메인 서버 (포트 3010)에 연결할 수 없습니다"
    log_info "관리자 시스템이 정상 작동하려면 메인 서버가 실행 중이어야 합니다"
fi

echo ""
echo "=================================================="
log_header "관리자 서버 시작"
echo "=================================================="
echo ""

# 서버 시작 정보 출력
log_info "서버 설정:"
echo "  📍 포트: 3011"
echo "  🌐 접속 주소: http://localhost:3011"
echo "  🔐 권한: 관리자 계정만 접근 가능"
echo "  📁 작업 디렉토리: $(pwd)"
echo ""

log_info "서버 시작 중..."
echo ""

# 개발 서버 시작
log_success "🚀 관리자 시스템이 시작되었습니다!"
echo ""
echo "=================================================="
echo "  📱 관리자 시스템: http://localhost:3011"
echo "  🔑 관리자 권한이 있는 계정으로 로그인하세요"
echo "  🛑 서버 중지: Ctrl+C"
echo "=================================================="
echo ""

# 서버 시작 (로그 출력과 함께)
exec npm run dev