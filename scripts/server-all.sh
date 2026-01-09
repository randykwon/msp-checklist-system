#!/bin/bash
# 전체 서버 관리 스크립트

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

start() {
    echo "=========================================="
    echo "🚀 전체 서버 시작"
    echo "=========================================="
    "$SCRIPT_DIR/server-main.sh" start
    "$SCRIPT_DIR/server-admin.sh" start
    echo "=========================================="
}

stop() {
    echo "=========================================="
    echo "🛑 전체 서버 중지"
    echo "=========================================="
    "$SCRIPT_DIR/server-admin.sh" stop
    "$SCRIPT_DIR/server-main.sh" stop
    echo "=========================================="
}

status() {
    echo "=========================================="
    echo "📊 서버 상태"
    echo "=========================================="
    "$SCRIPT_DIR/server-main.sh" status
    "$SCRIPT_DIR/server-admin.sh" status
    echo "=========================================="
}

restart() {
    echo "=========================================="
    echo "🔄 전체 서버 재시작"
    echo "=========================================="
    stop
    sleep 2
    start
}

case "$1" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    status)  status ;;
    *)
        echo "사용법: $0 {start|stop|restart|status}"
        echo ""
        echo "개별 서버 관리:"
        echo "  ./server-main.sh {start|stop|restart|status}   - 메인 서버 (포트 3010)"
        echo "  ./server-admin.sh {start|stop|restart|status}  - 어드민 서버 (포트 3011)"
        exit 1
        ;;
esac
