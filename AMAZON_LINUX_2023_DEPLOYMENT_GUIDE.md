# Amazon Linux 2023 배포 가이드

AWS EC2 Amazon Linux 2023에서 MSP Checklist 시스템을 배포하는 완전한 가이드입니다.

## 🚀 빠른 시작 (자동 배포)

### 1단계: EC2 인스턴스 준비

**권장 인스턴스 사양:**
- **인스턴스 타입**: t3.medium 이상 (2 vCPU, 4GB RAM)
- **스토리지**: 20GB 이상
- **AMI**: Amazon Linux 2023 (최신 버전)

**보안 그룹 설정:**
```
인바운드 규칙:
- SSH (22): 0.0.0.0/0 또는 특정 IP
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Custom TCP (3010): 0.0.0.0/0 (개발용, 선택사항)
- Custom TCP (3011): 0.0.0.0/0 (개발용, 선택사항)
```

### 2단계: 자동 배포 스크립트 실행

```bash
# EC2 인스턴스에 SSH 접속
ssh -i your-key.pem ec2-user@your-ec2-ip

# 프로젝트 클론
git clone https://github.com/your-username/msp-checklist-system.git
cd msp-checklist-system

# 자동 배포 스크립트 실행
chmod +x deploy/amazon-linux-2023-deploy.sh
./deploy/amazon-linux-2023-deploy.sh
```

**스크립트가 자동으로 수행하는 작업:**
1. ✅ 시스템 업데이트 및 필수 패키지 설치
2. ✅ Node.js 20.9.0 설치
3. ✅ PM2 프로세스 관리자 설치
4. ✅ 프로젝트 의존성 설치 (재시도 로직 포함)
5. ✅ 애플리케이션 빌드
6. ✅ PM2 설정 및 프로세스 시작
7. ✅ Nginx 리버스 프록시 설정
8. ✅ 방화벽 설정
9. ✅ SSL 인증서 설정 (선택사항)
10. ✅ 시스템 서비스 등록
11. ✅ 자동 백업 및 모니터링 설정

### 3단계: 배포 완료 확인

배포가 완료되면 다음 주소로 접속할 수 있습니다:
- **메인 서비스**: `http://your-ec2-ip` 또는 `http://your-domain`
- **관리자 시스템**: `http://your-ec2-ip/admin` 또는 `http://your-domain/admin`

## 🔧 수동 배포 (단계별)

자동 배포 스크립트를 사용하지 않고 수동으로 배포하려는 경우:

### 1단계: 시스템 준비

```bash
# 시스템 업데이트
sudo dnf update -y

# 개발 도구 설치
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y git curl wget unzip tar gcc-c++ make python3 python3-pip sqlite nginx firewalld htop vim
```

### 2단계: Node.js 설치

```bash
# Node.js 20.9.0 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 버전 확인
node --version  # v20.9.0
npm --version   # 10.x
```

### 3단계: PM2 설치

```bash
# PM2 전역 설치
sudo npm install -g pm2
```

### 4단계: 프로젝트 설정

```bash
# 애플리케이션 디렉토리 생성
sudo mkdir -p /opt/msp-checklist
sudo chown -R $USER:$USER /opt/msp-checklist
cd /opt/msp-checklist

# 프로젝트 클론
git clone https://github.com/your-username/msp-checklist-system.git .
```

### 5단계: 의존성 설치

```bash
# npm 설정 최적화
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000

# 루트 프로젝트 의존성
npm install

# 메인 앱 의존성
cd msp-checklist
rm -rf node_modules package-lock.json  # 기존 정리
npm install --no-optional --legacy-peer-deps

# 관리자 앱 의존성
cd admin
rm -rf node_modules package-lock.json  # 기존 정리
npm install --no-optional --legacy-peer-deps
cd ..
```

### 6단계: 환경 변수 설정

```bash
# 메인 앱 환경 변수
cp .env.local.example .env.local
nano .env.local  # 필요한 API 키 설정

# 관리자 앱 환경 변수
cd admin
cp .env.local.example .env.local
cd ..
```

### 7단계: 애플리케이션 빌드

```bash
# 메인 앱 빌드
npm run build

# 관리자 앱 빌드
cd admin
npm run build
cd ..
```

### 8단계: PM2 설정

```bash
# PM2 ecosystem 파일 생성
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'msp-checklist',
      script: 'npm',
      args: 'start',
      cwd: '/opt/msp-checklist/msp-checklist',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      }
    },
    {
      name: 'msp-admin',
      script: 'npm',
      args: 'start',
      cwd: '/opt/msp-checklist/msp-checklist/admin',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      }
    }
  ]
};
EOF

# PM2로 애플리케이션 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 9단계: Nginx 설정

```bash
# Nginx 설정 파일 생성
sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
upstream msp_checklist {
    server 127.0.0.1:3010;
}

upstream msp_admin {
    server 127.0.0.1:3011;
}

