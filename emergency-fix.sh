#!/bin/bash

# 긴급 LightningCSS 문제 해결 스크립트
# 현재 진행 중인 설치의 빌드 문제를 즉시 해결합니다.

set -e

echo "🚨 긴급 LightningCSS 문제 해결 시작..."

# MSP Checklist 디렉토리로 이동
cd /opt/msp-checklist/msp-checklist

echo "📍 현재 위치: $(pwd)"

# 1. 현재 빌드 프로세스 강제 중지
echo "⏹️  기존 빌드 프로세스 중지 중..."
sudo pkill -f "next build" 2>/dev/null || true
sudo pkill -f "npm run build" 2>/dev/null || true
sleep 2

# 2. 빌드 캐시 완전 정리
echo "🧹 빌드 캐시 정리 중..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Tailwind CSS v4 완전 제거
echo "🗑️  Tailwind CSS v4 제거 중..."
npm uninstall @tailwindcss/postcss @tailwindcss/node tailwindcss lightningcss 2>/dev/null || true

# 4. Tailwind CSS v3 설치
echo "⬇️  Tailwind CSS v3 설치 중..."
npm install tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0 --save-dev

# 5. 호환 설정 파일 생성
echo "⚙️  설정 파일 생성 중..."

# postcss.config.js 생성
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# tailwind.config.js 생성
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# 6. 기존 v4 설정 파일 제거
echo "🗑️  기존 v4 설정 파일 제거 중..."
rm -f postcss.config.mjs
rm -f postcss.config.ts

# 7. Next.js 설정 수정 (Turbopack 비활성화)
echo "⚙️  Next.js 설정 수정 중..."
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Turbopack 비활성화 (호환성 문제 해결)
  experimental: {
    turbo: false
  },
  
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF

# 8. 환경 변수 설정
echo "🌍 환경 변수 설정 중..."
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"

# 9. 테스트 빌드
echo "🔨 테스트 빌드 실행 중..."
if TURBOPACK=0 npm run build; then
    echo "✅ 빌드 성공! 문제가 해결되었습니다."
    echo ""
    echo "🎉 이제 설치 스크립트가 정상적으로 계속 진행됩니다."
    echo "설치 스크립트를 다시 실행하거나 현재 진행을 기다리세요."
else
    echo "❌ 빌드 실패. 추가 조치가 필요합니다."
    echo ""
    echo "추가 해결 방법:"
    echo "1. 완전 재설치: rm -rf node_modules && npm install"
    echo "2. 메모리 증가: export NODE_OPTIONS='--max-old-space-size=4096'"
    echo "3. 기본 CSS 사용: ./fix-lightningcss-issue.sh 실행 후 옵션 4 선택"
fi

echo ""
echo "🏁 긴급 수정 완료!"