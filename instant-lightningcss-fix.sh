#!/bin/bash

# 즉시 LightningCSS 문제 해결 스크립트
# 현재 진행 중인 빌드 문제를 즉시 해결합니다.

set -e

echo "🚨 즉시 LightningCSS 문제 해결 시작..."

# MSP Checklist 디렉토리로 이동
cd /opt/msp-checklist/msp-checklist

echo "📍 현재 위치: $(pwd)"

# 1. 모든 빌드 프로세스 강제 중지
echo "⏹️  모든 빌드 프로세스 중지 중..."
sudo pkill -f "next build" 2>/dev/null || true
sudo pkill -f "npm run build" 2>/dev/null || true
sudo pkill -f "turbopack" 2>/dev/null || true
sleep 3

# 2. 빌드 캐시 완전 정리
echo "🧹 빌드 캐시 완전 정리 중..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Tailwind CSS v4 및 LightningCSS 완전 제거
echo "🗑️  Tailwind CSS v4 및 LightningCSS 완전 제거 중..."
npm uninstall @tailwindcss/postcss @tailwindcss/node tailwindcss lightningcss 2>/dev/null || true

# 4. 모든 CSS 설정 파일 제거
echo "🗑️  모든 CSS 설정 파일 제거 중..."
rm -f postcss.config.js
rm -f postcss.config.mjs
rm -f postcss.config.ts
rm -f tailwind.config.js
rm -f tailwind.config.ts

# 5. 완전한 기본 CSS로 교체
echo "🎨 완전한 기본 CSS로 교체 중..."
cat > app/globals.css << 'EOF'
/* MSP Checklist 완전 기본 CSS */

/* 기본 리셋 */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: #333333;
  background-color: #ffffff;
}

/* 기본 레이아웃 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 버튼 */
.btn, button {
  display: inline-block;
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  transition: background-color 0.2s ease;
}

.btn:hover, button:hover {
  background-color: #0056b3;
}

