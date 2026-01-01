#!/bin/bash

# =============================================================================
# MSP Checklist - 관리자 앱 빌드 스크립트
# 관리자 페이지만 빌드하고 재시작합니다.
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           MSP Checklist - 관리자 앱 빌드 스크립트             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 프로젝트 디렉토리 감지
if [ -d "./msp-checklist/admin" ]; then
    PROJECT_DIR="$(pwd)"
elif [ -d "/opt/msp-checklist-system/msp-checklist/admin" ]; then
    PROJECT_DIR="/opt/msp-checklist-system"
else
    log_error "프로젝트 디렉토리를 찾을 수 없습니다."
    exit 1
fi

ADMIN_DIR="$PROJECT_DIR/msp-checklist/admin"
ADMIN_PORT=3011

log_info "프로젝트 경로: $PROJECT_DIR"
log_info "관리자 앱 경로: $ADMIN_DIR"

# 관리자 앱 디렉토리 확인
if [ ! -d "$ADMIN_DIR" ]; then
    log_error "관리자 앱 디렉토리가 없습니다: $ADMIN_DIR"
    exit 1
fi

# 환경 변수 설정
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# 1. 기존 관리자 서버 중지
# =============================================================================
log_info "기존 관리자 서버 중지 중..."

# PM2로 실행 중인 경우
if command -v pm2 &> /dev/null; then
    pm2 stop msp-admin 2>/dev/null || true
fi

# systemd로 실행 중인 경우
if systemctl is-active --quiet msp-admin 2>/dev/null; then
    sudo systemctl stop msp-admin 2>/dev/null || true
fi

# 직접 실행 중인 프로세스 종료
pkill -f "next.*${ADMIN_PORT}" 2>/dev/null || true
pkill -f "node.*admin.*${ADMIN_PORT}" 2>/dev/null || true

# PID 파일로 종료
if [ -f "$PROJECT_DIR/admin-server.pid" ]; then
    PID=$(cat "$PROJECT_DIR/admin-server.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$PROJECT_DIR/admin-server.pid"
fi

sleep 2
log_success "기존 서버 중지 완료"

# =============================================================================
# 2. 의존성 설치 (필요시)
# =============================================================================
cd "$ADMIN_DIR"

if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    log_info "의존성 설치 중..."
    npm install --legacy-peer-deps 2>/dev/null || npm install
    log_success "의존성 설치 완료"
else
    log_info "의존성이 최신 상태입니다."
fi

# =============================================================================
# 3. 빌드
# =============================================================================
log_info "관리자 앱 빌드 중..."

# 이전 빌드 캐시 정리 (선택적)
if [ "$1" == "--clean" ]; then
    log_info "빌드 캐시 정리 중..."
    rm -rf .next
fi

# 빌드 실행
npm run build

if [ $? -eq 0 ]; then
    log_success "빌드 완료!"
else
    log_error "빌드 실패"
    exit 1
fi

# =============================================================================
# 4. 서버 재시작
# =============================================================================
log_info "관리자 서버 시작 중..."

# PM2가 있으면 PM2로 시작
if command -v pm2 &> /dev/null; then
    pm2 delete msp-admin 2>/dev/null || true
    pm2 start npm --name "msp-admin" -- start -- -p $ADMIN_PORT
    pm2 save
    log_success "PM2로 관리자 서버 시작됨 (포트 $ADMIN_PORT)"
    
# systemd 서비스가 있으면 systemd로 시작
elif systemctl list-unit-files | grep -q msp-admin; then
    sudo systemctl start msp-admin
    log_success "systemd로 관리자 서버 시작됨 (포트 $ADMIN_PORT)"
    
# 직접 백그라운드로 시작
else
    nohup npm start -- -p $ADMIN_PORT > "$PROJECT_DIR/admin-server.log" 2>&1 &
    echo $! > "$PROJECT_DIR/admin-server.pid"
    log_success "관리자 서버 시작됨 (포트 $ADMIN_PORT, PID: $!)"
fi

# =============================================================================
# 5. 상태 확인
# =============================================================================
log_info "서버 상태 확인 중..."
sleep 3

echo ""
echo "═══════════════════════════════════════════════════════════════"

# 포트 확인
if command -v ss &> /dev/null; then
    if ss -tuln | grep -q ":${ADMIN_PORT} "; then
        log_success "포트 $ADMIN_PORT 리스닝 중"
    else
        log_warning "포트 $ADMIN_PORT 아직 시작 중..."
    fi
elif command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":${ADMIN_PORT} "; then
        log_success "포트 $ADMIN_PORT 리스닝 중"
    else
        log_warning "포트 $ADMIN_PORT 아직 시작 중..."
    fi
fi

# HTTP 응답 확인
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$ADMIN_PORT/login 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^[23] ]]; then
    log_success "HTTP 응답 정상 (HTTP $HTTP_CODE)"
else
    log_warning "HTTP 응답: $HTTP_CODE (서버 시작 중일 수 있음)"
fi

echo "═══════════════════════════════════════════════════════════════"

# =============================================================================
# 6. 완료 메시지
# =============================================================================
echo ""
log_success "관리자 앱 빌드 및 재시작 완료!"
echo ""

# IP 주소 확인
IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || \
     curl -s http://ipinfo.io/ip 2>/dev/null || \
     hostname -I 2>/dev/null | awk '{print $1}' || \
     echo "localhost")

echo -e "${CYAN}🌐 접속 URL:${NC}"
echo "   직접 접속: http://$IP:$ADMIN_PORT"
echo "   Nginx 경유: http://$IP/admin"
echo ""
echo -e "${CYAN}🔧 로그 확인:${NC}"
if command -v pm2 &> /dev/null; then
    echo "   pm2 logs msp-admin"
else
    echo "   tail -f $PROJECT_DIR/admin-server.log"
fi
echo ""
