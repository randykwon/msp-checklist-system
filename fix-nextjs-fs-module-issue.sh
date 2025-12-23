#!/bin/bash

# Next.js fs 모듈 해결 문제 해결 스크립트
# "Can't resolve 'fs'" 오류를 해결합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Next.js fs 모듈 해결 문제 해결                    ║"
echo "║                                                            ║"
echo "║  'Can't resolve fs' 오류를 해결합니다.                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# MSP Checklist 디렉토리로 이동
if [ -d "/opt/msp-checklist/msp-checklist" ]; then
    cd /opt/msp-checklist/msp-checklist
    log_info "MSP Checklist 디렉토리로 이동: $(pwd)"
elif [ -d "msp-checklist" ]; then
    cd msp-checklist
    log_info "MSP Checklist 디렉토리로 이동: $(pwd)"
else
    log_error "MSP Checklist 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# 1. 현재 빌드 프로세스 중지
log_info "기존 빌드 프로세스 정리 중..."
pkill -f "next build" 2>/dev/null || true
pkill -f "npm run build" 2>/dev/null || true

# 2. 빌드 캐시 완전 정리
log_info "빌드 캐시 완전 정리 중..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Next.js 설정 파일 수정
log_info "Next.js 설정 파일 수정 중..."

# next.config.ts 백업
if [ -f "next.config.ts" ]; then
    cp next.config.ts next.config.ts.backup
    log_info "기존 next.config.ts 백업 완료"
fi

# 새로운 next.config.ts 생성 (fs 모듈 문제 해결)
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 배포용 설정
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
    // Node.js 모듈을 클라이언트에서 제외
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }
    
    // PDF.js 워커 파일을 위한 설정
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
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

log_success "Next.js 설정 파일 수정 완료"

# 4. package.json 스크립트 수정 (Turbopack 비활성화)
log_info "package.json 빌드 스크립트 수정 중..."

if [ -f "package.json" ]; then
    # package.json 백업
    cp package.json package.json.backup
    
    # Turbopack 없이 빌드하도록 수정
    sed -i 's/"build": "next build"/"build": "TURBOPACK=0 next build"/' package.json
    
    log_success "package.json 수정 완료"
fi

# 5. 의존성 재설치 (필요시)
log_info "의존성 상태 확인 중..."

if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    log_warning "의존성 재설치가 필요합니다..."
    
    rm -rf node_modules package-lock.json
    npm install
    
    log_success "의존성 재설치 완료"
fi

# 6. TypeScript 설정 확인
log_info "TypeScript 설정 확인 중..."

if [ -f "tsconfig.json" ]; then
    # tsconfig.json 백업
    cp tsconfig.json tsconfig.json.backup
    
    # 새로운 tsconfig.json 생성 (Node.js 모듈 문제 해결)
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
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
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
    
    log_success "TypeScript 설정 수정 완료"
fi

# 7. 환경 변수 설정
log_info "빌드 환경 변수 설정 중..."
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"

# 8. 테스트 빌드 (Webpack 모드)
log_info "테스트 빌드 실행 중 (Webpack 모드)..."

if TURBOPACK=0 npm run build; then
    log_success "빌드 성공! fs 모듈 문제가 해결되었습니다."
    echo ""
    echo "✅ 해결 완료:"
    echo "- Turbopack 비활성화"
    echo "- Webpack fallback 설정 추가"
    echo "- Node.js 모듈 외부화"
    echo ""
    echo "이제 설치가 정상적으로 계속 진행됩니다."
    
else
    log_warning "빌드가 여전히 실패합니다. 대체 방법을 시도합니다..."
    
    # 대체 방법: 더 간단한 설정
    log_info "대체 설정으로 변경 중..."
    
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
  
  // 간단한 webpack 설정
  webpack: (config: any) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  }
};

export default nextConfig;
EOF
    
    # 재시도
    if TURBOPACK=0 npm run build; then
        log_success "대체 설정으로 빌드 성공!"
    else
        log_error "빌드 실패. 수동 확인이 필요합니다."
        echo ""
        echo "추가 해결 방법:"
        echo "1. Node.js 버전 확인: node --version"
        echo "2. 완전 재설치: rm -rf node_modules && npm install"
        echo "3. 기본 빌드 모드: npm run build --legacy-peer-deps"
        exit 1
    fi
fi

echo ""
log_info "스크립트 완료. 설치를 계속 진행하세요."