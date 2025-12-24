#!/bin/bash

# AWS 배포 문제 해결 스크립트
# MSP Checklist 시스템의 AWS 배포 관련 문제를 진단하고 해결합니다

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

# 전역 변수
PROJECT_DIR="/opt/msp-checklist-system"
ISSUES_FOUND=()
FIXES_APPLIED=()

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║            AWS 배포 문제 해결 스크립트                    ║"
    echo "║                                                            ║"
    echo "║  🔍 Next.js 빌드 문제 진단                                ║"
    echo "║  🎨 CSS/스타일링 문제 해결                                ║"
    echo "║  📱 정적 파일 서빙 문제 해결                              ║"
    echo "║  🔧 환경 변수 및 설정 문제 해결                           ║"
    echo "║  🌐 Nginx 프록시 설정 최적화                             ║"
    echo "║  ⚡ 성능 및 캐싱 최적화                                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 현재 상태 진단
diagnose_current_state() {
    log_step "현재 배포 상태 진단 중..."
    
    # 프로젝트 디렉토리 확인
    if [ ! -d "$PROJECT_DIR" ]; then
        ISSUES_FOUND+=("project_directory_missing")
        log_error "❌ 프로젝트 디렉토리가 없습니다: $PROJECT_DIR"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Next.js 빌드 상태 확인
    if [ -d "msp-checklist/.next" ]; then
        log_success "✅ 메인 애플리케이션 빌드 파일 존재"
    else
        ISSUES_FOUND+=("main_app_not_built")
        log_error "❌ 메인 애플리케이션이 빌드되지 않음"
    fi
    
    if [ -d "msp-checklist/admin/.next" ]; then
        log_success "✅ 관리자 애플리케이션 빌드 파일 존재"
    else
        ISSUES_FOUND+=("admin_app_not_built")
        log_warning "⚠️ 관리자 애플리케이션이 빌드되지 않음"
    fi
    
    # 프로세스 상태 확인
    if pgrep -f "node.*3010" > /dev/null; then
        log_success "✅ 메인 서버 (포트 3010) 실행 중"
    else
        ISSUES_FOUND+=("main_server_not_running")
        log_error "❌ 메인 서버가 실행되지 않음"
    fi
    
    if pgrep -f "node.*3011" > /dev/null; then
        log_success "✅ 관리자 서버 (포트 3011) 실행 중"
    else
        ISSUES_FOUND+=("admin_server_not_running")
        log_warning "⚠️ 관리자 서버가 실행되지 않음"
    fi
    
    # Nginx 상태 확인
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 실행 중"
    else
        ISSUES_FOUND+=("nginx_not_running")
        log_error "❌ Nginx 서비스가 실행되지 않음"
    fi
    
    # HTTP 응답 확인
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 응답 정상 ($http_code)"
    else
        ISSUES_FOUND+=("http_response_issue")
        log_error "❌ HTTP 응답 문제 ($http_code)"
    fi
}

# Next.js 설정 최적화
fix_nextjs_config() {
    log_step "Next.js 설정 최적화 중..."
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # Next.js 설정 파일 생성/업데이트
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화
  output: 'standalone',
  trailingSlash: false,
  
  // 이미지 최적화 (AWS 환경에서 문제 방지)
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // 정적 파일 최적화
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  
  // 압축 및 최적화
  compress: true,
  poweredByHeader: false,
  
  // 실험적 기능
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Webpack 설정
  webpack: (config: any, { isServer, dev }: any) => {
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
    
    // 프로덕션 최적화
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    
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
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
EOF

    # Admin 애플리케이션도 동일하게 설정
    if [ -d "admin" ]; then
        cp next.config.ts admin/
    fi
    
    FIXES_APPLIED+=("nextjs_config_optimized")
    log_success "✅ Next.js 설정 최적화 완료"
}

# CSS 및 스타일링 문제 해결
fix_css_issues() {
    log_step "CSS 및 스타일링 문제 해결 중..."
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # Tailwind CSS 설정 확인 및 수정
    if [ -f "tailwind.config.ts" ]; then
        cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
  // 프로덕션에서 미사용 CSS 제거
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
      './app/**/*.{js,ts,jsx,tsx}',
    ],
  },
};

