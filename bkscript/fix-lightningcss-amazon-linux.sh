#!/bin/bash

# Amazon Linux 2023 LightningCSS 문제 해결 스크립트

set -e

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

echo -e "${BLUE}🔧 Amazon Linux 2023 LightningCSS 문제 해결${NC}"
echo "================================================"

PROJECT_DIR="/opt/msp-checklist-system/msp-checklist"

# 1. 프로젝트 디렉토리로 이동
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# 2. 현재 상태 확인
log_info "현재 상태 확인 중..."
echo "Node.js 버전: $(node --version)"
echo "npm 버전: $(npm --version)"
echo "OS 정보: $(cat /etc/os-release | grep PRETTY_NAME)"

# 3. 문제가 있는 패키지들 제거
log_info "문제가 있는 CSS 관련 패키지들 제거 중..."

# LightningCSS 관련 패키지 제거
npm uninstall lightningcss @tailwindcss/postcss @tailwindcss/node 2>/dev/null || true

# PostCSS 관련 패키지 제거
npm uninstall postcss autoprefixer 2>/dev/null || true

# Tailwind CSS 제거
npm uninstall tailwindcss 2>/dev/null || true

# 4. 설정 파일들 제거
log_info "CSS 관련 설정 파일들 제거 중..."
rm -f postcss.config.* tailwind.config.* 2>/dev/null || true

# 5. 캐시 정리
log_info "npm 캐시 정리 중..."
npm cache clean --force
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .next 2>/dev/null || true

# 6. 간단한 CSS 프레임워크로 교체
log_info "간단한 CSS 설정으로 교체 중..."

# globals.css를 간단한 CSS로 교체
cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS - Amazon Linux 2023 호환 */

/* 기본 리셋 */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 기본 스타일 */
html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: #333;
  background: #fff;
}

/* 컨테이너 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 카드 스타일 */
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 버튼 스타일 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

/* 폼 스타일 */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 체크리스트 스타일 */
.checklist-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.checklist-item:hover {
  background-color: #f9fafb;
}

.checklist-item.completed {
  background-color: #f0f9ff;
  border-color: #3b82f6;
}

.checklist-checkbox {
  margin-right: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
}

.checklist-text {
  flex: 1;
}

.checklist-text.completed {
  text-decoration: line-through;
  color: #6b7280;
}

/* 진행률 바 */
.progress-container {
  margin: 1rem 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s ease;
}

/* 통계 카드 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

/* 네비게이션 */
.nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #3b82f6;
  background-color: #f3f4f6;
}

.nav-link.active {
  color: #3b82f6;
  background-color: #eff6ff;
}

