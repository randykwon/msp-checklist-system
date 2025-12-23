#!/bin/bash

# 최종 TypeScript 설정 문제 해결 스크립트
# Next.js 16에서 변경된 설정 형식에 맞춰 수정합니다.

set -e

echo "🔧 최종 TypeScript 설정 문제 해결 시작..."

# MSP Checklist 디렉토리로 이동
cd /opt/msp-checklist/msp-checklist

echo "📍 현재 위치: $(pwd)"

# 1. 올바른 Next.js 16 설정으로 수정
echo "⚙️  Next.js 16 호환 설정으로 수정 중..."
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Next.js 16에서 turbopack 설정 방법
  turbopack: {
    root: process.cwd()
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

# 2. TypeScript 설정 최적화
echo "📝 TypeScript 설정 최적화 중..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
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
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 3. package.json에서 deprecated 패키지 제거
echo "📦 deprecated 패키지 제거 중..."
npm uninstall @types/cookie @types/bcryptjs 2>/dev/null || true

# 4. 환경 변수 설정
echo "🌍 환경 변수 설정 중..."
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 5. 빌드 캐시 정리
echo "🧹 빌드 캐시 정리 중..."
rm -rf .next

# 6. 최종 테스트 빌드
echo "🔨 최종 테스트 빌드 실행 중..."
if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    echo ""
    echo "✅ 빌드 성공! 모든 문제가 해결되었습니다."
    echo ""
    echo "🎉 해결 완료:"
    echo "- TypeScript 설정 오류 수정"
    echo "- Next.js 16 호환 설정 적용"
    echo "- deprecated 패키지 제거"
    echo "- 빌드 성공 확인"
    echo ""
    echo "이제 설치가 정상적으로 완료됩니다!"
    
else
    echo ""
    echo "❌ 여전히 문제가 있습니다. 추가 진단이 필요합니다."
    echo ""
    echo "빌드 로그를 확인하여 구체적인 오류를 파악하세요:"
    echo "npm run build 2>&1 | tee build-debug.log"
    exit 1
fi

echo ""
echo "🏁 최종 TypeScript 설정 문제 해결 완료!"