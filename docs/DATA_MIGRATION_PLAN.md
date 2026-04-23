# 📦 MSP 체크리스트 시스템 데이터 마이그레이션 계획

## 📅 문서 정보
- **작성일**: 2026년 2월 2일
- **버전**: 1.0
- **목적**: 다른 서버로 사용자 데이터 마이그레이션

---

## 🗂️ 마이그레이션 대상 데이터

### 1. 데이터베이스 파일

| 파일명 | 위치 | 용도 | 우선순위 |
|--------|------|------|----------|
| `msp-assessment.db` | `/msp-checklist/` | 메인 데이터베이스 | 🔴 필수 |
| `advice-cache.db` | `/msp-checklist/` | AI 조언 캐시 | 🟡 권장 |
| `virtual-evidence-cache.db` | `/msp-checklist/` | 가상증빙 캐시 | 🟡 권장 |

### 2. 메인 데이터베이스 테이블 구조

#### 🔴 필수 마이그레이션 (사용자 데이터)

| 테이블명 | 레코드 수 | 설명 | 의존성 |
|----------|-----------|------|--------|
| `users` | 9 | 사용자 계정 정보 | 없음 (기본 테이블) |
| `assessment_data` | 91 | 평가 응답 데이터 | users, checklist_versions |
| `checklist_versions` | 12 | 체크리스트 버전 관리 | users |
| `evidence_evaluations` | - | 증빙 평가 결과 | users |
| `qa_questions` | 0 | Q&A 질문/답변 | users |

#### 🟡 권장 마이그레이션 (시스템 데이터)

| 테이블명 | 레코드 수 | 설명 |
|----------|-----------|------|
| `system_settings` | 2 | 시스템 설정 |
| `announcements` | 0 | 공지사항 |
| `user_activity_logs` | 55 | 사용자 활동 로그 |

#### 🟢 선택적 마이그레이션 (캐시 데이터)

| 테이블명 | 레코드 수 | 설명 |
|----------|-----------|------|
| `advice_cache` | 22 | AI 조언 캐시 |
| `virtual_evidence_cache` | 10 | 가상증빙 캐시 |

### 3. 파일 시스템 데이터

| 경로 | 용도 | 크기 | 우선순위 |
|------|------|------|----------|
| `/evidence-files/` | 업로드된 증빙 파일 | 0B | 🔴 필수 |
| `/cache/advice/` | 조언 JSON 캐시 | ~3MB | 🟢 선택 |
| `/cache/virtual-evidence/` | 가상증빙 JSON 캐시 | ~3MB | 🟢 선택 |
| `/.env.local` | 환경 설정 | - | 🔴 필수 (수동) |

---

## 🔄 테이블 스키마 상세

### users 테이블
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,        -- bcrypt 해시
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',      -- user, operator, admin, superadmin
  status TEXT DEFAULT 'active',  -- active, inactive
  phone TEXT,
  organization TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### assessment_data 테이블
```sql
CREATE TABLE assessment_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  assessment_type TEXT NOT NULL,  -- prerequisites, technical
  item_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL,
  evidence_required TEXT NOT NULL,
  met TEXT,                       -- true, false, null
  partner_response TEXT,
  evidence_files TEXT,            -- JSON 배열
  evaluation_data TEXT,           -- JSON 객체
  version_id INTEGER,
  last_updated DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### checklist_versions 테이블
```sql
CREATE TABLE checklist_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 0,
  is_template BOOLEAN DEFAULT 0,
  metadata TEXT,                  -- JSON 객체
  created_at DATETIME,
  updated_at DATETIME,
  created_by INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🛠️ 마이그레이션 방법

### 방법 1: 전체 DB 파일 복사 (권장 - 간단)

```bash
# 소스 서버에서
scp /path/to/msp-checklist/msp-assessment.db user@target:/path/to/msp-checklist/

# 캐시 DB도 복사 (선택)
scp /path/to/msp-checklist/advice-cache.db user@target:/path/to/msp-checklist/
scp /path/to/msp-checklist/virtual-evidence-cache.db user@target:/path/to/msp-checklist/
```

### 방법 2: SQL 덤프 및 복원

```bash
# 소스 서버에서 덤프
sqlite3 msp-assessment.db .dump > msp_backup.sql

# 타겟 서버에서 복원
sqlite3 msp-assessment.db < msp_backup.sql
```

