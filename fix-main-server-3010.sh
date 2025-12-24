#!/bin/bash

# 메인 서버 포트 3010 문제 해결 스크립트
# Admin 서버는 정상이므로 메인 서버만 집중 수정

echo "🔧 메인 서버 포트 3010 문제 해결 중..."

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
echo "=== 메인 서버 포트 3010 문제 해결 ==="
echo ""

# 1. 현재 상태 확인
log_info "1. 현재 서버 상태 확인"
echo ""

# 포트 3010 확인
log_info "포트 3010 상태 확인:"
PORT_3010=$(lsof -i :3010 2>/dev/null || echo "")
if [ -n "$PORT_3010" ]; then
    echo "$PORT_3010"
    log_warning "⚠️ 포트 3010이 사용 중이지만 응답하지 않음"
else
    log_error "❌ 포트 3010에서 실행 중인 프로세스 없음"
fi

echo ""

# 포트 3011 확인 (Admin - 정상)
log_info "포트 3011 상태 확인 (Admin - 정상):"
PORT_3011=$(lsof -i :3011 2>/dev/null || echo "")
if [ -n "$PORT_3011" ]; then
    echo "$PORT_3011"
    log_success "✅ Admin 서버 정상 실행 중"
else
    log_warning "⚠️ Admin 서버 상태 확인 필요"
fi

echo ""

# 2. 메인 서버 디렉토리 확인
log_info "2. 메인 서버 디렉토리 및 설정 확인"

# 현재 위치 확인
CURRENT_DIR=$(pwd)
log_info "현재 디렉토리: $CURRENT_DIR"

# MSP Checklist 디렉토리 찾기
if [ -d "msp-checklist" ]; then
    MAIN_DIR="$CURRENT_DIR/msp-checklist"
elif [ -d "/opt/msp-checklist-system/msp-checklist" ]; then
    MAIN_DIR="/opt/msp-checklist-system/msp-checklist"
else
    log_error "❌ 메인 서버 디렉토리를 찾을 수 없습니다"
    echo "다음 위치를 확인해주세요:"
    echo "- ./msp-checklist"
    echo "- /opt/msp-checklist-system/msp-checklist"
    exit 1
fi

log_info "메인 서버 디렉토리: $MAIN_DIR"

# 디렉토리로 이동
cd "$MAIN_DIR"

# package.json 확인
if [ -f "package.json" ]; then
    log_info "package.json 포트 설정 확인:"
    grep -A 3 -B 1 '"scripts"' package.json | grep -E 'dev|start'
    
    # 포트 3010 설정 확인
    if grep -q "3010" package.json; then
        log_success "✅ package.json에 포트 3010 설정 확인됨"
    else
        log_warning "⚠️ package.json에 포트 3010 설정이 명시되지 않음"
        
        # 포트 설정 수정
        log_info "포트 3010 설정 추가 중..."
        cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
        
        # dev와 start 스크립트에 포트 추가
        sed -i 's/"dev": "next dev"/"dev": "next dev -p 3010"/' package.json
        sed -i 's/"start": "next start"/"start": "next start -p 3010"/' package.json
        
        log_success "✅ package.json 포트 설정 수정 완료"
    fi
else
    log_error "❌ package.json 파일이 없습니다"
    exit 1
fi

echo ""

# 3. 환경 변수 확인 및 설정
log_info "3. 환경 변수 확인 및 설정"

if [ -f ".env.local" ]; then
    log_info "기존 .env.local 확인:"
    grep "PORT" .env.local || echo "PORT 설정 없음"
    
    # PORT 설정 확인 및 수정
    if grep -q "PORT=3010" .env.local; then
        log_success "✅ .env.local에 PORT=3010 설정 확인됨"
    else
        log_info ".env.local PORT 설정 수정 중..."
        
        # 기존 PORT 설정 제거
        sed -i '/^PORT=/d' .env.local
        
        # 새로운 PORT 설정 추가
        echo "PORT=3010" >> .env.local
        
        log_success "✅ .env.local PORT 설정 수정 완료"
    fi
else
    log_info ".env.local 파일 생성 중..."
    cat > .env.local << 'EOF'
