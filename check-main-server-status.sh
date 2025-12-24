#!/bin/bash

# 메인 서버 상태 빠른 확인 스크립트

echo "🔍 메인 서버 상태 빠른 확인..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "=== 메인 서버 상태 확인 ==="
echo ""

# 1. 포트 3010 확인
log_info "1. 포트 3010 상태:"
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    log_success "✅ 포트 3010 리스닝 중"
    lsof -i :3010 2>/dev/null || echo "  프로세스 정보 없음"
else
    log_error "❌ 포트 3010 리스닝되지 않음"
fi

echo ""

# 2. HTTP 응답 확인
log_info "2. HTTP 응답 확인:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ HTTP 응답 정상 (HTTP $HTTP_CODE)"
else
    log_error "❌ HTTP 응답 실패 (HTTP $HTTP_CODE)"
fi

echo ""

# 3. 프로세스 확인
log_info "3. Node.js 프로세스 확인:"
NODE_PROCESSES=$(ps aux | grep -E "node|npm|next" | grep -v grep | grep -E "3010|msp-checklist" || echo "")
if [ -n "$NODE_PROCESSES" ]; then
    echo "$NODE_PROCESSES"
else
    log_warning "⚠️ 관련 Node.js 프로세스 없음"
fi

echo ""

# 4. 로그 확인 (최근 5줄)
log_info "4. 최근 로그 확인:"
if [ -f "main-server.log" ]; then
    echo "=== 최근 로그 (마지막 5줄) ==="
    tail -5 main-server.log
    echo "=========================="
elif [ -f "../main-server.log" ]; then
    echo "=== 최근 로그 (마지막 5줄) ==="
    tail -5 ../main-server.log
    echo "=========================="
else
    log_warning "⚠️ 로그 파일을 찾을 수 없음"
fi

echo ""

# 5. 디렉토리 및 설정 확인
log_info "5. 설정 확인:"

# 현재 디렉토리에서 msp-checklist 찾기
if [ -d "msp-checklist" ]; then
    MAIN_DIR="./msp-checklist"
elif [ -d "/opt/msp-checklist-system/msp-checklist" ]; then
    MAIN_DIR="/opt/msp-checklist-system/msp-checklist"
else
    log_error "❌ 메인 서버 디렉토리를 찾을 수 없음"
    MAIN_DIR=""
fi

if [ -n "$MAIN_DIR" ]; then
    log_info "메인 디렉토리: $MAIN_DIR"
    
    # package.json 포트 설정 확인
    if [ -f "$MAIN_DIR/package.json" ]; then
        PORT_SETTING=$(grep -E '"dev"|"start"' "$MAIN_DIR/package.json" | grep "3010" || echo "")
        if [ -n "$PORT_SETTING" ]; then
            log_success "✅ package.json에 포트 3010 설정 확인됨"
        else
            log_warning "⚠️ package.json에 포트 3010 설정 없음"
        fi
    fi
    
    # .env.local 확인
    if [ -f "$MAIN_DIR/.env.local" ]; then
        ENV_PORT=$(grep "PORT=3010" "$MAIN_DIR/.env.local" || echo "")
        if [ -n "$ENV_PORT" ]; then
            log_success "✅ .env.local에 PORT=3010 설정 확인됨"
        else
            log_warning "⚠️ .env.local에 PORT=3010 설정 없음"
        fi
    else
        log_warning "⚠️ .env.local 파일 없음"
    fi
fi

echo ""

# 6. 종합 상태
log_info "6. 종합 상태:"
PORT_OK=$(netstat -tuln 2>/dev/null | grep -q ":3010 " && echo "true" || echo "false")
HTTP_OK=$([[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]] && echo "true" || echo "false")

if [ "$PORT_OK" = "true" ] && [ "$HTTP_OK" = "true" ]; then
    echo "🎉 메인 서버 정상 작동 중!"
    echo "  📍 포트: 3010"
    echo "  🌐 접속: http://localhost:3010"
    echo "  📊 상태: 정상"
elif [ "$PORT_OK" = "true" ]; then
    echo "⚠️ 메인 서버가 실행 중이지만 HTTP 응답에 문제가 있습니다"
    echo "  📍 포트: 3010 (리스닝 중)"
    echo "  🌐 접속: http://localhost:3010 (응답 없음)"
    echo "  💡 서버가 완전히 시작되기까지 시간이 더 필요할 수 있습니다"
else
    echo "❌ 메인 서버가 실행되지 않고 있습니다"
    echo "  📍 포트: 3010 (리스닝되지 않음)"
    echo "  🔧 해결: ./fix-main-server-3010.sh 실행"
fi

echo ""

# 7. 권장 조치
if [ "$PORT_OK" = "false" ] || [ "$HTTP_OK" = "false" ]; then
    log_info "7. 권장 조치:"
    echo "  🔧 자동 수정: ./fix-main-server-3010.sh"
    echo "  📝 로그 확인: tail -f main-server.log (또는 ../main-server.log)"
    echo "  🔄 수동 재시작: cd msp-checklist && PORT=3010 npm start"
    echo "  🛠️ 개발 모드: cd msp-checklist && PORT=3010 npm run dev"
fi

echo ""
echo "=== 메인 서버 상태 확인 완료 ==="