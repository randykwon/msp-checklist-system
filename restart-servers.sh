#!/bin/bash

# MSP 체크리스트 전체 서버 재시작 스크립트
# 메인 서버(3010)와 관리자 서버(3011) 모두 재시작

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
    echo -e "${PURPLE}🔄 $1${NC}"
}

# 프로세스 종료 함수
kill_process_on_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "$service_name (포트 $port) 실행 중 - 종료합니다"
        
        # 프로세스 정보 출력
        local pids=$(lsof -ti:$port)
        for pid in $pids; do
            local process_info=$(ps -p $pid -o pid,ppid,cmd --no-headers 2>/dev/null || echo "프로세스 정보 없음")
            log_info "종료할 프로세스: $process_info"
            kill -TERM $pid 2>/dev/null || kill -9 $pid 2>/dev/null || true
        done
        
        # 종료 확인
        sleep 2
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "정상 종료 실패 - 강제 종료합니다"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        
        log_success "$service_name 종료 완료"
    else
        log_info "$service_name (포트 $port) 실행 중이지 않음"
    fi
}

# 서버 상태 확인 함수
check_server_status() {
    local port=$1
    local service_name=$2
    local endpoint=$3
    
    log_info "$service_name 상태 확인 중..."
    
    # 최대 30초 대기
    for i in {1..30}; do
        if curl -s --connect-timeout 2 "http://localhost:$port$endpoint" > /dev/null 2>&1; then
            log_success "$service_name (포트 $port): 정상 실행 중"
            return 0
        fi
        sleep 1
    done
    
    log_error "$service_name (포트 $port): 실행 실패 또는 응답 없음"
    return 1
}

# 헤더 출력
clear
echo "=================================================="
log_header "MSP 체크리스트 전체 서버 재시작"
echo "=================================================="
echo ""

# 현재 디렉토리 확인
CURRENT_DIR=$(pwd)
log_info "현재 디렉토리: $CURRENT_DIR"

# 필수 디렉토리 확인
if [ ! -d "msp-checklist" ]; then
    log_error "메인 서비스 디렉토리를 찾을 수 없습니다: msp-checklist"
    exit 1
fi

if [ ! -d "msp-checklist/admin" ]; then
    log_error "관리자 시스템 디렉토리를 찾을 수 없습니다: msp-checklist/admin"
    exit 1
fi

echo ""
echo "=================================================="
log_header "기존 서버 프로세스 종료"
echo "=================================================="
echo ""

# 현재 실행 중인 관련 프로세스 확인
log_info "현재 실행 중인 서버 프로세스 확인..."
PROCESSES=$(ps aux | grep -E "(next dev|npm.*dev)" | grep -v grep || true)
if [ ! -z "$PROCESSES" ]; then
    echo "$PROCESSES"
else
    log_info "실행 중인 개발 서버가 없습니다"
fi

echo ""

# 각 포트별 프로세스 종료
kill_process_on_port 3010 "메인 서버"
kill_process_on_port 3011 "관리자 서버"

# 추가 정리 - Next.js 관련 프로세스
log_info "Next.js 관련 프로세스 정리 중..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

log_info "프로세스 정리 대기 중..."
sleep 3

echo ""
echo "=================================================="
log_header "서버 시작"
echo "=================================================="
echo ""

# 메인 서버 시작
log_info "메인 서버 시작 중 (포트 3010)..."
cd msp-checklist

# 의존성 확인
if [ ! -d "node_modules" ]; then
    log_warning "메인 서버 의존성 설치 중..."
    npm install
fi

# 메인 서버 백그라운드 실행
nohup npm run dev > ../server.log 2>&1 &
MAIN_PID=$!
log_success "메인 서버 시작됨 (PID: $MAIN_PID)"

# 관리자 서버 시작
log_info "관리자 서버 시작 중 (포트 3011)..."
cd admin

# 의존성 확인
if [ ! -d "node_modules" ]; then
    log_warning "관리자 서버 의존성 설치 중..."
    npm install
fi

# 관리자 서버 백그라운드 실행
nohup npm run dev > ../../admin-server.log 2>&1 &
ADMIN_PID=$!
log_success "관리자 서버 시작됨 (PID: $ADMIN_PID)"

cd ../..

# PID 파일 저장
echo $MAIN_PID > .main-server.pid
echo $ADMIN_PID > .admin-server.pid

echo ""
echo "=================================================="
log_header "서버 상태 확인"
echo "=================================================="
echo ""

log_info "서버 시작 대기 중..."
sleep 5

# 서버 상태 확인
MAIN_STATUS=0
ADMIN_STATUS=0

check_server_status 3010 "메인 서버" "/" || MAIN_STATUS=1
check_server_status 3011 "관리자 서버" "/" || ADMIN_STATUS=1

echo ""
echo "=================================================="
log_header "재시작 완료"
echo "=================================================="
echo ""

if [ $MAIN_STATUS -eq 0 ] && [ $ADMIN_STATUS -eq 0 ]; then
    log_success "🎉 모든 서버가 성공적으로 시작되었습니다!"
else
    log_warning "일부 서버에 문제가 있을 수 있습니다"
fi

echo ""
echo "📱 서비스 접속 주소:"
echo "   🌐 메인 서비스: http://localhost:3010"
echo "   🔧 관리자 시스템: http://localhost:3011"
echo ""
echo "📊 서버 관리:"
echo "   🔍 메인 서버 로그: tail -f server.log"
echo "   🔍 관리자 서버 로그: tail -f admin-server.log"
echo "   📋 서버 상태 확인: ./server-status.sh"
echo "   🛑 서버 중지: ./stop-servers.sh"
echo ""
echo "💡 팁:"
echo "   - 로그 파일을 통해 서버 상태를 모니터링하세요"
echo "   - 문제 발생 시 로그를 확인한 후 재시작하세요"
echo "   - 개발 중에는 각 서버를 개별적으로 실행하는 것을 권장합니다"
echo ""

# 백그라운드 실행 안내
log_info "서버들이 백그라운드에서 실행 중입니다"
log_info "터미널을 닫아도 서버는 계속 실행됩니다"