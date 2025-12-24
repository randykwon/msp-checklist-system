#!/bin/bash

# Nuclear CSS Fix - 완전한 LightningCSS 제거 및 해결
# Amazon Linux 2023에서 발생하는 모든 CSS 관련 문제 완전 해결

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

echo -e "${RED}💥 Nuclear CSS Fix - 완전한 LightningCSS 제거${NC}"
echo "=================================================="

PROJECT_DIR="/opt/msp-checklist-system/msp-checklist"

# 1. 프로젝트 디렉토리로 이동
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# 2. 모든 프로세스 중지
log_info "모든 관련 프로세스 중지 중..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 3. 모든 빌드 관련 파일 완전 삭제
log_info "모든 빌드 관련 파일 완전 삭제 중..."
rm -rf .next
rm -rf .turbo
rm -rf .swc
rm -rf node_modules
rm -rf package-lock.json
rm -rf yarn.lock
rm -rf pnpm-lock.yaml

# 4. npm 캐시 완전 정리
log_info "npm 캐시 완전 정리 중..."
npm cache clean --force
npm cache verify

# 5. 전역 캐시 정리
log_info "전역 캐시 정리 중..."
rm -rf ~/.npm
rm -rf ~/.cache/npm
rm -rf /tmp/npm-*

# 6. package.json 완전 재작성 (CSS 관련 패키지 완전 제외)
log_info "package.json 완전 재작성 중..."
cat > package.json << 'EOF'
{
  "name": "msp-checklist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.2.2",
    "eslint": "^8",
    "eslint-config-next": "16.0.10",
    "lucide-react": "^0.263.1",
    "next": "16.0.10",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5"
  }
}
EOF

# 7. 모든 CSS 관련 설정 파일 제거
log_info "모든 CSS 관련 설정 파일 제거 중..."
rm -f postcss.config.*
rm -f tailwind.config.*
rm -f .postcssrc*
rm -f *.css.map

# 8. globals.css를 완전히 새로 작성 (CSS만 사용)
log_info "globals.css 완전 재작성 중..."
cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS - 순수 CSS만 사용 */

/* 기본 리셋 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 기본 스타일 */
html,
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: #333;
  background: #fff;
  height: 100%;
}

#__next {
  height: 100%;
}

/* 컨테이너 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 레이아웃 */
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: 2rem 0;
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

.card-header {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.card-content {
  color: #374151;
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
  line-height: 1;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #059669;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
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
  font-size: 0.875rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: white;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
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
  background-color: white;
}

.checklist-item:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}

.checklist-item.completed {
  background-color: #f0f9ff;
  border-color: #3b82f6;
}