/* 유틸리티 클래스 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-5 { margin-top: 1.25rem; }
.mt-6 { margin-top: 1.5rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

.w-full { width: 100%; }
.h-full { height: 100%; }

.hidden { display: none; }
.block { display: block; }
.inline-block { display: inline-block; }

/* 반응형 디자인 */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  .card {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 로딩 애니메이션 */
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 알림 스타일 */
.alert {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.alert-success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.alert-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.alert-warning {
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  color: #92400e;
}

.alert-info {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
EOF

# 7. Next.js 설정 최적화 (LightningCSS 없이)
log_info "Next.js 설정 최적화 중..."

cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화
  output: 'standalone',
  trailingSlash: false,
  
  // 이미지 최적화 (AWS 환경 호환)
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // 압축 및 최적화
  compress: true,
  poweredByHeader: false,
  
  // 실험적 기능 (LightningCSS 제외)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Webpack 설정 (Amazon Linux 2023 호환)
  webpack: (config: any, { isServer }: any) => {
    // 클라이언트 사이드에서 서버 전용 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        events: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        cluster: false,
        module: false,
        readline: false,
        repl: false,
        vm: false,
        constants: false,
        domain: false,
        punycode: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        dgram: false,
        assert: false,
      };
    }
    
    // 외부 패키지 설정
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    // 네이티브 모듈 문제 해결
    config.resolve.alias = {
      ...config.resolve.alias,
      'lightningcss': false,
      '@tailwindcss/postcss': false,
    };
    
    return config;
  },
  
  // 서버 외부 패키지
  serverExternalPackages: ['better-sqlite3'],
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
EOF

# Admin 애플리케이션도 동일하게 처리
if [ -d "admin" ]; then
    log_info "Admin 애플리케이션 CSS 문제 해결 중..."
    
    cd admin
    
    # 문제가 있는 패키지들 제거
    npm uninstall lightningcss @tailwindcss/postcss @tailwindcss/node tailwindcss postcss autoprefixer 2>/dev/null || true
    
    # 설정 파일들 제거
    rm -f postcss.config.* tailwind.config.* 2>/dev/null || true
    
    # globals.css 복사
    if [ -f "app/globals.css" ]; then
        cp ../app/globals.css app/globals.css
    fi
    
    # Next.js 설정 복사
    cp ../next.config.ts ./
    
    cd ..
fi

# 8. 환경 변수 최적화
log_info "환경 변수 최적화 중..."

cat > .env.local << 'EOF'
# MSP Checklist 환경 변수 (Amazon Linux 2023 최적화)
NODE_ENV=production
PORT=3010
HOST=0.0.0.0

# Next.js 최적화
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=2048

# 데이터베이스 설정
DATABASE_URL=sqlite:./msp_checklist.db

# 보안 설정
JWT_SECRET=msp-checklist-jwt-secret-change-in-production
SESSION_SECRET=msp-checklist-session-secret-change-in-production
NEXTAUTH_SECRET=msp-checklist-nextauth-secret-change-in-production
NEXTAUTH_URL=http://localhost:3010

# API 설정
OPENAI_API_KEY=your-openai-api-key-here
CLAUDE_API_KEY=your-claude-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# 파일 업로드 설정
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# 로깅 설정
LOG_LEVEL=info
LOG_FILE=./server.log
EOF

# Admin 환경 변수도 설정
if [ -d "admin" ]; then
    cd admin
    cat > .env.local << 'EOF'
# MSP Checklist Admin 환경 변수
NODE_ENV=production
PORT=3011
HOST=0.0.0.0

# Next.js 최적화
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=1024

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
    cd ..
fi

# 9. 의존성 재설치
log_info "의존성 재설치 중..."

# 환경 변수 설정
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 메인 애플리케이션 의존성 설치
npm install --omit=optional --legacy-peer-deps

# 10. 빌드 재시도
log_info "메인 애플리케이션 빌드 재시도 중..."

if npm run build; then
    log_success "✅ 메인 애플리케이션 빌드 성공!"
    
    # Admin 애플리케이션 빌드
    if [ -d "admin" ]; then
        cd admin
        log_info "Admin 애플리케이션 빌드 중..."
        
        # Admin 의존성 설치
        npm install --omit=optional --legacy-peer-deps
        
        if npm run build; then
            log_success "✅ Admin 애플리케이션 빌드 성공!"
        else
            log_warning "⚠️ Admin 애플리케이션 빌드 실패 (메인은 정상)"
        fi
        cd ..
    fi
    
else
    log_error "❌ 빌드 실패. 추가 문제 해결 시도 중..."
    
    # 추가 문제 해결
    log_info "package.json에서 문제가 있는 의존성 제거 중..."
    
    # package.json에서 CSS 관련 의존성 제거
    if command -v jq > /dev/null 2>&1; then
        # jq가 있는 경우
        jq 'del(.dependencies.lightningcss, .dependencies."@tailwindcss/postcss", .dependencies."@tailwindcss/node", .dependencies.tailwindcss, .dependencies.postcss, .dependencies.autoprefixer)' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        # jq가 없는 경우 sed 사용
        sed -i '/"lightningcss"/d; /"@tailwindcss/d; /"tailwindcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json
    fi
    
    # 의존성 재설치
    rm -rf node_modules package-lock.json
    npm install --omit=optional --legacy-peer-deps
    
    # 빌드 재시도
    if npm run build; then
        log_success "✅ 문제 해결 후 빌드 성공!"
    else
        log_error "❌ 빌드 계속 실패. 수동 확인이 필요합니다."
        exit 1
    fi
fi

echo ""
log_success "🎉 Amazon Linux 2023 LightningCSS 문제 해결 완료!"

echo ""
echo "📊 해결된 문제들:"
echo "  ✅ LightningCSS 네이티브 모듈 충돌 해결"
echo "  ✅ Tailwind CSS 의존성 제거"
echo "  ✅ 간단한 CSS 프레임워크로 교체"
echo "  ✅ Next.js 설정 최적화"
echo "  ✅ 환경 변수 최적화"
echo "  ✅ Amazon Linux 2023 호환성 확보"

echo ""
echo "🚀 다음 단계:"
echo "1. MSP 배포 스크립트 계속 실행"
echo "2. 또는 수동으로 PM2 설정 및 시작"

# 11. 자동으로 배포 스크립트 계속 실행
read -p "MSP Checklist 배포를 계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "MSP Checklist 배포 계속 진행 중..."
    
    # 상위 디렉토리로 이동
    cd /opt/msp-checklist-system
    
    # PM2 설정 및 시작
    log_info "PM2 설정 및 애플리케이션 시작 중..."
    
    # PM2 설정 파일 생성
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
        PORT: 3010,
        NODE_OPTIONS: '--max-old-space-size=2048'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: '/opt/msp-checklist-system/logs/main-error.log',
      out_file: '/opt/msp-checklist-system/logs/main-out.log',
      log_file: '/opt/msp-checklist-system/logs/main-combined.log',
      time: true
    }
  ]
};
EOF

    # 로그 디렉토리 생성
    mkdir -p logs
    
    # PM2로 애플리케이션 시작
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    log_success "✅ MSP Checklist 애플리케이션 시작 완료!"
    
    # 상태 확인
    sleep 5
    pm2 status
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
    echo "  - 메인 서비스: http://$PUBLIC_IP:3010"
    echo "  - 또는 Nginx 설정 후: http://$PUBLIC_IP"
    
else
    echo "LightningCSS 문제 해결이 완료되었습니다."
    echo "필요시 수동으로 PM2를 설정하고 애플리케이션을 시작하세요."
fi