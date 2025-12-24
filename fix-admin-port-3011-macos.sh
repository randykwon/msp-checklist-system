#!/bin/bash

# Admin Server 포트 3011 강제 설정 스크립트 (macOS용)
# 포트 충돌을 해결하고 Admin 서버를 정확히 3011에서 실행

echo "🔧 Admin Server 포트 3011 강제 설정 중... (macOS)"

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
echo "=== Admin Server 포트 3011 강제 설정 (macOS) ==="
echo ""

# macOS 환경 확인
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "❌ 이 스크립트는 macOS 전용입니다"
    exit 1
fi

log_success "✅ macOS 환경 확인됨"

# 1. 현재 포트 사용 상황 확인 (macOS 명령어 사용)
log_info "1. 현재 포트 사용 상황 확인"
echo ""

log_info "포트 3010 사용 상황:"
PORT_3010=$(lsof -i :3010 2>/dev/null || echo "")
if [ -n "$PORT_3010" ]; then
    echo "$PORT_3010"
    log_warning "⚠️ 포트 3010이 사용 중입니다 (메인 서버)"
else
    log_success "✅ 포트 3010 사용 가능"
fi

echo ""

log_info "포트 3001 사용 상황:"
PORT_3001=$(lsof -i :3001 2>/dev/null || echo "")
if [ -n "$PORT_3001" ]; then
    echo "$PORT_3001"
    log_warning "⚠️ 포트 3001이 사용 중입니다 (잘못된 Admin 서버)"
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
# 2. 포트 3010에서 실행 중인 메인 서버 확인 (건드리지 않음)
log_info "2. 포트 3010 메인 서버 상태 확인"
if [ -n "$PORT_3010" ]; then
    log_info "포트 3010에서 메인 서버가 정상 실행 중입니다."
    log_success "✅ 메인 서버는 그대로 유지합니다"
else
    log_warning "⚠️ 포트 3010에서 메인 서버가 실행되지 않고 있습니다"
    log_info "메인 서버를 먼저 시작해주세요: cd msp-checklist && PORT=3010 npm start"
fi

echo ""

# 3. 포트 3001에서 실행 중인 잘못된 Admin 서버 종료
log_info "3. 잘못된 Admin 서버 종료 (포트 3001)"
if [ -n "$PORT_3001" ]; then
    log_info "포트 3001에서 실행 중인 잘못된 Admin 서버를 종료합니다..."
    
    # PM2 Admin 프로세스 종료 (있다면)
    if command -v pm2 > /dev/null; then
        pm2 stop msp-checklist-admin 2>/dev/null || true
        pm2 delete msp-checklist-admin 2>/dev/null || true
    fi
    
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

# 4. Admin 디렉토리 찾기 (macOS 일반적인 경로들)
log_info "4. Admin 디렉토리 찾기"

# 가능한 Admin 디렉토리 경로들
POSSIBLE_PATHS=(
    "./admin"
    "./msp-checklist/admin"
    "../admin"
    "~/msp-checklist/admin"
    "~/msp-checklist-system/msp-checklist/admin"
    "/opt/msp-checklist-system/msp-checklist/admin"
    "/Users/$USER/msp-checklist/admin"
    "/Users/$USER/msp-checklist-system/msp-checklist/admin"
)

ADMIN_DIR=""
for path in "${POSSIBLE_PATHS[@]}"; do
    # 경로 확장
    expanded_path=$(eval echo "$path")
    if [ -d "$expanded_path" ]; then
        ADMIN_DIR="$expanded_path"
        log_success "✅ Admin 디렉토리 발견: $ADMIN_DIR"
        break
    fi
done

if [ -z "$ADMIN_DIR" ]; then
    log_error "❌ Admin 디렉토리를 찾을 수 없습니다"
    echo ""
    echo "🔍 다음 경로들을 확인했습니다:"
    for path in "${POSSIBLE_PATHS[@]}"; do
        echo "  - $(eval echo "$path")"
    done
    echo ""
    echo "💡 Admin 디렉토리 경로를 직접 입력하세요:"
    read -p "Admin 디렉토리 경로: " ADMIN_DIR
    
    if [ ! -d "$ADMIN_DIR" ]; then
        log_error "❌ 입력한 경로가 존재하지 않습니다: $ADMIN_DIR"
        exit 1
    fi
