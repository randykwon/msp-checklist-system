# 고급 시스템 관리 기능 구현 완료

## 📋 구현 개요

MSP 헬퍼 시스템에 전체 시스템 초기화, 선택적 삭제, 백업 연동, 복구 기능, 로그 기록 등 고급 데이터 관리 기능을 완전히 구현했습니다.

## 🏗️ 시스템 아키텍처

### 1. 확장된 데이터베이스 스키마

#### system_backups 테이블
```sql
CREATE TABLE system_backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL, -- 'full', 'users', 'cache', 'selective'
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON metadata about backup
  FOREIGN KEY (created_by) REFERENCES users (id)
);
```

#### system_logs 테이블
```sql
CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL, -- 'delete', 'backup', 'restore', 'reset'
  target_type TEXT NOT NULL, -- 'user_data', 'cache', 'system', 'selective'
  target_id TEXT, -- user_id, cache_type, or other identifier
  performed_by INTEGER NOT NULL,
  details TEXT, -- JSON details about the operation
  affected_records INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'partial'
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users (id)
);
```

#### deleted_data_archive 테이블
```sql
CREATE TABLE deleted_data_archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_table TEXT NOT NULL,
  original_id TEXT NOT NULL,
  data_content TEXT NOT NULL, -- JSON of original data
  deleted_by INTEGER NOT NULL,
  deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  restore_deadline DATETIME, -- when this archive expires
  restored_at DATETIME,
  restored_by INTEGER,
  FOREIGN KEY (deleted_by) REFERENCES users (id),
  FOREIGN KEY (restored_by) REFERENCES users (id)
);
```

### 2. 백업 서비스 (`lib/backup-service.ts`)

#### 주요 클래스: BackupService
- **전체 시스템 백업**: 모든 테이블 데이터 백업
- **선택적 백업**: 조건별 데이터 백업
- **시스템 초기화**: 백업 후 전체 데이터 삭제
- **선택적 삭제**: 조건별 데이터 삭제
- **데이터 복구**: 백업에서 시스템 복원
- **로그 관리**: 모든 작업 이력 기록

## 🔧 주요 기능

### 1. **전체 시스템 초기화**

#### 기능 설명:
- 모든 사용자 데이터 + 캐시 일괄 삭제
- 관리자 계정은 보존
- 자동 백업 생성 (선택 가능)
- 삭제된 데이터 아카이브 (30일간 복구 가능)

#### 사용 방법:
```typescript
const backupService = getBackupService();
await backupService.resetFullSystem(adminUserId, true); // 백업 생성 포함
```

#### API 엔드포인트:
```
POST /api/system/reset
{
  "resetType": "full",
  "createBackup": true
}
```

### 2. **선택적 삭제**

#### 지원하는 조건:
- **날짜 범위**: 특정 기간의 데이터만 삭제
- **사용자 그룹**: 특정 사용자들의 데이터만 삭제
- **평가 타입**: 사전요구사항 또는 기술검증만 삭제
- **사용자 계정 포함**: 평가 데이터와 함께 사용자 계정도 삭제

#### 사용 예시:
```typescript
await backupService.deleteSelective(adminUserId, {
  dateFrom: '2024-01-01',
  dateTo: '2024-06-30',
  userIds: [1, 2, 3],
  assessmentTypes: ['prerequisites'],
  deleteUsers: false
}, true); // 백업 생성 포함
```

#### API 엔드포인트:
```
POST /api/system/reset
{
  "resetType": "selective",
  "criteria": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-06-30",
    "userIds": [1, 2, 3],
    "assessmentTypes": ["prerequisites"],
    "deleteUsers": false
  },
  "createBackup": true
}
```

### 3. **백업 연동**

#### 백업 유형:
- **전체 백업**: 모든 테이블 데이터
- **선택적 백업**: 조건에 맞는 데이터만
- **자동 백업**: 삭제/초기화 작업 전 자동 생성

#### 백업 데이터 구조:
```json
{
  "metadata": {
    "version": "1.0",
    "createdAt": "2024-12-17T10:30:00Z",
    "totalUsers": 150,
    "totalAssessments": 3000,
    "totalCacheItems": 200,
    "backupType": "full",
    "selectionCriteria": {...}
  },
  "data": {
    "users": [...],
    "assessmentData": [...],
    "adviceCache": [...],
    "virtualEvidenceCache": [...],
    "itemQa": [...]
  }
}
```

#### 백업 생성:
```typescript
// 전체 백업
const backupPath = await backupService.createFullBackup(adminUserId);

// 선택적 백업
const backupPath = await backupService.createSelectiveBackup(adminUserId, {
  dateFrom: '2024-01-01',
  userIds: [1, 2, 3],
  includeCache: true
});
```