server {
    listen 80;
    server_name _;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 관리자 시스템
    location /admin {
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_checklist;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Nginx 시작
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 10단계: 방화벽 설정

```bash
# 방화벽 시작
sudo systemctl enable firewalld
sudo systemctl start firewalld

# 필요한 포트 허용
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔍 문제 해결

### npm install 실패 시

**1. 캐시 정리:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
```

**2. 메모리 부족:**
```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=2048"
npm install
```

**3. 네트워크 타임아웃:**
```bash
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
```

**4. 레지스트리 문제:**
```bash
npm config set registry https://registry.npmjs.org/
```

### 빌드 실패 시

**1. TypeScript 오류:**
```bash
# 타입 체크 건너뛰기
npm run build -- --no-type-check
```

**2. 메모리 부족:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 서비스 실행 문제

**1. 포트 충돌:**
```bash
# 포트 사용 확인
sudo netstat -tlnp | grep :3010
sudo netstat -tlnp | grep :3011

# 프로세스 종료
sudo kill -9 $(sudo lsof -t -i:3010)
sudo kill -9 $(sudo lsof -t -i:3011)
```

**2. PM2 문제:**
```bash
# PM2 재시작
pm2 delete all
pm2 start ecosystem.config.js

# PM2 로그 확인
pm2 logs
```

**3. 권한 문제:**
```bash
# 디렉토리 권한 설정
sudo chown -R $USER:$USER /opt/msp-checklist
chmod +x /opt/msp-checklist/*.sh
```

### 데이터베이스 문제

**1. SQLite 권한:**
```bash
# 데이터베이스 파일 권한 설정
chmod 664 /opt/msp-checklist/msp-checklist/*.db
chmod 664 /opt/msp-checklist/msp-checklist/admin/*.db
```

**2. 데이터베이스 초기화:**
```bash
# 데이터베이스 백업 후 재생성
cp *.db backup/
rm *.db
# 애플리케이션 재시작하면 자동 생성됨
```

## 📊 모니터링 및 관리

### 시스템 상태 확인

```bash
# PM2 상태
pm2 status
pm2 logs

# 시스템 리소스
htop
free -h
df -h

# 네트워크 연결
netstat -tlnp | grep :301
```

### 로그 관리

```bash
# 애플리케이션 로그
tail -f /opt/msp-checklist/logs/msp-checklist.log
tail -f /opt/msp-checklist/logs/msp-admin.log

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 시스템 로그
sudo journalctl -u nginx -f
sudo journalctl -u msp-checklist -f
```

### 백업 및 복구

```bash
# 수동 백업
./backup.sh

# 데이터베이스 복구
cp backup/db_backup_YYYYMMDD_HHMMSS/*.db ./

# 설정 파일 백업
tar -czf config_backup.tar.gz .env.local admin/.env.local ecosystem.config.js
```

## 🔄 업데이트 및 배포

### 코드 업데이트

```bash
cd /opt/msp-checklist

# 코드 업데이트
git pull origin main

# 의존성 업데이트 (필요한 경우)
npm install
cd msp-checklist && npm install
cd admin && npm install && cd ..

# 애플리케이션 재빌드
cd msp-checklist
npm run build
cd admin && npm run build && cd ..

# 서비스 재시작
pm2 restart all
```

### 무중단 배포

```bash
# Blue-Green 배포를 위한 스크립트
cat > deploy-update.sh << 'EOF'
#!/bin/bash
set -e

echo "무중단 배포 시작..."

# 코드 업데이트
git pull origin main

# 빌드
cd msp-checklist
npm run build
cd admin && npm run build && cd ..

# PM2 무중단 재시작
pm2 reload ecosystem.config.js

echo "무중단 배포 완료!"
EOF

chmod +x deploy-update.sh
./deploy-update.sh
```

## 🔒 보안 강화

### SSL 인증서 설정

```bash
# Certbot 설치
sudo dnf install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 방화벽 강화

```bash
# 특정 IP만 SSH 허용
sudo firewall-cmd --permanent --remove-service=ssh
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='YOUR_IP' service name='ssh' accept"

# 개발 포트 제거 (프로덕션)
sudo firewall-cmd --permanent --remove-port=3010/tcp
sudo firewall-cmd --permanent --remove-port=3011/tcp

sudo firewall-cmd --reload
```

### 시스템 보안

```bash
# 자동 보안 업데이트 설정
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer

# fail2ban 설치 (SSH 보호)
sudo dnf install -y epel-release
sudo dnf install -y fail2ban
sudo systemctl enable --now fail2ban
```

## 📈 성능 최적화

### PM2 클러스터 모드

```bash
# ecosystem.config.js 수정
module.exports = {
  apps: [
    {
      name: 'msp-checklist',
      script: 'npm',
      args: 'start',
      instances: 'max',  // CPU 코어 수만큼 인스턴스 생성
      exec_mode: 'cluster'
    }
  ]
};
```

### Nginx 캐싱

```bash
# Nginx 설정에 캐싱 추가
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# Gzip 압축 활성화
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

이 가이드를 따라하면 Amazon Linux 2023에서 MSP Checklist 시스템을 안정적으로 배포하고 운영할 수 있습니다.