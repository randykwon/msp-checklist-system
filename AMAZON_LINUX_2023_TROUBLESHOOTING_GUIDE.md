# Amazon Linux 2023 문제 해결 가이드

Amazon Linux 2023에서 MSP Checklist 시스템 운영 중 발생할 수 있는 문제들과 해결 방법을 정리한 가이드입니다.

## 🚨 일반적인 문제들

### 1. 포트 접근 불가 (가장 흔한 문제)

**증상**: 브라우저에서 `http://EC2-IP:3010` 또는 `http://EC2-IP:3011`에 접속할 수 없음

**해결 방법**:
```bash
# 1. 서버 프로세스 확인
sudo ss -tlnp | grep :3010
sudo ss -tlnp | grep :3011

# 2. firewalld 상태 확인
sudo firewall-cmd --list-ports
sudo firewall-cmd --list-services

# 3. 포트 열기
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload

# 4. AWS 보안 그룹 확인 (중요!)
# AWS 콘솔 → EC2 → 보안 그룹 → 인바운드 규칙
# 포트 3010, 3011을 0.0.0.0/0에서 TCP로 허용

# 5. 서버 재시작
./restart-server.sh
```

### 2. npm install 실패

**증상**: `npm install` 실행 시 오류 발생, 특히 pdfjs-dist 관련 오류

**해결 방법**:
```bash
# 1. Node.js 버전 확인
node --version  # v20.9.0 이상이어야 함

# 2. npm 캐시 정리
npm cache clean --force
sudo npm cache clean --force

# 3. 권한 문제 해결
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /opt/msp-checklist

# 4. 메모리 부족 해결
export NODE_OPTIONS="--max-old-space-size=2048"

# 5. 의존성 재설치 (서버 최적화)
cd msp-checklist
rm -rf node_modules package-lock.json
npm install --no-optional --legacy-peer-deps

# 6. 네트워크 타임아웃 설정
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
```

### 3. 빌드 실패 (Tailwind CSS 오류)

**증상**: `npm run build` 실행 시 PostCSS 또는 Tailwind 관련 오류

**해결 방법**:
```bash
# 1. Tailwind CSS 의존성 확인
cd msp-checklist
npm list @tailwindcss/postcss

# 2. PostCSS 설정 확인
cat postcss.config.mjs

# 3. 캐시 정리 후 재빌드
rm -rf .next
npm run build

# 4. 메모리 부족 시
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 4. 서버 시작 실패

**증상**: `./restart-server.sh` 실행 시 서버가 시작되지 않음

**해결 방법**:
```bash
# 1. 로그 확인
tail -f server.log
tail -f admin-server.log

# 2. 포트 충돌 확인
sudo ss -tlnp | grep :3010
sudo ss -tlnp | grep :3011

# 3. 충돌하는 프로세스 종료
sudo pkill -f "node.*3010"
sudo pkill -f "node.*3011"

# 4. 환경 변수 확인
cat msp-checklist/.env.local
cat admin/.env.local