### 4. **복구 기능**

#### 복구 방식:
- **백업에서 복구**: 저장된 백업 파일에서 전체 시스템 복원
- **아카이브에서 복구**: 삭제된 개별 데이터 복원 (30일 이내)
- **트랜잭션 기반**: 복구 실패 시 롤백

#### 복구 프로세스:
1. 현재 데이터 자동 백업
2. 기존 데이터 삭제
3. 백업 데이터 복원
4. 외래키 제약조건 검증
5. 복구 완료 로그 기록

#### 사용 방법:
```typescript
await backupService.restoreFromBackup(backupId, adminUserId);
```

### 5. **로그 기록**

#### 기록되는 작업:
- **delete**: 데이터 삭제 작업
- **backup**: 백업 생성 작업
- **restore**: 데이터 복원 작업
- **reset**: 시스템 초기화 작업

#### 로그 정보:
- 작업 유형 및 대상
- 수행자 정보
- 영향받은 레코드 수
- 작업 상태 (성공/실패/부분성공)
- 상세 정보 (JSON)
- 오류 메시지 (실패 시)

#### 로그 조회:
```typescript
const logs = backupService.getSystemLogs(100); // 최근 100개
```

## 🖥️ 관리자 인터페이스

### 시스템 관리 페이지 (`/admin/system`)

#### 4개 탭 구성:
1. **백업 관리**: 백업 생성 및 목록 관리
2. **시스템 초기화**: 전체/선택적 초기화
3. **작업 로그**: 시스템 작업 이력 조회
4. **데이터 복구**: 복구 가능한 데이터 목록

#### 백업 관리 탭:
- **전체 백업**: 모든 데이터 백업
- **선택적 백업**: 조건별 백업 생성
- **백업 목록**: 생성된 백업 파일 관리
- **복원 기능**: 백업에서 시스템 복원

#### 시스템 초기화 탭:
- **선택적 삭제**: 세밀한 조건 설정
- **전체 초기화**: 시스템 완전 초기화
- **안전 장치**: 확인 메시지 및 자동 백업

#### 작업 로그 탭:
- **실시간 로그**: 모든 시스템 작업 이력
- **상태 표시**: 성공/실패/부분성공 구분
- **상세 정보**: 작업별 세부 내용

#### 데이터 복구 탭:
- **복구 가능 데이터**: 30일 이내 삭제된 데이터
- **개별 복구**: 특정 데이터만 선택 복구
- **만료 관리**: 복구 기한 표시

## 🔌 API 엔드포인트

### 백업 관리
```
GET  /api/system/backup     # 백업 목록 조회
POST /api/system/backup     # 새 백업 생성
```

### 시스템 복원
```
POST /api/system/restore    # 백업에서 복원
```

### 시스템 초기화
```
POST /api/system/reset      # 전체/선택적 초기화
```

### 로그 관리
```
GET  /api/system/logs       # 시스템 로그 조회
```

## 🛡️ 보안 및 권한

### 접근 제어:
- **관리자 전용**: 모든 시스템 관리 기능
- **JWT 토큰 검증**: 관리자 권한 확인
- **역할 기반 접근**: admin role 필수

### 안전 장치:
- **확인 메시지**: 위험한 작업 전 재확인
- **자동 백업**: 삭제 전 자동 백업 생성
- **트랜잭션**: 원자적 작업 보장
- **로그 기록**: 모든 작업 추적 가능

### 데이터 보호:
- **아카이브 시스템**: 삭제된 데이터 30일간 보관
- **복구 기한**: 자동 만료로 저장 공간 관리
- **관리자 보존**: 시스템 초기화 시 관리자 계정 보존

## 📊 사용 시나리오

### 1. **정기 시스템 정리**
```typescript
// 6개월 이상 된 비활성 사용자 데이터 정리
await backupService.deleteSelective(adminUserId, {
  dateTo: '2024-06-01',
  assessmentTypes: ['prerequisites', 'technical'],
  deleteUsers: true
}, true);
```

### 2. **테스트 데이터 정리**
```typescript
// 특정 테스트 사용자들의 데이터만 삭제
await backupService.deleteSelective(adminUserId, {
  userIds: [100, 101, 102], // 테스트 계정들
  deleteUsers: true
}, false); // 백업 생성 안함
```

