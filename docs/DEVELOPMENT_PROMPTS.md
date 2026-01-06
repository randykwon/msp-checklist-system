# MSP Checklist System - 개발 프롬프트 기록

이 문서는 MSP Checklist System 개발 과정에서 사용된 주요 프롬프트들을 기록합니다.

## 세션 정보
- 날짜: 2026년 1월 6일
- 이전 세션에서 이어진 작업

---

## 1. 시스템 요구사항 문서 작성

### 프롬프트
```
현재까지 구현된 내용을 sw/hw, functional, non-functional 기능들을 정리해서 만든 requirement 문서를 작성해줘
```

### 결과
- `docs/SYSTEM_REQUIREMENTS.md` 파일 생성
- HW/SW 요구사항, 기능적/비기능적 요구사항 정리

---

## 2. 가상증빙예제 API 오류 수정

### 프롬프트
```
새로 만든 사용자로 로그인 하면 가상증빙예제-참고용에서 예제보기 기능에서 다음과 같은 에러가 나온다
```

### 문제
- `itemCategory` 변수 스코프 오류
- `getItemCategory` 함수가 사용 후에 정의됨

### 해결
- 함수 정의를 사용 전으로 이동

---

## 3. 전체 기능 테스트 스크립트 생성

### 프롬프트
```
전체 기능 테스트를 하는 기능을 만들려 한다. 모든 기능을 테스트 하는 스크립트를 만들어 각 기능이 제대로 동작하는지 주기적으로 체크 할수 있도록 만들어줘
```

### 결과
- `scripts/test/run-all-tests.sh` - Bash 기반 전체 테스트
- `scripts/test/api-tests.js` - Node.js API 테스트
- `scripts/test/setup-scheduled-tests.sh` - Cron 스케줄 설정

---

## 4. 사용자/IP 활동 모니터링 기능

### 프롬프트
```
사용자/ip 별 활동 모니터링을 할수 있는 기능을 관리자 화면에 추가해줘. 로그인, 사용하고 있는 아이템등을 시간별, 날짜별, 섹션별, 기능별, 사용자별로 보고 싶어
```

### 구현 내용

#### 4.1 데이터베이스 테이블 추가
```sql
CREATE TABLE user_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_email TEXT,
  user_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  item_id TEXT,
  assessment_type TEXT,
  details TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_activity_ip ON user_activity_logs(ip_address);
CREATE INDEX idx_activity_action ON user_activity_logs(action_type);
CREATE INDEX idx_activity_category ON user_activity_logs(action_category);
CREATE INDEX idx_activity_created ON user_activity_logs(created_at);
```

#### 4.2 활동 로깅 헬퍼 함수 (lib/activity-logger.ts)
```typescript
// 액션 타입 정의
export const ACTION_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  VIEW_ASSESSMENT: 'view_assessment',
  UPDATE_ASSESSMENT: 'update_assessment',
  VIEW_ADVICE: 'view_advice',
  GENERATE_ADVICE: 'generate_advice',
  VIEW_VIRTUAL_EVIDENCE: 'view_virtual_evidence',
  GENERATE_VIRTUAL_EVIDENCE: 'generate_virtual_evidence',
  // ... 기타 액션 타입
};

// 액션 카테고리 정의
export const ACTION_CATEGORIES = {
  AUTH: 'auth',
  ASSESSMENT: 'assessment',
  ADVICE: 'advice',
  VIRTUAL_EVIDENCE: 'virtual_evidence',
  QA: 'qa',
  ADMIN: 'admin',
  // ... 기타 카테고리
};

// IP 주소 추출
export function getClientIP(request: NextRequest): string;

// 활동 로그 기록
export function logUserActivity(request, actionType, actionCategory, options);

// 로그인 활동 기록
export function logLoginActivity(request, userId, userEmail, userName, success);

// 회원가입 활동 기록
export function logRegisterActivity(request, userId, userEmail, userName);
```

#### 4.3 관리자 활동 모니터링 페이지
- 경로: `/admin/app/activity/page.tsx`
- 4가지 뷰: 통계, 로그, 사용자별, IP별
- 필터링: 사용자 ID, IP 주소, 카테고리, 날짜 범위

#### 4.4 API 엔드포인트
- GET `/api/activity-logs?view=stats|logs|users|ips`
- DELETE `/api/activity-logs?daysToKeep=90` (오래된 로그 정리)

---

## 5. SQL 문법 오류 수정

### 문제
```
SqliteError: no such column: "now" - should this be a string literal in single-quotes?
```

### 원인
```typescript
// 잘못된 코드
db.prepare('UPDATE users SET status = ?, updated_at = datetime("now") WHERE id = ?');

// 수정된 코드
db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?");
```

---

## 6. Virtual Evidence API 안정성 개선

### 문제
- `evidenceRequired`가 undefined일 때 `toLowerCase()` 호출 시 에러
- `createLLMService` 함수가 존재하지 않음

