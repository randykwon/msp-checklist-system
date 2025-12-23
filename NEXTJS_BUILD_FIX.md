# Next.js 빌드 문제 해결 가이드

## 🚨 발견된 문제들

### 1. TypeScript 모듈 누락 오류
**증상**:
```bash
Error: Cannot find module 'typescript'
⨯ Failed to load next.config.ts
```

**원인**: 최소 설치 모드(`--production`)에서 devDependencies가 설치되지 않아 TypeScript가 누락

**해결**: Next.js가 `next.config.ts` 파일을 트랜스파일하기 위해 TypeScript가 필요하므로, 빌드 시에는 모든 의존성을 설치하고 빌드 완료 후 정리

### 2. 다중 lockfile 경고
**증상**:
```bash
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of /opt/msp-checklist/package-lock.json as the root directory.
```

**원인**: 프로젝트 루트와 msp-checklist 디렉토리 모두에 package-lock.json 존재

**해결**: `next.config.ts`에 명시적인 루트 디렉토리 설정 추가

## ✅ 적용된 해결책

### 1. 설치 스크립트 개선
```bash
# 최소 설치 모드에서도 TypeScript 포함하여 설치
npm install --no-optional --legacy-peer-deps

# 빌드 완료 후 개발 의존성 정리
npm prune --production
```

### 2. Next.js 설정 개선
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Turbopack 설정 (루트 디렉토리 명시로 경고 해결)
  turbopack: {
    root: process.cwd()
  },
  // ... 기타 설정
};
```

## 🛠️ 수동 해결 방법

### TypeScript 누락 시
```bash
cd /opt/msp-checklist/msp-checklist

# TypeScript 수동 설치
npm install typescript @types/node --save-dev

# 빌드 재시도
npm run build
```

### 다중 lockfile 경고 해결
```bash
# 불필요한 lockfile 제거 (선택사항)
rm /opt/msp-checklist/package-lock.json

# 또는 next.config.ts에 루트 설정 추가
```

## 🔍 빌드 상태 확인

### 성공적인 빌드 출력
```bash
✓ Compiled successfully in 7.3s
   Route (app)                              Size     First Load JS
   ┌ ○ /                                    137 B          87.2 kB
   └ ○ /favicon.ico                         0 B                0 B
```

### 빌드 파일 확인
```bash
ls -la /opt/msp-checklist/msp-checklist/.next/
```

## 🚀 최적화된 설치 프로세스

### 1. 일반 설치 (권장)
```bash
./amazon-linux-robust-install.sh
```

### 2. 최소 설치 (디스크 공간 부족 시)
```bash
MSP_MINIMAL_INSTALL=true ./amazon-linux-robust-install.sh
```

**최소 설치 프로세스**:
1. 모든 의존성 설치 (TypeScript 포함)
2. 애플리케이션 빌드
3. 개발 의존성 자동 정리 (`npm prune --production`)
4. 디스크 공간 절약

## 📋 문제 예방

### package.json 의존성 확인
```bash
# TypeScript가 devDependencies에 있는지 확인
grep -A 10 "devDependencies" msp-checklist/package.json
```

### 빌드 전 의존성 검증
```bash
cd msp-checklist
npm ls typescript
npm ls @types/node
```

## 🔧 고급 문제 해결

### 캐시 문제 해결
```bash
# Next.js 캐시 정리
rm -rf msp-checklist/.next

# npm 캐시 정리
npm cache clean --force

# 재빌드
cd msp-checklist && npm run build
```

### 메모리 부족 시 빌드
```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=2048"
cd msp-checklist && npm run build
```

### 빌드 로그 상세 확인
```bash
cd msp-checklist
npm run build --verbose 2>&1 | tee build.log
```

## 📊 성능 최적화

### 빌드 시간 단축
- 불필요한 의존성 제거
- 캐시 활용
- 병렬 빌드 (가능한 경우)

### 디스크 공간 최적화
- 빌드 후 개발 의존성 정리
- 소스맵 생성 비활성화 (프로덕션)
- 불필요한 파일 제거

---

**업데이트**: 2024년 12월 24일  
**적용 버전**: Next.js 16.0.10, TypeScript 5.x  
**관련 파일**: `next.config.ts`, `package.json`, 설치 스크립트들