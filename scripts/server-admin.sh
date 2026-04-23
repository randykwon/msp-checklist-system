#!/bin/bash
# 어드민 서버 관리 스크립트 (포트 3011)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_ROOT/msp-checklist/admin"
PID_FILE="$PROJECT_ROOT/admin-server.pid"
LOG_FILE="$PROJECT_ROOT/logs/admin-server.log"
PORT=3011

# 로그 디렉토리 생성
mkdir -p "$PROJECT_ROOT/logs"

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
    fi
}

load_nvm

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "⚠️  어드민 서버가 이미 실행 중입니다 (PID: $PID)"
            return 1
        fi
    fi
    
    echo "🚀 어드민 서버 시작 중... (포트: $PORT)"
    cd "$APP_DIR"
    nohup npm run start > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo "✅ 어드민 서버 시작됨 (PID: $(cat $PID_FILE))"
    else
        echo "❌ 어드민 서버 시작 실패. 로그 확인: $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "🛑 어드민 서버 중지 중... (PID: $PID)"
            kill $PID
            sleep 2
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID
            fi
            echo "✅ 어드민 서버 중지됨"
        else
            echo "⚠️  어드민 서버가 실행 중이 아닙니다"
        fi
        rm -f "$PID_FILE"
    else
        echo "⚠️  PID 파일이 없습니다"
    fi
    
    # 포트로 실행 중인 프로세스 확인 및 종료
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "🔍 포트 $PORT 사용 중인 프로세스 종료: $PIDS"
        kill $PIDS 2>/dev/null
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "✅ 어드민 서버 실행 중 (PID: $PID, 포트: $PORT)"
            return 0
        fi
    fi
    
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "⚠️  포트 $PORT 사용 중 (PID: $PIDS) - PID 파일 없음"
        return 0
    fi
    
    echo "❌ 어드민 서버 중지됨"
    return 1
}

restart() {
    echo "🔄 어드민 서버 재시작..."
    stop
    sleep 1
    start
}

case "$1" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    status)  status ;;
    *)
        echo "사용법: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
