# 문제 해결 가이드

## 서버 관련

### 서버가 시작되지 않음

```bash
# 포트 사용 확인
sudo netstat -tlnp | grep -E ':3010|:3011'

# 기존 프로세스 종료
pkill -f "next.*3010"
pkill -f "next.*3011"

# 다시 시작
./scripts/manage/start-servers.sh
```

### 502 Bad Gateway (Nginx)

```bash
# Node.js 서버 확인
curl http://localhost:3010
curl http://localhost:3011

# 서버가 응답하지 않으면 시작
./scripts/manage/start-servers.sh

# Nginx 재시작
sudo systemctl restart nginx
```

### 메모리 부족

```bash
# 메모리 확인
free -h

# Swap 추가 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 빌드 관련

### npm install 실패

```bash
# 캐시 정리
npm cache clean --force

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 빌드 메모리 부족

```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## Nginx 관련

### SSL 인증서 발급 실패

```bash
# 도메인 DNS 확인
nslookup your-domain.com

# 포트 80 확인
sudo netstat -tlnp | grep :80

# 방화벽 확인
sudo firewall-cmd --list-all  # Amazon Linux
sudo ufw status               # Ubuntu
```

### 403 Forbidden

```bash
# SELinux 설정 (Amazon Linux)
sudo setsebool -P httpd_can_network_connect 1
```

## 데이터베이스 관련

### SQLite 잠금 오류

```bash
# 프로세스 확인
fuser msp-checklist/msp-assessment.db

# 서버 재시작
./scripts/manage/restart-servers.sh
```

## 로그 확인

```bash
# 메인 서버 로그
tail -f logs/main-server.log

# Admin 서버 로그
tail -f logs/admin-server.log

# Nginx 로그
sudo tail -f /var/log/nginx/msp-checklist-error.log

# systemd 로그
sudo journalctl -u msp-main -f
sudo journalctl -u msp-admin -f
```
