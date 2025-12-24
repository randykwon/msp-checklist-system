#!/bin/bash

# Admin Server 포트 3011 강제 설정 스크립트
# 포트 충돌을 해결하고 Admin 서버를 정확히 3011에서 실행

echo "🔧 Admin Server 포트 3011 강제 설정 중..."

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
echo "=== Admin Server 포트 3011 강제 설정 ==="
echo ""

# 1. 현재 포트 사용 상황 확인
log_info "1. 현재 포트 사용 상황 확인"
echo ""

log_info "포트 3000 사용 상황:"
PORT_3000=$(lsof -i :3000 2>/dev/null || echo "")
if [ -n "$PORT_3000" ]; then
    echo "$PORT_3000"
    log_warning "⚠️ 포트 3000이 사용 중입니다"
else
    log_success "✅ 포트 3000 사용 가능"
fi

echo ""

log_info "포트 3001 사용 상황:"
PORT_3001=$(lsof -i :3001 2>/dev/null || echo "")
if [ -n "$PORT_3001" ]; then
    echo "$PORT_3001"
    log_warning "⚠️ 포트 3001이 사용 중입니다 (현재 Admin 서버)"
else
    log_success "✅ 포트 3001 사용 가능"
fi

echo ""

log_info "포트 3011 사용 상황:"
PORT_3011=$(lsof -i :3011 2>/dev/null || echo "")
if [ -n "$PORT_3011" ]; then
    echo "$PORT_3011"
    log_warning "⚠️ 포트 3011이 이미 사용 중입니다"
else
    log_success "✅ 포트 3011 사용 가능"
fi

echo ""

# 2. 포트 3000을 사용하는 프로세스 정리
log_info "2. 포트 3000 사용 프로세스 정리"
if [ -n "$PORT_3000" ]; then
    log_info "포트 3000을 사용하는 프로세스를 종료합니다..."
    
    # 메인 서버인지 확인
    if echo "$PORT_3000" | grep -q "node\|npm\|next"; then
        log_warning "⚠️ 포트 3000에서 Node.js 프로세스 발견됨"
        
        # PM2 프로세스 확인
        PM2_MAIN=$(pm2 list 2>/dev/null | grep "msp-checklist-main" || echo "")
        if [ -n "$PM2_MAIN" ]; then
            log_info "PM2 메인 프로세스를 포트 3010으로 재시작합니다..."
            pm2 stop msp-checklist-main 2>/dev/null || true
            pm2 delete msp-checklist-main 2>/dev/null || true
        fi
        
        # 직접 실행 중인 프로세스 종료
        PID_3000=$(lsof -t -i :3000 2>/dev/null || echo "")
        if [ -n "$PID_3000" ]; then
            log_info "포트 3000 프로세스 종료 중... (PID: $PID_3000)"
            kill -TERM $PID_3000 2>/dev/null || true
            sleep 2
            kill -KILL $PID_3000 2>/dev/null || true
        fi
    fi
else
    log_success "✅ 포트 3000 정리 불필요"
fi

echo ""

# 3. 포트 3001에서 실행 중인 Admin 서버 종료
log_info "3. 현재 Admin 서버 종료"
if [ -n "$PORT_3001" ]; then
    log_info "포트 3001에서 실행 중인 Admin 서버를 종료합니다..."
    
    # PM2 Admin 프로세스 종료
    pm2 stop msp-checklist-admin 2>/dev/null || true
    pm2 delete msp-checklist-admin 2>/dev/null || true
    
    # 직접 실행 중인 프로세스 종료
    PID_3001=$(lsof -t -i :3001 2>/dev/null || echo "")
    if [ -n "$PID_3001" ]; then
        log_info "포트 3001 프로세스 종료 중... (PID: $PID_3001)"
        kill -TERM $PID_3001 2>/dev/null || true
        sleep 2
        kill -KILL $PID_3001 2>/dev/null || true
    fi
    
    log_success "✅ Admin 서버 종료 완료"
else
    log_success "✅ Admin 서버 종료 불필요"
