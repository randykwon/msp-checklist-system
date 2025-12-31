# MSP Checklist - Nginx 설정 샘플

각 운영체제별 Nginx 설정 파일 샘플입니다.

## 📁 파일 목록

| 파일 | 운영체제 | 설치 경로 |
|------|----------|-----------|
| `nginx-amazon-linux.conf.sample` | Amazon Linux 2023 | `/etc/nginx/conf.d/msp-checklist.conf` |
| `nginx-ubuntu.conf.sample` | Ubuntu 22.04/24.04 | `/etc/nginx/sites-available/msp-checklist` |
| `nginx-macos.conf.sample` | macOS (Homebrew) | `/opt/homebrew/etc/nginx/servers/msp-checklist.conf` |
| `nginx-windows.conf.sample` | Windows | `C:\nginx\conf\conf.d\msp-checklist.conf` |

## 🚀 빠른 설치

### Amazon Linux 2023

```bash
sudo dnf install -y nginx
sudo cp nginx-amazon-linux.conf.sample /etc/nginx/conf.d/msp-checklist.conf
sudo rm -f /etc/nginx/conf.d/default.conf
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Ubuntu

```bash
sudo apt update && sudo apt install -y nginx
sudo cp nginx-ubuntu.conf.sample /etc/nginx/sites-available/msp-checklist
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### macOS (Homebrew)

```bash
brew install nginx

# Apple Silicon (M1/M2/M3)
cp nginx-macos.conf.sample /opt/homebrew/etc/nginx/servers/msp-checklist.conf

# Intel Mac
cp nginx-macos.conf.sample /usr/local/etc/nginx/servers/msp-checklist.conf

nginx -t
brew services start nginx
```

### Windows

1. https://nginx.org/en/download.html 에서 다운로드
2. `C:\nginx`에 압축 해제
3. `C:\nginx\conf\conf.d` 폴더 생성
4. `nginx.conf`의 http 블록에 추가: `include conf.d/*.conf;`
5. 설정 파일 복사:
   ```cmd
   copy nginx-windows.conf.sample C:\nginx\conf\conf.d\msp-checklist.conf
   ```
6. 관리자 명령 프롬프트에서:
   ```cmd
   cd C:\nginx
   nginx -t
   nginx
   ```

## 🔧 포트 설정

| 서비스 | 포트 | URL |
|--------|------|-----|
| Nginx | 80 (Linux/Windows), 8080 (macOS) | `http://IP/` |
| 메인 앱 | 3010 | 내부 전용 |
| 관리자 앱 | 3011 | `http://IP/admin` |

## ✅ 설정 확인

```bash
# 설정 테스트
nginx -t

# 상태 확인
systemctl status nginx  # Linux
brew services list      # macOS

# 연결 테스트
curl http://localhost/health
curl http://localhost/
curl http://localhost/admin
```

## 🔒 SSL 인증서 (선택사항)

Let's Encrypt를 사용한 무료 SSL 인증서:

```bash
# Ubuntu/Amazon Linux
sudo apt install certbot python3-certbot-nginx  # Ubuntu
sudo dnf install certbot python3-certbot-nginx  # Amazon Linux

sudo certbot --nginx -d your-domain.com
```

## 📝 주의사항

- AWS EC2 사용 시 보안 그룹에서 포트 80, 443 인바운드 허용 필요
- Node.js 서버(3010, 3011)가 먼저 실행되어야 함
- macOS에서 포트 80 사용 시 sudo 필요 (개발 환경에서는 8080 권장)