### 방법 3: 선택적 테이블 마이그레이션

```bash
# 특정 테이블만 덤프
sqlite3 msp-assessment.db ".dump users" > users_backup.sql
sqlite3 msp-assessment.db ".dump assessment_data" > assessment_backup.sql

# 타겟에서 복원
sqlite3 msp-assessment.db < users_backup.sql
sqlite3 msp-assessment.db < assessment_backup.sql
```

---

## 📜 마이그레이션 스크립트

### export-data.sh (소스 서버용)
```bash
#!/bin/bash
# MSP 데이터 내보내기 스크립트

BACKUP_DIR="./migration_backup_$(date +%Y%m%d_%H%M%S)"
DB_PATH="./msp-checklist/msp-assessment.db"

mkdir -p "$BACKUP_DIR"

echo "📦 MSP 데이터 내보내기 시작..."

# 1. 데이터베이스 복사
echo "1. 데이터베이스 복사 중..."
cp "$DB_PATH" "$BACKUP_DIR/msp-assessment.db"
cp "./msp-checklist/advice-cache.db" "$BACKUP_DIR/" 2>/dev/null
cp "./msp-checklist/virtual-evidence-cache.db" "$BACKUP_DIR/" 2>/dev/null

# 2. SQL 덤프 생성
echo "2. SQL 덤프 생성 중..."
sqlite3 "$DB_PATH" .dump > "$BACKUP_DIR/full_dump.sql"

# 3. 테이블별 덤프
echo "3. 테이블별 덤프 생성 중..."
sqlite3 "$DB_PATH" ".dump users" > "$BACKUP_DIR/users.sql"
sqlite3 "$DB_PATH" ".dump assessment_data" > "$BACKUP_DIR/assessment_data.sql"
sqlite3 "$DB_PATH" ".dump checklist_versions" > "$BACKUP_DIR/checklist_versions.sql"
sqlite3 "$DB_PATH" ".dump system_settings" > "$BACKUP_DIR/system_settings.sql"

# 4. 증빙 파일 복사
echo "4. 증빙 파일 복사 중..."
cp -r "./msp-checklist/evidence-files" "$BACKUP_DIR/" 2>/dev/null

# 5. 캐시 파일 복사
echo "5. 캐시 파일 복사 중..."
cp -r "./msp-checklist/cache" "$BACKUP_DIR/" 2>/dev/null

# 6. 환경 설정 템플릿
echo "6. 환경 설정 템플릿 생성 중..."
cat > "$BACKUP_DIR/env.template" << 'EOF'
# AWS Bedrock 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# LLM 설정
LLM_PROVIDER=bedrock
LLM_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# 기타 설정
NEXT_PUBLIC_APP_URL=https://your-domain.com
EOF

# 7. 압축
echo "7. 압축 중..."
tar -czvf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"

echo ""
echo "✅ 내보내기 완료!"
echo "📁 백업 위치: ${BACKUP_DIR}.tar.gz"
echo ""
echo "📊 백업 통계:"
sqlite3 "$DB_PATH" "SELECT 'users: ' || COUNT(*) FROM users;"
sqlite3 "$DB_PATH" "SELECT 'assessment_data: ' || COUNT(*) FROM assessment_data;"
sqlite3 "$DB_PATH" "SELECT 'checklist_versions: ' || COUNT(*) FROM checklist_versions;"
```

