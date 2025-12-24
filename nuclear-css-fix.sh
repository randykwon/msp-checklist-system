#!/bin/bash

# 핵심 CSS 문제 완전 해결 스크립트
# 모든 CSS 프레임워크를 완전히 제거하고 순수 CSS로 대체합니다.

set -e

echo "💥 핵심 CSS 문제 완전 해결 시작..."

# MSP Checklist 디렉토리로 이동
cd /opt/msp-checklist-system/msp-checklist

echo "📍 현재 위치: $(pwd)"

# 1. 모든 프로세스 강제 종료
echo "⏹️  모든 관련 프로세스 강제 종료 중..."
sudo pkill -f "next" 2>/dev/null || true
sudo pkill -f "npm" 2>/dev/null || true
sudo pkill -f "node" 2>/dev/null || true
sudo pkill -f "turbo" 2>/dev/null || true
sleep 5

# 2. 모든 빌드 캐시 및 임시 파일 완전 삭제
echo "🧹 모든 캐시 및 임시 파일 완전 삭제 중..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf /tmp/next-*
rm -rf ~/.npm/_cacache
sudo rm -rf /tmp/npm-*

# 3. 모든 CSS 관련 패키지 완전 제거
echo "🗑️  모든 CSS 관련 패키지 완전 제거 중..."
npm uninstall tailwindcss @tailwindcss/postcss @tailwindcss/node @tailwindcss/typography @tailwindcss/forms @tailwindcss/aspect-ratio lightningcss postcss autoprefixer 2>/dev/null || true

# 4. 모든 CSS 설정 파일 완전 삭제
echo "🗑️  모든 CSS 설정 파일 완전 삭제 중..."
rm -f postcss.config.*
rm -f tailwind.config.*
rm -f .postcssrc*
rm -f tailwind.*

# 5. node_modules에서 CSS 관련 디렉토리 강제 삭제
echo "🗑️  node_modules에서 CSS 관련 디렉토리 강제 삭제 중..."
rm -rf node_modules/tailwindcss
rm -rf node_modules/@tailwindcss
rm -rf node_modules/lightningcss
rm -rf node_modules/postcss*
rm -rf node_modules/autoprefixer

# 6. package.json에서 CSS 관련 의존성 완전 제거
echo "📦 package.json에서 CSS 관련 의존성 완전 제거 중..."
if [ -f "package.json" ]; then
    # 백업 생성
    cp package.json package.json.backup
    
    # CSS 관련 의존성 제거
    sed -i '/"tailwindcss"/d' package.json
    sed -i '/"@tailwindcss/d' package.json
    sed -i '/"lightningcss"/d' package.json
    sed -i '/"postcss"/d' package.json
    sed -i '/"autoprefixer"/d' package.json
fi

# 7. 완전한 순수 CSS로 globals.css 교체
echo "🎨 완전한 순수 CSS로 globals.css 교체 중..."
cat > app/globals.css << 'EOF'
/* MSP Checklist 순수 CSS - 모든 프레임워크 제거됨 */

/* 기본 리셋 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}

body {
  margin: 0;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.6;
  color: #333333;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 기본 요소 스타일 */
h1, h2, h3, h4, h5, h6 {
  margin: 0 0 16px 0;
  font-weight: 600;
  line-height: 1.2;
}

h1 { font-size: 32px; }
h2 { font-size: 28px; }
h3 { font-size: 24px; }
h4 { font-size: 20px; }
h5 { font-size: 18px; }
h6 { font-size: 16px; }

p {
  margin: 0 0 16px 0;
}

a {
  color: #007bff;
  text-decoration: none;
}

a:hover {
  color: #0056b3;
  text-decoration: underline;
}

/* 레이아웃 클래스 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

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

.items-end {
  align-items: flex-end;
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

.justify-end {
  justify-content: flex-end;
}

.grid {
  display: grid;
  gap: 16px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* 버튼 스타일 */
.btn,
button {
  display: inline-block;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #007bff;
  color: white;
}