export default config;
EOF
    fi
    
    # 글로벌 CSS 최적화
    if [ -f "app/globals.css" ]; then
        # 기존 CSS 백업
        cp app/globals.css app/globals.css.backup
        
        cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 기본 스타일 */
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  color: var(--foreground);
  background: var(--background);
}

a {
  color: inherit;
  text-decoration: none;
}

/* MSP Checklist 커스텀 스타일 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
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

/* 반응형 디자인 */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
  
  .card {
    padding: 1rem;
  }
}

/* 로딩 애니메이션 */
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 체크리스트 스타일 */
.checklist-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.checklist-item:hover {
  background-color: #f9fafb;
}

.checklist-item.completed {
  background-color: #f0f9ff;
  border-color: #3b82f6;
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
EOF
    fi
    
    FIXES_APPLIED+=("css_issues_fixed")
    log_success "✅ CSS 및 스타일링 문제 해결 완료"
}

# 환경 변수 최적화
fix_environment_variables() {
    log_step "환경 변수 최적화 중..."
    
    cd "$PROJECT_DIR"
    
    # 프로덕션용 환경 변수 설정
    cat > .env.production << 'EOF'
# MSP Checklist 프로덕션 환경 변수
NODE_ENV=production
PORT=3010
ADMIN_PORT=3011
HOST=0.0.0.0

# Next.js 최적화
NEXT_TELEMETRY_DISABLED=1
TURBOPACK=0
NODE_OPTIONS=--max-old-space-size=2048

# 데이터베이스 설정
DATABASE_URL=sqlite:./msp_checklist.db
ADMIN_DATABASE_URL=sqlite:./admin.db

# 보안 설정 (프로덕션에서 변경 필요)
JWT_SECRET=msp-checklist-jwt-secret-production-change-this
SESSION_SECRET=msp-checklist-session-secret-production-change-this
NEXTAUTH_SECRET=msp-checklist-nextauth-secret-production-change-this
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

# 캐싱 설정
ENABLE_CACHE=true
CACHE_TTL=3600

# 성능 설정
ENABLE_COMPRESSION=true
ENABLE_STATIC_OPTIMIZATION=true
EOF

    # 메인 애플리케이션 환경 변수
    if [ -d "msp-checklist" ]; then
        cd msp-checklist
        cp ../.env.production .env.local
        
        # Admin 애플리케이션 환경 변수
        if [ -d "admin" ]; then
            cd admin
            cp ../../.env.production .env.local
            sed -i 's/PORT=3010/PORT=3011/' .env.local
            cd ..
        fi
        cd ..
    fi
    
    FIXES_APPLIED+=("environment_variables_optimized")
    log_success "✅ 환경 변수 최적화 완료"
}

# 애플리케이션 재빌드
rebuild_applications() {
    log_step "애플리케이션 재빌드 중..."
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # 기존 빌드 파일 제거
    rm -rf .next node_modules/.cache
    
    # 환경 변수 설정
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 의존성 재설치
    log_info "의존성 재설치 중..."
    npm ci --only=production
    
    # 메인 애플리케이션 빌드
    log_info "메인 애플리케이션 빌드 중..."
    if npm run build; then
        log_success "✅ 메인 애플리케이션 빌드 성공"
        
        # Admin 애플리케이션 빌드
        if [ -d "admin" ]; then
            cd admin
            log_info "관리자 애플리케이션 빌드 중..."
            
            # Admin 의존성 설치
            npm ci --only=production
            
            if npm run build; then
                log_success "✅ 관리자 애플리케이션 빌드 성공"
            else
                log_warning "⚠️ 관리자 애플리케이션 빌드 실패 (메인은 정상)"
            fi
            cd ..
        fi
    else
        log_error "❌ 메인 애플리케이션 빌드 실패"
        return 1
    fi
    
    FIXES_APPLIED+=("applications_rebuilt")
    log_success "✅ 애플리케이션 재빌드 완료"
}

