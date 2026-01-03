# MSP Checklist System - 시스템 요구사항 명세서

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-01-03 |
| 시스템 버전 | 0.1.0 |
| 상태 | 구현 완료 |

---

## 1. 시스템 개요

### 1.1 목적
AWS MSP(Managed Service Provider) 파트너 프로그램 검증을 위한 체크리스트 관리 시스템으로, 파트너사가 MSP 인증 요구사항을 체계적으로 준비하고 관리할 수 있도록 지원합니다.

### 1.2 시스템 구성
- **메인 애플리케이션**: 사용자용 체크리스트 평가 시스템 (포트 3010)
- **관리자 애플리케이션**: 시스템 관리 및 모니터링 (포트 3011)
- **데이터베이스**: SQLite 기반 로컬 데이터 저장
- **AI 서비스**: LLM 기반 조언 및 가상증빙 생성

---

## 2. 하드웨어/인프라 요구사항 (HW Requirements)

### 2.1 서버 요구사항

| 항목 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| CPU | 2 vCPU | 4 vCPU |
| 메모리 | 4GB RAM | 8GB RAM |
| 스토리지 | 20GB SSD | 50GB SSD |
| 네트워크 | 100Mbps | 1Gbps |

### 2.2 지원 운영체제
- **HW-001**: Amazon Linux 2023 지원
- **HW-002**: Ubuntu 20.04/22.04 LTS 지원
- **HW-003**: macOS (개발 환경)

### 2.3 네트워크 요구사항
- **HW-004**: HTTP 포트 80 (Nginx)
- **HW-005**: HTTPS 포트 443 (SSL/TLS)
- **HW-006**: 메인 앱 포트 3010 (내부)
- **HW-007**: Admin 앱 포트 3011 (내부)

### 2.4 클라우드 서비스 연동
- **HW-008**: AWS Bedrock (Claude AI) - 서울 리전 (ap-northeast-2)
- **HW-009**: OpenAI API (선택적)
- **HW-010**: Google Gemini API (선택적)
- **HW-011**: Anthropic Claude API (선택적)

---

## 3. 소프트웨어 요구사항 (SW Requirements)

### 3.1 런타임 환경

| 소프트웨어 | 버전 | 용도 |
|-----------|------|------|
| Node.js | 20.x LTS | 런타임 환경 |
| npm | 10.x | 패키지 관리 |
| Nginx | 1.24+ | 리버스 프록시 |
| SQLite | 3.x | 데이터베이스 |

### 3.2 프레임워크 및 라이브러리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| Next.js | 14.2.x | 웹 프레임워크 |
| React | 18.3.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 시스템 |
| better-sqlite3 | 12.5.x | SQLite 바인딩 |
| bcryptjs | 3.0.x | 비밀번호 해싱 |
| jsonwebtoken | 9.0.x | JWT 인증 |
| @aws-sdk/client-bedrock-runtime | 3.958.x | AWS Bedrock 연동 |

### 3.3 개발 도구
- **SW-001**: ESLint (코드 품질)
- **SW-002**: TypeScript (타입 검사)
- **SW-003**: Git (버전 관리)

---

## 4. 기능 요구사항 (Functional Requirements)

### 4.1 사용자 인증 시스템

#### FR-AUTH-001: 회원가입
- 이메일, 비밀번호, 이름, 조직명으로 회원가입
- 비밀번호 bcrypt 해싱 (salt rounds: 10)
- 신규 사용자 기본 상태: inactive
- 관리자 설정에 따른 자동 활성화 옵션

#### FR-AUTH-002: 로그인
- 이메일/비밀번호 기반 인증
- JWT 토큰 발급 (쿠키 저장)
- 메인 앱 쿠키: `msp_auth_token`
- Admin 앱 쿠키: `admin_auth_token`

#### FR-AUTH-003: 권한 관리
- 역할 기반 접근 제어 (RBAC)
- 역할 레벨: user(1) < operator(2) < admin(3) < superadmin(4)
- 역할별 접근 가능 페이지 제한

### 4.2 평가 체크리스트 시스템

#### FR-ASSESS-001: 평가 항목 표시
- Prerequisites (사전 요구사항) 체크리스트
- Technical Validation (기술 검증) 체크리스트
- 카테고리별 그룹화 및 접기/펼치기

#### FR-ASSESS-002: 평가 상태 관리
- 충족(met: true), 미충족(met: false), 미평가(met: null)
- 파트너 응답(partnerResponse) 텍스트 입력
- 증빙 파일 첨부 기능

#### FR-ASSESS-003: 진행률 대시보드
- 전체 진행률 표시
- 카테고리별 진행률
- 필수/선택 항목 구분 표시

