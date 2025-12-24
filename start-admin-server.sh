#!/bin/bash

# Admin Server 시작 및 확인 스크립트
# Admin 서버를 포트 3011에서 시작하고 상태를 확인

echo "🚀 Admin Server 시작 및 확인 중..."

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

# 프로젝트 디렉토리 확인
PROJECT_DIR="/opt/msp-checklist-system"
MAIN_APP_DIR="$PROJECT_DIR/msp-checklist"
ADMIN_APP_DIR="$MAIN_APP_DIR/admin"

echo ""
echo "=== Admin Server 시작 및 확인 ==="
echo ""

# 1. 디렉토리 구조 확인
log_info "1. 디렉토리 구조 확인"
if [ -d "$PROJECT_DIR" ]; then
    log_success "✅ 프로젝트 디렉토리 존재: $PROJECT_DIR"
    
    if [ -d "$MAIN_APP_DIR" ]; then
        log_success "✅ 메인 앱 디렉토리 존재: $MAIN_APP_DIR"
        
        if [ -d "$ADMIN_APP_DIR" ]; then
            log_success "✅ Admin 앱 디렉토리 존재: $ADMIN_APP_DIR"
        else
            log_error "❌ Admin 앱 디렉토리 없음: $ADMIN_APP_DIR"
            
            # Admin 디렉토리 생성 시도
            log_info "Admin 디렉토리 생성 시도 중..."
            mkdir -p "$ADMIN_APP_DIR"
            
            if [ -d "$ADMIN_APP_DIR" ]; then
                log_success "✅ Admin 디렉토리 생성 완료"
            else
                log_error "❌ Admin 디렉토리 생성 실패"
                exit 1
            fi
        fi
    else
        log_error "❌ 메인 앱 디렉토리 없음: $MAIN_APP_DIR"
        exit 1
    fi
else
    log_error "❌ 프로젝트 디렉토리 없음: $PROJECT_DIR"
    exit 1
fi

echo ""

# 2. Admin 애플리케이션 설정 확인 및 생성
log_info "2. Admin 애플리케이션 설정 확인 및 생성"
cd "$ADMIN_APP_DIR"

# Admin package.json 확인 및 생성
if [ ! -f "package.json" ]; then
    log_warning "⚠️ Admin package.json 없음 - 생성 중..."
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
    log_success "✅ Admin package.json 생성 완료"
else
    log_success "✅ Admin package.json 존재"
fi

# Admin next.config.js 확인 및 생성
if [ ! -f "next.config.js" ]; then
    log_warning "⚠️ Admin next.config.js 없음 - 메인에서 복사 중..."
    if [ -f "$MAIN_APP_DIR/next.config.js" ]; then
        cp "$MAIN_APP_DIR/next.config.js" ./
        log_success "✅ Admin next.config.js 복사 완료"
    else
        log_warning "⚠️ 메인 next.config.js도 없음 - 생성 중..."
        cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    staticGenerationAsyncStorage: false,
    staticGenerationBailout: 'ignore',
  },
};

module.exports = nextConfig;
EOF
        log_success "✅ Admin next.config.js 생성 완료"
    fi
else
    log_success "✅ Admin next.config.js 존재"
fi

# Admin .env.local 확인 및 생성
if [ ! -f ".env.local" ]; then
    log_warning "⚠️ Admin .env.local 없음 - 생성 중..."
    cat > .env.local << 'EOF'
# MSP Checklist Admin 환경 변수
NODE_ENV=production
PORT=3011
HOST=0.0.0.0

# Next.js 최적화
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048

# Next.js 동적 라우트 경고 억제
NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1

# 데이터베이스 설정
ADMIN_DATABASE_URL=sqlite:./admin.db

# 보안 설정
JWT_SECRET=msp-checklist-jwt-secret-change-in-production
SESSION_SECRET=msp-checklist-session-secret-change-in-production
NEXTAUTH_SECRET=msp-checklist-nextauth-secret-change-in-production
NEXTAUTH_URL=http://localhost:3011

# 로깅 설정
LOG_LEVEL=info
LOG_FILE=./admin.log
EOF
    log_success "✅ Admin .env.local 생성 완료"
else
    log_success "✅ Admin .env.local 존재"
    # 포트 설정 확인
    if grep -q "PORT=3011" .env.local; then
        log_success "✅ 포트 3011 설정 확인됨"
    else
        log_warning "⚠️ 포트 설정 수정 중..."
        sed -i 's/PORT=.*/PORT=3011/' .env.local
        echo "PORT=3011" >> .env.local
        log_success "✅ 포트 3011로 설정 완료"
    fi
fi

# Admin globals.css 확인 및 생성
mkdir -p app
if [ ! -f "app/globals.css" ]; then
    log_warning "⚠️ Admin globals.css 없음 - 메인에서 복사 중..."
    if [ -f "$MAIN_APP_DIR/app/globals.css" ]; then
        cp "$MAIN_APP_DIR/app/globals.css" app/
        log_success "✅ Admin globals.css 복사 완료"
    else
        log_warning "⚠️ 메인 globals.css도 없음 - 기본 CSS 생성 중..."
        cat > app/globals.css << 'EOF'
/* MSP Checklist Admin 기본 CSS */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}

body {
  color: #333;
  background-color: #f8f9fa;
  font-size: 14px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
  text-align: center;
  transition: all 0.15s ease-in-out;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
  color: #fff;
}

.card {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.125);
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  padding: 20px;
}
EOF
        log_success "✅ Admin 기본 globals.css 생성 완료"
    fi
else
    log_success "✅ Admin globals.css 존재"
fi

echo ""

