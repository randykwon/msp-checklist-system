# MSP Checklist - Nginx 설정 가이드

Nginx 리버스 프록시 설정 샘플 파일 및 설치 가이드입니다.

## 📁 파일 목록

| 파일 | 설명 | 설치 경로 |
|------|------|-----------|
| `nginx-amazon-linux.conf.sample` | Amazon Linux 2023용 | `/etc/nginx/conf.d/msp-checklist.conf` |
| `nginx-ubuntu.conf.sample` | Ubuntu 22.04/24.04용 | `/etc/nginx/sites-available/msp-checklist` |
| `nginx-ssl.conf.sample` | HTTPS (Let's Encrypt) | 위와 동일 |

## 🚀 빠른 설치 (권장)

### 자동 설치 스크립트 사용

```bash
# 프로젝트 루트에서 실행
sudo ./setup-nginx.sh
```

### SSL 인증서와 함께 설치

```bash
sudo ./setup-nginx.sh --ssl --domain your-domain.com --email your@email.com
```

## 📋 수동 설치

### Amazon Linux 2023

```bash
# 1. Nginx 설치
sudo dnf install -y nginx

# 2. 설정 파일 복사
sudo cp nginx-amazon-linux.conf.sample /etc/nginx/conf.d/msp-checklist.conf

# 3. 기본 설정 제거
sudo rm -f /etc/nginx/conf.d/default.conf

# 4. 설정 테스트
sudo nginx -t

# 5. Nginx 시작
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Ubuntu 22.04/24.04

```bash
# 1. Nginx 설치
sudo apt update && sudo apt install -y nginx

# 2. 설정 파일 복사
sudo cp nginx-ubuntu.conf.sample /etc/nginx/sites-available/msp-checklist

# 3. 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/

# 4. 기본 설정 제거
sudo rm -f /etc/nginx/sites-enabled/default

# 5. 설정 테스트
sudo nginx -t

# 6. Nginx 시작
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 🔧 포트 구성

| 서비스 | 포트 | 접속 URL |
|--------|------|----------|
| Nginx | 80 (HTTP), 443 (HTTPS) | `http://IP/` |
| 메인 앱 | 3010 | 내부 전용 |
| 관리자 앱 | 3011 | `http://IP/admin` |

## ✅ 설정 확인

```bash
# 설정 문법 테스트
sudo nginx -t

# 서비스 상태 확인
sudo systemctl status nginx

# 연결 테스트
curl http://localhost/health
curl http://localhost/
curl http://localhost/admin
```

## 🔒 SSL 인증서 (Let's Encrypt)

### 자동 설정

```bash
# Ubuntu
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Amazon Linux 2023
sudo dnf install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 인증서 갱신 확인

```bash
# 갱신 테스트
sudo certbot renew --dry-run

# 인증서 상태 확인
sudo certbot certificates
```

## 🔧 문제 해결

### 502 Bad Gateway

Node.js 서버가 실행 중인지 확인:

```bash
# 포트 확인
sudo netstat -tuln | grep -E ':3010|:3011'

# 서버 시작
cd /opt/msp-checklist-system
./restart-servers.sh
```

### 403 Forbidden (Amazon Linux)

SELinux 설정 확인:

```bash
sudo setsebool -P httpd_can_network_connect 1
```

### 설정 파일 위치

```bash
# Amazon Linux 2023
/etc/nginx/conf.d/msp-checklist.conf

# Ubuntu
/etc/nginx/sites-available/msp-checklist
/etc/nginx/sites-enabled/msp-checklist  # 심볼릭 링크
```

## 📝 로그 확인

```bash
# 액세스 로그
sudo tail -f /var/log/nginx/msp-access.log

# 에러 로그
sudo tail -f /var/log/nginx/msp-error.log
```

## ⚠️ AWS EC2 주의사항

1. **보안 그룹**: 포트 80, 443 인바운드 허용 필요
2. **탄력적 IP**: 고정 IP 사용 권장
3. **도메인**: SSL 인증서 발급 전 도메인이 서버 IP를 가리켜야 함
