# 설치 가이드

## 시스템 요구사항

- **OS**: Amazon Linux 2023, Ubuntu 20.04/22.04/24.04
- **Node.js**: 20.x 이상
- **메모리**: 최소 2GB RAM (4GB 권장)
- **디스크**: 최소 10GB 여유 공간

## 자동 설치

```bash
# 프로젝트 클론
git clone https://github.com/your-repo/msp-checklist-system.git
cd msp-checklist-system

# 전체 설치 (Node.js + 의존성 + 빌드)
sudo ./scripts/install/install-full.sh
```

## 수동 설치

### 1. Node.js 설치 (NVM 사용)

```bash
# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Node.js 20 설치
nvm install 20
nvm use 20
nvm alias default 20
```

### 2. 프로젝트 설정

```bash
# 프로젝트 클론
git clone https://github.com/your-repo/msp-checklist-system.git /opt/msp-checklist-system
cd /opt/msp-checklist-system
```

### 3. 의존성 설치

```bash
# 메인 앱
cd msp-checklist
npm install --legacy-peer-deps

# Admin 앱
cd admin
npm install --legacy-peer-deps
```

### 4. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필요한 환경 변수 설정
# - AWS_REGION: AWS 리전 (예: ap-northeast-2)
# - OPENAI_API_KEY: OpenAI API 키 (선택)
```

### 5. 빌드

```bash
# 메인 앱 빌드
cd /opt/msp-checklist-system/msp-checklist
npm run build

# Admin 앱 빌드
cd admin
npm run build
```

### 6. 서버 시작

```bash
cd /opt/msp-checklist-system
./scripts/manage/start-servers.sh
```

## AWS EC2 설치

### User Data 스크립트

EC2 인스턴스 생성 시 User Data에 다음 스크립트를 입력:

```bash
#!/bin/bash
cd /opt
git clone https://github.com/your-repo/msp-checklist-system.git
cd msp-checklist-system
sudo ./scripts/install/install-full.sh
sudo ./scripts/manage/setup-autostart.sh
sudo ./scripts/nginx/setup-nginx.sh
```

### 보안 그룹 설정

| 포트 | 프로토콜 | 소스 | 설명 |
|------|----------|------|------|
| 22 | TCP | 관리자 IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

## 설치 확인

```bash
# 서버 상태 확인
./scripts/manage/server-status.sh

# 포트 확인
curl http://localhost:3010
curl http://localhost:3011
```
