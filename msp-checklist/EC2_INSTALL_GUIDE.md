# EC2 서버 설치 가이드

AWS EC2에서 MSP Checklist 애플리케이션을 설치하고 실행하는 단계별 가이드입니다.

## 사전 요구사항

- AWS EC2 인스턴스 (Amazon Linux 2023 또는 Ubuntu 22.04 LTS)
- 최소 2GB RAM, 1 vCPU
- 포트 3010, 3011 접근 허용 (보안 그룹 설정)

## 1단계: 시스템 업데이트 및 Node.js 설치

### Amazon Linux 2023
```bash
# 시스템 업데이트
sudo dnf update -y

# Node.js 20.9.0 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Git 설치 (필요한 경우)
sudo dnf install -y git

# 버전 확인
node --version  # v20.9.0 이상이어야 함
npm --version   # 10.x 이상이어야 함
```

### Ubuntu 22.04 LTS
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20.9.0 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git 설치 (필요한 경우)
sudo apt-get install -y git

# 버전 확인
node --version  # v20.9.0 이상이어야 함
npm --version   # 10.x 이상이어야 함
```

## 2단계: 프로젝트 클론 및 설정

```bash
# 프로젝트 클론
git clone <your-repository-url>
cd msp-qna

# 또는 이미 클론된 경우
cd /path/to/your/msp-qna
```

## 3단계: 의존성 설치

```bash
# 프로젝트 루트에서 파일 감시 시스템 설치
npm install

# MSP 체크리스트 앱 의존성 설치
cd msp-checklist

# 기존 node_modules 및 package-lock.json 제거 (Electron 제거 후)
rm -rf node_modules package-lock.json

# 서버 환경에 최적화된 의존성 설치
npm install --production --no-optional

# 개발 의존성도 필요한 경우 (빌드를 위해)
# npm install
```

## 4단계: 환경 변수 설정

```bash
# 환경 변수 파일 복사
cp .env.local.example .env.local

# 환경 변수 편집
nano .env.local
```

환경 변수 예시:
```bash
# LLM 제공업체 선택 (openai, gemini, claude, bedrock 중 하나)
LLM_PROVIDER=openai

# OpenAI API 키 (선택한 제공업체에 따라)
OPENAI_API_KEY=your_api_key_here

# 기타 설정
NODE_ENV=production
```

## 5단계: 애플리케이션 빌드 및 시작

```bash
# 프로덕션 빌드
npm run build

# 프로젝트 루트로 이동
cd ..

# 서버 시작
./restart-server.sh
```

## 6단계: 서비스 확인

```bash
# 서버 상태 확인
./server-status.sh

# 로그 확인
tail -f server.log
tail -f admin-server.log
```

브라우저에서 접속:
- 메인 서비스: `http://your-ec2-public-ip:3010`
- 관리자 시스템: `http://your-ec2-public-ip:3011`

## 문제 해결

### npm install 실패 시

1. **캐시 정리**:
```bash
npm cache clean --force
```

2. **타임아웃 설정**:
```bash
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
```

3. **레지스트리 변경** (네트워크 문제 시):
```bash
npm config set registry https://registry.npmjs.org/
```

### 포트 접근 문제

1. **보안 그룹 확인**: EC2 보안 그룹에서 포트 3010, 3011 인바운드 규칙 추가
2. **방화벽 확인**:
```bash
# Amazon Linux 2023
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload

# Ubuntu 22.04
sudo ufw allow 3010/tcp
sudo ufw allow 3011/tcp
```

### 메모리 부족 시

Node.js 메모리 제한 증가:
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

### 권한 문제

```bash
# 프로젝트 디렉토리 권한 설정
sudo chown -R $USER:$USER /path/to/msp-qna
chmod +x *.sh
```

## 자동 시작 설정 (선택사항)

시스템 부팅 시 자동으로 서비스를 시작하려면:

```bash
# systemd 서비스 파일 생성
sudo nano /etc/systemd/system/msp-checklist.service
```

서비스 파일 내용:
```ini
[Unit]
Description=MSP Checklist Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/msp-qna
ExecStart=/home/ec2-user/msp-qna/restart-server.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

서비스 활성화:
```bash
sudo systemctl daemon-reload
sudo systemctl enable msp-checklist
sudo systemctl start msp-checklist
sudo systemctl status msp-checklist
```

## 성능 최적화

### PM2 사용 (권장)

```bash
# PM2 전역 설치
sudo npm install -g pm2

# PM2로 애플리케이션 시작
cd msp-checklist
pm2 start npm --name "msp-checklist" -- start
pm2 start npm --name "msp-admin" --cwd ../admin -- start

# PM2 자동 시작 설정
pm2 startup
pm2 save
```

### 리버스 프록시 설정

Nginx를 사용한 리버스 프록시 설정은 `NGINX_NODE_SETUP_GUIDE.md`를 참조하세요.

## 모니터링

```bash
# 실시간 로그 모니터링
tail -f server.log admin-server.log

# 시스템 리소스 모니터링
htop
df -h
free -h

# 네트워크 연결 확인
netstat -tlnp | grep :301
```

이 가이드를 따라하면 EC2에서 MSP Checklist 애플리케이션을 성공적으로 실행할 수 있습니다.