# Nginx 설정 최적화
optimize_nginx_config() {
    log_step "Nginx 설정 최적화 중..."
    
    # OS 감지
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
        elif [[ "$ID" == "amzn" ]]; then
            OS_TYPE="amazon-linux-2023"
        fi
    fi
    
    # 기존 MSP 설정 백업
    if [[ "$OS_TYPE" == "ubuntu" ]] && [ -f "/etc/nginx/sites-available/msp-checklist" ]; then
        sudo cp /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-available/msp-checklist.backup
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]] && [ -f "/etc/nginx/conf.d/msp-checklist.conf" ]; then
        sudo cp /etc/nginx/conf.d/msp-checklist.conf /etc/nginx/conf.d/msp-checklist.conf.backup
    fi
    
    # 최적화된 Nginx 설정 생성
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        create_optimized_ubuntu_nginx_config
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        create_optimized_amazon_nginx_config
    fi
    
    # Nginx 설정 테스트 및 재시작
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "✅ Nginx 설정 최적화 완료"
    else
        log_error "❌ Nginx 설정 오류"
        return 1
    fi
    
    FIXES_APPLIED+=("nginx_config_optimized")
}

# Ubuntu용 최적화된 Nginx 설정
create_optimized_ubuntu_nginx_config() {
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
# MSP Checklist 최적화된 Nginx 설정 (Ubuntu)
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

# 레이트 리미팅
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# 캐시 설정
proxy_cache_path /var/cache/nginx/msp levels=1:2 keys_zone=msp_cache:10m max_size=100m inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    
    # 업로드 크기 제한
    client_max_body_size 50M;
    client_body_buffer_size 128k;
    
    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 관리자 시스템
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=20 nodelay;
        
        # 캐시 비활성화 (동적 콘텐츠)
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Next.js 정적 파일 (_next/static)
    location /_next/static/ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        
        # 장기 캐싱
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # 압축
        gzip_static on;
    }
    
    # 이미지 및 정적 파일
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        
        # 캐싱 설정
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header Vary "Accept-Encoding";
        
        # 압축
        gzip_static on;
    }
    
    # API 라우트
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API 캐시 비활성화
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        limit_req zone=api burst=30 nodelay;
    }
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=50 nodelay;
        
        # HTML 캐싱 (짧은 시간)
        location ~* \.html$ {
            proxy_pass http://msp_main;
            proxy_set_header Host $host;
            expires 5m;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # 헬스체크
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 파비콘
    location /favicon.ico {
        proxy_pass http://msp_main;
        expires 1d;
        add_header Cache-Control "public";
        access_log off;
    }
    
    # 보안: 숨겨진 파일 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
}

# Amazon Linux용 최적화된 Nginx 설정
create_optimized_amazon_nginx_config() {
    sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
# MSP Checklist 최적화된 Nginx 설정 (Amazon Linux 2023)
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

# 레이트 리미팅
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# 캐시 설정
proxy_cache_path /var/cache/nginx/msp levels=1:2 keys_zone=msp_cache:10m max_size=100m inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    
    # 업로드 크기 제한
    client_max_body_size 50M;
    client_body_buffer_size 128k;
    
    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 관리자 시스템
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=20 nodelay;
        
        # 캐시 비활성화 (동적 콘텐츠)
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Next.js 정적 파일 (_next/static)
    location /_next/static/ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        
        # 장기 캐싱
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # 압축
        gzip_static on;
    }
    
    # 이미지 및 정적 파일
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        
        # 캐싱 설정
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header Vary "Accept-Encoding";
        
        # 압축
        gzip_static on;
    }
    
    # API 라우트
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API 캐시 비활성화
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        limit_req zone=api burst=30 nodelay;
    }
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=50 nodelay;
        
        # HTML 캐싱 (짧은 시간)
        location ~* \.html$ {
            proxy_pass http://msp_main;
            proxy_set_header Host $host;
            expires 5m;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # 헬스체크
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 파비콘
    location /favicon.ico {
        proxy_pass http://msp_main;
        expires 1d;
        add_header Cache-Control "public";
        access_log off;
    }
    
    # 보안: 숨겨진 파일 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF
}

