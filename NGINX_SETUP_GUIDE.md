# Nginx + Node.js 연동 설정 가이드

MSP Checklist 시스템을 위한 Nginx 리버스 프록시 설정 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [빠른 시작](#빠른-시작)
3. [완전한 설정](#완전한-설정)
4. [SSL 인증서 설정](#ssl-인증서-설정)
5. [테스트 및 검증](#테스트-및-검증)
6. [문제 해결](#문제-해결)
7. [성능 최적화](#성능-최적화)

## 🎯 개요

### 아키텍처

```
인터넷 → AWS 보안 그룹 → Nginx (포트 80/443) → Node.js 서버들
                                                  ├── 메인 서버 (포트 3010)
                                                  └── 관리자 서버 (포트 3011)
```

### 주요 기능

- **리버스 프록시**: 외부 요청을 내부 Node.js 서버로 전달
- **로드 밸런싱**: 여러 서버 인스턴스 간 부하 분산
- **SSL 종료**: HTTPS 암호화/복호화 처리
- **정적 파일 캐싱**: 성능 최적화
- **보안 헤더**: XSS, CSRF 등 보안 강화
- **압축**: Gzip 압축으로 대역폭 절약

## 🚀 빠른 시작

### 1. 빠른 설정 (5분)

기본적인 Nginx + Node.js 연동만 빠르게 설정:

```bash
# 빠른 설정 실행
./nginx-quick-setup.sh
```

이 스크립트는 다음을 수행합니다:
- OS 자동 감지 (Ubuntu/Amazon Linux 2023)
- Nginx 설치
- 기본 프록시 설정
- 방화벽 설정
- 서비스 시작



### 2. 설정 확인

```bash
# 설정 테스트
./test-nginx-setup.sh
```

## 🔧 완전한 설정

### 1. 고급 설정 (15분)

성능 최적화, 보안 강화, 모니터링 포함:

```bash
# 완전한 설정 실행
./setup-nginx-node.sh
```

### 2. SSL 인증서와 함께 설정

```bash
# SSL 인증서 포함 설정
./setup-nginx-node.sh --ssl --domain your-domain.com --email your@email.com
```

### 3. 명령행 옵션

```bash
# 도움말 확인
./setup-nginx-node.sh --help

# Nginx 설치 건너뛰기 (이미 설치된 경우)
./setup-nginx-node.sh --no-install

# SSL만 설정
./setup-nginx-node.sh --ssl --domain example.com --email admin@example.com
```

## 🔒 SSL 인증서 설정

### 1. Let's Encrypt 자동 설정

```bash
# 도메인과 이메일 주소 지정
./setup-nginx-node.sh --ssl --domain your-domain.com --email your@email.com
```

### 2. 수동 SSL 설정

```bash
# Certbot 설치 (Ubuntu)
sudo apt install certbot python3-certbot-nginx

# Certbot 설치 (Amazon Linux 2023)
sudo dnf install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 3. SSL 설정 확인

```bash
# SSL 인증서 상태 확인
sudo certbot certificates

# 갱신 테스트
sudo certbot renew --dry-run
```

## 🧪 테스트 및 검증

### 1. 자동 테스트 실행

```bash
# 종합 테스트
./test-nginx-setup.sh
```

### 2. 수동 테스트

```bash
# Nginx 상태 확인
sudo systemctl status nginx

# 설정 파일 문법 검사
sudo nginx -t

# 포트 확인
sudo netstat -tuln | grep -E ':80|:3010|:3011'

# HTTP 응답 테스트
curl -I http://localhost
curl -I http://localhost/admin
```

### 3. 로그 확인

```bash
# 실시간 로그 모니터링
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MSP Checklist 전용 로그 (고급 설정 시)
sudo tail -f /var/log/nginx/msp-checklist-access.log
sudo tail -f /var/log/nginx/msp-checklist-error.log
```

## 🔧 문제 해결

### 1. 일반적인 문제들

#### Nginx 시작 실패

```bash
# 상태 확인
sudo systemctl status nginx

# 설정 파일 검사
sudo nginx -t

# 포트 충돌 확인
sudo netstat -tuln | grep :80
```

#### 502 Bad Gateway 오류

```bash
# Node.js 서버 상태 확인
sudo netstat -tuln | grep -E ':3010|:3011'

# PM2 프로세스 확인 (PM2 사용 시)
pm2 status

# 서버 재시작
cd /opt/msp-checklist-system
./restart-servers.sh
```

#### 403 Forbidden 오류

```bash
# 파일 권한 확인
ls -la /opt/msp-checklist-system/

# SELinux 확인 (Amazon Linux)
sudo getenforce
sudo setsebool -P httpd_can_network_connect 1
```

### 2. 설정 파일 위치

```bash
# 주요 설정 파일들
/etc/nginx/nginx.conf                    # 메인 설정
/etc/nginx/sites-available/msp-checklist # MSP Checklist 설정 (Ubuntu)
/etc/nginx/conf.d/msp-checklist.conf     # MSP Checklist 설정 (Amazon Linux)
/etc/nginx/conf.d/performance.conf       # 성능 최적화 설정
```

### 3. 백업 및 복구

```bash
# 설정 백업
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 기본 설정으로 복구 (Ubuntu)
sudo apt install --reinstall nginx

# 기본 설정으로 복구 (Amazon Linux)
sudo dnf reinstall nginx
```

## ⚡ 성능 최적화

### 1. 자동 최적화

완전한 설정 스크립트는 다음 최적화를 자동으로 적용합니다:

- **워커 프로세스**: CPU 코어 수에 맞춤
- **연결 수**: 최적화된 워커 연결 수
- **Gzip 압축**: 텍스트 파일 압축
- **캐싱**: 정적 파일 장기 캐싱
- **버퍼 크기**: 최적화된 버퍼 설정

### 2. 수동 최적화

#### 캐싱 설정

```nginx
# 정적 파일 캐싱
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API 응답 캐싱 비활성화
location /api/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

#### 압축 설정

```nginx
# Gzip 압축
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. 모니터링

#### 상태 확인 스크립트

```bash
# 시스템 상태 확인 (고급 설정 시 자동 생성됨)
sudo /usr/local/bin/check-msp-status.sh
```

#### 성능 모니터링

```bash
# Nginx 상태 모듈 (설정 시)
curl http://localhost/nginx_status

# 실시간 연결 수
sudo netstat -an | grep :80 | wc -l

# 메모리 사용량
free -h

# CPU 사용량
top -p $(pgrep nginx)
```

## 📊 설정 예시

### 1. 기본 설정

```nginx
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://localhost:3011;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. SSL 설정

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL 최적화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 나머지 설정...
}

# HTTP to HTTPS 리다이렉트
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🛡️ 보안 설정

### 1. 보안 헤더

```nginx
# 보안 헤더 추가
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### 2. 레이트 리미팅

```nginx
# 레이트 리미팅 설정
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
    
    location /admin/login {
        limit_req zone=login burst=5 nodelay;
    }
}
```

### 3. IP 차단

```nginx
# 특정 IP 차단
deny 192.168.1.100;
deny 10.0.0.0/8;

# 관리자 페이지 IP 제한
location /admin {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    # 프록시 설정...
}
```

## 📝 유지보수

### 1. 정기 점검

```bash
# 주간 점검 스크립트
#!/bin/bash
echo "=== Nginx 상태 점검 $(date) ==="
systemctl status nginx
nginx -t
df -h
free -h
```

### 2. 로그 로테이션

```bash
# 로그 로테이션 설정 확인
sudo cat /etc/logrotate.d/nginx

# 수동 로그 로테이션
sudo logrotate -f /etc/logrotate.d/nginx
```

### 3. 업데이트

```bash
# Nginx 업데이트 (Ubuntu)
sudo apt update && sudo apt upgrade nginx

# Nginx 업데이트 (Amazon Linux)
sudo dnf update nginx

# 설정 백업 후 업데이트
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
```

## 🆘 긴급 상황 대응

### 1. 서비스 중단 시

```bash
# 1. 상태 확인
sudo systemctl status nginx
./test-nginx-setup.sh

# 2. 재시작 시도
sudo systemctl restart nginx

# 3. 설정 복구
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
sudo systemctl restart nginx

# 4. 임시 우회 (직접 포트 접근)
# AWS 보안 그룹에서 포트 3010, 3011 임시 허용
```

### 2. 높은 부하 시

```bash
# 1. 현재 연결 수 확인
sudo netstat -an | grep :80 | wc -l

# 2. 프로세스 상태 확인
top -p $(pgrep nginx)

# 3. 임시 레이트 리미팅 강화
# /etc/nginx/conf.d/emergency.conf 생성
limit_req_zone $binary_remote_addr zone=emergency:10m rate=1r/s;
```

## 📞 지원 및 문의

### 유용한 명령어 요약

```bash
# 상태 확인
sudo systemctl status nginx
./test-nginx-setup.sh

# 설정 테스트
sudo nginx -t

# 재시작
sudo systemctl restart nginx

# 로그 확인
sudo tail -f /var/log/nginx/error.log

# 재설정
./setup-nginx-node.sh
```

### 로그 위치

- **액세스 로그**: `/var/log/nginx/access.log`
- **에러 로그**: `/var/log/nginx/error.log`
- **MSP 전용 로그**: `/var/log/nginx/msp-checklist-*.log`

---

이 가이드를 통해 MSP Checklist 시스템의 Nginx 설정을 완료하고 안정적으로 운영할 수 있습니다. 추가 질문이나 문제가 있으면 언제든지 문의하세요!