# 3. PM2 ecosystem.config.js 확인 및 생성
log_info "3. PM2 ecosystem.config.js 확인 및 생성"
cd "$PROJECT_DIR"

if [ ! -f "ecosystem.config.js" ]; then
    log_warning "⚠️ ecosystem.config.js 없음 - 생성 중..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'msp-checklist-main',
      cwd: '/opt/msp-checklist-system/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist-system/logs/main-error.log',
      out_file: '/opt/msp-checklist-system/logs/main-out.log',
      log_file: '/opt/msp-checklist-system/logs/main-combined.log',
      time: true
    },
    {
      name: 'msp-checklist-admin',
      cwd: '/opt/msp-checklist-system/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist-system/logs/admin-error.log',
      out_file: '/opt/msp-checklist-system/logs/admin-out.log',
      log_file: '/opt/msp-checklist-system/logs/admin-combined.log',
      time: true
    }
  ]
};
EOF
    log_success "✅ ecosystem.config.js 생성 완료"
else
    log_success "✅ ecosystem.config.js 존재"
fi

# 로그 디렉토리 생성
mkdir -p logs

echo ""

# 4. Admin 의존성 설치
log_info "4. Admin 의존성 설치"
cd "$ADMIN_APP_DIR"

if [ ! -d "node_modules" ]; then
    log_info "Admin 의존성 설치 중..."
    npm install --legacy-peer-deps --no-fund --no-audit --force
    
    if [ $? -eq 0 ]; then
        log_success "✅ Admin 의존성 설치 완료"
    else
        log_error "❌ Admin 의존성 설치 실패"
        exit 1
    fi
else
    log_success "✅ Admin node_modules 존재"
fi

echo ""

# 5. Admin 빌드
log_info "5. Admin 빌드"
if [ ! -d ".next" ]; then
    log_info "Admin 빌드 중..."
    
    # 환경 변수 설정
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    export NEXT_PRIVATE_SKIP_STATIC_GENERATION_TRACE=1
    export NEXT_PRIVATE_DISABLE_STATIC_IMAGES=1
    
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "✅ Admin 빌드 완료"
    else
        log_error "❌ Admin 빌드 실패"
        exit 1
    fi
else
    log_success "✅ Admin .next 디렉토리 존재 (빌드됨)"
fi

echo ""

# 6. PM2로 Admin 서버 시작
log_info "6. PM2로 Admin 서버 시작"
cd "$PROJECT_DIR"

# 기존 프로세스 중지
pm2 stop msp-checklist-admin 2>/dev/null || true
pm2 delete msp-checklist-admin 2>/dev/null || true

# PM2로 시작
pm2 start ecosystem.config.js --only msp-checklist-admin

if [ $? -eq 0 ]; then
    log_success "✅ Admin 서버 PM2 시작 완료"
    
    # 상태 확인
    sleep 3
    pm2 status
    
else
    log_error "❌ Admin 서버 PM2 시작 실패"
    
    # 직접 시작 시도
    log_info "직접 시작 시도 중..."
    cd "$ADMIN_APP_DIR"
    PORT=3011 npm start &
    ADMIN_PID=$!
    log_info "Admin 서버 PID: $ADMIN_PID"
fi

echo ""

# 7. 포트 3011 확인
log_info "7. 포트 3011 확인"
sleep 5

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 포트 3011이 리스닝 중입니다"
    
    # HTTP 테스트
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ Admin 서버 HTTP 응답 성공 (HTTP $HTTP_CODE)"
    else
        log_warning "⚠️ Admin 서버 HTTP 응답 실패 (HTTP $HTTP_CODE)"
    fi
    
else
    log_error "❌ 포트 3011이 리스닝되지 않음"
    
    # 로그 확인
    log_info "PM2 로그 확인:"
    pm2 logs msp-checklist-admin --lines 10 2>/dev/null || echo "PM2 로그 없음"
fi

echo ""

# 8. Nginx 프록시 테스트
log_info "8. Nginx /admin 프록시 테스트"
ADMIN_PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
if [[ "$ADMIN_PROXY_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ Nginx /admin 프록시 성공 (HTTP $ADMIN_PROXY_CODE)"
else
    log_warning "⚠️ Nginx /admin 프록시 실패 (HTTP $ADMIN_PROXY_CODE)"
    log_info "Nginx 설정 확인이 필요할 수 있습니다"
fi

echo ""

# 9. 종합 결과
log_info "9. 종합 결과"
echo ""

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "🎉 Admin 서버가 포트 3011에서 성공적으로 실행 중입니다!"
    
    echo ""
    echo "📋 접속 정보:"
    echo "  - 직접 접속: http://localhost:3011"
    echo "  - Nginx 프록시: http://localhost/admin"
    echo ""
    echo "🔧 관리 명령어:"
    echo "  - 상태 확인: pm2 status"
    echo "  - 로그 확인: pm2 logs msp-checklist-admin"
    echo "  - 재시작: pm2 restart msp-checklist-admin"
    echo "  - 중지: pm2 stop msp-checklist-admin"
    
else
    log_error "❌ Admin 서버 시작에 실패했습니다"
    
    echo ""
    echo "🔧 문제 해결 방법:"
    echo "1. 로그 확인:"
    echo "   pm2 logs msp-checklist-admin"
    echo ""
    echo "2. 수동 시작:"
    echo "   cd $ADMIN_APP_DIR"
    echo "   PORT=3011 npm start"
    echo ""
    echo "3. 포트 충돌 확인:"
    echo "   lsof -i :3011"
    echo "   netstat -tuln | grep 3011"
fi

echo ""
echo "=== Admin Server 시작 및 확인 완료 ==="