NODE_ENV=production
PORT=3010
HOST=0.0.0.0

# Next.js 최적화
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048

# Turbopack 비활성화
TURBOPACK=0
NEXT_PRIVATE_TURBOPACK=false

# 정적 생성 최적화
NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1
EOF
    log_success "✅ .env.local 파일 생성 완료"
fi

echo ""

# 4. 기존 프로세스 정리
log_info "4. 기존 메인 서버 프로세스 정리"

# 포트 3010 프로세스 종료
if [ -n "$PORT_3010" ]; then
    log_info "포트 3010 프로세스 종료 중..."
    PID_3010=$(lsof -t -i :3010 2>/dev/null || echo "")
    if [ -n "$PID_3010" ]; then
        log_info "PID $PID_3010 종료 중..."
        kill -TERM $PID_3010 2>/dev/null || true
        sleep 3
        kill -KILL $PID_3010 2>/dev/null || true
        log_success "✅ 기존 프로세스 종료 완료"
    fi
fi

# PM2 프로세스 확인 및 정리
if command -v pm2 > /dev/null 2>&1; then
    log_info "PM2 메인 프로세스 확인 중..."
    PM2_MAIN=$(pm2 list 2>/dev/null | grep -E "msp.*main|main.*msp" || echo "")
    if [ -n "$PM2_MAIN" ]; then
        log_info "PM2 메인 프로세스 재시작 중..."
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        log_success "✅ PM2 프로세스 정리 완료"
    fi
fi

echo ""

# 5. 의존성 및 빌드 상태 확인
log_info "5. 의존성 및 빌드 상태 확인"

# node_modules 확인
if [ -d "node_modules" ]; then
    log_success "✅ node_modules 존재"
else
    log_warning "⚠️ node_modules 없음 - 의존성 설치 필요"
    log_info "의존성 설치 중..."
    npm install
    log_success "✅ 의존성 설치 완료"
fi

# .next 빌드 디렉토리 확인
if [ -d ".next" ]; then
    log_info ".next 빌드 디렉토리 존재 - 재빌드 시도"
    rm -rf .next
fi

# 빌드 시도
log_info "애플리케이션 빌드 중..."
if npm run build; then
    log_success "✅ 빌드 성공"
else
    log_warning "⚠️ 빌드 실패 - 개발 모드로 시작 시도"
fi

echo ""

# 6. 메인 서버 시작
log_info "6. 메인 서버 시작"

# 환경 변수 설정
export NODE_ENV=production
export PORT=3010
export HOST=0.0.0.0
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=2048"
export TURBOPACK=0
export NEXT_PRIVATE_TURBOPACK=false

log_info "환경 변수 설정 완료"

# 서버 시작 시도 (프로덕션 모드)
log_info "프로덕션 모드로 서버 시작 중..."
if [ -d ".next" ]; then
    # 빌드가 성공한 경우 프로덕션 모드
    PORT=3010 npm start > ../main-server.log 2>&1 &
    MAIN_PID=$!
    echo $MAIN_PID > ../main-server.pid
    log_info "메인 서버 PID: $MAIN_PID (프로덕션 모드)"
else
    # 빌드가 실패한 경우 개발 모드
    log_warning "빌드 실패로 개발 모드로 시작"
    PORT=3010 npm run dev > ../main-server.log 2>&1 &
    MAIN_PID=$!
    echo $MAIN_PID > ../main-server.pid
    log_info "메인 서버 PID: $MAIN_PID (개발 모드)"
fi

echo ""

# 7. 서버 시작 확인
log_info "7. 서버 시작 확인 (30초 대기)"
sleep 10

