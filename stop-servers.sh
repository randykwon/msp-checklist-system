#!/bin/bash

# MSP 체크리스트 서버 중지 스크립트

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
    echo -e "${PURPLE}🛑 $1${NC}"
}

# 프로세스 종료 함수
kill_process_on_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_info "$service_name (포트 $port) 종료 중..."
        
        # 프로세스 정보 출력
        local pids=$(lsof -ti:$port)
        for pid in $pids; do
            local process_info=$(ps -p $pid -o pid,ppid,cmd --no-headers 2>/dev/null || echo "프로세스 정보 없음")
            log_info "종료할 프로세스: $process_info"
            
            # 정상 종료 시도 (SIGTERM)
            kill -TERM $pid 2>/dev/null || true
            sleep 1
            
            # 여전히 실행 중이면 강제 종료 (SIGKILL)
            if ps -p $pid > /dev/null 2>&1; then
                log_warning "정상 종료 실패 - 강제 종료합니다"
                kill -9 $pid 2>/dev/null || true
            fi
        done
        
        # 종료 확인
        sleep 1
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_error "$service_name 종료 실패"
            return 1
        else
            log_success "$service_name 종료 완료"
            return 0
        fi
    else
        log_info "$service_name (포트 $port) 실행 중이지 않음"
        return 0
    fi
}

# 헤더 출력
clear
echo "=================================================="
log_header "MSP 체크리스트 서버 중지"
echo "=================================================="
echo ""

# 현재 시간 출력
CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
log_info "중지 시작 시간: $CURRENT_TIME"

echo ""
echo "=================================================="
log_header "현재 실행 중인 프로세스 확인"
echo "=================================================="
echo ""

# 현재 실행 중인 관련 프로세스 확인
PROCESSES=$(ps aux | grep -E "(next dev|npm.*dev|node.*next)" | grep -v grep || true)
if [ ! -z "$PROCESSES" ]; then
    log_info "실행 중인 개발 서버 프로세스:"
    echo "$PROCESSES"
else
    log_info "실행 중인 개발 서버 프로세스가 없습니다"
fi

# PID 파일 확인
echo ""
log_info "PID 파일 확인:"
if [ -f ".main-server.pid" ]; then
    MAIN_PID=$(cat .main-server.pid)
    if ps -p $MAIN_PID > /dev/null 2>&1; then
        log_info "메인 서버 PID: $MAIN_PID (실행 중)"
    else
        log_info "메인 서버 PID: $MAIN_PID (이미 종료됨)"
    fi
else
    log_info "메인 서버 PID 파일 없음"
fi

if [ -f ".admin-server.pid" ]; then
    ADMIN_PID=$(cat .admin-server.pid)
    if ps -p $ADMIN_PID > /dev/null 2>&1; then
        log_info "관리자 서버 PID: $ADMIN_PID (실행 중)"
    else
        log_info "관리자 서버 PID: $ADMIN_PID (이미 종료됨)"
    fi
else
    log_info "관리자 서버 PID 파일 없음"
fi

echo ""
echo "=================================================="
log_header "서버 프로세스 종료"
echo "=================================================="
echo ""

# 각 포트별 프로세스 종료
MAIN_STOP_OK=0
ADMIN_STOP_OK=0

kill_process_on_port 3010 "메인 서버" || MAIN_STOP_OK=1
echo ""
kill_process_on_port 3011 "관리자 서버" || ADMIN_STOP_OK=1

echo ""
log_info "추가 프로세스 정리 중..."

# Next.js 관련 프로세스 추가 정리
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

# PID 파일로 저장된 프로세스 종료
if [ -f ".main-server.pid" ]; then
    MAIN_PID=$(cat .main-server.pid)
    if ps -p $MAIN_PID > /dev/null 2>&1; then
        log_info "PID 파일의 메인 서버 프로세스 종료: $MAIN_PID"
        kill -TERM $MAIN_PID 2>/dev/null || kill -9 $MAIN_PID 2>/dev/null || true
    fi
    rm -f .main-server.pid
fi

if [ -f ".admin-server.pid" ]; then
    ADMIN_PID=$(cat .admin-server.pid)
    if ps -p $ADMIN_PID > /dev/null 2>&1; then
        log_info "PID 파일의 관리자 서버 프로세스 종료: $ADMIN_PID"
        kill -TERM $ADMIN_PID 2>/dev/null || kill -9 $ADMIN_PID 2>/dev/null || true
    fi
    rm -f .admin-server.pid
fi

log_info "프로세스 종료 대기 중..."
sleep 3

echo ""
echo "=================================================="
log_header "종료 결과 확인"
echo "=================================================="
echo ""

# 최종 확인
FINAL_CHECK_OK=1

# 포트 사용 상태 재확인
if lsof -Pi :3010 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_error "메인 서버 (포트 3010): 아직 실행 중"
    FINAL_CHECK_OK=0
else
    log_success "메인 서버 (포트 3010): 종료 완료"
fi

if lsof -Pi :3011 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_error "관리자 서버 (포트 3011): 아직 실행 중"
    FINAL_CHECK_OK=0
else
    log_success "관리자 서버 (포트 3011): 종료 완료"
fi

# 남은 프로세스 확인
REMAINING_PROCESSES=$(ps aux | grep -E "(next dev|npm.*dev|node.*next)" | grep -v grep || true)
if [ ! -z "$REMAINING_PROCESSES" ]; then
    log_warning "남은 관련 프로세스가 있습니다:"
    echo "$REMAINING_PROCESSES"
    FINAL_CHECK_OK=0
else
    log_success "모든 관련 프로세스가 종료되었습니다"
fi

echo ""
echo "=================================================="
log_header "종료 완료"
echo "=================================================="
echo ""

if [ $FINAL_CHECK_OK -eq 1 ]; then
    log_success "🎉 모든 서버가 성공적으로 중지되었습니다!"
else
    log_warning "일부 프로세스가 완전히 종료되지 않았을 수 있습니다"
    echo ""
    echo "💡 추가 정리가 필요한 경우:"
    echo "   🔍 남은 프로세스 확인: ps aux | grep -E '(next|npm)' | grep -v grep"
    echo "   🔧 수동 종료: kill -9 <PID>"
    echo "   🔌 포트 확인: lsof -i:3010 -i:3011"
fi

echo ""
echo "📊 서버 관리 명령어:"
echo "   🚀 서버 시작: ./restart-servers.sh"
echo "   📋 상태 확인: ./server-status.sh"
echo "   🔧 관리자만 시작: ./start-admin.sh"
echo ""

STOP_TIME=$(date '+%Y-%m-%d %H:%M:%S')
log_info "중지 완료 시간: $STOP_TIME"