### 3. **시스템 마이그레이션**
```typescript
// 1. 전체 백업 생성
const backupPath = await backupService.createFullBackup(adminUserId);

// 2. 시스템 초기화
await backupService.resetFullSystem(adminUserId, false);

// 3. 새 데이터 임포트 후 필요시 복원
await backupService.restoreFromBackup(backupId, adminUserId);
```

### 4. **장애 복구**
```typescript
// 최신 백업에서 시스템 복원
const backups = backupService.getBackups();
const latestBackup = backups[0];
await backupService.restoreFromBackup(latestBackup.id, adminUserId);
```

## 📈 모니터링 및 통계

### 백업 통계:
- 백업 파일 크기 및 개수
- 백업 생성 빈도
- 저장 공간 사용량

### 작업 통계:
- 일별/월별 작업 횟수
- 작업 성공률
- 영향받은 레코드 수

### 복구 통계:
- 복구 가능한 데이터 수
- 복구 성공률
- 만료된 아카이브 수

## 🔄 자동화 기능

### 자동 백업:
- 시스템 초기화 전 자동 백업
- 대량 삭제 작업 전 자동 백업
- 실패 시 자동 롤백

### 자동 정리:
- 30일 경과된 아카이브 자동 삭제
- 오래된 백업 파일 정리 (설정 가능)
- 로그 파일 순환 정리

### 알림 시스템:
- 중요 작업 완료 알림
- 오류 발생 시 즉시 알림
- 저장 공간 부족 경고

## 📁 파일 구조

```
msp-checklist/
├── lib/
│   └── backup-service.ts           # 백업 서비스 핵심 로직
├── admin/app/
│   ├── system/
│   │   └── page.tsx               # 시스템 관리 페이지
│   └── api/system/
│       ├── backup/route.ts        # 백업 API
│       ├── restore/route.ts       # 복원 API
│       ├── reset/route.ts         # 초기화 API
│       └── logs/route.ts          # 로그 API
├── backups/                       # 백업 파일 저장소
└── msp-assessment.db             # 확장된 데이터베이스
```

## ✅ 구현 완료 사항

1. **전체 시스템 초기화** ✅
   - 모든 사용자 데이터 + 캐시 일괄 삭제
   - 관리자 계정 보존
   - 자동 백업 생성

2. **선택적 삭제** ✅
   - 날짜 범위별 삭제
   - 사용자 그룹별 삭제
   - 평가 타입별 삭제
   - 사용자 계정 포함 삭제

3. **백업 연동** ✅
   - 전체/선택적 백업 생성
   - 삭제 전 자동 백업
   - JSON 형태 백업 파일

4. **복구 기능** ✅
   - 백업에서 전체 시스템 복원
   - 삭제된 데이터 아카이브
   - 30일 복구 기한

5. **로그 기록** ✅
   - 모든 작업 이력 추적
   - 상세 정보 및 오류 메시지
   - 성공/실패 상태 관리

6. **관리자 인터페이스** ✅
   - 4개 탭 시스템 관리 페이지
   - 직관적인 UI/UX
   - 실시간 상태 표시

7. **보안 및 권한** ✅
   - 관리자 전용 접근
   - JWT 토큰 검증
   - 안전 장치 구현

## 🎯 사용법 요약

### 관리자 접근:
1. 관리자 계정으로 로그인
2. 네비게이션에서 "시스템 관리" 클릭
3. 원하는 탭 선택하여 작업 수행

### 전체 시스템 초기화:
1. "시스템 초기화" 탭 선택
2. "전체 초기화" 선택
3. 확인 메시지 승인
4. 자동 백업 생성 후 초기화 실행

### 선택적 데이터 삭제:
1. "시스템 초기화" 탭 선택
2. "선택적 삭제" 선택
3. 조건 설정 (날짜, 사용자, 타입 등)
4. 확인 후 실행

### 백업 및 복원:
1. "백업 관리" 탭에서 백업 생성
2. 필요시 백업 목록에서 "복원" 클릭
3. 확인 후 시스템 복원

## 🎉 결론

고급 시스템 관리 기능이 완전히 구현되어 관리자는 이제 다음과 같은 작업을 안전하고 효율적으로 수행할 수 있습니다:

- **체계적인 데이터 관리**: 조건별 세밀한 데이터 삭제
- **안전한 시스템 운영**: 자동 백업과 복구 기능
- **완전한 추적성**: 모든 작업의 상세 로그 기록
- **유연한 복구**: 백업과 아카이브를 통한 다양한 복구 옵션
- **직관적인 관리**: 웹 기반 관리 인터페이스

이 시스템을 통해 MSP 헬퍼 시스템의 데이터 관리가 한층 더 전문적이고 안전해졌습니다.