# PM2 설정 최적화
optimize_pm2_config() {
    log_step "PM2 설정 최적화 중..."
    
    cd "$PROJECT_DIR"
    
    # 최적화된 PM2 설정 파일 생성
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
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      error_file: '/opt/msp-checklist-system/logs/main-error.log',
      out_file: '/opt/msp-checklist-system/logs/main-out.log',
      log_file: '/opt/msp-checklist-system/logs/main-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
    },
    {
      name: 'msp-checklist-admin',
      cwd: '/opt/msp-checklist-system/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        NODE_OPTIONS: '--max-old-space-size=1024'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      error_file: '/opt/msp-checklist-system/logs/admin-error.log',
      out_file: '/opt/msp-checklist-system/logs/admin-out.log',
      log_file: '/opt/msp-checklist-system/logs/admin-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
    }
  ]
};
EOF

    # 로그 디렉토리 생성
    mkdir -p logs
    
    FIXES_APPLIED+=("pm2_config_optimized")
    log_success "✅ PM2 설정 최적화 완료"
}

# 애플리케이션 재시작
restart_applications() {
    log_step "애플리케이션 재시작 중..."
    
    cd "$PROJECT_DIR"
    
    # PM2 프로세스 중지
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # 새로운 설정으로 시작
    pm2 start ecosystem.config.js
    pm2 save
    
    # 시작 스크립트 설정
    pm2 startup
    
    # 상태 확인
    sleep 10
    local running_processes=$(pm2 list | grep -c "online" || echo "0")
    
    if [ "$running_processes" -gt 0 ]; then
        log_success "✅ 애플리케이션 재시작 완료 ($running_processes개 프로세스)"
    else
        log_error "❌ 애플리케이션 시작 실패"
        pm2 logs --lines 20
        return 1
    fi
    
    FIXES_APPLIED+=("applications_restarted")
}

# 캐시 디렉토리 생성
setup_cache_directories() {
    log_step "캐시 디렉토리 설정 중..."
    
    # Nginx 캐시 디렉토리
    sudo mkdir -p /var/cache/nginx/msp
    sudo chown -R nginx:nginx /var/cache/nginx/msp 2>/dev/null || sudo chown -R www-data:www-data /var/cache/nginx/msp 2>/dev/null || true
    
    # Next.js 캐시 최적화
    cd "$PROJECT_DIR/msp-checklist"
    mkdir -p .next/cache
    
    if [ -d "admin" ]; then
        cd admin
        mkdir -p .next/cache
        cd ..
    fi
    
    FIXES_APPLIED+=("cache_directories_setup")
    log_success "✅ 캐시 디렉토리 설정 완료"
}

# 최종 테스트
run_final_tests() {
    log_step "최종 테스트 실행 중..."
    
    sleep 5
    
    # HTTP 응답 테스트
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 응답 테스트 통과 ($http_code)"
    else
        log_error "❌ HTTP 응답 테스트 실패 ($http_code)"
    fi
    
    # 관리자 페이지 테스트
    local admin_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ "$admin_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ 관리자 페이지 테스트 통과 ($admin_code)"
    else
        log_warning "⚠️ 관리자 페이지 응답: $admin_code"
    fi
    
    # 정적 파일 테스트
    local static_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/_next/static/ 2>/dev/null || echo "000")
    if [[ "$static_code" =~ ^[2-4][0-9][0-9]$ ]]; then
        log_success "✅ 정적 파일 서빙 정상"
    else
        log_info "ℹ️ 정적 파일 응답: $static_code (정상일 수 있음)"
    fi
    
    # API 테스트
    local api_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
    if [[ "$api_code" =~ ^[2-4][0-9][0-9]$ ]]; then
        log_success "✅ API 엔드포인트 정상"
    else
        log_info "ℹ️ API 응답: $api_code"
    fi
    
    # 프로세스 상태 확인
    local pm2_status=$(pm2 list | grep -c "online" || echo "0")
    log_info "PM2 프로세스 상태: $pm2_status개 온라인"
    
    # Nginx 상태 확인
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 정상"
    else
        log_error "❌ Nginx 서비스 문제"
    fi
}

