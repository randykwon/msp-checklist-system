# AWS MSP 자체 평가 어드바이저

AWS MSP 파트너 프로그램 검증을 위한 자체 평가 및 조언 시스템입니다.

## 🚀 빠른 시작

### EC2 원라인 설치
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/scripts/install/install-full.sh | bash
```

### 로컬 개발 환경
```bash
# 1. 저장소 클론
git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system

# 2. 필수 소프트웨어 설치
./scripts/install/install-prerequisites.sh

# 3. 환경 변수 설정
./scripts/install/setup-env.sh

# 4. 전체 빌드
./scripts/install/build-all.sh

# 5. 서버 시작
./scripts/server-all.sh start
```

## 📁 프로젝트 구조

```
msp-checklist-system/
├── msp-checklist/              # 메인 앱 (Next.js, 포트 3010)
│   ├── app/                    # App Router 페이지
│   ├── components/             # React 컴포넌트
│   ├── lib/                    # 유틸리티 함수
│   ├── packages/
│   │   └── shared/             # @msp/shared 공유 패키지
│   │       ├── src/
│   │       │   ├── llm-service.ts    # LLM 통합 서비스
│   │       │   ├── db-service.ts     # DB 서비스
│   │       │   └── cache-service.ts  # 캐시 서비스
│   │       └── dist/           # 빌드 결과
│   └── admin/                  # Admin 앱 (Next.js, 포트 3011)
│       ├── app/                # Admin 페이지
│       └── components/         # Admin 컴포넌트
├── scripts/
│   ├── install/                # 설치/빌드 스크립트
│   ├── server-*.sh             # 서버 관리 스크립트
│   └── ...
├── docs/                       # 문서
├── nginx-samples/              # Nginx 설정 샘플
└── logs/                       # 로그 파일
```

## 🔧 서버 관리

```bash
# 전체 서버 관리
./scripts/server-all.sh start      # 시작
./scripts/server-all.sh stop       # 중지
./scripts/server-all.sh restart    # 재시작
./scripts/server-all.sh status     # 상태 확인

# 개별 서버 관리
./scripts/server-main.sh start     # 메인 앱만
./scripts/server-admin.sh start    # Admin 앱만
```

## 🏗 빌드

```bash
# 전체 빌드 (Shared → Main → Admin)
./scripts/install/build-all.sh

# 클린 빌드 (node_modules 삭제 후)
./scripts/install/build-all.sh --clean

# 개별 빌드
./scripts/install/build-shared.sh   # Shared 패키지만
./scripts/install/build-main.sh     # 메인 앱만
./scripts/install/build-admin.sh    # Admin 앱만
./scripts/install/build-admin.sh --with-shared  # Admin + Shared
```

## 🌐 접속 URL

| 서비스 | 포트 | URL | 설명 |
|--------|------|-----|------|
| 메인 앱 | 3010 | http://localhost:3010 | 사용자용 평가 화면 |
| Admin 앱 | 3011 | http://localhost:3011 | 관리자용 대시보드 |

## ⚙️ 환경 변수 설정

### 메인 앱 (`msp-checklist/.env.local`)
```env
# LLM Provider (openai, gemini, claude, bedrock)
DEFAULT_LLM_PROVIDER=bedrock

# AWS Bedrock
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

# OpenAI (선택)
OPENAI_API_KEY=your-openai-key

# Gemini (선택)
GEMINI_API_KEY=your-gemini-key
```

### Admin 앱 (`msp-checklist/admin/.env.local`)
```env
MAIN_APP_URL=http://localhost:3010
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3010
JWT_SECRET=your-jwt-secret
ADMIN_DEFAULT_PASSWORD=admin123
```

## 📚 문서

| 문서 | 설명 |
|------|------|
| [설치 가이드](scripts/install/README.md) | 상세 설치 방법 |
| [시스템 요구사항](docs/SYSTEM_REQUIREMENTS.md) | 하드웨어/소프트웨어 요구사항 |
| [Nginx 설정](docs/NGINX_SETUP.md) | 리버스 프록시 설정 |
| [배포 가이드](docs/DEPLOYMENT.md) | 프로덕션 배포 |
| [문제 해결](docs/TROUBLESHOOTING.md) | 일반적인 문제 해결 |

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, SQLite (better-sqlite3)
- **AI/LLM**: AWS Bedrock (Claude), OpenAI, Google Gemini, Anthropic
- **Server**: PM2, Nginx
- **Package**: npm workspaces, @msp/shared

## 📄 라이선스

MIT License
