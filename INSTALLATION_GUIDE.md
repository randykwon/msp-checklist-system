# MSP Checklist 시스템 설치 및 업데이트 가이드

## 📋 목차
1. [시스템 요구사항](#시스템-요구사항)
2. [신규 설치](#신규-설치)
3. [업데이트](#업데이트)
4. [문제 해결](#문제-해결)
5. [서버 관리](#서버-관리)
6. [유용한 명령어](#유용한-명령어)

---

## 시스템 요구사항

### 하드웨어 최소 사양
| 항목 | 최소 | 권장 |
|------|------|------|
| CPU | 1 vCPU | 2 vCPU |
| 메모리 | 1GB + 2GB 스왑 | 2GB |
| 디스크 | 10GB | 20GB |
| EC2 인스턴스 | t2.micro | t2.small 이상 |

### 지원 운영체제
- Ubuntu 22.04 LTS
- Amazon Linux 2023

### 필수 소프트웨어
- Node.js 20.x 이상
- npm 10.x 이상
- Nginx
- Git

---

## 신규 설치

### 방법 1: 자동 설치 (권장)

```bash
# 1. 프로젝트 클론
cd /opt
sudo git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system

# 2. 실행 권한 부여
sudo chmod +x *.sh

# 3. 전체 자동 설치 실행
sudo ./ec2-full-install.sh
```

> ✅ 자동 설치 완료 시 관리자 계정(`admin@msp.com` / `admin123!`)이 자동 생성됩니다.

### 방법 2: 단계별 수동 설치

#### 1단계: 시스템 준비

**Ubuntu:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx build-essential
```

**Amazon Linux 2023:**
```bash
sudo dnf update -y
sudo dnf install -y curl wget git nginx gcc gcc-c++ make
```

#### 2단계: Node.js 20.x 설치

**Ubuntu:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Amazon Linux 2023:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

**버전 확인:**
```bash
node --version  # v20.x.x
npm --version   # 10.x.x
```

#### 3단계: 스왑 메모리 설정 (t2.micro 필수)

```bash
# 2GB 스왑 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 적용
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

#### 4단계: 프로젝트 클론 및 설치

```bash
cd /opt
sudo git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system

# 소유권 설정 (Ubuntu: ubuntu, Amazon Linux: ec2-user)
sudo chown -R $(whoami):$(whoami) .
```

#### 5단계: 의존성 설치 및 빌드

```bash
# 메인 애플리케이션
cd /opt/msp-checklist-system/msp-checklist
npm install --legacy-peer-deps
npm run build

# Admin 애플리케이션
cd admin
npm install --legacy-peer-deps
npm run build
```

#### 6단계: 환경 변수 설정

```bash
cd /opt/msp-checklist-system/msp-checklist

# .env.local 파일 편집
nano .env.local
```

필수 환경 변수:
```env
NODE_ENV=production
PORT=3010
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
```

#### 7단계: Nginx 설정

**Ubuntu:**
```bash
sudo nano /etc/nginx/sites-available/msp-checklist
```

**Amazon Linux 2023:**
```bash
sudo nano /etc/nginx/conf.d/msp-checklist.conf
```

설정 내용:
```nginx
upstream msp_main {
    server 127.0.0.1:3010;
}

upstream msp_admin {
    server 127.0.0.1:3011;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Ubuntu 추가 작업:**
```bash
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

**Nginx 적용:**
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 8단계: 관리자 계정 생성

> ⚠️ **참고:** 자동 설치(`ec2-full-install.sh`) 또는 업데이트(`update-and-build.sh`) 시 관리자 계정이 자동으로 생성됩니다.

수동으로 생성하려면:
```bash
cd /opt/msp-checklist-system
sudo node create-admin.cjs
```

기본 관리자 계정:
- 이메일: `admin@msp.com`
- 비밀번호: `admin123!`

> 🔐 **보안:** 첫 로그인 후 반드시 비밀번호를 변경하세요!

#### 9단계: 서버 시작

```bash
cd /opt/msp-checklist-system
./restart-servers.sh
```

#### 10단계: 자동 시작 설정

```bash
sudo ./setup-autostart.sh
```

---

## 업데이트

### 빠른 업데이트 (코드만)

```bash
cd /opt/msp-checklist-system
./pull-changes.sh
```

### 전체 업데이트 (빌드 포함)

```bash
cd /opt/msp-checklist-system
sudo ./update-and-build.sh
```

> ✅ 업데이트 시 관리자 계정이 없으면 자동으로 생성됩니다.

### 수동 업데이트

```bash
cd /opt/msp-checklist-system

# 1. 최신 코드 가져오기
sudo git pull

# 2. 메인 애플리케이션 업데이트
cd msp-checklist
npm install --legacy-peer-deps
npm run build

# 3. Admin 애플리케이션 업데이트
cd admin
npm install --legacy-peer-deps
npm run build

# 4. 서버 재시작
cd /opt/msp-checklist-system
./restart-servers.sh
```

---

## 문제 해결

### Node.js 버전 오류

**증상:**
```
npm warn EBADENGINE Unsupported engine {
  required: { node: '20.x || 22.x' },
  current: { node: 'v18.x.x' }
}
```

**해결:**
```bash
# Node.js 20.x 업그레이드
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs  # Amazon Linux
# 또는
sudo apt install -y nodejs  # Ubuntu
```

### 메모리 부족 (npm install Killed)

**증상:**
```
npm install
Killed
```

**해결:**
```bash
# 스왑 메모리 추가
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

### 빌드 오류

**해결:**
```bash
cd /opt/msp-checklist-system/msp-checklist

# 캐시 및 의존성 정리
rm -rf node_modules package-lock.json .next

# 재설치
npm install --legacy-peer-deps
npm run build
```

### 포트 충돌

**확인:**
```bash
sudo lsof -i :3010
sudo lsof -i :3011
```

**해결:**
```bash
# 기존 프로세스 종료
sudo kill -9 $(sudo lsof -t -i:3010)
sudo kill -9 $(sudo lsof -t -i:3011)

# 서버 재시작
./restart-servers.sh
```

### Nginx 오류

**설정 테스트:**
```bash
sudo nginx -t
```

**로그 확인:**
```bash
sudo tail -f /var/log/nginx/error.log
```

### 데이터베이스 테이블 없음

**증상:**
```
SqliteError: no such table: users
```

**해결:**
```bash
cd /opt/msp-checklist-system
sudo node create-admin.cjs
```

---

## 서버 관리

### 서버 시작/중지/재시작

```bash
cd /opt/msp-checklist-system

# 시작
./restart-servers.sh

# 상태 확인
./server-status.sh

# 중지
./stop-servers.sh
```

### PM2 관리 (자동 시작 설정 후)

```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 재시작
pm2 restart all

# 중지
pm2 stop all
```

### 로그 확인

```bash
# 메인 서버 로그
tail -f /opt/msp-checklist-system/main-server.log

# Admin 서버 로그
tail -f /opt/msp-checklist-system/admin-server.log

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 유용한 명령어

### 시스템 정보

```bash
# 디스크 사용량
df -h

# 메모리 사용량
free -h

# CPU 사용량
top

# Node.js 버전
node --version

# npm 버전
npm --version
```

### 서비스 상태

```bash
# Nginx 상태
sudo systemctl status nginx

# 포트 사용 확인
sudo netstat -tlnp | grep -E '3010|3011|80'
```

### 방화벽 설정

**Ubuntu (UFW):**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3010/tcp
sudo ufw allow 3011/tcp
sudo ufw reload
```

**Amazon Linux (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload
```

### AWS 보안 그룹

EC2 콘솔에서 다음 인바운드 규칙 추가:
- HTTP (80) - 0.0.0.0/0
- HTTPS (443) - 0.0.0.0/0
- Custom TCP (3010) - 0.0.0.0/0
- Custom TCP (3011) - 0.0.0.0/0

---

## 접속 URL

| 서비스 | URL |
|--------|-----|
| 메인 서비스 | http://[서버IP] |
| 관리자 시스템 | http://[서버IP]/admin |
| 메인 직접 접속 | http://[서버IP]:3010 |
| Admin 직접 접속 | http://[서버IP]:3011 |

---

## 지원

문제가 발생하면 GitHub Issues에 등록하거나 로그 파일을 확인하세요.

```bash
# 전체 로그 수집
cd /opt/msp-checklist-system
cat main-server.log admin-server.log > debug-logs.txt
```
