#!/bin/bash

# MSP Checklist 자동 배포 데몬
# GitHub 변경사항을 주기적으로 확인하고 자동 빌드/배포
# 
# 사용법:
#   시작: sudo ./auto-deploy-daemon.sh start
#   중지: sudo ./auto-deploy-daemon.sh stop
#   상태: sudo ./auto-deploy-daemon.sh status
#   로그: sudo ./auto-deploy-daemon.sh logs

set -o pipefail

# 설정
PROJECT_DIR="/opt/msp-checklist-system"
CHECK_INTERVAL=10  # 초 단위
LOG_FILE="/var/log/msp-auto-deploy.log"
PID_FILE="/var/run/msp-auto-deploy.pid"
DAEMON_NAME="msp-auto-deploy"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로깅 함수
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    if [ "$DAEMON_MODE" != "true" ]; then
        case $level in
            INFO) echo -e "${BLUE}[$timestamp]${NC} $message" ;;
            SUCCESS) echo -e "${GREEN}[$timestamp]${NC} ✅ $message" ;;
            WARNING) echo -e "${YELLOW}[$timestamp]${NC} ⚠️ $message" ;;
            ERROR) echo -e "${RED}[$timestamp]${NC} ❌ $message" ;;
        esac
    fi
}

# GitHub 변경사항 확인
check_for_updates() {
    cd "$PROJECT_DIR" || return 1
    
    # fetch만 수행 (pull 없이)
    git fetch origin 2>/dev/null
    
    # 로컬과 원격 커밋 비교
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse origin/main 2>/dev/null)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        return 0  # 변경사항 있음
    else
        return 1  # 변경사항 없음
    fi
}

# 업데이트 및 빌드 수행
perform_update() {
    cd "$PROJECT_DIR" || return 1
    
    log "INFO" "변경사항 감지됨. 업데이트 시작..."
    
    # 현재 커밋 저장
    local before_commit=$(git rev-parse --short HEAD)
    
    # Pull 수행
    if ! git pull origin main >> "$LOG_FILE" 2>&1; then
        log "ERROR" "Git pull 실패"
        return 1
    fi
    
    local after_commit=$(git rev-parse --short HEAD)
    log "SUCCESS" "Pull 완료: $before_commit → $after_commit"
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null
    
    # PM2 프로세스 중지
    log "INFO" "서비스 중지 중..."
    pm2 stop all >> "$LOG_FILE" 2>&1 || true
    
    # 메인 앱 빌드
    log "INFO" "메인 앱 빌드 중..."
    cd "$PROJECT_DIR/msp-checklist"
    
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 의존성 업데이트
    if [ -f "package-lock.json" ]; then
        npm ci --omit=optional >> "$LOG_FILE" 2>&1 || npm install --omit=optional --legacy-peer-deps >> "$LOG_FILE" 2>&1
    else
        npm install --omit=optional --legacy-peer-deps >> "$LOG_FILE" 2>&1
    fi
    
    # 빌드
    if npm run build >> "$LOG_FILE" 2>&1; then
        log "SUCCESS" "메인 앱 빌드 성공"
    else
        log "ERROR" "메인 앱 빌드 실패"
        # 빌드 실패해도 서비스는 재시작
    fi
    
    # Admin 앱 빌드
    if [ -d "admin" ]; then
        log "INFO" "Admin 앱 빌드 중..."
        cd admin
        
        if [ -f "package-lock.json" ]; then
            npm ci --omit=optional >> "$LOG_FILE" 2>&1 || npm install --omit=optional --legacy-peer-deps >> "$LOG_FILE" 2>&1
        else
            npm install --omit=optional --legacy-peer-deps >> "$LOG_FILE" 2>&1
        fi
        
        if npm run build >> "$LOG_FILE" 2>&1; then
            log "SUCCESS" "Admin 앱 빌드 성공"
        else
            log "WARNING" "Admin 앱 빌드 실패"
        fi
        cd ..
    fi
    
    # PM2 프로세스 시작
    log "INFO" "서비스 시작 중..."
    cd "$PROJECT_DIR"
    
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1
    else
        cd msp-checklist
        pm2 start npm --name "msp-checklist-main" -- start >> "$LOG_FILE" 2>&1
        if [ -d "admin" ]; then
            cd admin
            pm2 start npm --name "msp-checklist-admin" -- start >> "$LOG_FILE" 2>&1
        fi
    fi
    
    pm2 save >> "$LOG_FILE" 2>&1
    
    # Nginx 재시작
    systemctl restart nginx >> "$LOG_FILE" 2>&1 || true
    
    log "SUCCESS" "배포 완료!"
    return 0
}

