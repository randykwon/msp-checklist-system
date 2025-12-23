# Ubuntu 문제 해결 가이드

Ubuntu 22.04 LTS에서 MSP Checklist 시스템 운영 중 발생할 수 있는 문제들과 해결 방법을 정리한 가이드입니다.

## 🚨 일반적인 문제들

### 1. 포트 접근 불가

**증상**: 브라우저에서 `http://서버IP:3010` 또는 `http://서버IP:3011`에 접속할 수 없음

**해결 방법**:
```bash
# 1. 서버 프로세스 확인
sudo netstat -tlnp | grep :3010
sudo netstat -tlnp | grep :3011

# 2. 방화벽 상태 확인
sudo ufw status

# 3. 포트 열기
sudo ufw allow 3010/tcp
sudo ufw allow 3011/tcp

# 4. AWS EC2인 경우 보안 그룹 확인
# AWS 콘솔에서 인바운드 규칙에 포트 3010, 3011 추가
```

### 2. npm install 실패

**증상**: `npm install` 실행 시 오류 발생

**해결 방법**:
```bash
# 1. 캐시 정리
npm cache clean --force
sudo npm cache clean --force

# 2. Node.js 버전 확인
node --version  # v20.9.0 이상이어야 함

# 3. 권한 문제 해결
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /opt/msp-checklist

# 4. 의존성 재설치
rm -rf node_modules package-lock.json
npm install --no-optional --legacy-peer-deps

# 5. 메모리 부족 시
export NODE_OPTIONS="--max-old-space-size=2048"
npm install
```

### 3. 서버 시작 실패

**증상**: `./restart-server.sh` 실행 시 서버가 시작되지 않음

**해결 방법**:
```bash
# 1. 로그 확인
tail -f server.log
tail -f admin-server.log

# 2. 포트 충돌 확인
sudo netstat -tlnp | grep :3010
sudo netstat -tlnp | grep :3011

# 3. 충돌하는 프로세스 종료
sudo kill -9 <PID>

# 4. 환경 변수 확인
cat msp-checklist/.env.local
cat admin/.env.local

# 5. 권한 확인
chmod +x *.sh
chmod +x msp-checklist/*.sh
```

### 4. 빌드 실패

**증상**: `npm run build` 실행 시 오류 발생

**해결 방법**:
```bash
# 1. 의존성 확인
npm list --depth=0

# 2. TypeScript 오류 확인
npm run lint

# 3. 캐시 정리 후 재빌드
rm -rf .next
npm run build

# 4. 메모리 부족 시
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 🔧 성능 문제

### 1. 서버 응답 속도 느림

**해결 방법**:
```bash
# 1. PM2로 클러스터 모드 실행
sudo npm install -g pm2
pm2 start msp-checklist/server.js --name "msp-main" -i max
pm2 start admin/server.js --name "msp-admin" -i 2

# 2. 시스템 리소스 확인
htop
df -h
free -h

# 3. 로그 파일 크기 확인
ls -lh *.log

# 4. 로그 로테이션 설정
sudo tee /etc/logrotate.d/msp-checklist > /dev/null <<EOF
/opt/msp-checklist/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
```

### 2. 메모리 부족

**해결 방법**:
```bash
# 1. 스왑 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Node.js 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=1024"

# 4. PM2 메모리 제한
pm2 start server.js --max-memory-restart 1G
```

## 🔒 보안 문제

### 1. 무단 접근 시도

**해결 방법**:
```bash
# 1. fail2ban 설치
sudo apt install -y fail2ban

# 2. fail2ban 설정
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF

sudo systemctl restart fail2ban

# 3. 로그 모니터링
sudo tail -f /var/log/auth.log
```

### 2. SSL 인증서 문제

**해결 방법**:
```bash
# 1. 인증서 상태 확인
sudo certbot certificates

# 2. 인증서 갱신
sudo certbot renew --dry-run

# 3. 자동 갱신 설정 확인
sudo crontab -l | grep certbot

# 4. Nginx 설정 확인
sudo nginx -t
```

## 🗄️ 데이터베이스 문제

### 1. SQLite 데이터베이스 손상

**해결 방법**:
```bash
# 1. 데이터베이스 무결성 확인
sqlite3 msp-checklist/msp-assessment.db "PRAGMA integrity_check;"

# 2. 백업에서 복원
cp backups/msp-assessment-YYYYMMDD.db msp-checklist/msp-assessment.db

# 3. 데이터베이스 재생성 (데이터 손실 주의)
rm msp-checklist/msp-assessment.db
# 서버 재시작하면 새 데이터베이스 생성됨
```

### 2. 백업 설정

**자동 백업 스크립트**:
```bash
# backup-script.sh 생성
tee backup-script.sh > /dev/null <<EOF
#!/bin/bash
BACKUP_DIR="/opt/msp-checklist/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# 데이터베이스 백업
cp msp-checklist/msp-assessment.db \$BACKUP_DIR/msp-assessment-\$DATE.db
cp msp-checklist/advice-cache.db \$BACKUP_DIR/advice-cache-\$DATE.db