fi

cd "$ADMIN_DIR"
log_info "현재 디렉토리: $(pwd)"

echo ""

# 5. Admin 설정 파일 확인 및 수정
log_info "5. Admin 설정 파일 확인 및 수정"

# package.json 포트 설정 강제 수정
log_info "Admin package.json 포트 설정 수정 중..."
if [ -f "package.json" ]; then
    # 기존 백업 (macOS 호환)
    cp package.json "package.json.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 포트 3011 강제 설정 (macOS sed 호환)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed 사용
        sed -i '' 's/"next dev"/"next dev -p 3011"/' package.json
        sed -i '' 's/"next dev -p [0-9]*"/"next dev -p 3011"/' package.json
        sed -i '' 's/"next start"/"next start -p 3011"/' package.json
        sed -i '' 's/"next start -p [0-9]*"/"next start -p 3011"/' package.json
    fi
    
    log_success "✅ package.json 포트 설정 수정 완료"
    
    # 수정된 내용 확인
    log_info "수정된 스크립트 확인:"
    grep -A 5 '"scripts"' package.json
else
    log_warning "⚠️ Admin package.json 파일이 없습니다 - 생성 중..."
    cat > package.json << 'EOF'
{
  "name": "msp-checklist-admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3011",
    "build": "next build",
    "start": "next start -p 3011",
    "lint": "echo 'Linting disabled'"
  },
  "dependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.2.2",
    "lucide-react": "^0.263.1",
    "next": "14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5"
  }
}
EOF
    log_success "✅ package.json 파일 생성 완료"
fi

echo ""

# .env.local 포트 설정 강제 수정
log_info "Admin .env.local 포트 설정 수정 중..."
if [ -f ".env.local" ]; then
    # 기존 포트 설정 제거 (macOS sed 호환)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' '/^PORT=/d' .env.local
    fi
    # 새로운 포트 설정 추가
    echo "PORT=3011" >> .env.local
    
    log_success "✅ .env.local 포트 설정 수정 완료"
    
    # 포트 설정 확인
    log_info "포트 설정 확인:"
    grep "PORT=" .env.local
else
    log_warning "⚠️ .env.local 파일이 없습니다 - 생성 중..."
    cat > .env.local << 'EOF'
NODE_ENV=development
PORT=3011
HOST=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048
NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1
EOF
    log_success "✅ .env.local 파일 생성 완료"
fi

echo ""

# 6. 의존성 확인
log_info "6. 의존성 확인"
if [ ! -d "node_modules" ]; then
    log_info "의존성 설치 중..."
    npm install
    
    if [ $? -eq 0 ]; then
        log_success "✅ 의존성 설치 완료"
    else
        log_error "❌ 의존성 설치 실패"
        exit 1
    fi
else
    log_success "✅ node_modules 존재"
fi

echo ""

# 7. 환경 변수 설정
log_info "7. 환경 변수 설정"
export NODE_ENV=development
export PORT=3011
export HOST=0.0.0.0
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
export NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1

log_success "✅ 환경 변수 설정 완료"

echo ""

# 8. Admin 서버를 포트 3011에서 시작
log_info "8. Admin 서버를 포트 3011에서 시작"

log_info "Admin 서버 시작 중..."
echo ""
echo "🚀 Admin 서버가 포트 3011에서 시작됩니다..."
echo ""
echo "📋 접속 정보:"
echo "  🌐 로컬 접속: http://localhost:3011"
echo "  🔗 네트워크 접속: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'your-ip'):3011"
echo ""
echo "🛑 서버 중지: Ctrl+C"
echo ""
echo "=================================================="

# 포트 3011로 강제 시작
PORT=3011 npm run dev

echo ""
echo "=== Admin Server 포트 3011 강제 설정 완료 (macOS) ==="