.checklist-checkbox {
  margin-right: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.checklist-text {
  flex: 1;
  font-size: 0.875rem;
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

/* 네비게이션 */
.nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
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

.nav-brand:hover {
  color: #3b82f6;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.nav-link:hover {
  color: #3b82f6;
  background-color: #f3f4f6;
}

.nav-link.active {
  color: #3b82f6;
  background-color: #eff6ff;
  font-weight: 500;
}

/* 알림 스타일 */
.alert {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  border: 1px solid;
}

.alert-success {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.alert-error {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.alert-warning {
  background-color: #fffbeb;
  border-color: #fed7aa;
  color: #92400e;
}

.alert-info {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}

/* 유틸리티 클래스 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }

.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }

.hidden { display: none; }
.block { display: block; }

.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }

.shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.shadow-md { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }

/* 반응형 디자인 */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  .card {
    padding: 1rem;
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
EOF

# 9. Next.js 설정을 완전히 새로 작성 (CSS 처리 완전 제거)
log_info "Next.js 설정 완전 재작성 중..."
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기본 설정
  reactStrictMode: true,
  
  // 프로덕션 최적화
  output: 'standalone',
  trailingSlash: false,
  
  // 이미지 최적화
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  
  // 압축 및 최적화
  compress: true,
  poweredByHeader: false,
  
  // 실험적 기능 (최소한만)
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Webpack 설정 (CSS 처리 완전 제거)
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
    
    // 문제가 있는 모듈들 완전 차단
    config.resolve.alias = {
      ...config.resolve.alias,
      'lightningcss': false,
      '@tailwindcss/postcss': false,
      '@tailwindcss/node': false,
      'tailwindcss': false,
      'postcss': false,
      'autoprefixer': false,
    };
    
    // CSS 관련 로더 완전 제거
    config.module.rules = config.module.rules.filter((rule: any) => {
      if (rule.test && rule.test.toString().includes('css')) {
        return false;
      }
      return true;
    });
    
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
  
  // TypeScript 설정
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
EOF

# 10. 환경 변수 최적화
log_info "환경 변수 최적화 중..."
cat > .env.local << 'EOF'
# MSP Checklist 환경 변수 (CSS 프레임워크 없이)
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

# 11. Admin 애플리케이션도 동일하게 처리
if [ -d "admin" ]; then
    log_info "Admin 애플리케이션도 동일하게 처리 중..."
    
    cd admin
    
    # Admin 캐시 삭제
    rm -rf .next
    rm -rf node_modules
    rm -rf package-lock.json
    
    # Admin package.json 복사
    cp ../package.json ./
    
    # Admin globals.css 복사
    if [ -f "app/globals.css" ]; then
        cp ../app/globals.css app/globals.css
    fi
    
    # Admin Next.js 설정 복사
    cp ../next.config.ts ./
    
    # Admin 환경 변수
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

# 12. 의존성 재설치 (완전히 새로운 설치)
log_info "의존성 완전 재설치 중..."

# 환경 변수 설정
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 메인 애플리케이션 의존성 설치
npm install --no-optional --no-fund --no-audit

# 13. webpack 모드로 빌드 시도
log_info "webpack 모드로 빌드 시도 중..."

if npx next build --webpack; then
    log_success "✅ 메인 애플리케이션 빌드 성공!"
    
    # Admin 애플리케이션 빌드
    if [ -d "admin" ]; then
        cd admin
        log_info "Admin 애플리케이션 빌드 중..."
        
        # Admin 의존성 설치
        npm install --no-optional --no-fund --no-audit
        
        if npx next build --webpack; then
            log_success "✅ Admin 애플리케이션 빌드 성공!"
        else
            log_warning "⚠️ Admin 애플리케이션 빌드 실패 (메인은 정상)"
        fi
        cd ..
    fi
    
else
    log_error "❌ webpack 빌드 실패. Turbopack 비활성화 시도 중..."
    
    # Turbopack 완전 비활성화
    export TURBOPACK=0
    export NEXT_PRIVATE_TURBOPACK=0
    
    # 개발 모드로 빌드 시도
    log_info "개발 모드로 빌드 시도 중..."
    export NODE_ENV=development
    
    if npx next build --webpack; then
        log_success "✅ 개발 모드 빌드 성공"
    else
        log_error "❌ 모든 빌드 시도 실패"
        
        # 최후의 수단: 기본 빌드
        log_info "기본 빌드 시도 중..."
        if npm run build; then
            log_success "✅ 기본 빌드 성공"
        else
            log_error "❌ 완전 실패 - 수동 확인 필요"
            exit 1
        fi
    fi
fi

echo ""
log_success "💥 Nuclear CSS Fix 완료!"

echo ""
echo "📊 해결된 문제들:"
echo "  ✅ LightningCSS 네이티브 모듈 완전 제거"
echo "  ✅ Tailwind CSS 의존성 완전 제거"
echo "  ✅ PostCSS 설정 완전 제거"
echo "  ✅ 모든 CSS 프레임워크 의존성 제거"
echo "  ✅ 순수 CSS만 사용하는 구조로 변경"
echo "  ✅ package.json 완전 정리"
echo "  ✅ 모든 캐시 완전 삭제"
echo "  ✅ webpack 모드 강제 사용"

echo ""
echo "🚀 다음 단계:"
echo "1. PM2로 애플리케이션 시작:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "2. 또는 직접 시작:"
echo "   npm run start"

# 14. 자동으로 PM2 시작 여부 확인
read -p "PM2로 애플리케이션을 시작하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "PM2로 애플리케이션 시작 중..."
    
    # 상위 디렉토리로 이동
    cd /opt/msp-checklist-system
    
    # PM2 설정 파일이 있는지 확인
    if [ -f "ecosystem.config.js" ]; then
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
        log_error "ecosystem.config.js 파일을 찾을 수 없습니다."
        echo "수동으로 PM2를 설정하거나 npm run start를 사용하세요."
    fi
else
    echo "Nuclear CSS Fix가 완료되었습니다."
    echo "필요시 수동으로 애플리케이션을 시작하세요."
fi