# 5. 권한 확인
chmod +x *.sh
chmod +x msp-checklist/*.sh
```

## 🔧 Amazon Linux 2023 특화 문제

### 1. dnf 패키지 관리자 문제

**해결 방법**:
```bash
# 1. dnf 캐시 정리
sudo dnf clean all

# 2. 저장소 업데이트
sudo dnf update -y

# 3. EPEL 저장소 활성화 (필요한 경우)
sudo dnf install -y epel-release

# 4. 개발 도구 설치
sudo dnf groupinstall -y "Development Tools"
```

### 2. firewalld vs iptables 충돌

**해결 방법**:
```bash
# 1. firewalld 상태 확인
sudo systemctl status firewalld

# 2. iptables 비활성화 (firewalld 사용)
sudo systemctl stop iptables 2>/dev/null || true
sudo systemctl disable iptables 2>/dev/null || true

# 3. firewalld 활성화
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 4. 포트 설정
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload
```

### 3. SELinux 문제

**해결 방법**:
```bash
# 1. SELinux 상태 확인
getenforce

# 2. SELinux 로그 확인
sudo tail -f /var/log/audit/audit.log | grep denied

# 3. HTTP 연결 허용 (Nginx 사용 시)
sudo setsebool -P httpd_can_network_connect 1

# 4. 임시로 SELinux 비활성화 (권장하지 않음)
sudo setenforce 0

# 5. 영구 비활성화 (권장하지 않음)
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

## 📊 성능 문제

### 1. 메모리 부족

**해결 방법**:
```bash
# 1. 메모리 사용량 확인
free -h
ps aux --sort=-%mem | head -10

# 2. 스왑 파일 생성 (2GB)
sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. 영구 설정
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# 4. Node.js 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=2048"

# 5. 시스템 메모리 최적화
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOF
sudo sysctl -p
```

### 2. 디스크 공간 부족

**해결 방법**:
```bash
# 1. 디스크 사용량 확인
df -h
du -sh /opt/msp-checklist/*

# 2. 로그 파일 정리
sudo find /var/log -name "*.log" -mtime +7 -delete
sudo journalctl --vacuum-time=7d

# 3. npm 캐시 정리
npm cache clean --force
sudo npm cache clean --force

# 4. 불필요한 패키지 제거
sudo dnf autoremove -y

# 5. 임시 파일 정리
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*
```

## 🌐 네트워크 문제

### 1. AWS 보안 그룹 설정

**AWS CLI로 보안 그룹 설정**:
```bash
# 1. 현재 보안 그룹 확인
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# 2. 포트 3010 허용
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 3010 \
    --cidr 0.0.0.0/0

# 3. 포트 3011 허용
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 3011 \
    --cidr 0.0.0.0/0
```

### 2. 외부 API 연결 실패

**해결 방법**:
```bash
# 1. DNS 확인
nslookup api.openai.com
nslookup generativelanguage.googleapis.com

# 2. 아웃바운드 연결 테스트
curl -I https://api.openai.com
curl -I https://generativelanguage.googleapis.com

# 3. 방화벽 아웃바운드 확인
sudo firewall-cmd --list-all

# 4. 프록시 설정 확인
echo $http_proxy
echo $https_proxy

# 5. API 키 확인
grep -r "API_KEY" msp-checklist/.env.local admin/.env.local
```

## 🔒 보안 문제

### 1. SSH 접속 문제

**해결 방법**:
```bash
# 1. SSH 서비스 상태 확인
sudo systemctl status sshd

# 2. SSH 설정 확인
sudo cat /etc/ssh/sshd_config | grep -E "Port|PermitRootLogin|PasswordAuthentication"

# 3. 방화벽에서 SSH 허용
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# 4. SSH 키 권한 확인
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 2. fail2ban 설정

**설치 및 설정**:
```bash
# 1. fail2ban 설치
sudo dnf install -y epel-release
sudo dnf install -y fail2ban

# 2. 설정 파일 생성
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/secure
EOF

# 3. 서비스 시작
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# 4. 상태 확인
sudo fail2ban-client status
```

## 📋 자동화 스크립트

### 1. 시스템 상태 모니터링

```bash
# monitor-system.sh 생성
tee monitor-system.sh > /dev/null <<EOF
#!/bin/bash

echo "=== MSP Checklist 시스템 상태 ($(date)) ==="
echo ""

echo "=== 프로세스 상태 ==="
ps aux | grep -E "(node|npm)" | grep -v grep

echo ""
echo "=== 포트 상태 ==="
sudo ss -tlnp | grep -E ":301[01]"

echo ""
echo "=== 방화벽 상태 ==="
sudo firewall-cmd --list-ports

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

echo ""
echo "=== 네트워크 연결 테스트 ==="
curl -I http://localhost:3010 2>/dev/null && echo "메인 서버: OK" || echo "메인 서버: FAIL"
curl -I http://localhost:3011 2>/dev/null && echo "관리자 서버: OK" || echo "관리자 서버: FAIL"
EOF

chmod +x monitor-system.sh
```

### 2. 자동 복구 스크립트

```bash
# auto-recovery.sh 생성
tee auto-recovery.sh > /dev/null <<EOF
#!/bin/bash

LOG_FILE="/var/log/msp-checklist-recovery.log"

log_message() {
    echo "$(date): \$1" >> \$LOG_FILE
}

# 메인 서버 상태 확인
if ! curl -f http://localhost:3010 > /dev/null 2>&1; then
    log_message "메인 서버 응답 없음 - 재시작 시도"
    cd /opt/msp-checklist
    ./restart-server.sh
    sleep 15
    
    if curl -f http://localhost:3010 > /dev/null 2>&1; then
        log_message "메인 서버 재시작 성공"
    else
        log_message "메인 서버 재시작 실패 - 관리자 확인 필요"
    fi
fi

# 관리자 서버 상태 확인
if ! curl -f http://localhost:3011 > /dev/null 2>&1; then
    log_message "관리자 서버 응답 없음 - 재시작 시도"
    cd /opt/msp-checklist
    ./restart-server.sh
    sleep 15
    
    if curl -f http://localhost:3011 > /dev/null 2>&1; then
        log_message "관리자 서버 재시작 성공"
    else
        log_message "관리자 서버 재시작 실패 - 관리자 확인 필요"
    fi
fi

# 디스크 공간 확인 (90% 이상 시 경고)
DISK_USAGE=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 90 ]; then
    log_message "디스크 사용량 경고: \${DISK_USAGE}%"
fi

# 메모리 사용량 확인 (90% 이상 시 경고)
MEMORY_USAGE=\$(free | awk 'NR==2{printf "%.0f", \$3*100/\$2}')
if [ \$MEMORY_USAGE -gt 90 ]; then
    log_message "메모리 사용량 경고: \${MEMORY_USAGE}%"
fi
EOF

chmod +x auto-recovery.sh

# crontab에 추가 (5분마다 실행)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/msp-checklist/auto-recovery.sh") | crontab -
```

### 3. 백업 스크립트

```bash
# backup-system.sh 생성
tee backup-system.sh > /dev/null <<EOF
#!/bin/bash

BACKUP_DIR="/opt/msp-checklist/backups"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# 데이터베이스 백업
if [ -f "msp-checklist/msp-assessment.db" ]; then
    cp msp-checklist/msp-assessment.db \$BACKUP_DIR/msp-assessment-\$DATE.db
fi

if [ -f "msp-checklist/advice-cache.db" ]; then
    cp msp-checklist/advice-cache.db \$BACKUP_DIR/advice-cache-\$DATE.db
fi

# 환경 변수 백업
cp msp-checklist/.env.local \$BACKUP_DIR/env-local-\$DATE.backup 2>/dev/null || true
cp admin/.env.local \$BACKUP_DIR/admin-env-local-\$DATE.backup 2>/dev/null || true

# 7일 이상 된 백업 삭제
find \$BACKUP_DIR -name "*.db" -mtime +7 -delete
find \$BACKUP_DIR -name "*.backup" -mtime +7 -delete

echo "백업 완료: \$DATE"
EOF

chmod +x backup-system.sh

# crontab에 추가 (매일 새벽 2시)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/msp-checklist/backup-system.sh") | crontab -
```

## 📞 지원 요청 시 수집할 정보

문제 해결을 위해 지원을 요청할 때 다음 정보를 함께 제공해주세요:

```bash
# 시스템 정보 수집 스크립트
tee collect-debug-info.sh > /dev/null <<EOF
#!/bin/bash

echo "=== 시스템 정보 ==="
cat /etc/os-release
uname -a

echo ""
echo "=== Node.js 정보 ==="
node --version
npm --version

echo ""
echo "=== 프로세스 상태 ==="
ps aux | grep -E "(node|npm)" | grep -v grep

echo ""
echo "=== 포트 상태 ==="
sudo ss -tlnp | grep -E ":301[01]"

echo ""
echo "=== 방화벽 상태 ==="
sudo firewall-cmd --list-all

echo ""
echo "=== 메모리 및 디스크 ==="
free -h
df -h

echo ""
echo "=== 최근 오류 로그 ==="
grep -i error server.log admin-server.log 2>/dev/null | tail -20

echo ""
echo "=== 시스템 로그 ==="
sudo journalctl -u msp-checklist --no-pager -n 20 2>/dev/null || echo "systemd 서비스 없음"

echo ""
echo "=== 네트워크 테스트 ==="
curl -I http://localhost:3010 2>&1
curl -I http://localhost:3011 2>&1
EOF

chmod +x collect-debug-info.sh
./collect-debug-info.sh > debug-info.txt
```

이 가이드를 참조하여 Amazon Linux 2023에서 발생하는 대부분의 문제를 해결할 수 있습니다. 추가 도움이 필요하면 GitHub Issues를 통해 문의하세요.