#!/bin/bash

# MSP 체크리스트 서버 상태 확인 스크립트

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
    echo -e "${PURPLE}📊 $1${NC}"
}

# 서버 응답 확인 함수
check_server_response() {
    local port=$1
    local service_name=$2
    local endpoint=${3:-"/"}
    
    if curl -s --connect-timeout 3 --max-time 5 "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        log_success "$service_name (포트 $port): 응답 정상"
        return 0
    else
        log_error "$service_name (포트 $port): 응답 없음"
        return 1
    fi
}

# 포트 사용 확인 함수
check_port_usage() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        local process_info=$(ps -p $pid -o pid,ppid,cmd --no-headers 2>/dev/null || echo "프로세스 정보 없음")
        log_success "$service_name (포트 $port): 사용 중"
        echo "     PID: $pid"
        echo "     프로세스: $process_info"
        return 0
    else
        log_error "$service_name (포트 $port): 사용 안함"
        return 1
    fi
}

# 파일 상태 확인 함수
check_file_status() {
    local file_path=$1
    local file_name=$2
    
    if [ -f "$file_path" ]; then
        local file_size=$(ls -lh "$file_path" | awk '{print $5}')
        local file_date=$(ls -l "$file_path" | awk '{print $6, $7, $8}')
        log_success "$file_name: 존재 (크기: $file_size, 수정: $file_date)"
        return 0
    else
        log_warning "$file_name: 없음"
        return 1
    fi
}

# 헤더 출력
clear
echo "=================================================="
log_header "MSP 체크리스트 서버 상태 확인"
echo "=================================================="
echo ""

# 현재 시간 출력
CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
log_info "확인 시간: $CURRENT_TIME"
log_info "현재 디렉토리: $(pwd)"

echo ""
echo "=================================================="
log_header "포트 사용 상태"
echo "=================================================="
echo ""

MAIN_PORT_OK=0
ADMIN_PORT_OK=0

check_port_usage 3010 "메인 서버" || MAIN_PORT_OK=1
echo ""
check_port_usage 3011 "관리자 서버" || ADMIN_PORT_OK=1

echo ""
echo "=================================================="
log_header "서버 응답 확인"
echo "=================================================="
echo ""

MAIN_RESPONSE_OK=0
ADMIN_RESPONSE_OK=0

check_server_response 3010 "메인 서버" "/" || MAIN_RESPONSE_OK=1
check_server_response 3011 "관리자 서버" "/" || ADMIN_RESPONSE_OK=1

# API 엔드포인트 추가 확인
echo ""
log_info "API 엔드포인트 상세 확인:"
if curl -s --connect-timeout 2 --max-time 3 "http://localhost:3010/api/auth/me" > /dev/null 2>&1; then
    log_success "메인 서버 API: 정상 응답"
else
    log_warning "메인 서버 API: 응답 없음 (로그인 필요할 수 있음)"
fi

echo ""
echo "=================================================="
log_header "실행 중인 프로세스"
echo "=================================================="
echo ""

# Next.js 관련 프로세스 확인
PROCESSES=$(ps aux | grep -E "(next dev|npm.*dev|node.*next)" | grep -v grep || true)
if [ ! -z "$PROCESSES" ]; then
    log_success "실행 중인 개발 서버 프로세스:"
    echo "$PROCESSES" | while read line; do
        echo "  $line"
    done
else
    log_warning "실행 중인 개발 서버 프로세스 없음"
fi

# PID 파일 확인
echo ""
log_info "PID 파일 확인:"
if [ -f ".main-server.pid" ]; then
    MAIN_PID=$(cat .main-server.pid)
    if ps -p $MAIN_PID > /dev/null 2>&1; then
        log_success "메인 서버 PID: $MAIN_PID (실행 중)"
    else
        log_warning "메인 서버 PID: $MAIN_PID (종료됨)"
    fi
else
    log_info "메인 서버 PID 파일 없음"