#### FR-ASSESS-004: 다중 프로필 지원
- 사용자별 여러 평가 프로필 생성
- 프로필 간 전환 기능
- 프로필별 독립적인 진행 상태

### 4.3 AI 조언 시스템

#### FR-AI-001: 조언 생성
- 평가 항목별 맞춤형 조언 생성
- 한국어/영어 다국어 지원
- LLM 프로바이더 선택 (Bedrock, OpenAI, Gemini, Claude)

#### FR-AI-002: 조언 캐시
- 생성된 조언 SQLite 캐시 저장
- 버전별 캐시 관리
- 캐시 내보내기/가져오기 (JSON)

#### FR-AI-003: 가상증빙 생성
- 평가 항목별 가상 증빙 예제 생성
- 시연 가이드 생성 (시연 필요 항목)
- 시각적 자료 예제 포함

### 4.4 관리자 기능

#### FR-ADMIN-001: 사용자 관리
- 전체 사용자 목록 조회
- 사용자 역할 변경
- 사용자 상태 변경 (active/inactive/suspended)
- 사용자 삭제

#### FR-ADMIN-002: 공지사항 관리
- 공지사항 CRUD
- 공지 유형 (info, warning, success, error)
- 우선순위 설정
- 게시 기간 설정

#### FR-ADMIN-003: Q&A 관리
- 사용자 질문 조회
- 답변 작성
- 질문/답변 삭제

#### FR-ADMIN-004: 캐시 관리
- 조언 캐시 통계 조회
- 가상증빙 캐시 통계 조회
- 캐시 재생성
- 캐시 내보내기

#### FR-ADMIN-005: 시스템 설정
- 자동 사용자 활성화 설정
- 시스템 설정 조회/수정
- 백업 관리

### 4.5 다국어 지원

#### FR-I18N-001: 언어 전환
- 한국어/영어 UI 전환
- 평가 항목 다국어 표시
- 조언/가상증빙 다국어 생성

---

## 5. 비기능 요구사항 (Non-Functional Requirements)

### 5.1 성능 요구사항

#### NFR-PERF-001: 응답 시간
- 페이지 로드: 3초 이내
- API 응답: 1초 이내 (캐시된 데이터)
- AI 조언 생성: 30초 이내

#### NFR-PERF-002: 동시 사용자
- 최소 50명 동시 접속 지원
- 권장 100명 동시 접속 지원

### 5.2 보안 요구사항

#### NFR-SEC-001: 인증 보안
- 비밀번호 bcrypt 해싱
- JWT 토큰 기반 세션 관리
- HttpOnly 쿠키 사용

#### NFR-SEC-002: 통신 보안
- HTTPS/TLS 1.2+ 지원
- Let's Encrypt SSL 인증서
- 자동 인증서 갱신

#### NFR-SEC-003: 접근 제어
- 역할 기반 접근 제어 (RBAC)
- API 엔드포인트 인증 필수
- 관리자 기능 권한 검증

### 5.3 가용성 요구사항

#### NFR-AVAIL-001: 서비스 가용성
- 목표 가용성: 99.5%
- systemd 서비스 자동 재시작
- 서버 재부팅 시 자동 시작

#### NFR-AVAIL-002: 데이터 백업
- SQLite 데이터베이스 백업 기능
- 백업 파일 관리
- 복원 기능

### 5.4 확장성 요구사항

#### NFR-SCALE-001: 수평 확장
- 단일 서버 배포 (현재)
- 로드 밸런서 지원 가능 구조

#### NFR-SCALE-002: 데이터 확장
- SQLite → PostgreSQL 마이그레이션 가능
- 캐시 시스템 분리 가능

### 5.5 유지보수성 요구사항

#### NFR-MAINT-001: 배포 자동화
- Git 기반 배포 스크립트
- 원클릭 업데이트 (pull + build + restart)
- 롤백 지원

#### NFR-MAINT-002: 로깅
- 서버 로그 파일 저장
- 에러 로깅
- 시스템 작업 로그

#### NFR-MAINT-003: 모니터링
- 서버 상태 확인 스크립트
- 시스템 가동시간 표시
- 프로세스 상태 모니터링

---

## 6. 인터페이스 요구사항

### 6.1 사용자 인터페이스

#### UI-001: 반응형 디자인
- 데스크톱/태블릿/모바일 지원
- 최소 너비: 320px

#### UI-002: 접근성
- 키보드 네비게이션 지원
- 색상 대비 준수
- 스크린 리더 호환

### 6.2 API 인터페이스

#### API-001: RESTful API
- JSON 요청/응답
- HTTP 상태 코드 준수
- 에러 메시지 표준화

#### API-002: 인증 API
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/me

