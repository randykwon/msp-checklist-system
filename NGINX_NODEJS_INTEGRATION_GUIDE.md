# Nginx + Node.js 통합 가이드

MSP Checklist 시스템의 Nginx와 Node.js 통합 설정에 대한 완전한 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [알려진 문제들](#알려진-문제들)
3. [해결 방법](#해결-방법)
4. [스크립트 사용법](#스크립트-사용법)
5. [수동 설정 방법](#수동-설정-방법)
6. [문제 해결](#문제-해결)
7. [모니터링 및 유지보수](#모니터링-및-유지보수)

## 🎯 개요

MSP Checklist 시스템은 다음과 같은 구조로 구성됩니다:

- **메인 애플리케이션**: 포트 3010에서 실행
- **관리자 시스템**: 포트 3011에서 실행  
- **Nginx 리버스 프록시**: 포트 80에서 클라이언트 요청을 받아 적절한 백엔드로 전달

### 아키텍처 다이어그램

```
인터넷 → Nginx (포트 80) → Node.js 서버들
                ├─ / → 메인 애플리케이션 (포트 3010)
                └─ /admin → 관리자 시스템 (포트 3011)
```

## 🚨 알려진 문제들

### 1. sendfile 중복 설정 오류

**증상:**
```
nginx: [emerg] "sendfile" directive is duplicate in /etc/nginx/conf.d/performance.conf:4
```

**원인:** 
- `nginx.conf`에 이미 `sendfile on;` 설정이 있는데
- `performance.conf`에서 다시 `sendfile on;`을 설정하여 중복 발생

**해결책:** 중복된 설정 파일 제거 및 정리

### 2. 포트 충돌 문제

**증상:**
- Nginx가 포트 3010, 3011에 직접 바인딩 시도
- Node.js 서버와 포트 충돌 발생

**원인:** 
- 잘못된 Nginx 설정에서 `listen 3010;`, `listen 3011;` 지시어 사용

**해결책:** Nginx는 포트 80만 리스닝하고 프록시로만 동작하도록 설정

### 3. OS별 설정 구조 차이

**Ubuntu vs Amazon Linux 2023:**

| 항목 | Ubuntu | Amazon Linux 2023 |
|------|--------|-------------------|
| 설정 디렉토리 | `/etc/nginx/sites-available/`, `/etc/nginx/sites-enabled/` | `/etc/nginx/conf.d/` |
| 기본 설정 파일 | `default` | `default.conf` |
| 패키지 관리자 | `apt` | `dnf` |
| 방화벽 | `ufw` | `firewalld` |

## 🔧 해결 방법

### 자동 해결 (권장)

#### 1. 통합 배포 스크립트 사용

```bash
# 전체 설치 (권장)
sudo ./msp-deployment-suite-refined.sh

# Nginx만 설정
sudo ./msp-deployment-suite-refined.sh --nginx-only

# 의존성만 설치
sudo ./msp-deployment-suite-refined.sh --deps-only
```

#### 2. 문제 해결 전용 스크립트 사용

```bash
# 모든 문제 자동 진단 및 해결
sudo ./nginx-node-troubleshoot.sh
```

### 수동 해결

#### 1. sendfile 중복 문제 해결

```bash
# 문제가 있는 파일 제거
sudo rm -f /etc/nginx/conf.d/performance.conf

# nginx.conf 확인
grep -n "sendfile" /etc/nginx/nginx.conf

# 설정 테스트
sudo nginx -t
```

#### 2. 포트 충돌 문제 해결

```bash
# 포트 바인딩 설정 확인
grep -r "listen 301" /etc/nginx/

# 잘못된 설정 제거
sudo sed -i '/listen 3010/d; /listen 3011/d' /etc/nginx/conf.d/msp-checklist.conf
```

#### 3. OS별 설정 구조 정리

**Ubuntu:**
```bash
# 디렉토리 생성
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# 기본 사이트 비활성화
sudo rm -f /etc/nginx/sites-enabled/default

# MSP 설정 활성화
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
```

**Amazon Linux 2023:**
```bash
# 기본 설정 비활성화
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled

# Ubuntu 스타일 디렉토리 제거 (있는 경우)
sudo rm -rf /etc/nginx/sites-available /etc/nginx/sites-enabled
```

## 📖 스크립트 사용법

### msp-deployment-suite-refined.sh

완전한 MSP Checklist 시스템 배포를 위한 통합 스크립트입니다.

```bash
# 기본 사용법
sudo ./msp-deployment-suite-refined.sh

# 옵션들
sudo ./msp-deployment-suite-refined.sh --help

# 주요 옵션
--deps-only         # 의존성 및 Node.js만 설치
--nginx-only        # Nginx만 설정
--ssl               # SSL 인증서 설정
--domain DOMAIN     # 도메인 이름
--email EMAIL       # 이메일 주소
--force-reinstall   # 강제 재설치
--minimal           # 최소 설치
--skip-build        # 빌드 건너뛰기
```

**사용 예시:**

```bash
# 전체 설치
sudo ./msp-deployment-suite-refined.sh

# SSL과 함께 설치
sudo ./msp-deployment-suite-refined.sh --ssl --domain example.com --email admin@example.com

# Nginx만 재설정
sudo ./msp-deployment-suite-refined.sh --nginx-only

# 의존성만 설치
sudo ./msp-deployment-suite-refined.sh --deps-only
```

### nginx-node-troubleshoot.sh

Nginx와 Node.js 관련 문제를 자동으로 진단하고 해결하는 스크립트입니다.

```bash
# 기본 사용법
sudo ./nginx-node-troubleshoot.sh
```

**기능:**
- 자동 문제 진단
- sendfile 중복 오류 해결
- 포트 충돌 문제 해결
- OS별 설정 구조 차이 해결
- 테스트 서버 생성
- 종합 연결 테스트

## 🔧 수동 설정 방법

### 1. Ubuntu 설정

```bash
# Nginx 설치
sudo apt update
sudo apt install -y nginx

# 설정 파일 생성
sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
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
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 설정 활성화
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Amazon Linux 2023 설정

```bash
# Nginx 설치
sudo dnf update -y
sudo dnf install -y nginx

# 설정 파일 생성
sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
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
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 기본 설정 비활성화
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled

# 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

## 🔍 문제 해결

### 일반적인 문제들

#### 1. HTTP 502 Bad Gateway

**원인:** Node.js 서버가 실행되지 않음

**해결:**
```bash
# Node.js 서버 상태 확인
netstat -tuln | grep -E ':3010|:3011'

# 테스트 서버 시작
node test-server.js &

# PM2로 실제 서버 시작
cd /opt/msp-checklist-system
pm2 start ecosystem.config.js
```

#### 2. 설정 파일 문법 오류

**진단:**
```bash
sudo nginx -t
```

**해결:**
```bash
# 자동 해결 스크립트 실행
sudo ./nginx-node-troubleshoot.sh

# 또는 수동으로 설정 파일 재생성
sudo rm -f /etc/nginx/conf.d/msp-*.conf
sudo ./msp-deployment-suite-refined.sh --nginx-only
```

#### 3. 포트 접근 불가

**확인:**
```bash
# 방화벽 상태 확인 (Ubuntu)
sudo ufw status

# 방화벽 상태 확인 (Amazon Linux)
sudo firewall-cmd --list-all

# AWS 보안 그룹 확인 필요
```

**해결:**
```bash
# Ubuntu
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Amazon Linux
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 진단 명령어들

```bash
# Nginx 상태 확인
sudo systemctl status nginx

# 설정 파일 테스트
sudo nginx -t

# 포트 사용 확인
netstat -tuln | grep -E ':80|:3010|:3011'

# 로그 확인
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 연결 테스트
curl -I http://localhost
curl -I http://localhost/admin
curl http://localhost/health
```

## 📊 모니터링 및 유지보수

### 상태 확인 스크립트

스크립트 실행 후 다음 명령어로 시스템 상태를 확인할 수 있습니다:

```bash
# 전체 시스템 상태 확인
sudo /usr/local/bin/msp-status.sh

# 애플리케이션 재시작
cd /opt/msp-checklist-system && ./restart-all.sh

# 로그 확인
cd /opt/msp-checklist-system && ./view-logs.sh
```

### 정기 점검 항목

1. **서비스 상태 확인**
   ```bash
   sudo systemctl status nginx
   pm2 status
   ```

2. **디스크 공간 확인**
   ```bash
   df -h
   ```

3. **로그 로테이션 확인**
   ```bash
   ls -la /var/log/nginx/
   ```

4. **보안 업데이트**
   ```bash
   # Ubuntu
   sudo apt update && sudo apt upgrade
   
   # Amazon Linux
   sudo dnf update
   ```

### 성능 최적화

1. **Nginx 워커 프로세스 최적화**
   - 자동으로 CPU 코어 수에 맞춰 설정됨 (`worker_processes auto;`)

2. **연결 유지 최적화**
   - `keepalive` 설정으로 연결 재사용

3. **압축 설정**
   - gzip 압축으로 대역폭 절약

4. **캐싱 설정**
   - 정적 파일에 대한 브라우저 캐싱 설정

## 🚀 다음 단계

1. **SSL 인증서 설정**
   ```bash
   sudo ./msp-deployment-suite-refined.sh --ssl --domain your-domain.com --email your@email.com
   ```

2. **환경 변수 설정**
   ```bash
   nano /opt/msp-checklist-system/.env.unified
   ```

3. **관리자 계정 생성**
   ```bash
   cd /opt/msp-checklist-system
   node create-admin.cjs
   ```

4. **백업 설정**
   - 데이터베이스 백업
   - 설정 파일 백업
   - 정기 백업 스케줄 설정

## 📞 지원

문제가 지속되는 경우:

1. 로그 파일 확인
2. 진단 스크립트 실행
3. 시스템 상태 점검
4. 필요시 전문가 지원 요청

---

이 가이드는 MSP Checklist 시스템의 Nginx와 Node.js 통합에 대한 완전한 참조 자료입니다. 추가 질문이나 문제가 있으면 언제든지 문의하세요.