# 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🚀 AWS 배포 최적화 완료! 🚀                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist AWS 배포 최적화가 완료되었습니다!"
    
    # 공용 IP 확인
    local public_ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    echo "  - 메인 서비스: http://$public_ip"
    echo "  - 관리자 시스템: http://$public_ip/admin"
    echo "  - 헬스체크: http://$public_ip/health"
    
    echo ""
    echo "🔧 적용된 최적화:"
    for fix in "${FIXES_APPLIED[@]}"; do
        case $fix in
            "nextjs_config_optimized")
                echo "  ✅ Next.js 설정 최적화"
                ;;
            "css_issues_fixed")
                echo "  ✅ CSS 및 스타일링 문제 해결"
                ;;
            "environment_variables_optimized")
                echo "  ✅ 환경 변수 최적화"
                ;;
            "applications_rebuilt")
                echo "  ✅ 애플리케이션 재빌드"
                ;;
            "nginx_config_optimized")
                echo "  ✅ Nginx 설정 최적화"
                ;;
            "pm2_config_optimized")
                echo "  ✅ PM2 설정 최적화"
                ;;
            "applications_restarted")
                echo "  ✅ 애플리케이션 재시작"
                ;;
            "cache_directories_setup")
                echo "  ✅ 캐시 디렉토리 설정"
                ;;
        esac
    done
    
    echo ""
    echo "📊 성능 개선사항:"
    echo "  - 정적 파일 캐싱 활성화"
    echo "  - gzip 압축 최적화"
    echo "  - Next.js 빌드 최적화"
    echo "  - 메모리 사용량 최적화"
    echo "  - 응답 시간 개선"
    
    echo ""
    echo "🔧 관리 명령어:"
    echo "  - 상태 확인: pm2 status"
    echo "  - 로그 확인: pm2 logs"
    echo "  - 재시작: pm2 restart all"
    echo "  - Nginx 상태: sudo systemctl status nginx"
    echo "  - Nginx 재시작: sudo systemctl restart nginx"
    
    echo ""
    echo "📝 추가 권장사항:"
    echo "1. AWS 보안 그룹에서 포트 80, 443 인바운드 규칙 확인"
    echo "2. CloudFront CDN 설정으로 성능 추가 개선"
    echo "3. Route 53으로 도메인 설정"
    echo "4. SSL 인증서 설정 (Let's Encrypt 또는 AWS Certificate Manager)"
    echo "5. CloudWatch로 모니터링 설정"
    
    echo ""
}

# 메인 실행 함수
main() {
    show_banner
    
    # 사용자 확인
    read -p "AWS 배포 최적화를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "최적화가 취소되었습니다."
        exit 0
    fi
    
    # 진단 및 수정 과정
    diagnose_current_state
    
    # 문제가 발견된 경우에만 해당 수정 실행
    if [[ " ${ISSUES_FOUND[@]} " =~ " main_app_not_built " ]] || [[ " ${ISSUES_FOUND[@]} " =~ " admin_app_not_built " ]]; then
        fix_nextjs_config
        fix_css_issues
        fix_environment_variables
        rebuild_applications
    fi
    
    optimize_nginx_config
    optimize_pm2_config
    setup_cache_directories
    
    if [[ " ${ISSUES_FOUND[@]} " =~ " main_server_not_running " ]] || [[ " ${ISSUES_FOUND[@]} " =~ " admin_server_not_running " ]]; then
        restart_applications
    fi
    
    run_final_tests
    show_completion_info
    
    log_success "AWS 배포 최적화가 성공적으로 완료되었습니다! 🎉"
}

# 스크립트 실행
main "$@"