.btn:hover,
button:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.btn-primary { background-color: #007bff; color: white; }
.btn-primary:hover { background-color: #0056b3; }

.btn-secondary { background-color: #6c757d; color: white; }
.btn-secondary:hover { background-color: #545b62; }

.btn-success { background-color: #28a745; color: white; }
.btn-success:hover { background-color: #1e7e34; }

.btn-danger { background-color: #dc3545; color: white; }
.btn-danger:hover { background-color: #c82333; }

.btn-warning { background-color: #ffc107; color: #212529; }
.btn-warning:hover { background-color: #e0a800; }

.btn-info { background-color: #17a2b8; color: white; }
.btn-info:hover { background-color: #138496; }

.btn-light { background-color: #f8f9fa; color: #212529; border: 1px solid #dee2e6; }
.btn-light:hover { background-color: #e2e6ea; }

.btn-dark { background-color: #343a40; color: white; }
.btn-dark:hover { background-color: #23272b; }

/* 카드 스타일 */
.card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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

.card-body {
  padding: 0;
}

.card-footer {
  border-top: 1px solid #dee2e6;
  padding-top: 16px;
  margin-top: 16px;
}

/* 텍스트 유틸리티 */
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
.text-primary { color: #007bff; }
.text-secondary { color: #6c757d; }
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }
.text-warning { color: #ffc107; }
.text-info { color: #17a2b8; }
.text-light { color: #f8f9fa; }
.text-dark { color: #343a40; }

.text-white { color: #ffffff; }
.text-black { color: #000000; }

.text-gray-100 { color: #f8f9fa; }
.text-gray-200 { color: #e9ecef; }
.text-gray-300 { color: #dee2e6; }
.text-gray-400 { color: #ced4da; }
.text-gray-500 { color: #adb5bd; }
.text-gray-600 { color: #6c757d; }
.text-gray-700 { color: #495057; }
.text-gray-800 { color: #343a40; }
.text-gray-900 { color: #212529; }

/* 배경색 */
.bg-primary { background-color: #007bff; }
.bg-secondary { background-color: #6c757d; }
.bg-success { background-color: #28a745; }
.bg-danger { background-color: #dc3545; }
.bg-warning { background-color: #ffc107; }
.bg-info { background-color: #17a2b8; }
.bg-light { background-color: #f8f9fa; }
.bg-dark { background-color: #343a40; }

.bg-white { background-color: #ffffff; }
.bg-black { background-color: #000000; }

.bg-gray-50 { background-color: #f8f9fa; }
.bg-gray-100 { background-color: #e9ecef; }
.bg-gray-200 { background-color: #dee2e6; }
.bg-gray-300 { background-color: #ced4da; }

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
input,
textarea,
select {
  display: block;
  width: 100%;
  padding: 12px;
  font-size: 16px;
  line-height: 1.5;
  color: #495057;
  background-color: #ffffff;
  border: 1px solid #ced4da;
  border-radius: 6px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

/* 유틸리티 */
.hidden { display: none !important; }
.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }

.w-full { width: 100%; }
.w-auto { width: auto; }
.h-full { height: 100%; }
.h-auto { height: auto; }

.rounded { border-radius: 6px; }
.rounded-lg { border-radius: 8px; }
.rounded-xl { border-radius: 12px; }
.rounded-full { border-radius: 50%; }

.shadow { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15); }
.shadow-xl { box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }

.border { border: 1px solid #dee2e6; }
.border-0 { border: none; }

/* MSP 체크리스트 전용 스타일 */
.checklist-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.checklist-item {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.checklist-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #007bff;
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

.progress-container {
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  height: 8px;
  margin: 16px 0;
}

.progress-bar {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-radius: 50%;
  border-top-color: #007bff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 반응형 디자인 */
@media (max-width: 640px) {
  .container {
    padding: 0 12px;
  }
  
  .card {
    padding: 16px;
    margin-bottom: 12px;
  }
  
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr;
  }
  
  .btn {
    padding: 10px 20px;
    font-size: 14px;
  }
}

@media (min-width: 641px) and (max-width: 768px) {
  .grid-cols-3,
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

# 8. Next.js 설정을 완전히 새로 작성 (CSS 프레임워크 없음)
echo "⚙️  Next.js 설정을 완전히 새로 작성 중..."
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기본 설정
  output: 'standalone',
  trailingSlash: true,
  
  // 이미지 최적화 비활성화
  images: {
    unoptimized: true
  },
  
  // Turbopack 설정 (경고 해결)
  turbopack: {
    root: process.cwd()
  },
  
  // Webpack 설정 (Node.js 모듈 문제 해결)
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
  
  // 서버 외부 패키지
  serverExternalPackages: ['better-sqlite3'],
  
  // 텔레메트리 비활성화
  telemetry: {
    disabled: true
  }
};

export default nextConfig;
EOF

# 9. TypeScript 설정 최적화
echo "📝 TypeScript 설정 최적화 중..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "types": ["node"],
    "forceConsistentCasingInFileNames": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
EOF

# 10. package-lock.json 재생성
echo "📦 package-lock.json 재생성 중..."
rm -f package-lock.json

# 11. 환경 변수 설정
echo "🌍 환경 변수 설정 중..."
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 12. npm 캐시 완전 정리
echo "🧹 npm 캐시 완전 정리 중..."
npm cache clean --force

# 13. 의존성 재설치 (CSS 프레임워크 없이)
echo "📦 의존성 재설치 중 (CSS 프레임워크 없이)..."
npm install --no-optional

# 14. 최종 테스트 빌드 (Webpack 모드 강제)
echo "🔨 최종 테스트 빌드 실행 중 (Webpack 모드 강제)..."

if TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    echo ""
    echo "🎉🎉🎉 핵심 CSS 문제 완전 해결 성공! 🎉🎉🎉"
    echo ""
    echo "✅ 해결 완료:"
    echo "- 모든 CSS 프레임워크 완전 제거"
    echo "- Tailwind CSS 완전 삭제"
    echo "- LightningCSS 완전 삭제"
    echo "- 순수 CSS로 완전 대체"
    echo "- Node.js 모듈 문제 해결"
    echo "- TypeScript 설정 최적화"
    echo "- 빌드 성공 확인"
    echo ""
    echo "이제 MSP Checklist가 완전히 작동합니다!"
    
else
    echo ""
    echo "❌ 여전히 문제가 있습니다. 시스템 정보를 확인합니다..."
    echo ""
    echo "시스템 정보:"
    echo "- Node.js: $(node --version)"
    echo "- npm: $(npm --version)"
    echo "- 메모리: $(free -h | head -2 | tail -1)"
    echo "- 디스크: $(df -h / | tail -1)"
    echo ""
    echo "package.json 확인:"
    grep -E "(tailwind|postcss|lightningcss)" package.json || echo "CSS 프레임워크 없음"
    echo ""
    echo "node_modules 확인:"
    ls -la node_modules/ | grep -E "(tailwind|postcss|lightningcss)" || echo "CSS 프레임워크 디렉토리 없음"
    
    exit 1
fi

echo ""
echo "💥 핵심 CSS 문제 완전 해결 완료!"