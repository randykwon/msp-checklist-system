# Nginx + Node.js 서버 통합 설정 가이드

## 📋 목차
1. [개요](#개요)
2. [아키텍처 구조](#아키텍처-구조)
3. [환경 설정](#환경-설정)
4. [Nginx 설정](#nginx-설정)
5. [Node.js 애플리케이션 설정](#nodejs-애플리케이션-설정)
6. [PM2 프로세스 관리](#pm2-프로세스-관리)
7. [SSL 인증서 설정](#ssl-인증서-설정)
8. [로드 밸런싱](#로드-밸런싱)
9. [모니터링 및 로그](#모니터링-및-로그)
10. [트러블슈팅](#트러블슈팅)

## 🎯 개요

이 가이드는 Nginx를 리버스 프록시로 사용하여 Node.js 애플리케이션을 배포하는 방법을 설명합니다.

### 장점
- **성능 향상**: Nginx가 정적 파일 서빙 및 SSL 처리
- **보안**: Node.js 서버를 직접 노출하지 않음
- **확장성**: 로드 밸런싱 및 캐싱 지원
- **안정성**: Nginx의 안정적인 프록시 기능

## 🏗️ 아키텍처 구조

```
인터넷 → Nginx (포트 80/443) → Node.js 앱들 (포트 3010, 3011)
```

### 포트 구성
- **80**: HTTP (Nginx)
- **443**: HTTPS (Nginx + SSL)
- **3010**: 메인 Node.js 애플리케이션
- **3011**: 관리자 Node.js 애플리케이션

## ⚙️ 환경 설정

### 1. 시스템 요구사항
- **OS**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023
- **RAM**: 최소 2GB (권장 4GB)
- **CPU**: 최소 1 vCPU (권장 2 vCPU)
- **디스크**: 최소 20GB

### 2. 필수 패키지 설치

#### Ubuntu 22.04 LTS
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Node.js 20.9.0 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치
sudo npm install -g pm2
```

#### Amazon Linux 2023
```bash
# 시스템 업데이트
sudo dnf update -y

# 필수 패키지 설치
sudo dnf install -y curl wget git nginx python3-pip

# Node.js 20.9.0 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# PM2 및 Certbot 설치
sudo npm install -g pm2
sudo pip3 install certbot certbot-nginx
```

## 🔧 Nginx 설정

### 1. 기본 Nginx 설정 제거

#### Ubuntu
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

#### Amazon Linux
```bash
# 기본 설정은 보통 /etc/nginx/nginx.conf에 포함되어 있음
```

### 2. MSP 체크리스트용 Nginx 설정 생성

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
    # 로드 밸런싱을 위한 추가 서버 (필요시)
    # server 127.0.0.1:3012;
    # server 127.0.0.1:3013;
}

upstream msp_admin {
    server 127.0.0.1:3011;
    # 로드 밸런싱을 위한 추가 서버 (필요시)
    # server 127.0.0.1:3014;
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
    
    # SSL 인증서 설정 (Let's Encrypt)
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
        
        # 정적 파일이 없으면 메인 앱으로 프록시
        try_files $uri @main_app;
    }
    
    # 메인 애플리케이션 (사용자용)
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
        
        # 관리자 접근 제한 (선택사항)
        # allow 192.168.1.0/24;
        # deny all;
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

## 🚀 Node.js 애플리케이션 설정

### 1. 애플리케이션 구조
```
/opt/msp-checklist/
├── msp-checklist/          # 메인 애플리케이션 (포트 3010)
├── msp-checklist/admin/    # 관리자 애플리케이션 (포트 3011)
├── ecosystem.config.js     # PM2 설정
└── deploy/                 # 배포 스크립트들
```

### 2. PM2 Ecosystem 설정
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
      instances: 2, // CPU 코어 수에 맞게 조정
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist/logs/main-error.log',
      out_file: '/opt/msp-checklist/logs/main-out.log',
      log_file: '/opt/msp-checklist/logs/main-combined.log',
      time: true
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
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/opt/msp-checklist/logs/admin-error.log',
      out_file: '/opt/msp-checklist/logs/admin-out.log',
      log_file: '/opt/msp-checklist/logs/admin-combined.log',
      time: true
    }
  ]
};
```

### 3. 환경 변수 설정

#### 메인 애플리케이션 (.env.local)
```bash
# /opt/msp-checklist/msp-checklist/.env.local
NODE_ENV=production
PORT=3010
DATABASE_URL=./msp-assessment.db
JWT_SECRET=your-super-secret-jwt-key-here
OPENAI_API_KEY=your-openai-api-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### 관리자 애플리케이션 (.env.local)
```bash
# /opt/msp-checklist/msp-checklist/admin/.env.local
NODE_ENV=production
PORT=3011
DATABASE_URL=./msp-assessment.db
JWT_SECRET=your-super-secret-jwt-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.com/admin
```

## 📊 PM2 프로세스 관리

### 1. PM2 명령어
```bash
# 애플리케이션 시작
cd /opt/msp-checklist
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 특정 앱 로그 확인
pm2 logs msp-main
pm2 logs msp-admin

# 재시작
pm2 restart all
pm2 restart msp-main

# 중지
pm2 stop all

# 삭제
pm2 delete all

# 모니터링
pm2 monit

# 설정 저장
pm2 save

# 부팅 시 자동 시작 설정
pm2 startup
```

### 2. PM2 모니터링 설정
```bash
# PM2 Plus 연결 (선택사항)
pm2 link <secret_key> <public_key>

# 메트릭 수집
pm2 install pm2-server-monit
```

## 🔒 SSL 인증서 설정

### 1. Let's Encrypt 인증서 발급
```bash
# 도메인 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 인증서 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 2. 자동 갱신 설정
```bash
# Crontab 편집
sudo crontab -e

# 다음 라인 추가 (매일 새벽 2시에 갱신 확인)
0 2 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

## ⚖️ 로드 밸런싱

### 1. 다중 인스턴스 설정
PM2 클러스터 모드를 사용하여 CPU 코어 수만큼 인스턴스 실행:

```javascript
// ecosystem.config.js에서
instances: 'max', // 또는 구체적인 숫자
exec_mode: 'cluster'
```

### 2. Nginx 업스트림 설정
```nginx
upstream msp_main {
    least_conn; # 로드 밸런싱 방식
    server 127.0.0.1:3010 weight=1;
    server 127.0.0.1:3012 weight=1;
    server 127.0.0.1:3013 weight=1;
    
    # 헬스 체크 (nginx-plus 필요)
    # health_check;
}
```

## 📈 모니터링 및 로그

### 1. 로그 디렉토리 구조
```
/opt/msp-checklist/logs/
├── main-error.log          # 메인 앱 에러 로그
├── main-out.log           # 메인 앱 출력 로그
├── main-combined.log      # 메인 앱 통합 로그
├── admin-error.log        # 관리자 앱 에러 로그
├── admin-out.log         # 관리자 앱 출력 로그
└── admin-combined.log    # 관리자 앱 통합 로그
```

### 2. Nginx 로그
```bash
# 접근 로그
sudo tail -f /var/log/nginx/msp-checklist-access.log

# 에러 로그
sudo tail -f /var/log/nginx/msp-checklist-error.log

# 실시간 모니터링
sudo tail -f /var/log/nginx/msp-checklist-access.log | grep -E "(GET|POST|PUT|DELETE)"
```

### 3. 시스템 모니터링
```bash
# 시스템 리소스
htop

# 네트워크 연결
sudo netstat -tlnp | grep -E "(80|443|3010|3011)"

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

## 🛠️ 트러블슈팅

### 1. 일반적인 문제들

#### Nginx 502 Bad Gateway
```bash
# Node.js 앱이 실행 중인지 확인
pm2 status

# 포트 확인
sudo netstat -tlnp | grep -E "(3010|3011)"

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

#### SSL 인증서 문제
```bash
# 인증서 상태 확인
sudo certbot certificates

# 인증서 갱신
sudo certbot renew

# Nginx 설정 테스트
sudo nginx -t
```

#### 성능 문제
```bash
# PM2 모니터링
pm2 monit

# 시스템 리소스 확인
htop

# 로그 분석
pm2 logs --lines 100
```

### 2. 디버깅 명령어
```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 프로세스 확인
sudo systemctl status nginx

# 포트 사용 확인
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3010
sudo lsof -i :3011

# 방화벽 상태 확인 (Ubuntu)
sudo ufw status

# 방화벽 상태 확인 (Amazon Linux)
sudo firewall-cmd --list-all
```

### 3. 성능 최적화

#### Nginx 최적화
```nginx
# /etc/nginx/nginx.conf에 추가
worker_processes auto;
worker_connections 1024;

# 버퍼 크기 조정
client_body_buffer_size 128k;
client_max_body_size 10m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
output_buffers 1 32k;
postpone_output 1460;
```

#### PM2 최적화
```javascript
// ecosystem.config.js
{
  instances: 'max',
  exec_mode: 'cluster',
  max_memory_restart: '1G',
  node_args: '--max-old-space-size=1024'
}
```

## 📋 체크리스트

### 배포 전 확인사항
- [ ] Node.js 20.9.0+ 설치 확인
- [ ] PM2 설치 확인
- [ ] Nginx 설치 및 설정 완료
- [ ] 방화벽 설정 (포트 80, 443 열기)
- [ ] 도메인 DNS 설정 완료

### 배포 후 확인사항
- [ ] PM2 프로세스 정상 실행
- [ ] Nginx 프록시 정상 동작
- [ ] SSL 인증서 정상 설치
- [ ] 로그 파일 생성 확인
- [ ] 헬스 체크 엔드포인트 동작 확인

### 운영 중 확인사항
- [ ] 정기적인 로그 모니터링
- [ ] SSL 인증서 자동 갱신 확인
- [ ] 시스템 리소스 모니터링
- [ ] 백업 스크립트 정상 동작

이 가이드를 따라하면 Nginx와 Node.js를 안정적으로 함께 운영할 수 있습니다! 🚀