fi

echo ""

# 4. Admin 디렉토리 설정 확인 및 수정
log_info "4. Admin 디렉토리 설정 확인 및 수정"
ADMIN_DIR="/opt/msp-checklist-system/msp-checklist/admin"

if [ -d "$ADMIN_DIR" ]; then
    cd "$ADMIN_DIR"
    
    # package.json 포트 설정 강제 수정
    log_info "Admin package.json 포트 설정 수정 중..."
    if [ -f "package.json" ]; then
        # 기존 백업
        cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
        
        # 포트 3011 강제 설정
        sed -i 's/"next dev"/"next dev -p 3011"/' package.json
        sed -i 's/"next dev -p [0-9]*"/"next dev -p 3011"/' package.json
        sed -i 's/"next start"/"next start -p 3011"/' package.json
        sed -i 's/"next start -p [0-9]*"/"next start -p 3011"/' package.json
        
        log_success "✅ package.json 포트 설정 수정 완료"
        
        # 수정된 내용 확인
        log_info "수정된 스크립트 확인:"
        grep -A 5 '"scripts"' package.json
    else
        log_error "❌ Admin package.json 파일이 없습니다"
        exit 1
    fi
    
    echo ""
    
    # .env.local 포트 설정 강제 수정
    log_info "Admin .env.local 포트 설정 수정 중..."
    if [ -f ".env.local" ]; then
        # 기존 포트 설정 제거
        sed -i '/^PORT=/d' .env.local
        # 새로운 포트 설정 추가
        echo "PORT=3011" >> .env.local
        
        log_success "✅ .env.local 포트 설정 수정 완료"
        
        # 포트 설정 확인
        log_info "포트 설정 확인:"
        grep "PORT=" .env.local
    else
        log_warning "⚠️ .env.local 파일이 없습니다 - 생성 중..."
        cat > .env.local << 'EOF'
NODE_ENV=production
PORT=3011
HOST=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048
NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1
EOF
        log_success "✅ .env.local 파일 생성 완료"
    fi
    
else
    log_error "❌ Admin 디렉토리가 없습니다: $ADMIN_DIR"
    exit 1
fi

echo ""

# 5. PM2 ecosystem.config.js 포트 설정 확인
log_info "5. PM2 ecosystem.config.js 포트 설정 확인"
ECOSYSTEM_FILE="/opt/msp-checklist-system/ecosystem.config.js"

if [ -f "$ECOSYSTEM_FILE" ]; then
    log_info "ecosystem.config.js에서 Admin 포트 설정 확인 중..."
    
    if grep -q "PORT.*3011" "$ECOSYSTEM_FILE"; then
        log_success "✅ ecosystem.config.js에 포트 3011 설정 확인됨"
    else
        log_warning "⚠️ ecosystem.config.js 포트 설정 수정 필요"
        
        # 백업 생성
        cp "$ECOSYSTEM_FILE" "$ECOSYSTEM_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        
        # 포트 설정 수정
        sed -i 's/PORT: [0-9]*/PORT: 3011/' "$ECOSYSTEM_FILE"
        
        log_success "✅ ecosystem.config.js 포트 설정 수정 완료"
    fi
    
    # Admin 관련 설정 확인
    log_info "Admin 관련 설정:"
    grep -A 10 -B 5 "msp-checklist-admin\|PORT.*3011" "$ECOSYSTEM_FILE"
    
else
    log_error "❌ ecosystem.config.js 파일이 없습니다"
    exit 1
fi

echo ""

# 6. 환경 변수 설정
log_info "6. 환경 변수 설정"
export NODE_ENV=production
export PORT=3011
export HOST=0.0.0.0
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
export NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1

log_success "✅ 환경 변수 설정 완료"

echo ""

# 7. Admin 서버를 포트 3011에서 시작
log_info "7. Admin 서버를 포트 3011에서 시작"

# PM2로 시작
cd /opt/msp-checklist-system
log_info "PM2로 Admin 서버 시작 중..."

