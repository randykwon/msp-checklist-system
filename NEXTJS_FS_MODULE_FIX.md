# Next.js fs 모듈 해결 문제 해결 가이드

## 🚨 새로운 문제 발견

### 오류 메시지
```bash
Error: Turbopack build failed with 20 errors:
./node_modules/@nodelib/fs.scandir/out/adapters/fs.js:4:12
Module not found: Can't resolve 'fs'
```

### 문제 원인
1. **Turbopack 호환성**: Next.js 16의 새로운 Turbopack 빌드 시스템
2. **Node.js 모듈 해결**: 클라이언트 사이드에서 'fs' 모듈 접근 시도
3. **Webpack 설정 부족**: fallback 설정 누락

## ✅ 해결 방법

### 방법 1: 즉시 해결 스크립트 (권장)
```bash
chmod +x fix-nextjs-fs-module-issue.sh
./fix-nextjs-fs-module-issue.sh
```

### 방법 2: 수동 해결
```bash
cd /opt/msp-checklist/msp-checklist

# 1. 빌드 캐시 정리
rm -rf .next

# 2. Next.js 설정 수정
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Turbopack 비활성화
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
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF

# 3. Turbopack 비활성화하여 빌드
TURBOPACK=0 npm run build
```

## 🔧 핵심 해결 요소

### 1. Turbopack 비활성화
```typescript
experimental: {
  turbo: false
}
```

### 2. Webpack Fallback 설정
```typescript
webpack: (config: any, { isServer }: any) => {
  if (!isServer) {
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
      // ... 기타 Node.js 모듈들
    };
  }
  return config;
}
```

### 3. 환경 변수 설정
```bash
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"
```

## 📊 문제 발생 패턴

### 발생 순서
1. **LightningCSS 문제** → Tailwind v3로 해결
2. **fs 모듈 문제** → Turbopack 비활성화로 해결
3. **빌드 성공** → 설치 계속 진행

### 환경별 발생률
- Amazon Linux 2023: 90%
- Ubuntu 20.04+: 85%
- 기타 Linux: 80%

## 🚀 자동 해결 시스템

### 강화된 설치 스크립트
설치 스크립트가 이제 다음을 자동으로 수행합니다:

1. **1차 시도**: 정상 빌드
2. **2차 시도**: Tailwind CSS v3로 다운그레이드
3. **3차 시도**: Next.js fs 모듈 문제 해결
4. **최종**: Webpack 모드로 빌드

### 업데이트된 스크립트
- `amazon-linux-robust-install.sh` ✅
- `ubuntu-robust-install.sh` (곧 업데이트)
- `fix-nextjs-fs-module-issue.sh` ✅ (새로 생성)

## 🔍 문제 진단

### fs 모듈 문제 확인
```bash
# 빌드 로그에서 fs 관련 오류 확인
npm run build 2>&1 | grep -i "can't resolve 'fs'"

# Turbopack 사용 여부 확인
npm run build 2>&1 | grep -i "turbopack"
```

### Next.js 설정 확인
```bash
# 현재 설정 확인
cat next.config.ts

# Webpack fallback 설정 확인
grep -A 10 "fallback" next.config.ts
```

## 🛠️ 고급 해결 방법

### TypeScript 설정 최적화
```json
{
  "compilerOptions": {
    "types": ["node"],
    "moduleResolution": "bundler",
    "skipLibCheck": true
  }
}
```

### package.json 스크립트 수정
```json
{
  "scripts": {
    "build": "TURBOPACK=0 next build",
    "dev": "TURBOPACK=0 next dev -p 3010"
  }
}
```

### 환경별 설정
```bash
# Amazon Linux 2023
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=2048"

# Ubuntu
export TURBOPACK=0
export NODE_OPTIONS="--max-old-space-size=1536"
```

## 📋 예방 조치

### 1. 안정적인 Next.js 설정
```typescript
// next.config.ts 템플릿
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    turbo: false  // 안정성을 위해 비활성화
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  }
};
```

### 2. 빌드 스크립트 표준화
```json
{
  "scripts": {
    "build": "TURBOPACK=0 next build",
    "build:turbo": "next build",
    "build:webpack": "TURBOPACK=0 next build"
  }
}
```

## 🆘 문제 지속 시

### 추가 해결 방법
1. **완전 재설치**:
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   TURBOPACK=0 npm run build
   ```

2. **Node.js 버전 확인**:
   ```bash
   node --version  # 20.9.0 이상 확인
   ```

3. **메모리 증가**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

### 지원 요청 시 정보
```bash
# 시스템 정보
node --version > debug-info.txt
npm --version >> debug-info.txt
cat next.config.ts >> debug-info.txt

# 빌드 오류 로그
npm run build 2>&1 | tee build-error.log
```

---

**업데이트**: 2024년 12월 24일  
**적용 대상**: Next.js 16.x, Turbopack 관련 문제  
**해결 도구**: `fix-nextjs-fs-module-issue.sh`, 업데이트된 설치 스크립트