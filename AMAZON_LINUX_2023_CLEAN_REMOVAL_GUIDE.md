# Amazon Linux 2023 깨끗한 제거 및 재설치 가이드

Amazon Linux 2023에서 MSP Checklist 시스템을 완전히 제거하고 깨끗하게 재설치하는 단계별 가이드입니다.

## 🗑️ 완전 제거 (Clean Removal)

### 1단계: 실행 중인 프로세스 중지

```bash
# 현재 실행 중인 Node.js 프로세스 확인
ps aux | grep node

# PM2로 관리되는 프로세스 중지 (있는 경우)
pm2 stop all
pm2 delete all
pm2 kill

# 일반 Node.js 프로세스 강제 종료
sudo pkill -f node
sudo pkill -f npm

# 포트 사용 중인 프로세스 확인 및 종료
sudo netstat -tlnp | grep :301
# 또는
sudo ss -tlnp | grep :301

# 특정 포트 사용 프로세스 종료 (PID 확인 후)
sudo kill -9 <PID>
```

### 2단계: 시스템 서비스 제거

```bash
# systemd 서비스 중지 및 제거 (있는 경우)
sudo systemctl stop msp-checklist
sudo systemctl disable msp-checklist
sudo rm -f /etc/systemd/system/msp-checklist.service
sudo systemctl daemon-reload

# crontab 작업 제거
crontab -l | grep -v msp-checklist | crontab -
# 또는 완전 초기화
crontab -r
```

### 3단계: 애플리케이션 파일 제거

```bash
# 프로젝트 디렉토리 완전 삭제
sudo rm -rf /opt/msp-checklist
rm -rf ~/msp-checklist
rm -rf ~/msp-qna

# 홈 디렉토리의 관련 파일들 제거
rm -rf ~/.npm/_logs/*msp*
rm -rf ~/.pm2
```

### 4단계: Node.js 및 npm 완전 제거

```bash
# Node.js 패키지 제거
sudo dnf remove -y nodejs npm

# Node.js 관련 디렉토리 제거
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm
sudo rm -rf /usr/local/lib/node_modules
sudo rm -rf /usr/local/include/node
sudo rm -rf /usr/local/share/man/man1/node*

# 사용자별 Node.js 설정 제거
rm -rf ~/.npm
rm -rf ~/.node-gyp
rm -rf ~/.config/configstore/update-notifier-npm.json
```

### 5단계: 방화벽 규칙 정리

```bash
# firewalld 규칙 제거
sudo firewall-cmd --permanent --remove-port=3010/tcp
sudo firewall-cmd --permanent --remove-port=3011/tcp
sudo firewall-cmd --reload

# 방화벽 규칙 확인
sudo firewall-cmd --list-ports
```

### 6단계: 로그 파일 정리

```bash
# 애플리케이션 로그 제거
sudo rm -f /var/log/msp-checklist*
sudo rm -f /var/log/node*

# 시스템 로그에서 관련 항목 확인
sudo journalctl --vacuum-time=1d
```

### 7단계: 데이터베이스 파일 제거 (선택사항)

```bash
# SQLite 데이터베이스 파일 찾기 및 제거
find / -name "*.db" -path "*msp*" 2>/dev/null
find / -name "*msp-assessment*" 2>/dev/null
find / -name "*advice-cache*" 2>/dev/null

# 발견된 파일들 제거 (경로 확인 후)
sudo rm -f /path/to/msp-assessment.db
sudo rm -f /path/to/advice-cache.db
```

## 🔄 깨끗한 재설치 (Clean Installation)

### 1단계: 시스템 업데이트

```bash
# 시스템 패키지 업데이트
sudo dnf update -y

# 개발 도구 설치
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y git curl wget
```

### 2단계: Node.js 20.9.0 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Node.js 설치
sudo dnf install -y nodejs

# 버전 확인
node --version  # v20.9.0 이상
npm --version   # 10.x 이상