# 7일 이상 된 백업 삭제
find \$BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "백업 완료: \$DATE"
EOF

chmod +x backup-script.sh

# crontab에 추가 (매일 새벽 2시)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/msp-checklist/backup-script.sh") | crontab -
```

## 🌐 네트워크 문제

### 1. 외부 API 연결 실패

**해결 방법**:
```bash
# 1. DNS 확인
nslookup api.openai.com
nslookup generativelanguage.googleapis.com

# 2. 방화벽 아웃바운드 확인
sudo ufw status verbose

# 3. 프록시 설정 확인
echo $http_proxy
echo $https_proxy

# 4. API 키 확인
grep -r "API_KEY" msp-checklist/.env.local admin/.env.local
```

### 2. Nginx 리버스 프록시 문제

**해결 방법**:
```bash
# 1. Nginx 설정 테스트
sudo nginx -t

# 2. Nginx 로그 확인
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 3. 업스트림 서버 확인
curl -I http://localhost:3010
curl -I http://localhost:3011

# 4. Nginx 설정 재로드
sudo systemctl reload nginx
```

## 📊 모니터링 및 로그

### 1. 시스템 모니터링 스크립트

```bash
# monitor.sh 생성
tee monitor.sh > /dev/null <<EOF
#!/bin/bash

echo "=== MSP Checklist 시스템 상태 ==="
echo "시간: $(date)"
echo ""

echo "=== 프로세스 상태 ==="
ps aux | grep -E "(node|npm)" | grep -v grep

echo ""
echo "=== 포트 상태 ==="
sudo netstat -tlnp | grep -E ":301[01]"

echo ""
echo "=== 메모리 사용량 ==="
free -h

echo ""
echo "=== 디스크 사용량 ==="
df -h

echo ""
echo "=== 최근 로그 (마지막 10줄) ==="
echo "--- server.log ---"
tail -10 server.log 2>/dev/null || echo "로그 파일 없음"
echo "--- admin-server.log ---"
tail -10 admin-server.log 2>/dev/null || echo "로그 파일 없음"
EOF

chmod +x monitor.sh
```

### 2. 로그 분석

```bash
# 오류 로그 검색
grep -i error server.log admin-server.log

# 접속 로그 분석
grep -E "GET|POST" server.log | tail -20

# 성능 문제 확인
grep -i "timeout\|slow\|memory" server.log admin-server.log
```

## 🔄 자동 복구 스크립트

```bash
# auto-recovery.sh 생성
tee auto-recovery.sh > /dev/null <<EOF
#!/bin/bash

LOG_FILE="/var/log/msp-checklist-recovery.log"

log_message() {
    echo "$(date): \$1" >> \$LOG_FILE
}

# 서버 상태 확인
if ! curl -f http://localhost:3010 > /dev/null 2>&1; then
    log_message "메인 서버 응답 없음 - 재시작 시도"
    cd /opt/msp-checklist
    ./restart-server.sh
    sleep 10
    
    if curl -f http://localhost:3010 > /dev/null 2>&1; then
        log_message "메인 서버 재시작 성공"
    else
        log_message "메인 서버 재시작 실패"
    fi
fi

# 관리자 서버 상태 확인
if ! curl -f http://localhost:3011 > /dev/null 2>&1; then
    log_message "관리자 서버 응답 없음 - 재시작 시도"
    cd /opt/msp-checklist
    ./restart-server.sh
    sleep 10
    
    if curl -f http://localhost:3011 > /dev/null 2>&1; then
        log_message "관리자 서버 재시작 성공"
    else
        log_message "관리자 서버 재시작 실패"
    fi
fi
EOF

chmod +x auto-recovery.sh

# crontab에 추가 (5분마다 실행)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/msp-checklist/auto-recovery.sh") | crontab -
```

## 📞 지원 요청 시 수집할 정보

문제 해결을 위해 지원을 요청할 때 다음 정보를 함께 제공해주세요:

```bash
# 시스템 정보 수집 스크립트
tee collect-info.sh > /dev/null <<EOF
#!/bin/bash

echo "=== 시스템 정보 ==="
uname -a
lsb_release -a

echo ""
echo "=== Node.js 정보 ==="
node --version
npm --version

echo ""
echo "=== 프로세스 상태 ==="
ps aux | grep -E "(node|npm)" | grep -v grep

echo ""
echo "=== 포트 상태 ==="
sudo netstat -tlnp | grep -E ":301[01]"

echo ""
echo "=== 방화벽 상태 ==="
sudo ufw status

echo ""
echo "=== 디스크 사용량 ==="
df -h

echo ""
echo "=== 메모리 사용량 ==="
free -h

echo ""
echo "=== 최근 오류 로그 ==="
grep -i error server.log admin-server.log | tail -20
EOF

chmod +x collect-info.sh
./collect-info.sh > system-info.txt
```

이 가이드를 참조하여 대부분의 문제를 해결할 수 있습니다. 추가 도움이 필요하면 GitHub Issues를 통해 문의하세요.