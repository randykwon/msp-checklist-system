# MSP Checklist System

AWS MSP 파트너 프로그램 검증을 위한 체크리스트 관리 시스템입니다.

## 🚀 빠른 시작

### 1. 자동 설치 (권장)

```bash
# Amazon Linux 2023
sudo ./scripts/install/install-full.sh

# Ubuntu
sudo ./scripts/install/install-full.sh
```

### 2. 수동 설치

```bash
# 의존성 설치
cd msp-checklist && npm install --legacy-peer-deps
cd admin && npm install --legacy-peer-deps

# 빌드
cd .. && npm run build
cd admin && npm run build
```

## 📁 프로젝트 구조

```
├── msp-checklist/          # 메인 애플리케이션
│   ├── admin/              # 관리자 애플리케이션
│   ├── app/                # Next.js App Router
│   ├── components/         # React 컴포넌트
│   └── lib/                # 유틸리티 함수
├── scripts/                # 관리 스크립트
│   ├── install/            # 설치 스크립트
│   ├── manage/             # 서버 관리 스크립트
│   ├── deploy/             # 배포 스크립트
│   ├── nginx/              # Nginx 설정 스크립트
│   └── utils/              # 유틸리티 스크립트
├── nginx-samples/          # Nginx 설정 샘플
└── docs/                   # 문서
```

## 🔧 서버 관리

```bash
# 서버 시작
./scripts/manage/start-servers.sh

# 서버 중지
./scripts/manage/stop-servers.sh

# 서버 재시작
./scripts/manage/restart-servers.sh

# 상태 확인
./scripts/manage/server-status.sh

# 자동 시작 설정 (systemd)
sudo ./scripts/manage/setup-autostart.sh
```

## 🌐 Nginx 설정

```bash
# Nginx 설치
sudo ./scripts/nginx/install-nginx.sh

# Node.js 연동 설정
sudo ./scripts/nginx/setup-nginx-node.sh

# SSL 인증서 설정
sudo ./scripts/nginx/setup-nginx-ssl.sh -d example.com -e admin@example.com
```

## 📦 배포

```bash
# GitHub에서 변경사항 가져오기
./scripts/deploy/pull-changes.sh

# 전체 배포 업데이트 (pull + build + restart)
./scripts/deploy/deploy-update.sh
```

## 🔑 사용자 관리

```bash
# 관리자 계정 생성
node scripts/utils/create-admin.cjs

# 일반 사용자 생성
node scripts/utils/create-user.cjs

# 운영자 계정 생성
node scripts/utils/create-operator.cjs

# 최고 관리자로 업그레이드
node scripts/utils/upgrade-to-superadmin.cjs
```

## 🌍 접속 URL

| 서비스 | 포트 | URL |
|--------|------|-----|
| 메인 앱 | 3010 | http://localhost:3010 |
| Admin 앱 | 3011 | http://localhost:3011 |
| Nginx (HTTP) | 80 | http://서버IP/ |
| Nginx (HTTPS) | 443 | https://도메인/ |

Nginx 설정 후:
- 메인 앱: `http://서버IP/` 또는 `https://도메인/`
- Admin 앱: `http://서버IP/admin` 또는 `https://도메인/admin`

## 📚 문서

- [설치 가이드](docs/INSTALLATION.md)
- [Nginx 설정 가이드](docs/NGINX_SETUP.md)
- [배포 가이드](docs/DEPLOYMENT.md)
- [문제 해결](docs/TROUBLESHOOTING.md)

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, SQLite
- **AI**: AWS Bedrock (Claude), OpenAI GPT-4
- **Server**: Nginx, PM2/systemd

## 📄 라이선스

MIT License