# npm 전역 설정
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
```

### 3단계: 프로젝트 클론

```bash
# 작업 디렉토리 생성
sudo mkdir -p /opt/msp-checklist
sudo chown -R $USER:$USER /opt/msp-checklist

# 프로젝트 클론
cd /opt/msp-checklist
git clone https://github.com/randykwon/msp-checklist-system.git .

# 또는 기존 저장소에서
git clone <your-repository-url> .
```

### 4단계: 의존성 설치

```bash
# 프로젝트 루트 의존성 설치
npm install

# MSP 체크리스트 앱 의존성 설치
cd msp-checklist
chmod +x install-server.sh
./install-server.sh

# 관리자 시스템 의존성 설치
cd ../admin
npm install
```

### 5단계: 환경 변수 설정

```bash
# MSP 체크리스트 환경 변수
cd /opt/msp-checklist/msp-checklist
cp .env.local.example .env.local
nano .env.local

# 관리자 시스템 환경 변수
cd ../admin
cp .env.local.example .env.local
nano .env.local
```

### 6단계: 빌드 및 테스트

```bash
# MSP 체크리스트 빌드
cd /opt/msp-checklist/msp-checklist
npm run build

# 관리자 시스템 빌드
cd ../admin
npm run build
```

### 7단계: 방화벽 설정

```bash
# 필요한 포트 열기
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload

# 설정 확인
sudo firewall-cmd --list-ports
```

### 8단계: 서버 시작

```bash
# 프로젝트 루트로 이동
cd /opt/msp-checklist

# 서버 시작
./restart-server.sh

# 상태 확인
./server-status.sh
```

## 🔧 문제 해결

### npm install 실패 시

```bash
# 캐시 완전 정리
npm cache clean --force
sudo npm cache clean --force

# 권한 문제 해결
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /opt/msp-checklist

# 메모리 부족 시
export NODE_OPTIONS="--max-old-space-size=2048"
```

### 포트 충돌 시

```bash
# 포트 사용 프로세스 확인
sudo netstat -tlnp | grep :3010
sudo netstat -tlnp | grep :3011

# 프로세스 강제 종료
sudo kill -9 <PID>
```

### 권한 문제 시

```bash
# 디렉토리 권한 설정
sudo chown -R $USER:$USER /opt/msp-checklist
chmod +x /opt/msp-checklist/*.sh
chmod +x /opt/msp-checklist/msp-checklist/*.sh
```

## 🚀 자동화 스크립트

완전 제거 및 재설치를 위한 자동화 스크립트:

```bash
#!/bin/bash
# complete-reinstall.sh

echo "MSP Checklist 완전 제거 및 재설치 시작..."

# 1. 프로세스 중지
pm2 kill 2>/dev/null || true
sudo pkill -f node 2>/dev/null || true

# 2. 파일 제거
sudo rm -rf /opt/msp-checklist
rm -rf ~/.npm
rm -rf ~/.pm2

# 3. Node.js 재설치
sudo dnf remove -y nodejs npm
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 4. 프로젝트 재설치
sudo mkdir -p /opt/msp-checklist
sudo chown -R $USER:$USER /opt/msp-checklist
cd /opt/msp-checklist
git clone <your-repo-url> .

# 5. 의존성 설치
npm install
cd msp-checklist && ./install-server.sh
cd ../admin && npm install

# 6. 서버 시작
cd /opt/msp-checklist
./restart-server.sh

echo "재설치 완료!"
```

## 📋 체크리스트

재설치 후 확인사항:

- [ ] Node.js 버전 확인 (v20.9.0+)
- [ ] npm 버전 확인 (10.x+)
- [ ] 포트 3010, 3011 접근 가능
- [ ] 환경 변수 설정 완료
- [ ] 빌드 성공
- [ ] 서버 정상 시작
- [ ] 웹 브라우저 접속 확인
- [ ] 로그 파일 정상 생성

이 가이드를 따라하면 Amazon Linux 2023에서 MSP Checklist 시스템을 완전히 제거하고 깨끗하게 재설치할 수 있습니다.