### 해결

#### 6.1 필수 필드 검증 및 기본값 설정
```typescript
// 필수 필드 검증
if (!itemId) {
  return NextResponse.json(
    { error: 'itemId is required' },
    { status: 400 }
  );
}

// 기본값 설정
const safeTitle = title || itemId;
const safeDescription = description || '';
const safeEvidenceRequired = evidenceRequired || '';
const safeAdvice = advice || '';
const safeLanguage = language || 'ko';
```

#### 6.2 LLM 서비스 호출 방식 변경
```typescript
// 변경 전
import { createLLMService, LLMMessage } from '@/lib/llm-service';
const llmService = createLLMService();
const result = await llmService.generateText(messages, options);

// 변경 후
import { callLLM, getDefaultLLMConfig } from '@/lib/llm-service';
const llmConfig = getDefaultLLMConfig();
const result = await callLLM(userPrompt, systemMessage, llmConfig);
```

---

## 7. 테스트 계정 생성 및 기능 테스트

### 프롬프트
```
테스트 아이디를 만들어 모든 아이템의 가상증빙예제-참고용 보기 기능이 동작하는지 확인해줘
```

### 테스트 명령어
```bash
# 회원가입
curl -s -X POST http://localhost:3010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@test.com","password":"test123456","name":"테스트2"}'

# 로그인
curl -s -X POST http://localhost:3010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@test.com","password":"test123456"}' \
  -c /tmp/cookies.txt

# 가상증빙 API 테스트
curl -s -X POST http://localhost:3010/api/virtual-evidence \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{"itemId":"BUSP-001"}'

# 모든 캐시된 항목 테스트
sqlite3 msp-checklist/msp-assessment.db "SELECT item_id FROM virtual_evidence_cache;" | while read item; do
  echo "Testing $item..."
  result=$(curl -s -X POST http://localhost:3010/api/virtual-evidence \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d "{\"itemId\":\"$item\"}")
  
  if echo "$result" | grep -q '"virtualEvidence"'; then
    echo "  ✓ OK"
  else
    echo "  ✗ FAILED: $result"
  fi
done
```

---

## 8. 서버 관리 명령어

### 서버 재시작
```bash
# PM2 사용 시 (프로덕션)
pm2 restart all

# 개발 환경
lsof -ti:3010 | xargs kill -9 2>/dev/null
lsof -ti:3011 | xargs kill -9 2>/dev/null
npm run dev  # msp-checklist 디렉토리에서
npm run dev  # msp-checklist/admin 디렉토리에서
```

### Git 커밋
```bash
git add -A
git commit -m "커밋 메시지"
git push origin main
```

---

## 커밋 히스토리

### 커밋 1: 활동 모니터링 기능 추가
```
feat: 사용자/IP별 활동 모니터링 기능 추가

- user_activity_logs 테이블 추가 (lib/db.ts, admin/lib/db.ts)
- 활동 로깅 헬퍼 함수 추가 (lib/activity-logger.ts)
- 관리자 활동 모니터링 페이지 추가 (admin/app/activity/page.tsx)
- 활동 로그 API 엔드포인트 추가 (admin/app/api/activity-logs/route.ts)
- 로그인/회원가입 시 활동 로깅 통합
- AdminLayout에 활동 모니터링 네비게이션 추가
- admin/superadmin 권한에 /activity 경로 접근 권한 추가
```

### 커밋 2: API 오류 수정
```
fix: virtual-evidence API 및 updateUserStatus SQL 오류 수정

- updateUserStatus: datetime("now") → datetime('now') SQL 문법 수정
- virtual-evidence API: 필수 필드 검증 및 기본값 설정 추가
- virtual-evidence API: createLLMService → callLLM 함수로 변경
- undefined 변수 접근 시 에러 방지를 위한 안전한 변수 사용
```

---

## 파일 변경 목록

### 새로 생성된 파일
- `msp-checklist/lib/activity-logger.ts`
- `msp-checklist/admin/app/activity/page.tsx`
- `msp-checklist/admin/app/api/activity-logs/route.ts`
- `scripts/test/run-all-tests.sh`
- `scripts/test/api-tests.js`
- `scripts/test/setup-scheduled-tests.sh`
- `docs/SYSTEM_REQUIREMENTS.md`

### 수정된 파일
- `msp-checklist/lib/db.ts` - 활동 로그 함수 추가, SQL 문법 수정
- `msp-checklist/admin/lib/db.ts` - 활동 로그 함수 추가
- `msp-checklist/admin/components/AdminLayout.tsx` - 활동 모니터링 네비게이션 추가
- `msp-checklist/admin/lib/permissions.ts` - /activity 경로 권한 추가
- `msp-checklist/app/api/auth/login/route.ts` - 활동 로깅 통합
- `msp-checklist/app/api/auth/register/route.ts` - 활동 로깅 통합
- `msp-checklist/app/api/virtual-evidence/route.ts` - 안정성 개선