# 데몬 메인 루프
daemon_loop() {
    log "INFO" "자동 배포 데몬 시작 (체크 간격: ${CHECK_INTERVAL}초)"
    
    while true; do
        if check_for_updates; then
            perform_update
        fi
        sleep $CHECK_INTERVAL
    done
}

# 데몬 시작
start_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}데몬이 이미 실행 중입니다 (PID: $pid)${NC}"
            return 1
        fi
    fi
    
    # 로그 디렉토리 생성
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    echo -e "${GREEN}자동 배포 데몬 시작 중...${NC}"
    
    # 백그라운드로 실행
    DAEMON_MODE=true nohup bash -c "
        export DAEMON_MODE=true
        source '$0'
        daemon_loop
    " >> "$LOG_FILE" 2>&1 &
    
    local pid=$!
    echo $pid > "$PID_FILE"
    
    sleep 1
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 데몬 시작됨 (PID: $pid)${NC}"
        echo -e "${BLUE}로그 확인: tail -f $LOG_FILE${NC}"
    else
        echo -e "${RED}❌ 데몬 시작 실패${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# 데몬 중지
stop_daemon() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}데몬이 실행 중이 아닙니다${NC}"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${BLUE}데몬 중지 중... (PID: $pid)${NC}"
        kill "$pid" 2>/dev/null
        sleep 2
        
        # 강제 종료
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -9 "$pid" 2>/dev/null
        fi
        
        echo -e "${GREEN}✅ 데몬 중지됨${NC}"
    else
        echo -e "${YELLOW}데몬 프로세스가 이미 종료됨${NC}"
    fi
    
    rm -f "$PID_FILE"
}

# 데몬 상태 확인
check_status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 데몬 실행 중 (PID: $pid)${NC}"
            echo -e "${BLUE}체크 간격: ${CHECK_INTERVAL}초${NC}"
            echo -e "${BLUE}로그 파일: $LOG_FILE${NC}"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}데몬이 실행 중이 아닙니다${NC}"
    return 1
}

# 로그 보기
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}=== 최근 로그 (마지막 50줄) ===${NC}"
        tail -50 "$LOG_FILE"
        echo ""
        echo -e "${BLUE}실시간 로그 보기: tail -f $LOG_FILE${NC}"
    else
        echo -e "${YELLOW}로그 파일이 없습니다${NC}"
    fi
}

# 도움말
show_help() {
    echo "MSP Checklist 자동 배포 데몬"
    echo ""
    echo "사용법: $0 {start|stop|restart|status|logs|help}"
    echo ""
    echo "명령어:"
    echo "  start   - 데몬 시작"
    echo "  stop    - 데몬 중지"
    echo "  restart - 데몬 재시작"
    echo "  status  - 데몬 상태 확인"
    echo "  logs    - 최근 로그 보기"
    echo "  help    - 도움말 표시"
    echo ""
    echo "설정:"
    echo "  체크 간격: ${CHECK_INTERVAL}초"
    echo "  로그 파일: $LOG_FILE"
    echo "  PID 파일: $PID_FILE"
}

# 메인 실행
case "${1:-}" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        stop_daemon
        sleep 2
        start_daemon
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ "$DAEMON_MODE" = "true" ]; then
            daemon_loop
        else
            show_help
            exit 1
        fi
        ;;
esac
