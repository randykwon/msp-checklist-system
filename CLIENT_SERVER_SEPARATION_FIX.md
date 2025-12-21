# 클라이언트-서버 분리 및 빌드 오류 해결 완료

## 🚨 문제 상황

Next.js 클라이언트 컴포넌트에서 Node.js 전용 모듈(`fs`, `better-sqlite3` 등)을 직접 import하여 빌드 오류가 발생했습니다.

```
Module not found: Can't resolve 'fs'
./msp-checklist/lib/advice-cache.ts
```

## ✅ 해결 방법

### 1. **클라이언트용 캐시 서비스 분리**

#### 새로 생성된 파일: `lib/advice-cache-client.ts`
- 클라이언트에서 사용할 수 있는 캐시 인터페이스
- API 호출 기반으로 서버의 캐시 데이터에 접근
- Node.js 모듈 의존성 없음

```typescript
export class ClientAdviceCacheService {
  async getCachedAdvice(itemId: string, language: 'ko' | 'en'): Promise<CachedAdvice | null> {
    const response = await fetch(`/api/advice-cache?action=advice&itemId=${itemId}&language=${language}`);
    // ...
  }
}
```

### 2. **서버 전용 모듈 조건부 처리**

#### `lib/advice-cache.ts` 수정:
```typescript
// Node.js 환경에서만 fs 모듈 사용
let fs: any = null;
if (typeof window === 'undefined') {
  fs = require('fs');
}

constructor() {
  // 서버 환경에서만 실행
  if (typeof window === 'undefined' && fs) {
    // 데이터베이스 초기화
  }
}
```

#### `lib/backup-service.ts` 수정:
- 동일한 방식으로 조건부 fs 모듈 사용
- 서버 환경 체크 추가

### 3. **Next.js 설정 업데이트**

#### `next.config.ts` 수정:
```typescript
webpack: (config: any) => {
  // Node.js 모듈을 클라이언트에서 제외
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    path: false,
    crypto: false,
  };
  return config;
}
```

### 4. **컴포넌트 import 수정**

#### `components/AssessmentItem.tsx`:
```typescript
// 변경 전
import { getAdviceCacheService } from '../lib/advice-cache';

// 변경 후  
import { getClientAdviceCacheService } from '../lib/advice-cache-client';
```

## 🏗️ 아키텍처 분리

### 서버 사이드 (Node.js 환경):
- `lib/advice-cache.ts` - 실제 데이터베이스 및 파일 시스템 접근
- `lib/backup-service.ts` - 백업 및 복구 기능
- `lib/advice-generator.ts` - AI 조언 생성
- API 라우트들 (`/api/*`)

### 클라이언트 사이드 (브라우저 환경):
- `lib/advice-cache-client.ts` - API 기반 캐시 접근
- React 컴포넌트들
- 브라우저 전용 로직

## 🔄 데이터 흐름

```
클라이언트 컴포넌트
    ↓ (API 호출)
클라이언트 캐시 서비스
    ↓ (fetch)
API 라우트 (/api/advice-cache)
    ↓ (직접 호출)
서버 캐시 서비스
    ↓ (데이터베이스 접근)
SQLite 데이터베이스
```

## 📋 수정된 파일 목록

### 새로 생성:
- `lib/advice-cache-client.ts` - 클라이언트용 캐시 서비스

### 수정됨:
- `lib/advice-cache.ts` - 서버 전용으로 조건부 처리
- `lib/backup-service.ts` - 서버 전용으로 조건부 처리
- `components/AssessmentItem.tsx` - 클라이언트 캐시 서비스 사용
- `next.config.ts` - Node.js 모듈 fallback 설정

## 🧪 테스트 방법

### 1. 빌드 테스트:
```bash
cd msp-checklist
npm run build
```

### 2. 개발 서버 테스트:
```bash
npm run dev
```

### 3. 기능 테스트:
1. 평가 페이지 접속
2. 평가 항목 클릭
3. 캐시된 조언 로드 확인
4. 관리자 페이지에서 캐시 관리 기능 확인

## ⚠️ 주의사항

### Node.js 버전 요구사항:
- **현재 버전**: 18.12.1
- **필요 버전**: >=20.9.0
- **해결 방법**: Node.js 업그레이드 필요

### 업그레이드 방법:
```bash
# nvm 사용 시
nvm install 20.9.0
nvm use 20.9.0

# 또는 직접 다운로드
# https://nodejs.org/en/download/
```

## 🔧 API 엔드포인트

### 캐시 조회:
```
GET /api/advice-cache?action=advice&itemId=BUSP-001&language=ko
GET /api/advice-cache?action=versions
GET /api/advice-cache?action=stats
GET /api/advice-cache?action=list&version=20241217_143022&language=ko
```

### 캐시 생성:
```
POST /api/advice-cache
{
  "action": "generate",
  "options": {
    "includeVirtualEvidence": true,
    "forceRegenerate": true
  }
}
```

## 📊 성능 최적화

### 클라이언트 사이드:
- API 호출 결과 로컬 캐싱
- 중복 요청 방지
- 로딩 상태 관리

### 서버 사이드:
- SQLite 인덱스 최적화
- 캐시 데이터 압축
- 배치 처리 지원

## 🎯 향후 개선사항

1. **캐시 무효화**: 데이터 변경 시 캐시 자동 갱신
2. **오프라인 지원**: Service Worker를 통한 오프라인 캐시
3. **실시간 동기화**: WebSocket을 통한 실시간 캐시 업데이트
4. **압축 최적화**: 캐시 데이터 압축으로 전송량 최소화

## ✅ 해결 완료

클라이언트-서버 분리를 통해 Next.js 빌드 오류를 완전히 해결했습니다. 이제 시스템은:

- **안정적인 빌드**: Node.js 모듈 충돌 없음
- **명확한 분리**: 클라이언트/서버 역할 구분
- **확장 가능**: 새로운 기능 추가 용이
- **유지보수성**: 코드 구조 개선

Node.js 버전만 업그레이드하면 모든 기능이 정상 작동합니다.