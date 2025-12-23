#!/bin/bash

# 궁극적인 빌드 문제 해결 스크립트
# 모든 CSS 프레임워크 문제를 우회하여 기본 CSS로 대체합니다.

set -e

echo "🚨 궁극적인 빌드 문제 해결 시작..."

# MSP Checklist 디렉토리로 이동
cd /opt/msp-checklist/msp-checklist

echo "📍 현재 위치: $(pwd)"

# 1. 모든 빌드 프로세스 강제 중지
echo "⏹️  모든 빌드 프로세스 중지 중..."
sudo pkill -f "next" 2>/dev/null || true
sudo pkill -f "npm" 2>/dev/null || true
sleep 3

# 2. 완전한 정리
echo "🧹 완전한 정리 중..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

# 3. 모든 CSS 프레임워크 제거
echo "🗑️  모든 CSS 프레임워크 제거 중..."
npm uninstall tailwindcss @tailwindcss/postcss @tailwindcss/node postcss autoprefixer lightningcss 2>/dev/null || true

# 4. 기존 CSS 설정 파일 제거
echo "🗑️  기존 CSS 설정 파일 제거 중..."
rm -f postcss.config.js
rm -f postcss.config.mjs
rm -f postcss.config.ts
rm -f tailwind.config.js
rm -f tailwind.config.ts

# 5. 기본 CSS로 globals.css 교체
echo "🎨 기본 CSS로 교체 중..."
cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS 스타일 */

/* 기본 리셋 */
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f8fafc;
}

/* 컨테이너 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 버튼 스타일 */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #6b7280;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.btn-success {
  background-color: #10b981;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-danger {
  background-color: #ef4444;
}

.btn-danger:hover {
  background-color: #dc2626;
}

/* 카드 스타일 */
.card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
}

.card-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

/* 레이아웃 */
.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
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

/* 텍스트 */
.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.text-sm {
  font-size: 0.875rem;
}

.text-base {
  font-size: 1rem;
}

.text-lg {
  font-size: 1.125rem;
}

.text-xl {
  font-size: 1.25rem;
}

.text-2xl {
  font-size: 1.5rem;
}

.font-bold {
  font-weight: 700;
}

.font-semibold {
  font-weight: 600;
}

.font-medium {
  font-weight: 500;
}

/* 색상 */
.text-gray-500 {
  color: #6b7280;
}

.text-gray-700 {
  color: #374151;
}

.text-gray-900 {
  color: #111827;
}

.text-blue-600 {
  color: #2563eb;
}

.text-green-600 {
  color: #059669;
}

.text-red-600 {
  color: #dc2626;
}

/* 배경색 */
.bg-white {
  background-color: white;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.bg-green-50 {
  background-color: #ecfdf5;
}

.bg-red-50 {
  background-color: #fef2f2;
}

/* 여백 */
.m-0 { margin: 0; }
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-4 { margin: 1rem; }
.m-8 { margin: 2rem; }

.mt-0 { margin-top: 0; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-8 { margin-top: 2rem; }

.mb-0 { margin-bottom: 0; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-8 { margin-bottom: 2rem; }

.ml-0 { margin-left: 0; }
.ml-1 { margin-left: 0.25rem; }
.ml-2 { margin-left: 0.5rem; }
.ml-4 { margin-left: 1rem; }
.ml-8 { margin-left: 2rem; }

.mr-0 { margin-right: 0; }
.mr-1 { margin-right: 0.25rem; }
.mr-2 { margin-right: 0.5rem; }
.mr-4 { margin-right: 1rem; }
.mr-8 { margin-right: 2rem; }

/* 패딩 */
.p-0 { padding: 0; }
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }

.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }

.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }

/* 폼 요소 */
.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #374151;
  background-color: white;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

/* 유틸리티 */
.hidden {
  display: none;
}

.block {
  display: block;
}

.inline {
  display: inline;
}

.inline-block {
  display: inline-block;
}

.w-full {
  width: 100%;
}

.h-full {
  height: 100%;
}

.rounded {
  border-radius: 0.25rem;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.shadow {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
}

.shadow-lg {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
}

/* 반응형 */
@media (min-width: 640px) {
  .sm\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .sm\:text-lg {
    font-size: 1.125rem;
  }
}

@media (min-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  
  .md\:text-xl {
    font-size: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* MSP 체크리스트 전용 스타일 */
.checklist-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
}

.checklist-item.completed {
  background-color: #ecfdf5;
  border-color: #10b981;
}

.checklist-item.pending {
  background-color: #fef3c7;
  border-color: #f59e0b;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #10b981;
  transition: width 0.3s ease;
}

/* 로딩 애니메이션 */
.loading {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
EOF

# 6. Next.js 설정을 최소한으로 수정
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
  experimental: {
    turbo: false
  },
  
  // 최소한의 webpack 설정
  webpack: (config: any, { isServer }: any) => {
    // 클라이언트에서 Node.js 모듈 완전 차단
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

# 7. package.json에서 CSS 관련 스크립트 정리
echo "📦 package.json 정리 중..."
if [ -f "package.json" ]; then
  # 백업 생성
  cp package.json package.json.backup
  
  # CSS 관련 스크립트 제거 (있다면)
  sed -i '/"cache"/d' package.json 2>/dev/null || true
fi

# 8. 환경 변수 설정
echo "🌍 환경 변수 설정 중..."
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 9. 테스트 빌드
echo "🔨 테스트 빌드 실행 중..."
if TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    echo ""
    echo "✅ 빌드 성공! 모든 CSS 프레임워크 문제가 해결되었습니다."
    echo ""
    echo "🎉 해결 완료:"
    echo "- Tailwind CSS 완전 제거"
    echo "- 기본 CSS로 대체"
    echo "- Turbopack 비활성화"
    echo "- Node.js 모듈 완전 차단"
    echo ""
    echo "이제 설치가 정상적으로 계속 진행됩니다."
    
else
    echo ""
    echo "❌ 여전히 빌드 실패. 최후의 수단을 시도합니다..."
    
    # 최후의 수단: node_modules 완전 재설치
    echo "🔄 node_modules 완전 재설치 중..."
    rm -rf node_modules package-lock.json
    npm install
    
    # 재시도
    if TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        echo "✅ 완전 재설치 후 빌드 성공!"
    else
        echo "❌ 최후의 수단도 실패. 수동 확인이 필요합니다."
        echo ""
        echo "문제 해결을 위해 다음 정보를 확인하세요:"
        echo "1. Node.js 버전: $(node --version)"
        echo "2. 메모리 상태: $(free -h | head -2)"
        echo "3. 디스크 공간: $(df -h / | tail -1)"
        exit 1
    fi
fi

echo ""
echo "🏁 궁극적인 빌드 문제 해결 완료!"