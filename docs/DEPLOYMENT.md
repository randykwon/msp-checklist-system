# MSP 어드바이저 - 배포 가이드

## 📋 목차

1. [배포 아키텍처](#배포-아키텍처)
2. [EC2 배포](#ec2-배포)
3. [업데이트 배포](#업데이트-배포)
4. [Nginx 설정](#nginx-설정)
5. [SSL 인증서](#ssl-인증서)
6. [모니터링](#모니터링)
7. [백업 및 복구](#백업-및-복구)

---

## 배포 아키텍처

### 단일 서버 구성 (권장)
```
┌─────────────────────────────────────────────────────────┐
│                      EC2 Instance                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │                    Nginx                          │   │
│  │         (리버스 프록시, SSL 종료)                  │   │
│  └──────────────┬────────────────┬──────────────────┘   │
│                 │                │                       │
│        ┌────────▼────────┐ ┌────▼────────┐              │
│        │   메인 앱       │ │  Admin 앱   │              │
│        │   (포트 3010)   │ │  (포트 3011)│              │
│        └────────┬────────┘ └────┬────────┘              │
│                 │                │                       │
│        ┌────────▼────────────────▼────────┐             │
│        │           SQLite DB              │             │
│        │  (msp-assessment.db, cache.db)   │             │
│        └──────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

### 외부 서비스 연결
```
EC2 Instance ──────► AWS Bedrock (Claude LLM)
                 └──► OpenAI API (선택)
                 └──► Gemini API (선택)
```

---

## EC2 배포

### 1. EC2 인스턴스 생성

**권장 설정:**
- AMI: Amazon Linux 2023
- 인스턴스 타입: t3.medium (4GB RAM)
- 스토리지: 20GB gp3
- 보안 그룹: SSH(22), HTTP(80), HTTPS(443)

### 2. 보안 그룹 설정

| 유형 | 프로토콜 | 포트 | 소스 |
|------|---------|------|------|
| SSH | TCP | 22 | 내 IP |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |
| Custom TCP | TCP | 3010 | 0.0.0.0/0 (또는 제한) |
| Custom TCP | TCP | 3011 | 내 IP (관리자만) |

### 3. 설치 실행

```bash
# SSH 접속
ssh -i your-key.pem ec2-user@your-ec2-ip

# 원라인 설치
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/scripts/install/install-full.sh | bash

# 또는 수동 설치
git clone https://github.com/randykwon/msp-checklist-system.git /opt/msp-advisor
cd /opt/msp-advisor
chmod +x scripts/install/*.sh
./scripts/install/install-full.sh
```

### 4. API 키 설정

```bash
# 메인 앱 환경 변수
nano /opt/msp-advisor/msp-checklist/.env.local

# 필수 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 5. 서비스 시작

```bash
# 서비스 시작
/opt/msp-advisor/start.sh

# 상태 확인
/opt/msp-advisor/status.sh
```

---

## 업데이트 배포

### 자동 업데이트 스크립트

```bash
/opt/msp-advisor/update.sh
```

이 스크립트는 다음을 수행합니다:
1. 서비스 중지
2. Git pull (최신 코드)
3. Shared 패키지 빌드
4. 메인 앱 빌드
5. Admin 앱 빌드
6. 서비스 재시작

### 수동 업데이트

```bash
cd /opt/msp-advisor

# 1. 서비스 중지
pm2 stop all

# 2. 코드 업데이트
git pull origin main

# 3. 빌드
./scripts/install/build-all.sh

# 4. 서비스 시작
pm2 restart all
```

### 롤백

```bash
# 이전 커밋으로 롤백
cd /opt/msp-advisor
git log --oneline -5  # 커밋 확인
git checkout <commit-hash>

# 재빌드 및 재시작
./scripts/install/build-all.sh
pm2 restart all
```

---

## Nginx 설정

### Nginx 설치

```bash
# Amazon Linux
sudo yum install -y nginx

# Ubuntu
sudo apt-get install -y nginx
```

### 기본 설정 (`/etc/nginx/conf.d/msp-advisor.conf`)

```nginx
# 메인 앱
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정 (LLM 호출용)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# Admin 앱
server {
    listen 80;
    server_name admin.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### Nginx 시작

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

---

## SSL 인증서

### Let's Encrypt (Certbot)

```bash
# Certbot 설치
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux
# 또는
sudo apt-get install -y certbot python3-certbot-nginx  # Ubuntu

# 인증서 발급
sudo certbot --nginx -d your-domain.com -d admin.your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 자동 갱신 (cron)

```bash
# crontab 편집
sudo crontab -e

# 매일 새벽 3시에 갱신 시도
0 3 * * * /usr/bin/certbot renew --quiet
```

---

## 모니터링

### PM2 모니터링

```bash
# 실시간 상태
pm2 status

# 실시간 로그
pm2 logs

# 메트릭 모니터링
pm2 monit

# 웹 대시보드
pm2 plus  # PM2 Plus 계정 필요
```

### 로그 확인

```bash
# 메인 앱 로그
tail -f /opt/msp-advisor/logs/main-combined.log

# Admin 앱 로그
tail -f /opt/msp-advisor/logs/admin-combined.log

# 에러 로그만
tail -f /opt/msp-advisor/logs/main-error.log
```

### 헬스 체크

```bash
# 메인 앱
curl -s http://localhost:3010 | head -1

# Admin 앱
curl -s http://localhost:3011 | head -1
```

---

## 백업 및 복구

### 데이터베이스 백업

```bash
# 수동 백업
BACKUP_DIR="/opt/msp-advisor/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp /opt/msp-advisor/msp-checklist/*.db $BACKUP_DIR/
```

### 자동 백업 (cron)

```bash
# crontab 편집
crontab -e

# 매일 새벽 2시 백업
0 2 * * * /opt/msp-advisor/scripts/backup.sh
```

### 백업 스크립트 (`/opt/msp-advisor/scripts/backup.sh`)

```bash
#!/bin/bash
BACKUP_DIR="/opt/msp-advisor/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# DB 백업
cp /opt/msp-advisor/msp-checklist/*.db $BACKUP_DIR/

# 환경 변수 백업
cp /opt/msp-advisor/msp-checklist/.env.local $BACKUP_DIR/
cp /opt/msp-advisor/msp-checklist/admin/.env.local $BACKUP_DIR/admin.env.local

# 7일 이상 된 백업 삭제
find /opt/msp-advisor/backups -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
```

### 복구

```bash
# 서비스 중지
pm2 stop all

# DB 복구
cp /opt/msp-advisor/backups/20260109/*.db /opt/msp-advisor/msp-checklist/

# 서비스 시작
pm2 restart all
```

---

## 문제 해결

### 서비스가 시작되지 않음
```bash
# 로그 확인
pm2 logs --lines 50

# 포트 충돌 확인
lsof -i :3010
lsof -i :3011
```

### 메모리 부족
```bash
# 메모리 확인
free -m

# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart all
```

### Nginx 502 Bad Gateway
```bash
# 백엔드 서비스 확인
pm2 status

# Nginx 로그 확인
sudo tail -f /var/log/nginx/error.log
```

자세한 문제 해결은 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)를 참조하세요.