pm2 start ecosystem.config.js --only msp-checklist-admin

if [ $? -eq 0 ]; then
    log_success "✅ PM2로 Admin 서버 시작 완료"
    
    # 잠시 대기 후 상태 확인
    sleep 5
    pm2 status
    
else
    log_warning "⚠️ PM2 시작 실패 - 직접 시작 시도 중..."
    
    # 직접 시작
    cd "$ADMIN_DIR"
    log_info "Admin 디렉토리에서 직접 시작 중..."
    
    # 백그라운드로 시작
    PORT=3011 npm start > /tmp/admin-server.log 2>&1 &
    ADMIN_PID=$!
    
    log_info "Admin 서버 PID: $ADMIN_PID"
    
    # PID 파일 저장
    echo $ADMIN_PID > /tmp/admin-server.pid
    
    log_success "✅ Admin 서버 직접 시작 완료"
fi

echo ""

# 8. 포트 3011 확인
log_info "8. 포트 3011 확인"
sleep 3

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 포트 3011이 리스닝 중입니다!"
    
    # 포트 사용 프로세스 확인
    log_info "포트 3011 사용 프로세스:"
    lsof -i :3011 2>/dev/null || echo "lsof 정보 없음"
    
    echo ""
    
    # HTTP 테스트
    log_info "HTTP 연결 테스트 중..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 2>/dev/null || echo "000")
    
    if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ Admin 서버 HTTP 응답 성공! (HTTP $HTTP_CODE)"
    else
        log_warning "⚠️ Admin 서버 HTTP 응답 대기 중... (HTTP $HTTP_CODE)"
        log_info "서버가 완전히 시작될 때까지 잠시 기다려주세요"
    fi
    
else
    log_error "❌ 포트 3011이 리스닝되지 않습니다"
    
    # 로그 확인
    log_info "로그 확인:"
    if [ -f "/tmp/admin-server.log" ]; then
        echo "=== Admin 서버 로그 ==="
        tail -20 /tmp/admin-server.log
    fi
    
    pm2 logs msp-checklist-admin --lines 10 2>/dev/null || echo "PM2 로그 없음"
fi

echo ""

# 9. Nginx 프록시 테스트
log_info "9. Nginx /admin 프록시 테스트"
ADMIN_PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")

if [[ "$ADMIN_PROXY_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ Nginx /admin 프록시 성공! (HTTP $ADMIN_PROXY_CODE)"
else
    log_warning "⚠️ Nginx /admin 프록시 대기 중... (HTTP $ADMIN_PROXY_CODE)"
    log_info "Admin 서버가 완전히 시작되면 프록시도 작동할 것입니다"
fi

echo ""

# 10. 종합 결과
log_info "10. 종합 결과"
echo ""

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    echo "🎉 Admin 서버가 포트 3011에서 성공적으로 실행 중입니다!"
    echo ""
    echo "📋 접속 정보:"
    echo "  - 직접 접속: http://localhost:3011"
    echo "  - Nginx 프록시: http://localhost/admin"
    echo "  - 외부 접속: http://your-server-ip/admin"
    echo ""
    echo "🔧 관리 명령어:"
    echo "  - 상태 확인: pm2 status"
    echo "  - 로그 확인: pm2 logs msp-checklist-admin"
    echo "  - 재시작: pm2 restart msp-checklist-admin"
    echo "  - 중지: pm2 stop msp-checklist-admin"
    echo ""
    echo "✅ 포트 충돌 문제가 해결되었습니다!"
    
else
    echo "❌ Admin 서버 포트 3011 설정에 실패했습니다"
    echo ""
    echo "🔧 추가 확인 사항:"
    echo "1. 로그 확인: tail -f /tmp/admin-server.log"
    echo "2. PM2 로그: pm2 logs msp-checklist-admin"
    echo "3. 포트 상태: netstat -tuln | grep 301"
    echo "4. 프로세스 확인: ps aux | grep node"
fi

echo ""
echo "=== Admin Server 포트 3011 강제 설정 완료 ==="