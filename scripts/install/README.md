# MSP 어드바이저 - 설치 가이드

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [빠른 설치 (EC2)](#빠른-설치-ec2)
3. [수동 설치](#수동-설치)
4. [개발 환경 설정](#개발-환경-설정)
5. [스크립트 설명](#스크립트-설명)

---

## 시스템 요구사항

### 하드웨어
- **CPU**: 2 vCPU 이상 권장
- **메모리**: 최소 2GB RAM (4GB 권장)
- **디스크**: 최소 10GB 여유 공간

### 소프트웨어
- **OS**: Amazon Linux 2023, Amazon Linux 2, Ubuntu 20.04/22.04, macOS
- **Node.js**: 20.x (nvm으로 자동 설치)
- **Git**: 2.x 이상

### 네트워크 포트
- **3010**: 메인 앱 (사용자용)
- **3011**: Admin 앱 (관리자용)

---

## 빠른 설치 (EC2)

### 원라인 설치
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/msp-advisor/main/scripts/install/install-full.sh | bash
```

### 또는 수동 실행
```bash
# 저장소 클론
git clone https://github.com/your-repo/msp-advisor.git /opt/msp-advisor
cd /opt/msp-advisor

# 설치 스크립트 실행
chmod +x scripts/install/install-full.sh
./scripts/install/install-full.sh
```

### 설치 후 설정
```bash
# API 키 설정
nano /opt/msp-advisor/msp-checklist/.env.local

# 서비스 재시작
/opt/msp-advisor/restart.sh
```

---

## 수동 설치

### 1. 필수 소프트웨어 설치
```bash
./scripts/install/install-prerequisites.sh
```

설치되는 항목:
- Node.js 20.x (nvm 사용)
- npm
- PM2 (프로세스 관리자)
- Git

### 2. 환경 변수 설정
```bash
# 기본 설정 파일 생성
./scripts/install/setup-env.sh

# 대화형 모드로 설정
./scripts/install/setup-env.sh --interactive

# 기존 파일 덮어쓰기
./scripts/install/setup-env.sh --force
```

### 3. 프로젝트 빌드
```bash
# 전체 빌드 (Shared + Main + Admin)
./scripts/install/build-all.sh

# 클린 빌드 (node_modules 삭제 후 빌드)
./scripts/install/build-all.sh --clean
```

### 4. 서버 시작
```bash
# 전체 서버 시작
./scripts/server-all.sh start

# 상태 확인
./scripts/server-all.sh status
```

---

## 개발 환경 설정

### 로컬 개발 환경
```bash
# 1. 저장소 클론
git clone https://github.com/your-repo/msp-advisor.git
cd msp-advisor

# 2. 필수 소프트웨어 설치 (처음 한 번만)
./scripts/install/install-prerequisites.sh

# 3. 환경 변수 설정
./scripts/install/setup-env.sh

# 4. 전체 빌드
./scripts/install/build-all.sh

# 5. 서버 시작
./scripts/server-all.sh start
```

### 개별 빌드 (개발 중)
```bash
# Shared 패키지만 빌드
./scripts/install/build-shared.sh

# Admin 앱만 빌드 (Shared 포함)
./scripts/install/build-admin.sh --with-shared

# 메인 앱만 빌드
./scripts/install/build-main.sh
```

### 개발 서버 실행
```bash
# 메인 앱 개발 서버 (포트 3010)
cd msp-checklist
npm run dev

# Admin 앱 개발 서버 (포트 3011)
cd msp-checklist/admin
npm run dev
```

---

## 스크립트 설명

### 설치 스크립트 (`scripts/install/`)

| 스크립트 | 설명 |
|---------|------|
| `install-prerequisites.sh` | 필수 소프트웨어 설치 (Node.js, PM2, Git) |
| `install-full.sh` | EC2 완벽 설치 (클론 + 빌드 + PM2 설정) |
| `setup-env.sh` | 환경 변수 파일 생성 |
| `build-all.sh` | 전체 빌드 (Shared + Main + Admin) |
| `build-shared.sh` | Shared 패키지만 빌드 |
| `build-main.sh` | 메인 앱만 빌드 |
| `build-admin.sh` | Admin 앱만 빌드 |

### 서버 관리 스크립트 (`scripts/`)

| 스크립트 | 설명 |
|---------|------|
| `server-all.sh` | 전체 서버 관리 (start/stop/restart/status) |
| `server-main.sh` | 메인 서버 관리 |
| `server-admin.sh` | Admin 서버 관리 |

### 사용 예시
```bash
# 전체 서버 시작
./scripts/server-all.sh start

# 전체 서버 중지
./scripts/server-all.sh stop

# 전체 서버 재시작
./scripts/server-all.sh restart

# 상태 확인
./scripts/server-all.sh status
```

---

## 프로젝트 구조

```
msp-advisor/
├── msp-checklist/              # 메인 앱 (Next.js)
│   ├── app/                    # App Router 페이지
│   ├── components/             # React 컴포넌트
│   ├── lib/                    # 유틸리티 함수
│   ├── packages/
│   │   └── shared/             # @msp/shared 패키지
│   │       ├── src/
│   │       │   ├── llm-service.ts    # LLM 통합 서비스
│   │       │   ├── db-service.ts     # DB 서비스
│   │       │   └── cache-service.ts  # 캐시 서비스
│   │       └── dist/           # 빌드 결과
│   └── admin/                  # Admin 앱 (Next.js)
│       ├── app/                # Admin 페이지
│       └── components/         # Admin 컴포넌트
├── scripts/
│   ├── install/                # 설치 스크립트
│   ├── server-*.sh             # 서버 관리 스크립트
│   └── ...
└── logs/                       # 로그 파일
```

---

## 문제 해결

### Node.js 버전 문제
```bash
# nvm 재로드
source ~/.bashrc  # 또는 source ~/.zshrc

# Node.js 버전 확인
node -v  # v20.x.x 이어야 함

# 버전 변경
nvm use 20
```

### 빌드 실패
```bash
# 클린 빌드 시도
./scripts/install/build-all.sh --clean

# 또는 수동으로 캐시 삭제
rm -rf msp-checklist/node_modules
rm -rf msp-checklist/.next
rm -rf msp-checklist/admin/node_modules
rm -rf msp-checklist/admin/.next
rm -rf msp-checklist/packages/shared/node_modules
rm -rf msp-checklist/packages/shared/dist
```

### 포트 충돌
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3010
lsof -i :3011

# 프로세스 종료
kill -9 <PID>
```

### PM2 문제
```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs

# PM2 재설정
pm2 delete all
pm2 start ecosystem.config.js
```