fi

if [ -f ".admin-server.pid" ]; then
    ADMIN_PID=$(cat .admin-server.pid)
    if ps -p $ADMIN_PID > /dev/null 2>&1; then
        log_success "관리자 서버 PID: $ADMIN_PID (실행 중)"
    else
        log_warning "관리자 서버 PID: $ADMIN_PID (종료됨)"
    fi
else
    log_info "관리자 서버 PID 파일 없음"
fi

echo ""
echo "=================================================="
log_header "데이터베이스 상태"
echo "=================================================="
echo ""

check_file_status "msp-checklist/msp-assessment.db" "메인 데이터베이스"
check_file_status "msp-checklist/advice-cache.db" "조언 캐시 데이터베이스"
check_file_status "msp-checklist/virtual-evidence-cache.db" "가상증빙 캐시 데이터베이스"

echo ""
echo "=================================================="
log_header "로그 파일 상태"
echo "=================================================="
echo ""

if check_file_status "server.log" "메인 서버 로그"; then
    LOG_LINES=$(wc -l < server.log 2>/dev/null || echo "0")
    echo "     총 줄 수: $LOG_LINES"
    if [ $LOG_LINES -gt 0 ]; then
        echo "     최근 로그 (마지막 3줄):"
        tail -3 server.log 2>/dev/null | sed 's/^/       /' || echo "       로그 읽기 실패"
    fi
fi

echo ""

if check_file_status "admin-server.log" "관리자 서버 로그"; then
    ADMIN_LOG_LINES=$(wc -l < admin-server.log 2>/dev/null || echo "0")
    echo "     총 줄 수: $ADMIN_LOG_LINES"
    if [ $ADMIN_LOG_LINES -gt 0 ]; then
        echo "     최근 로그 (마지막 3줄):"
        tail -3 admin-server.log 2>/dev/null | sed 's/^/       /' || echo "       로그 읽기 실패"
    fi
fi

echo ""
echo "=================================================="
log_header "전체 상태 요약"
echo "=================================================="
echo ""

# 전체 상태 판단
OVERALL_STATUS="정상"
STATUS_COLOR=$GREEN

if [ $MAIN_PORT_OK -ne 0 ] || [ $MAIN_RESPONSE_OK -ne 0 ]; then
    log_error "메인 서버: 문제 있음"
    OVERALL_STATUS="문제 있음"
    STATUS_COLOR=$RED
else
    log_success "메인 서버: 정상"
fi

if [ $ADMIN_PORT_OK -ne 0 ] || [ $ADMIN_RESPONSE_OK -ne 0 ]; then
    log_error "관리자 서버: 문제 있음"
    OVERALL_STATUS="문제 있음"
    STATUS_COLOR=$RED
else
    log_success "관리자 서버: 정상"
fi

echo ""
echo -e "${STATUS_COLOR}🎯 전체 상태: $OVERALL_STATUS${NC}"

echo ""
echo "=================================================="
log_header "서비스 정보"
echo "=================================================="
echo ""
echo "📱 접속 주소:"
echo "   🌐 메인 서비스: http://localhost:3010"
echo "   🔧 관리자 시스템: http://localhost:3011"
echo ""
echo "📊 관리 명령어:"
echo "   🔄 서버 재시작: ./restart-servers.sh"
echo "   🛑 서버 중지: ./stop-servers.sh"
echo "   🔍 실시간 로그: tail -f server.log"
echo "   🔍 관리자 로그: tail -f admin-server.log"
echo ""

if [ "$OVERALL_STATUS" != "정상" ]; then
    echo "💡 문제 해결 방법:"
    echo "   1. 서버 재시작: ./restart-servers.sh"
    echo "   2. 로그 확인: tail -f server.log"
    echo "   3. 포트 충돌 확인: lsof -i:3010 -i:3011"
    echo "   4. 프로세스 수동 종료 후 재시작"
    echo ""
fi