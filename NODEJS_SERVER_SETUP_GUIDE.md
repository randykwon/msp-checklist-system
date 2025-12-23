# Node.js 서버 설정 완전 가이드

## 📋 목차
1. [개요](#개요)
2. [시스템 요구사항](#시스템-요구사항)
3. [Node.js 설치](#nodejs-설치)
4. [애플리케이션 구조](#애플리케이션-구조)
5. [환경 변수 설정](#환경-변수-설정)
6. [PM2 프로세스 관리](#pm2-프로세스-관리)
7. [Nginx 리버스 프록시](#nginx-리버스-프록시)
8. [SSL 인증서 설정](#ssl-인증서-설정)
9. [모니터링 및 로그](#모니터링-및-로그)
10. [성능 최적화](#성능-최적화)
11. [보안 설정](#보안-설정)
12. [백업 및 복구](#백업-및-복구)
13. [트러블슈팅](#트러블슈팅)

## 🎯 개요

MSP 체크리스트 시스템은 두 개의 Next.js 애플리케이션으로 구성됩니다:
- **메인 애플리케이션** (포트 3010): 사용자용 체크리스트 시스템
- **관리자 애플리케이션** (포트 3011): 관리자용 대시보드

## 💻 시스템 요구사항

### 최소 요구사항
- **OS**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023
- **CPU**: 1 vCPU
- **RAM**: 2GB
- **디스크**: 20GB SSD
- **Node.js**: 20.9.0 이상

### 권장 사양
- **OS**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023
- **CPU**: 2 vCPU 이상
- **RAM**: 4GB 이상
- **디스크**: 40GB SSD 이상
- **Node.js**: 20.9.0 LTS

## 🚀 Node.js 설치

### 1. NodeSource 저장소 사용 (권장)

#### Ubuntu 22.04 LTS
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# NodeSource 저장소 추가 및 Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.9.0 이상이어야 함
npm --version   # 10.x.x 이상 권장
```

#### Amazon Linux 2023
```bash
# 시스템 업데이트
sudo dnf update -y

# NodeSource 저장소 추가 및 Node.js 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 버전 확인
node --version  # v20.9.0 이상이어야 함
npm --version   # 10.x.x 이상 권장
```

### 2. NVM 사용 (개발 환경)
```bash
# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Node.js 20.9.0 설치 및 사용
nvm install 20.9.0
nvm use 20.9.0
nvm alias default 20.9.0

# 버전 확인
node --version
npm --version
```

### 3. PM2 설치
```bash
# PM2 전역 설치
sudo npm install -g pm2

# PM2 버전 확인
pm2 --version
```

## 📁 애플리케이션 구조

### 디렉토리 구조
```
/opt/msp-checklist/
├── msp-checklist/              # 메인 애플리케이션
│   ├── .next/                  # Next.js 빌드 파일
│   ├── components/             # React 컴포넌트
│   ├── pages/                  # Next.js 페이지
│   ├── public/                 # 정적 파일
│   ├── .env.local             # 환경 변수
│   ├── package.json           # 의존성 정의
│   └── next.config.js         # Next.js 설정
├── msp-checklist/admin/        # 관리자 애플리케이션
│   ├── .next/                  # Next.js 빌드 파일
│   ├── components/             # React 컴포넌트
│   ├── pages/                  # Next.js 페이지
│   ├── .env.local             # 환경 변수
│   └── package.json           # 의존성 정의
├── logs/                       # 로그 파일
├── backups/                    # 백업 파일
├── ecosystem.config.js         # PM2 설정
├── package.json               # 루트 의존성
└── deploy/                     # 배포 스크립트
    ├── setup-nginx-node.sh    # 자동 설정 스크립트
    ├── deploy-app.sh          # 애플리케이션 배포
    ├── validate-setup.sh      # 설정 검증
    └── nginx.conf             # Nginx 설정
```

### 포트 구성
- **3010**: 메인 애플리케이션 (사용자용)
- **3011**: 관리자 애플리케이션 (관리자용)
- **80**: HTTP (Nginx 프록시)
- **443**: HTTPS (Nginx 프록시 + SSL)

## ⚙️ 환경 변수 설정

### 1. 메인 애플리케이션 환경 변수
```bash
# /opt/msp-checklist/msp-checklist/.env.local
NODE_ENV=production
PORT=3010
DATABASE_URL=./msp-assessment.db
JWT_SECRET=your-super-secret-jwt-key-here-change-this
OPENAI_API_KEY=your-openai-api-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 선택사항
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### 2. 관리자 애플리케이션 환경 변수
```bash
# /opt/msp-checklist/msp-checklist/admin/.env.local
NODE_ENV=production
PORT=3011
DATABASE_URL=./msp-assessment.db
JWT_SECRET=your-super-secret-jwt-key-here-change-this
NEXT_PUBLIC_APP_URL=https://your-domain.com/admin

# 관리자 전용 설정
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=secure-admin-password-change-this
```

### 3. 환경 변수 보안 설정
```bash
# 환경 변수 파일 권한 설정
chmod 600 /opt/msp-checklist/msp-checklist/.env.local
chmod 600 /opt/msp-checklist/msp-checklist/admin/.env.local

# 소유권 설정
chown $USER:$USER /opt/msp-checklist/msp-checklist/.env.local
chown $USER:$USER /opt/msp-checklist/msp-checklist/admin/.env.local
```

## 🔧 PM2 프로세스 관리

### 1. PM2 Ecosystem 설정
```javascript
// /opt/msp-checklist/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '/opt/msp-checklist/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 2,              // CPU 코어 수에 맞게 조정
      exec_mode: 'cluster',      // 클러스터 모드로 실행
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist/logs/main-error.log',
      out_file: '/opt/msp-checklist/logs/main-out.log',
      log_file: '/opt/msp-checklist/logs/main-combined.log',
      time: true,
      
      // 성능 최적화
      node_args: '--max-old-space-size=1024',
      
      // 헬스 체크
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true
    },
    {
      name: 'msp-admin',
      cwd: '/opt/msp-checklist/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,              // 관리자는 단일 인스턴스
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/opt/msp-checklist/logs/admin-error.log',
      out_file: '/opt/msp-checklist/logs/admin-out.log',
      log_file: '/opt/msp-checklist/logs/admin-combined.log',
      time: true,
      
      // 성능 최적화
      node_args: '--max-old-space-size=512'
    }
  ]
};
```

### 2. PM2 기본 명령어
```bash
# 애플리케이션 시작
cd /opt/msp-checklist
pm2 start ecosystem.config.js

# 상태 확인
pm2 status
pm2 list

# 로그 확인
pm2 logs                    # 모든 앱 로그
pm2 logs msp-main          # 메인 앱 로그만
pm2 logs msp-admin         # 관리자 앱 로그만
pm2 logs --lines 100       # 최근 100줄

# 재시작
pm2 restart all            # 모든 앱 재시작
pm2 restart msp-main       # 특정 앱 재시작
pm2 reload all             # 무중단 재시작

# 중지 및 삭제
pm2 stop all               # 모든 앱 중지
pm2 delete all             # 모든 앱 삭제

# 모니터링
pm2 monit                  # 실시간 모니터링
pm2 show msp-main          # 특정 앱 상세 정보

# 설정 저장 및 자동 시작
pm2 save                   # 현재 프로세스 목록 저장
pm2 startup                # 부팅 시 자동 시작 설정
pm2 unstartup              # 자동 시작 해제
```

### 3. PM2 고급 기능
```bash
# 메모리 사용량 모니터링
pm2 monit

# 프로세스 리셋 (통계 초기화)
pm2 reset all

# 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

# 프로세스 덤프 생성
pm2 dump

# 프로세스 복원
pm2 resurrect
```

## 🌐 Nginx 리버스 프록시

### 1. Nginx 설치 및 기본 설정

#### Ubuntu
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### Amazon Linux
```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Nginx 설정 파일 생성

#### Ubuntu
```bash
sudo nano /etc/nginx/sites-available/msp-checklist
```

#### Amazon Linux
```bash
sudo nano /etc/nginx/conf.d/msp-checklist.conf
```

### 3. Nginx 설정 내용
```nginx
# MSP Checklist Nginx Configuration
upstream msp_main {
    server 127.0.0.1:3010;
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

upstream msp_admin {
    server 127.0.0.1:3011;
    keepalive 16;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

# HTTP 서버 (HTTPS로 리다이렉트)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Let's Encrypt 인증을 위한 경로
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # 모든 HTTP 요청을 HTTPS로 리다이렉트
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 서버
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
    
    # 파일 업로드 크기 제한
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
    
    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        try_files $uri @main_app;
    }
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 버퍼링 설정
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # 관리자 애플리케이션
    location /admin {
        proxy_pass http://msp_admin/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API 엔드포인트 (캐싱 비활성화)
    location /api {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API는 캐싱하지 않음
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # 헬스 체크 엔드포인트
    location /health {
        proxy_pass http://msp_main;
        access_log off;
    }
    
    # 정적 파일 fallback
    location @main_app {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Nginx 설정 활성화

#### Ubuntu
```bash
# 설정 파일 링크 생성
sudo ln -s /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

#### Amazon Linux
```bash
# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 🔒 SSL 인증서 설정

### 1. Certbot 설치

#### Ubuntu
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### Amazon Linux
```bash
sudo pip3 install certbot certbot-nginx
```

### 2. SSL 인증서 발급
```bash
# 도메인 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 인증서 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 3. 자동 갱신 설정
```bash
# Crontab 편집
sudo crontab -e

# 다음 라인 추가 (매일 새벽 2시에 갱신 확인)
0 2 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

## 📊 모니터링 및 로그

### 1. 로그 파일 위치
```
/opt/msp-checklist/logs/
├── main-error.log          # 메인 앱 에러 로그
├── main-out.log           # 메인 앱 출력 로그
├── main-combined.log      # 메인 앱 통합 로그
├── admin-error.log        # 관리자 앱 에러 로그
├── admin-out.log         # 관리자 앱 출력 로그
└── admin-combined.log    # 관리자 앱 통합 로그

/var/log/nginx/
├── msp-checklist-access.log    # Nginx 접근 로그
├── msp-checklist-error.log     # Nginx 에러 로그
├── msp-checklist-ssl-access.log # SSL 접근 로그
└── msp-checklist-ssl-error.log  # SSL 에러 로그
```

### 2. 로그 모니터링 명령어
```bash
# PM2 로그 실시간 확인
pm2 logs --lines 50

# Nginx 로그 실시간 확인
sudo tail -f /var/log/nginx/msp-checklist-access.log
sudo tail -f /var/log/nginx/msp-checklist-error.log

# 에러 로그만 확인
sudo grep "ERROR" /var/log/nginx/msp-checklist-error.log

# 특정 시간대 로그 확인
sudo grep "$(date '+%d/%b/%Y:%H')" /var/log/nginx/msp-checklist-access.log
```

### 3. 시스템 모니터링
```bash
# 시스템 리소스 확인
htop
top

# 메모리 사용량
free -h

# 디스크 사용량
df -h

# 네트워크 연결 상태
sudo netstat -tlnp | grep -E "(80|443|3010|3011)"
sudo ss -tlnp | grep -E "(80|443|3010|3011)"

# 프로세스 확인
ps aux | grep node
ps aux | grep nginx
```

## ⚡ 성능 최적화

### 1. Node.js 애플리케이션 최적화

#### PM2 클러스터 모드
```javascript
// ecosystem.config.js
{
  instances: 'max',          // CPU 코어 수만큼 인스턴스 생성
  exec_mode: 'cluster',      // 클러스터 모드
  node_args: '--max-old-space-size=1024'  // 메모리 제한
}
```

#### Next.js 최적화
```javascript
// next.config.js
module.exports = {
  // 압축 활성화
  compress: true,
  
  // 이미지 최적화
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 번들 분석
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
  
  // 실험적 기능
  experimental: {
    optimizeCss: true,
    optimizeImages: true,
  }
};
```

### 2. Nginx 성능 최적화

#### /etc/nginx/nginx.conf 수정
```nginx
# 워커 프로세스 수 (CPU 코어 수와 동일하게)
worker_processes auto;

# 워커 연결 수
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # 파일 전송 최적화
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # 타임아웃 설정
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # 버퍼 크기 최적화
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_proxied any;
    
    # 로그 형식 최적화
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
}
```

### 3. 시스템 레벨 최적화

#### 파일 디스크립터 제한 증가
```bash
# /etc/security/limits.conf에 추가
* soft nofile 65536
* hard nofile 65536

# 현재 세션에 적용
ulimit -n 65536
```

#### 커널 파라미터 최적화
```bash
# /etc/sysctl.conf에 추가
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 400000

# 적용
sudo sysctl -p
```

## 🔐 보안 설정

### 1. 방화벽 설정

#### Ubuntu (UFW)
```bash
# UFW 활성화
sudo ufw enable

# 기본 정책 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필요한 포트만 열기
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 상태 확인
sudo ufw status verbose
```

#### Amazon Linux (firewalld)
```bash
# firewalld 시작 및 활성화
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 서비스 허용
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 설정 적용
sudo firewall-cmd --reload

# 상태 확인
sudo firewall-cmd --list-all
```

### 2. Node.js 애플리케이션 보안

#### 환경 변수 보안
```bash
# 환경 변수 파일 권한 설정
chmod 600 /opt/msp-checklist/msp-checklist/.env.local
chmod 600 /opt/msp-checklist/msp-checklist/admin/.env.local

# 강력한 JWT 시크릿 생성
openssl rand -base64 32
```

#### 의존성 보안 검사
```bash
# npm audit 실행
cd /opt/msp-checklist/msp-checklist
npm audit

# 취약점 자동 수정
npm audit fix

# 관리자 앱도 동일하게 실행
cd admin
npm audit
npm audit fix
```

### 3. Nginx 보안 강화

#### 보안 헤더 추가
```nginx
# 보안 헤더
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

# 서버 정보 숨기기
server_tokens off;

# 불필요한 HTTP 메서드 차단
if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE|OPTIONS)$ ) {
    return 405;
}
```

## 💾 백업 및 복구

### 1. 데이터베이스 백업 스크립트
```bash
#!/bin/bash
# /opt/msp-checklist/backup-db.sh

BACKUP_DIR="/opt/msp-checklist/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# 데이터베이스 백업
if [ -f "/opt/msp-checklist/msp-checklist/msp-assessment.db" ]; then
    cp /opt/msp-checklist/msp-checklist/msp-assessment.db $BACKUP_DIR/main-db_$DATE.db
    echo "메인 DB 백업 완료: main-db_$DATE.db"
fi

if [ -f "/opt/msp-checklist/msp-checklist/admin/msp-assessment.db" ]; then
    cp /opt/msp-checklist/msp-checklist/admin/msp-assessment.db $BACKUP_DIR/admin-db_$DATE.db
    echo "관리자 DB 백업 완료: admin-db_$DATE.db"
fi

# 7일 이상 된 백업 파일 삭제
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "백업 완료: $(date)"
```

### 2. 자동 백업 설정
```bash
# 백업 스크립트 실행 권한 부여
chmod +x /opt/msp-checklist/backup-db.sh

# Crontab에 자동 백업 추가
crontab -e

# 매일 새벽 3시에 백업
0 3 * * * /opt/msp-checklist/backup-db.sh >> /opt/msp-checklist/logs/backup.log 2>&1
```

### 3. 전체 시스템 백업
```bash
#!/bin/bash
# /opt/msp-checklist/full-backup.sh

BACKUP_DIR="/opt/msp-checklist/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 애플리케이션 전체 백업 (node_modules 제외)
tar -czf $BACKUP_DIR/app-backup_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='logs' \
    --exclude='backups' \
    /opt/msp-checklist/

# Nginx 설정 백업
sudo cp /etc/nginx/sites-available/msp-checklist $BACKUP_DIR/nginx-config_$DATE.conf 2>/dev/null || \
sudo cp /etc/nginx/conf.d/msp-checklist.conf $BACKUP_DIR/nginx-config_$DATE.conf

# PM2 설정 백업
pm2 dump --force

echo "전체 백업 완료: $(date)"
```

## 🛠️ 트러블슈팅

### 1. 일반적인 문제들

#### Node.js 애플리케이션이 시작되지 않음
```bash
# Node.js 버전 확인
node --version  # 20.9.0 이상이어야 함

# 포트 사용 확인
sudo netstat -tlnp | grep -E "(3010|3011)"
sudo lsof -i :3010
sudo lsof -i :3011

# PM2 로그 확인
pm2 logs
pm2 show msp-main

# 의존성 재설치
cd /opt/msp-checklist/msp-checklist
rm -rf node_modules package-lock.json
npm install
```

#### Nginx 502 Bad Gateway
```bash
# Node.js 앱 상태 확인
pm2 status

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# Nginx 설정 테스트
sudo nginx -t

# 업스트림 서버 연결 테스트
curl -I http://localhost:3010
curl -I http://localhost:3011
```

#### SSL 인증서 문제
```bash
# 인증서 상태 확인
sudo certbot certificates

# 인증서 갱신
sudo certbot renew

# Nginx SSL 설정 확인
sudo nginx -t

# SSL 연결 테스트
openssl s_client -connect your-domain.com:443
```

#### 메모리 부족 문제
```bash
# 메모리 사용량 확인
free -h
pm2 monit

# 메모리 사용량이 높은 프로세스 확인
ps aux --sort=-%mem | head -10

# PM2 메모리 제한 설정
pm2 restart msp-main --max-memory-restart 1G
```

### 2. 성능 문제 해결

#### 응답 속도 느림
```bash
# CPU 사용률 확인
htop
top

# 네트워크 연결 상태 확인
sudo netstat -an | grep :80 | wc -l
sudo netstat -an | grep :443 | wc -l

# Nginx 액세스 로그 분석
sudo tail -f /var/log/nginx/msp-checklist-access.log | grep -E "HTTP/[0-9\.]+ [45][0-9][0-9]"

# PM2 클러스터 인스턴스 증가
pm2 scale msp-main +2
```

#### 디스크 공간 부족
```bash
# 디스크 사용량 확인
df -h

# 큰 파일 찾기
sudo find /opt/msp-checklist -type f -size +100M -ls

# 로그 파일 정리
sudo logrotate -f /etc/logrotate.conf

# 오래된 백업 파일 삭제
find /opt/msp-checklist/backups -mtime +30 -delete
```

### 3. 디버깅 도구

#### 헬스 체크 스크립트
```bash
#!/bin/bash
# /opt/msp-checklist/health-check.sh

echo "🔍 MSP 체크리스트 시스템 헬스 체크"
echo "시간: $(date)"
echo ""

# 서비스 상태 확인
check_service() {
    local name=$1
    local url=$2
    
    if curl -s --max-time 10 $url > /dev/null; then
        echo "✅ $name: 정상"
    else
        echo "❌ $name: 오류"
    fi
}

check_service "메인 애플리케이션" "http://localhost:3010"
check_service "관리자 애플리케이션" "http://localhost:3011"
check_service "Nginx" "http://localhost"

# PM2 상태
echo ""
echo "📊 PM2 프로세스 상태:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 status

# 시스템 리소스
echo ""
echo "💻 시스템 리소스:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "메모리: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "디스크: $(df -h / | awk 'NR==2{printf "%s", $5}')"
```

## 📋 체크리스트

### 설치 전 확인사항
- [ ] 시스템 요구사항 충족 (CPU, RAM, 디스크)
- [ ] 도메인 DNS 설정 완료
- [ ] 방화벽 포트 80, 443 열기
- [ ] sudo 권한 확인

### 설치 후 확인사항
- [ ] Node.js 20.9.0+ 설치 확인
- [ ] PM2 설치 및 프로세스 실행 확인
- [ ] Nginx 설치 및 프록시 동작 확인
- [ ] SSL 인증서 설정 (선택사항)
- [ ] 환경 변수 설정 완료
- [ ] 로그 파일 생성 확인

### 운영 중 확인사항
- [ ] 정기적인 백업 수행
- [ ] SSL 인증서 자동 갱신 확인
- [ ] 시스템 리소스 모니터링
- [ ] 보안 업데이트 적용
- [ ] 로그 파일 정리

이 가이드를 따라하면 Node.js 서버를 안정적이고 효율적으로 운영할 수 있습니다! 🚀