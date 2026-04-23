# Nginx 설정 가이드

MSP Checklist 시스템을 위한 Nginx 리버스 프록시 설정 가이드입니다.

## 🎯 아키텍처

```
인터넷 → AWS 보안 그룹 → Nginx (80/443) → Node.js 서버
                                           ├── 메인 서버 (3010)
                                           └── 관리자 서버 (3011)
```

## 📦 스크립트 구성

| 스크립트 | 설명 |
|---------|------|
| `install-nginx.sh` | Nginx만 설치 |
| `setup-nginx-node.sh` | Node.js 앱 연동 설정 (리버스 프록시) |
| `setup-nginx-ssl.sh` | SSL 인증서 설정 (Let's Encrypt) |
| `setup-nginx.sh` | 통합 스크립트 (설치 + 설정 한번에) |

## 🚀 빠른 설치

### 방법 1: 분리된 스크립트 사용 (권장)

```bash
# 1. Nginx 설치
sudo ./install-nginx.sh

# 2. Node.js 앱 연동 설정
sudo ./setup-nginx-node.sh

# 3. SSL 설정 (선택사항)
sudo ./setup-nginx-ssl.sh -d example.com -e admin@example.com
```

### 방법 2: 통합 스크립트 사용

```bash
# HTTP만 설정
sudo ./setup-nginx.sh

# HTTPS 포함 설정
sudo ./setup-nginx.sh --ssl --domain your-domain.com --email your@email.com
```

### 방법 3: 수동 설치

```bash
# Amazon Linux 2023
sudo dnf install -y nginx
sudo cp nginx-samples/nginx-amazon-linux.conf.sample /etc/nginx/conf.d/msp-checklist.conf
sudo rm -f /etc/nginx/conf.d/default.conf
sudo nginx -t && sudo systemctl enable --now nginx

# Ubuntu
sudo apt update && sudo apt install -y nginx
sudo cp nginx-samples/nginx-ubuntu.conf.sample /etc/nginx/sites-available/msp-checklist
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl enable --now nginx
```

## 📝 스크립트 상세

### install-nginx.sh

Nginx 웹 서버만 설치합니다.

```bash
sudo ./install-nginx.sh
```

### setup-nginx-node.sh

Nginx를 Node.js 앱의 리버스 프록시로 설정합니다.

```bash
# 기본 설정 (포트 3010, 3011)
sudo ./setup-nginx-node.sh

# 도메인 지정
sudo ./setup-nginx-node.sh -d example.com

# 포트 변경
sudo ./setup-nginx-node.sh -m 3000 -a 3001
```

옵션:
- `-d, --domain`: 도메인 이름
- `-m, --main-port`: 메인 앱 포트 (기본값: 3010)
- `-a, --admin-port`: Admin 앱 포트 (기본값: 3011)

### setup-nginx-ssl.sh

Let's Encrypt SSL 인증서를 설정합니다.

```bash
sudo ./setup-nginx-ssl.sh -d example.com -e admin@example.com
```

옵션:
- `-d, --domain`: 도메인 이름 (필수)
- `-e, --email`: 알림 이메일 (권장)

## 🔧 포트 구성

| 서비스 | 포트 | URL |
|--------|------|-----|
| Nginx | 80, 443 | `http://IP/` |
| 메인 앱 | 3010 | 내부 전용 |
| 관리자 앱 | 3011 | `http://IP/admin` |

## ✅ 확인 명령어

```bash
# 설정 테스트
sudo nginx -t

# 상태 확인
sudo systemctl status nginx

# 연결 테스트
curl http://localhost/health
curl http://localhost/
curl http://localhost/admin

# 로그 확인
sudo tail -f /var/log/nginx/msp-checklist-error.log
```

## 🔒 SSL 인증서 (Let's Encrypt)

```bash
# 자동 설정 (권장)
sudo ./setup-nginx-ssl.sh -d your-domain.com -e your@email.com

# 수동 설정
# Ubuntu
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Amazon Linux 2023
sudo dnf install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 갱신 테스트
sudo certbot renew --dry-run

# 인증서 상태 확인
sudo certbot certificates
```

## 🔧 문제 해결

### 502 Bad Gateway

```bash
# Node.js 서버 확인
sudo netstat -tuln | grep -E ':3010|:3011'

# 서버 시작
./restart-servers.sh
```

### 403 Forbidden (Amazon Linux SELinux)

```bash
sudo setsebool -P httpd_can_network_connect 1
```

### 포트 충돌

```bash
# 포트 사용 확인
sudo netstat -tlnp | grep -E ':80|:443|:3010|:3011'

# 또는
sudo ss -tlnp | grep -E ':80|:443|:3010|:3011'
```

### 설정 파일 위치

| OS | 설정 파일 |
|----|----------|
| Amazon Linux | `/etc/nginx/conf.d/msp-checklist.conf` |
| Ubuntu | `/etc/nginx/sites-available/msp-checklist` |

## ⚠️ AWS EC2 주의사항

1. 보안 그룹에서 포트 80, 443 인바운드 허용
2. SSL 인증서 발급 전 도메인이 서버 IP를 가리켜야 함
3. 탄력적 IP 사용 권장

## 📁 샘플 파일

- `nginx-samples/nginx-amazon-linux.conf.sample` - Amazon Linux 2023
- `nginx-samples/nginx-ubuntu.conf.sample` - Ubuntu 22.04/24.04
- `nginx-samples/nginx-ssl.conf.sample` - HTTPS 설정 예시