# 첫 번째 확인
log_info "10초 후 첫 번째 확인..."
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    log_success "✅ 포트 3010이 리스닝 중입니다!"
else
    log_warning "⚠️ 아직 리스닝되지 않음 - 추가 대기 중..."
    sleep 10
    
    # 두 번째 확인
    log_info "20초 후 두 번째 확인..."
    if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
        log_success "✅ 포트 3010이 리스닝 중입니다!"
    else
        log_warning "⚠️ 아직 리스닝되지 않음 - 최종 대기 중..."
        sleep 10
        
        # 최종 확인
        log_info "30초 후 최종 확인..."
        if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
            log_success "✅ 포트 3010이 리스닝 중입니다!"
        else
            log_error "❌ 포트 3010이 리스닝되지 않습니다"
            
            # 로그 확인
            log_info "서버 로그 확인:"
            if [ -f "../main-server.log" ]; then
                echo "=== 최근 로그 (마지막 20줄) ==="
                tail -20 ../main-server.log
                echo "=========================="
            fi
            
            # 프로세스 상태 확인
            if [ -f "../main-server.pid" ]; then
                MAIN_PID=$(cat ../main-server.pid)
                if ps -p $MAIN_PID > /dev/null 2>&1; then
                    log_info "프로세스 $MAIN_PID는 실행 중이지만 포트를 리스닝하지 않음"
                else
                    log_error "프로세스 $MAIN_PID가 종료됨"
                fi
            fi
        fi
    fi
fi

echo ""

# 8. HTTP 연결 테스트
log_info "8. HTTP 연결 테스트"
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ 메인 서버 HTTP 응답 성공! (HTTP $HTTP_CODE)"
else
    log_warning "⚠️ 메인 서버 HTTP 응답 대기 중... (HTTP $HTTP_CODE)"
    
    # 추가 대기 후 재시도
    sleep 5
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ 메인 서버 HTTP 응답 성공! (HTTP $HTTP_CODE)"
    else
        log_error "❌ 메인 서버 HTTP 응답 실패 (HTTP $HTTP_CODE)"
    fi
fi

echo ""

# 9. 종합 결과
log_info "9. 종합 결과"
echo ""

# 포트 상태 최종 확인
FINAL_PORT_CHECK=$(netstat -tuln 2>/dev/null | grep ":3010 " || ss -tuln 2>/dev/null | grep ":3010 " || echo "")
FINAL_HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 2>/dev/null || echo "000")

if [ -n "$FINAL_PORT_CHECK" ] && [[ "$FINAL_HTTP_CHECK" =~ ^[2-3][0-9][0-9]$ ]]; then
    echo "🎉 메인 서버가 포트 3010에서 성공적으로 실행 중입니다!"
    echo ""
    echo "📋 서버 정보:"
    echo "  🌐 메인 서버: http://localhost:3010 (HTTP $FINAL_HTTP_CHECK)"
    echo "  🔐 Admin 서버: http://localhost:3011 (정상 실행 중)"
    echo ""
    echo "🔧 관리 명령어:"
    echo "  📊 프로세스 확인: ps aux | grep node"
    echo "  📝 로그 확인: tail -f ../main-server.log"
    echo "  🛑 서버 중지: kill \$(cat ../main-server.pid)"
    echo ""
    echo "✅ 메인 서버 문제가 해결되었습니다!"
    
elif [ -n "$FINAL_PORT_CHECK" ]; then
    echo "⚠️ 메인 서버가 포트 3010에서 실행 중이지만 HTTP 응답에 문제가 있습니다"
    echo ""
    echo "🔧 추가 확인 사항:"
    echo "1. 로그 확인: tail -f ../main-server.log"
    echo "2. 프로세스 상태: ps aux | grep node"
    echo "3. 포트 상태: lsof -i :3010"
    echo "4. 방화벽 확인: 포트 3010이 열려있는지 확인"
    echo ""
    echo "💡 서버가 완전히 시작되려면 추가 시간이 필요할 수 있습니다."
    
else
    echo "❌ 메인 서버 시작에 실패했습니다"
    echo ""
    echo "🔧 문제 해결 방법:"
    echo "1. 로그 확인: tail -f ../main-server.log"
    echo "2. 수동 시작: cd $MAIN_DIR && PORT=3010 npm start"
    echo "3. 개발 모드: cd $MAIN_DIR && PORT=3010 npm run dev"
    echo "4. 의존성 재설치: cd $MAIN_DIR && rm -rf node_modules && npm install"
    echo ""
    echo "📝 로그 파일 위치: ../main-server.log"
fi

echo ""
echo "=== 메인 서버 포트 3010 문제 해결 완료 ==="