#### API-003: 평가 API
- GET /api/assessment
- POST /api/assessment
- DELETE /api/assessment

#### API-004: 조언 API
- GET /api/advice
- POST /api/advice-cache/generate
- GET /api/advice-cache/stats

#### API-005: 관리자 API
- GET /api/admin/stats
- GET /api/users
- PUT /api/users/[id]
- DELETE /api/users/[id]

---

## 7. 운영 스크립트

### 7.1 설치 스크립트
| 스크립트 | 경로 | 설명 |
|---------|------|------|
| 전체 설치 | scripts/install/install-full.sh | Node.js, 의존성, 빌드 |

### 7.2 서버 관리 스크립트
| 스크립트 | 경로 | 설명 |
|---------|------|------|
| 서버 시작 | scripts/manage/start-servers.sh | 메인/Admin 서버 시작 |
| 서버 중지 | scripts/manage/stop-servers.sh | 서버 프로세스 종료 |
| 서버 재시작 | scripts/manage/restart-servers.sh | 서버 재시작 |
| 상태 확인 | scripts/manage/server-status.sh | 서버 상태 조회 |
| 자동 시작 | scripts/manage/setup-autostart.sh | systemd 서비스 등록 |

### 7.3 배포 스크립트
| 스크립트 | 경로 | 설명 |
|---------|------|------|
| 변경사항 가져오기 | scripts/deploy/pull-changes.sh | git pull |
| 전체 배포 | scripts/deploy/deploy-update.sh | pull + build + restart |
| Git 커밋 | scripts/deploy/git-commit.sh | 커밋 및 푸시 |

### 7.4 Nginx 스크립트
| 스크립트 | 경로 | 설명 |
|---------|------|------|
| Nginx 설치 | scripts/nginx/install-nginx.sh | Nginx 설치 |
| Node.js 연동 | scripts/nginx/setup-nginx-node.sh | 리버스 프록시 설정 |
| SSL 설정 | scripts/nginx/setup-nginx-ssl.sh | Let's Encrypt SSL |

### 7.5 유틸리티 스크립트
| 스크립트 | 경로 | 설명 |
|---------|------|------|
| 관리자 생성 | scripts/utils/create-admin.cjs | admin 계정 생성 |
| 운영자 생성 | scripts/utils/create-operator.cjs | operator 계정 생성 |
| 사용자 생성 | scripts/utils/create-user.cjs | user 계정 생성 |
| 최고관리자 승격 | scripts/utils/upgrade-to-superadmin.cjs | superadmin 승격 |

---

## 8. 데이터베이스 스키마

### 8.1 users 테이블
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  phone TEXT,
  organization TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 8.2 assessment_data 테이블
```sql
CREATE TABLE assessment_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  assessment_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL,
  evidence_required TEXT NOT NULL,
  met TEXT,
  partner_response TEXT,
  evidence_files TEXT,
  evaluation_data TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 8.3 advice_cache 테이블
```sql
CREATE TABLE advice_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  language TEXT NOT NULL,
  advice_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, language)
);
```

### 8.4 virtual_evidence_cache 테이블
```sql
CREATE TABLE virtual_evidence_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  language TEXT NOT NULL,
  virtual_evidence_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, language)
);
```

### 8.5 admin_announcements 테이블
```sql
CREATE TABLE admin_announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  start_date DATETIME,
  end_date DATETIME,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 8.6 system_settings 테이블
```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

---

## 9. 환경 변수 설정

### 9.1 필수 환경 변수
```bash
# LLM 프로바이더 설정
LLM_PROVIDER=bedrock  # bedrock, openai, gemini, claude

# AWS Bedrock 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

# JWT 설정
JWT_SECRET=your_jwt_secret
```

### 9.2 선택적 환경 변수
```bash
# OpenAI 설정
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o

# Google Gemini 설정
GOOGLE_API_KEY=your_google_key
GEMINI_MODEL=gemini-1.5-pro

# Anthropic Claude 설정
ANTHROPIC_API_KEY=your_anthropic_key
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

---

## 10. 부록

### 10.1 용어 정의
| 용어 | 정의 |
|------|------|
| MSP | Managed Service Provider - AWS 관리형 서비스 제공자 |
| Prerequisites | MSP 인증을 위한 사전 요구사항 |
| Technical Validation | MSP 인증을 위한 기술 검증 항목 |
| Virtual Evidence | AI가 생성한 가상 증빙 예제 |

### 10.2 참고 문서
- [설치 가이드](INSTALLATION.md)
- [배포 가이드](DEPLOYMENT.md)
- [Nginx 설정 가이드](NGINX_SETUP.md)
- [문제 해결](TROUBLESHOOTING.md)

### 10.3 변경 이력
| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-03 | 최초 작성 |