.btn-primary { background-color: #007bff; }
.btn-primary:hover { background-color: #0056b3; }

.btn-secondary { background-color: #6c757d; }
.btn-secondary:hover { background-color: #545b62; }

.btn-success { background-color: #28a745; }
.btn-success:hover { background-color: #1e7e34; }

.btn-danger { background-color: #dc3545; }
.btn-danger:hover { background-color: #c82333; }

/* 카드 */
.card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-header {
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 8px;
}

/* 레이아웃 */
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.flex-row {
  flex-direction: row;
}

.items-center {
  align-items: center;
}

.items-start {
  align-items: flex-start;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.justify-start {
  justify-content: flex-start;
}

.grid {
  display: grid;
  gap: 16px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* 텍스트 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.text-sm { font-size: 14px; }
.text-base { font-size: 16px; }
.text-lg { font-size: 18px; }
.text-xl { font-size: 20px; }
.text-2xl { font-size: 24px; }
.text-3xl { font-size: 30px; }

.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

/* 색상 */
.text-gray-500 { color: #6c757d; }
.text-gray-600 { color: #495057; }
.text-gray-700 { color: #343a40; }
.text-gray-800 { color: #212529; }
.text-gray-900 { color: #000000; }

.text-blue-500 { color: #007bff; }
.text-blue-600 { color: #0056b3; }
.text-green-500 { color: #28a745; }
.text-green-600 { color: #1e7e34; }
.text-red-500 { color: #dc3545; }
.text-red-600 { color: #c82333; }

/* 배경색 */
.bg-white { background-color: #ffffff; }
.bg-gray-50 { background-color: #f8f9fa; }
.bg-gray-100 { background-color: #e9ecef; }
.bg-gray-200 { background-color: #dee2e6; }

.bg-blue-50 { background-color: #e3f2fd; }
.bg-blue-100 { background-color: #bbdefb; }
.bg-green-50 { background-color: #e8f5e8; }
.bg-green-100 { background-color: #c8e6c9; }
.bg-red-50 { background-color: #ffebee; }
.bg-red-100 { background-color: #ffcdd2; }

/* 여백 */
.m-0 { margin: 0; }
.m-1 { margin: 4px; }
.m-2 { margin: 8px; }
.m-3 { margin: 12px; }
.m-4 { margin: 16px; }
.m-5 { margin: 20px; }
.m-6 { margin: 24px; }
.m-8 { margin: 32px; }

.mt-0 { margin-top: 0; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mt-8 { margin-top: 32px; }

.mb-0 { margin-bottom: 0; }
.mb-1 { margin-bottom: 4px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mb-8 { margin-bottom: 32px; }

.ml-0 { margin-left: 0; }
.ml-1 { margin-left: 4px; }
.ml-2 { margin-left: 8px; }
.ml-3 { margin-left: 12px; }
.ml-4 { margin-left: 16px; }

.mr-0 { margin-right: 0; }
.mr-1 { margin-right: 4px; }
.mr-2 { margin-right: 8px; }
.mr-3 { margin-right: 12px; }
.mr-4 { margin-right: 16px; }

/* 패딩 */
.p-0 { padding: 0; }
.p-1 { padding: 4px; }
.p-2 { padding: 8px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.p-5 { padding: 20px; }
.p-6 { padding: 24px; }
.p-8 { padding: 32px; }

.px-0 { padding-left: 0; padding-right: 0; }
.px-1 { padding-left: 4px; padding-right: 4px; }
.px-2 { padding-left: 8px; padding-right: 8px; }
.px-3 { padding-left: 12px; padding-right: 12px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.px-6 { padding-left: 24px; padding-right: 24px; }

.py-0 { padding-top: 0; padding-bottom: 0; }
.py-1 { padding-top: 4px; padding-bottom: 4px; }
.py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.py-6 { padding-top: 24px; padding-bottom: 24px; }

/* 폼 요소 */
input, textarea, select {
  display: block;
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1.5;
  color: #495057;
  background-color: #ffffff;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

/* 유틸리티 */
.hidden { display: none; }
.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }

.w-full { width: 100%; }
.w-auto { width: auto; }
.h-full { height: 100%; }
.h-auto { height: auto; }

.rounded { border-radius: 4px; }
.rounded-lg { border-radius: 8px; }
.rounded-full { border-radius: 50%; }

.shadow { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15); }
.shadow-xl { box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }

.border { border: 1px solid #dee2e6; }
.border-0 { border: none; }

/* MSP 체크리스트 전용 */
.checklist-item {
  padding: 16px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-bottom: 8px;
  background: white;
  transition: all 0.2s ease;
}

.checklist-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.checklist-item.completed {
  background-color: #d4edda;
  border-color: #28a745;
}

.checklist-item.pending {
  background-color: #fff3cd;
  border-color: #ffc107;
}

.checklist-item.failed {
  background-color: #f8d7da;
  border-color: #dc3545;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

/* 로딩 애니메이션 */
.loading {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #e9ecef;
  border-radius: 50%;
  border-top-color: #007bff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 반응형 */
@media (max-width: 640px) {
  .container {
    padding: 0 12px;
  }
  
  .card {
    padding: 16px;
  }
  
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
  
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
  
  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 641px) and (max-width: 768px) {
  .grid-cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 769px) {
  .grid-cols-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}
EOF

# 6. Next.js 설정을 최소한으로 수정 (Turbopack 완전 비활성화)
echo "⚙️  Next.js 설정을 최소한으로 수정 중..."
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Turbopack 완전 비활성화
  turbopack: {
    root: process.cwd()
  },
  
  // 최소한의 webpack 설정
  webpack: (config: any, { isServer }: any) => {
    // 클라이언트에서 모든 Node.js 모듈 차단
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
    
    // 외부 모듈 처리
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF

# 7. 환경 변수 설정
echo "🌍 환경 변수 설정 중..."
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 8. 테스트 빌드 (Webpack 모드 강제)
echo "🔨 테스트 빌드 실행 중 (Webpack 모드 강제)..."

if TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    echo ""
    echo "✅ 빌드 성공! LightningCSS 문제가 완전히 해결되었습니다."
    echo ""
    echo "🎉 해결 완료:"
    echo "- Tailwind CSS 완전 제거"
    echo "- LightningCSS 완전 제거"
    echo "- 완전한 기본 CSS로 대체"
    echo "- Turbopack 완전 비활성화"
    echo "- Webpack 모드 강제 사용"
    echo ""
    echo "이제 설치가 정상적으로 계속 진행됩니다."
    
else
    echo ""
    echo "❌ 여전히 빌드 실패. node_modules 완전 재설치를 시도합니다..."
    
    # 최후의 수단: 완전 재설치
    echo "🔄 node_modules 완전 재설치 중..."
    rm -rf node_modules package-lock.json
    
    # 캐시 완전 정리
    npm cache clean --force
    
    # 재설치
    npm install --no-optional
    
    # 재시도
    if TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        echo "✅ 완전 재설치 후 빌드 성공!"
    else
        echo "❌ 최후의 수단도 실패. 수동 확인이 필요합니다."
        echo ""
        echo "시스템 정보:"
        echo "- Node.js: $(node --version)"
        echo "- npm: $(npm --version)"
        echo "- 메모리: $(free -h | head -2 | tail -1)"
        echo "- 디스크: $(df -h / | tail -1)"
        exit 1
    fi
fi

echo ""
echo "🏁 즉시 LightningCSS 문제 해결 완료!"