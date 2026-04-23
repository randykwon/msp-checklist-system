# MSP 어드바이저 - 설치 가이드

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [빠른 설치 (EC2)](#빠른-설치-ec2)
3. [수동 설치](#수동-설치)
4. [개발 환경 설정](#개발-환경-설정)
5. [환경 변수 설정](#환경-변수-설정)
6. [빌드 및 실행](#빌드-및-실행)

---

## 시스템 요구사항

### 하드웨어
| 항목 | 최소 | 권장 |
|------|------|------|
| CPU | 1 vCPU | 2 vCPU |
| 메모리 | 2GB RAM | 4GB RAM |
| 디스크 | 10GB | 20GB |

### 소프트웨어
| 항목 | 버전 |
|------|------|
| OS | Amazon Linux 2023, Amazon Linux 2, Ubuntu 20.04/22.04, macOS |
| Node.js | 20.x (nvm으로 자동 설치) |
| npm | 10.x |
| Git | 2.x 이상 |

### 네트워크 포트
| 포트 | 용도 |
|------|------|
| 3010 | 메인 앱 (사용자용) |
| 3011 | Admin 앱 (관리자용) |
| 80/443 | Nginx (선택) |

---

## 빠른 설치 (EC2)

### 원라인 설치
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/scripts/install/install-full.sh | bash
```

### 설치 후 설정
```bash
# API 키 설정 (필수)
nano /opt/msp-advisor/msp-checklist/.env.local

# 서비스 재시작
/opt/msp-advisor/restart.sh

# 상태 확인
/opt/msp-advisor/status.sh
```

### EC2 보안 그룹 설정
AWS 콘솔에서 다음 포트를 열어주세요:
- **3010** (TCP): 메인 앱
- **3011** (TCP): Admin 앱
- 또는 **80/443** (Nginx 사용 시)

---

## 수동 설치

### 1단계: 필수 소프트웨어 설치
```bash
./scripts/install/install-prerequisites.sh
```

설치되는 항목:
- Node.js 20.x (nvm 사용)
- npm
- PM2 (프로세스 관리자)
- Git

### 2단계: 환경 변수 설정
```bash
# 기본 설정 파일 생성
./scripts/install/setup-env.sh

# 대화형 모드 (API 키 직접 입력)
./scripts/install/setup-env.sh --interactive

# 기존 파일 덮어쓰기
./scripts/install/setup-env.sh --force
```

### 3단계: 프로젝트 빌드
```bash
# 전체 빌드 (권장)
./scripts/install/build-all.sh

# 클린 빌드 (문제 발생 시)
./scripts/install/build-all.sh --clean
```

### 4단계: 서버 시작
```bash
./scripts/server-all.sh start
```

---

## 개발 환경 설정

### 로컬 개발
```bash
# 1. 저장소 클론
git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system

# 2. 필수 소프트웨어 설치
./scripts/install/install-prerequisites.sh

# 3. 새 터미널 열기 또는 nvm 로드
source ~/.bashrc  # 또는 source ~/.zshrc

# 4. 환경 변수 설정
./scripts/install/setup-env.sh

# 5. 전체 빌드
./scripts/install/build-all.sh

# 6. 서버 시작
./scripts/server-all.sh start
```

### 개발 서버 실행 (Hot Reload)
```bash
# 메인 앱 개발 서버
cd msp-checklist
npm run dev

# Admin 앱 개발 서버 (별도 터미널)
cd msp-checklist/admin
npm run dev
```

### 코드 수정 후 빌드
```bash
# Shared 패키지 수정 시
./scripts/install/build-shared.sh

# Admin 앱 수정 시 (Shared 포함)
./scripts/install/build-admin.sh --with-shared

# 메인 앱 수정 시
./scripts/install/build-main.sh
```

---

## 환경 변수 설정

### 메인 앱 (`msp-checklist/.env.local`)

```env
#===============================================================================
# MSP 어드바이저 - 메인 앱 환경 변수
#===============================================================================

# 기본 LLM Provider (openai, gemini, claude, bedrock)
DEFAULT_LLM_PROVIDER=bedrock

#-------------------------------------------------------------------------------
# AWS Bedrock 설정 (권장)
#-------------------------------------------------------------------------------
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

#-------------------------------------------------------------------------------
# OpenAI 설정 (선택)
#-------------------------------------------------------------------------------
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

#-------------------------------------------------------------------------------
# Google Gemini 설정 (선택)
#-------------------------------------------------------------------------------
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-pro

#-------------------------------------------------------------------------------
# Anthropic Claude 설정 (선택, Direct API)
#-------------------------------------------------------------------------------
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Admin 앱 (`msp-checklist/admin/.env.local`)

```env
#===============================================================================
# MSP 어드바이저 - Admin 앱 환경 변수
#===============================================================================

# 메인 앱 URL
MAIN_APP_URL=http://localhost:3010
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3010

# JWT Secret (자동 생성됨)
JWT_SECRET=your-random-secret-key

# Admin 초기 비밀번호
ADMIN_DEFAULT_PASSWORD=admin123
```

---

## 빌드 및 실행

### 빌드 스크립트

| 스크립트 | 설명 |
|---------|------|
| `build-all.sh` | 전체 빌드 (Shared → Main → Admin) |
| `build-all.sh --clean` | 클린 빌드 (캐시 삭제 후) |
| `build-shared.sh` | @msp/shared 패키지만 빌드 |
| `build-main.sh` | 메인 앱만 빌드 |
| `build-admin.sh` | Admin 앱만 빌드 |
| `build-admin.sh --with-shared` | Admin + Shared 빌드 |

### 서버 관리 스크립트

| 스크립트 | 설명 |
|---------|------|
| `server-all.sh start` | 전체 서버 시작 |
| `server-all.sh stop` | 전체 서버 중지 |
| `server-all.sh restart` | 전체 서버 재시작 |
| `server-all.sh status` | 상태 확인 |
| `server-main.sh` | 메인 서버만 관리 |
| `server-admin.sh` | Admin 서버만 관리 |

### 빌드 순서

프로젝트는 monorepo 구조로, 빌드 순서가 중요합니다:

```
1. @msp/shared 패키지 빌드
   └── msp-checklist/packages/shared/

2. 메인 앱 빌드
   └── msp-checklist/

3. Admin 앱 빌드
   └── msp-checklist/admin/
```

`build-all.sh` 스크립트가 이 순서를 자동으로 처리합니다.

---

## 삭제 (Uninstall)

### 완전 삭제
```bash
# 대화형 모드 (확인 후 삭제)
/opt/msp-checklist-system/scripts/install/uninstall.sh

# 강제 삭제 (확인 없이)
/opt/msp-checklist-system/scripts/install/uninstall.sh --force

# DB 백업 후 삭제
/opt/msp-checklist-system/scripts/install/uninstall.sh --keep-db
```

### 삭제 항목
- PM2 프로세스 (msp-main, msp-admin)
- 설치 디렉토리 (`/opt/msp-checklist-system`)
- PM2 시작 설정 (startup)
- 로그 파일

### 백업 옵션 (`--keep-db`)
`--keep-db` 옵션 사용 시 다음 파일이 `~/msp-backup-날짜/`에 백업됩니다:
- `msp-assessment.db` (사용자 데이터)
- `advice-cache.db` (조언 캐시)
- `virtual-evidence-cache.db` (가상증빙 캐시)
- `.env.local` (환경 설정)
- `evidence-files/` (증빙 파일)

---

## 문제 해결

### Node.js 버전 문제
```bash
# nvm 재로드
source ~/.bashrc

# 버전 확인
node -v  # v20.x.x 이어야 함

# 버전 변경
nvm use 20
```

### 빌드 실패
```bash
# 클린 빌드 시도
./scripts/install/build-all.sh --clean
```

### 포트 충돌
```bash
# 포트 사용 확인
lsof -i :3010
lsof -i :3011

# 프로세스 종료
kill -9 <PID>
```

자세한 문제 해결은 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)를 참조하세요.