### import-data.sh (타겟 서버용)
```bash
#!/bin/bash
# MSP 데이터 가져오기 스크립트

BACKUP_FILE="$1"
APP_DIR="./msp-checklist"

if [ -z "$BACKUP_FILE" ]; then
  echo "사용법: $0 <백업파일.tar.gz>"
  exit 1
fi

echo "📦 MSP 데이터 가져오기 시작..."

# 1. 압축 해제
echo "1. 압축 해제 중..."
tar -xzvf "$BACKUP_FILE"
BACKUP_DIR="${BACKUP_FILE%.tar.gz}"

# 2. 기존 DB 백업
echo "2. 기존 데이터 백업 중..."
if [ -f "$APP_DIR/msp-assessment.db" ]; then
  mv "$APP_DIR/msp-assessment.db" "$APP_DIR/msp-assessment.db.old_$(date +%Y%m%d_%H%M%S)"
fi

# 3. 새 DB 복사
echo "3. 새 데이터베이스 복사 중..."
cp "$BACKUP_DIR/msp-assessment.db" "$APP_DIR/"
cp "$BACKUP_DIR/advice-cache.db" "$APP_DIR/" 2>/dev/null
cp "$BACKUP_DIR/virtual-evidence-cache.db" "$APP_DIR/" 2>/dev/null

# 4. 증빙 파일 복사
echo "4. 증빙 파일 복사 중..."
cp -r "$BACKUP_DIR/evidence-files/"* "$APP_DIR/evidence-files/" 2>/dev/null

# 5. 캐시 파일 복사
echo "5. 캐시 파일 복사 중..."
cp -r "$BACKUP_DIR/cache/"* "$APP_DIR/cache/" 2>/dev/null

# 6. standalone 폴더에 심볼릭 링크 생성
echo "6. standalone 심볼릭 링크 설정 중..."
rm -f "$APP_DIR/.next/standalone/msp-assessment.db"
ln -s "$APP_DIR/msp-assessment.db" "$APP_DIR/.next/standalone/msp-assessment.db"

echo ""
echo "✅ 가져오기 완료!"
echo ""
echo "📊 가져온 데이터 통계:"
sqlite3 "$APP_DIR/msp-assessment.db" "SELECT 'users: ' || COUNT(*) FROM users;"
sqlite3 "$APP_DIR/msp-assessment.db" "SELECT 'assessment_data: ' || COUNT(*) FROM assessment_data;"
sqlite3 "$APP_DIR/msp-assessment.db" "SELECT 'checklist_versions: ' || COUNT(*) FROM checklist_versions;"
echo ""
echo "⚠️  다음 단계:"
echo "1. .env.local 파일을 수동으로 설정하세요"
echo "2. 서버를 재시작하세요: npm run build && node server.js"
```

---

## ✅ 마이그레이션 체크리스트

### 사전 준비
- [ ] 타겟 서버에 Node.js 20.x 설치
- [ ] 타겟 서버에 애플리케이션 코드 배포
- [ ] 타겟 서버에 필요한 디렉토리 생성

### 데이터 마이그레이션
- [ ] 소스 서버에서 export-data.sh 실행
- [ ] 백업 파일을 타겟 서버로 전송
- [ ] 타겟 서버에서 import-data.sh 실행

### 환경 설정
- [ ] `.env.local` 파일 설정 (AWS 키, LLM 설정 등)
- [ ] 관리자 앱 `.env.local` 설정

### 검증
- [ ] 사용자 로그인 테스트
- [ ] 평가 데이터 확인
- [ ] 버전 관리 기능 확인
- [ ] AI 조언 기능 확인

### 서버 시작
- [ ] 메인 앱 빌드 및 시작
- [ ] 관리자 앱 빌드 및 시작
- [ ] Nginx 설정 (필요시)

---

## ⚠️ 주의사항

1. **비밀번호 해시**: 사용자 비밀번호는 bcrypt로 해시되어 있어 그대로 마이그레이션됩니다.

2. **외래 키 관계**: `assessment_data`와 `checklist_versions`는 `users` 테이블에 의존합니다. 반드시 `users` 테이블을 먼저 마이그레이션하세요.

3. **standalone 심볼릭 링크**: 빌드 후 `.next/standalone/msp-assessment.db`가 원본 DB를 가리키도록 심볼릭 링크를 설정해야 합니다.

4. **환경 변수**: AWS 키와 LLM 설정은 `.env.local` 파일에서 수동으로 설정해야 합니다.

5. **파일 권한**: 마이그레이션 후 파일 권한을 확인하세요 (특히 EC2 환경).

---

## 📞 문제 해결

### DB 잠금 오류
```bash
# 서버 중지 후 마이그레이션
pkill -f "node.*server.js"
```

### 외래 키 오류
```bash
# 외래 키 검사 비활성화 후 가져오기
sqlite3 msp-assessment.db "PRAGMA foreign_keys=OFF;"
sqlite3 msp-assessment.db < backup.sql
sqlite3 msp-assessment.db "PRAGMA foreign_keys=ON;"
```

### 권한 오류 (EC2)
```bash
sudo chown -R ec2-user:ec2-user /home/ec2-user/msp-qna/
chmod 644 msp-assessment.db
```

---

*문서 작성: Kiro AI Assistant*
*마지막 업데이트: 2026년 2월 2일*
