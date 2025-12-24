# MSP Checklist 완전 제거 가이드

MSP Checklist 시스템을 안전하고 깔끔하게 제거하는 방법에 대한 완전한 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [제거 전 준비사항](#제거-전-준비사항)
3. [자동 제거 스크립트](#자동-제거-스크립트)
4. [수동 제거 방법](#수동-제거-방법)
5. [백업 및 복원](#백업-및-복원)
6. [문제 해결](#문제-해결)
7. [재설치 방법](#재설치-방법)

## 🎯 개요

MSP Checklist 시스템은 다음과 같은 구성 요소들로 이루어져 있습니다:

### 제거 대상 구성 요소

| 구성 요소 | 위치 | 설명 |
|-----------|------|------|
| **메인 프로젝트** | `/opt/msp-checklist-system/` | 전체 애플리케이션 코드 |
| **Node.js 서버** | 포트 3010, 3011 | 메인 및 관리자 서버 |
| **PM2 프로세스** | `~/.pm2/` | 프로세스 관리자 |
| **Nginx 설정** | `/etc/nginx/` | 리버스 프록시 설정 |
| **데이터베이스** | `*.db` 파일 | SQLite 데이터베이스 |
| **로그 파일** | `/var/log/nginx/`, `logs/` | 시스템 로그 |
| **환경 변수** | `.env*` 파일 | 설정 파일 |
| **방화벽 규칙** | UFW/firewalld | 포트 접근 규칙 |

## ⚠️ 제거 전 준비사항

### 1. 중요 데이터 확인

제거하기 전에 다음 데이터들을 확인하세요:

```bash
# 데이터베이스 파일 확인
find /opt/msp-checklist-system -name "*.db" -ls

# 업로드된 파일 확인
find /opt/msp-checklist-system -name "uploads" -type d -ls

# 환경 변수 파일 확인
find /opt/msp-checklist-system -name ".env*" -ls

# 커스텀 설정 파일 확인
find /opt/msp-checklist-system -name "*.config.*" -ls
```

### 2. 현재 상태 점검

```bash
# 실행 중인 MSP 프로세스 확인
ps aux | grep -E 'msp|node.*301[01]'

# PM2 프로세스 확인
pm2 list

# Nginx 상태 확인
sudo systemctl status nginx

# 포트 사용 확인
netstat -tuln | grep -E ':3010|:3011'
```

### 3. 백업 권장사항

**중요한 데이터가 있다면 반드시 백업하세요:**

- 데이터베이스 파일 (`.db`)
- 업로드된 파일 (`uploads/`)
- 환경 변수 (`.env*`)
- 커스텀 설정 파일
- Nginx 커스텀 설정

## 🚀 자동 제거 스크립트

### 기본 사용법

```bash
# 완전 제거 (권장)
sudo ./msp-complete-uninstall.sh

# 백업과 함께 제거
sudo ./msp-complete-uninstall.sh --backup

# 도움말 확인
sudo ./msp-complete-uninstall.sh --help
```

### 스크립트 옵션

| 옵션 | 설명 | 사용 예시 |
|------|------|-----------|
| `--backup` | 제거 전 백업 생성 | `sudo ./msp-complete-uninstall.sh --backup` |
| `--keep-nginx` | Nginx 설치 유지 (MSP 설정만 제거) | `sudo ./msp-complete-uninstall.sh --keep-nginx` |
| `--keep-nodejs` | Node.js 설치 유지 (MSP 앱만 제거) | `sudo ./msp-complete-uninstall.sh --keep-nodejs` |
| `--force` | 확인 없이 강제 제거 | `sudo ./msp-complete-uninstall.sh --force` |
| `--help` | 도움말 표시 | `sudo ./msp-complete-uninstall.sh --help` |

### 사용 시나리오별 명령어

#### 1. 완전 제거 (모든 구성 요소)
```bash
sudo ./msp-complete-uninstall.sh --backup
```

#### 2. MSP만 제거 (Nginx, Node.js 유지)
```bash
sudo ./msp-complete-uninstall.sh --keep-nginx --keep-nodejs --backup
```

#### 3. 웹서버 유지하고 MSP만 제거
```bash
sudo ./msp-complete-uninstall.sh --keep-nginx --backup
```

#### 4. 개발 환경 유지하고 MSP만 제거
```bash
sudo ./msp-complete-uninstall.sh --keep-nodejs --backup
```

#### 5. 긴급 상황 - 강제 제거
```bash
sudo ./msp-complete-uninstall.sh --force
```

### 제거 과정

스크립트는 다음 순서로 제거를 진행합니다:

1. **사용자 확인** - 제거할 항목 목록 표시 및 확인
2. **백업 생성** (옵션) - 중요 파일들 백업
3. **프로세스 중지** - PM2 및 Node.js 프로세스 종료
4. **Nginx 설정 정리** - MSP 관련 설정 제거 또는 완전 제거
5. **Node.js 제거** (옵션) - Node.js 및 npm 완전 제거
6. **프로젝트 파일 제거** - MSP 관련 모든 파일 삭제
7. **방화벽 정리** - MSP 관련 포트 규칙 제거
8. **시스템 정리** - 임시 파일 및 캐시 정리
9. **제거 검증** - 모든 구성 요소 제거 확인

## 🔧 수동 제거 방법

자동 스크립트를 사용할 수 없는 경우 수동으로 제거할 수 있습니다.

### 1. PM2 프로세스 중지 및 제거

```bash
# MSP 관련 프로세스 중지
pm2 stop msp-checklist-main
pm2 stop msp-checklist-admin
pm2 delete msp-checklist-main
pm2 delete msp-checklist-admin

# 모든 PM2 프로세스 중지 (필요시)
pm2 kill

# PM2 설정 제거
rm -rf ~/.pm2
```

### 2. Node.js 프로세스 강제 종료

```bash
# MSP 관련 프로세스 찾기
pgrep -f "msp.*node\|node.*msp"

# 포트 사용 프로세스 찾기
lsof -ti:3010,3011

# 프로세스 종료 (PID 확인 후)
kill -TERM <PID>
# 또는 강제 종료
kill -KILL <PID>
```

### 3. Nginx 설정 정리

#### MSP 설정만 제거 (Nginx 유지)

**Ubuntu:**
```bash
# MSP 설정 파일 제거
sudo rm -f /etc/nginx/sites-available/msp-checklist
sudo rm -f /etc/nginx/sites-enabled/msp-checklist

# 기본 사이트 복원
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# 설정 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

**Amazon Linux 2023:**
```bash
# MSP 설정 파일 제거
sudo rm -f /etc/nginx/conf.d/msp-*.conf

# 기본 설정 복원
sudo mv /etc/nginx/conf.d/default.conf.disabled /etc/nginx/conf.d/default.conf

# 설정 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

#### Nginx 완전 제거

**Ubuntu:**
```bash
# Nginx 서비스 중지
sudo systemctl stop nginx
sudo systemctl disable nginx

# 패키지 제거
sudo apt remove --purge -y nginx nginx-common nginx-core
sudo apt autoremove -y

# 설정 디렉토리 제거
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx
sudo rm -rf /var/cache/nginx
```

**Amazon Linux 2023:**
```bash
# Nginx 서비스 중지
sudo systemctl stop nginx
sudo systemctl disable nginx

# 패키지 제거
sudo dnf remove -y nginx

# 설정 디렉토리 제거
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx
sudo rm -rf /var/cache/nginx
```

### 4. Node.js 제거

#### PM2만 제거 (Node.js 유지)
```bash
sudo npm uninstall -g pm2
```

#### Node.js 완전 제거

**Ubuntu:**
```bash
# 패키지 제거
sudo apt remove --purge -y nodejs npm
sudo apt autoremove -y

# NodeSource 저장소 제거
sudo rm -f /etc/apt/sources.list.d/nodesource.list
sudo rm -f /etc/apt/keyrings/nodesource.gpg
```

**Amazon Linux 2023:**
```bash
# 패키지 제거
sudo dnf remove -y nodejs npm

# NodeSource 저장소 제거
sudo rm -f /etc/yum.repos.d/nodesource-*.repo
```

**공통 정리:**
```bash
# Node.js 관련 디렉토리 제거
sudo rm -rf /usr/local/lib/node_modules
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm
sudo rm -rf ~/.npm
sudo rm -rf ~/.node-gyp
```

### 5. MSP 프로젝트 파일 제거

```bash
# 메인 프로젝트 디렉토리 제거
sudo rm -rf /opt/msp-checklist-system

# 다른 위치의 MSP 파일들 제거
sudo rm -rf /opt/msp-checklist
sudo rm -rf /var/www/msp-*
sudo rm -rf /home/*/msp-checklist*

# 시스템 서비스 파일 제거
sudo rm -f /etc/systemd/system/msp-*.service
sudo systemctl daemon-reload

# 로그 파일 제거
sudo rm -rf /var/log/msp-*
sudo rm -f /var/log/nginx/msp-*
```

### 6. 방화벽 규칙 정리

**Ubuntu (UFW):**
```bash
# MSP 포트 규칙 제거
sudo ufw delete allow 3010/tcp
sudo ufw delete allow 3011/tcp

# 방화벽 상태 확인
sudo ufw status
```

**Amazon Linux 2023 (firewalld):**
```bash
# MSP 포트 규칙 제거
sudo firewall-cmd --permanent --remove-port=3010/tcp
sudo firewall-cmd --permanent --remove-port=3011/tcp
sudo firewall-cmd --reload

# 방화벽 상태 확인
sudo firewall-cmd --list-all
```

### 7. 시스템 정리

```bash
# 관리 스크립트 제거
sudo rm -f /usr/local/bin/msp-status.sh
sudo rm -f /usr/local/bin/check-msp-status.sh

# cron 작업 제거
(crontab -l 2>/dev/null | grep -v msp || true) | crontab -

# 임시 파일 정리
sudo rm -rf /tmp/msp-*
sudo rm -rf /tmp/npm-*
sudo rm -rf /tmp/next-*

# 패키지 캐시 정리
# Ubuntu
sudo apt autoremove -y
sudo apt autoclean

# Amazon Linux
sudo dnf autoremove -y
sudo dnf clean all
```

## 💾 백업 및 복원

### 수동 백업 생성

```bash
# 백업 디렉토리 생성
BACKUP_DIR="/tmp/msp-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# MSP 프로젝트 백업
sudo cp -r /opt/msp-checklist-system "$BACKUP_DIR/"

# Nginx 설정 백업
sudo cp -r /etc/nginx "$BACKUP_DIR/nginx-config"

# PM2 설정 백업
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/"

# 환경 변수 백업
sudo cp /opt/msp-checklist-system/.env.unified "$BACKUP_DIR/"

echo "백업 완료: $BACKUP_DIR"
```

### 백업에서 복원

```bash
# 백업 디렉토리 확인
BACKUP_DIR="/tmp/msp-backup-YYYYMMDD_HHMMSS"  # 실제 경로로 변경

# MSP 프로젝트 복원
sudo cp -r "$BACKUP_DIR/msp-checklist-system" /opt/

# Nginx 설정 복원
sudo cp -r "$BACKUP_DIR/nginx-config"/* /etc/nginx/
sudo nginx -t
sudo systemctl restart nginx

# PM2 설정 복원
pm2 resurrect "$BACKUP_DIR/dump.pm2"

# 환경 변수 복원
sudo cp "$BACKUP_DIR/.env.unified" /opt/msp-checklist-system/
```

## 🔍 문제 해결

### 일반적인 문제들

#### 1. 프로세스가 종료되지 않음

**문제:** MSP 프로세스가 계속 실행됨

**해결:**
```bash
# 강제 종료
sudo pkill -f msp
sudo pkill -f "node.*301[01]"

# 포트 사용 프로세스 강제 종료
sudo lsof -ti:3010,3011 | xargs kill -9
```

#### 2. Nginx 설정 오류

**문제:** Nginx 재시작 실패

**해결:**
```bash
# 설정 파일 문법 확인
sudo nginx -t

# 백업에서 복원
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf

# 기본 설정으로 복원
sudo rm -f /etc/nginx/sites-enabled/*
sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
```

#### 3. 권한 문제

**문제:** 파일 삭제 권한 없음

**해결:**
```bash
# 소유권 확인
ls -la /opt/msp-checklist-system

# 소유권 변경 후 삭제
sudo chown -R $USER:$USER /opt/msp-checklist-system
rm -rf /opt/msp-checklist-system
```

#### 4. 디스크 공간 부족

**문제:** 백업 생성 시 공간 부족

**해결:**
```bash
# 디스크 공간 확인
df -h

# 불필요한 파일 정리
sudo apt clean  # Ubuntu
sudo dnf clean all  # Amazon Linux

# 로그 파일 정리
sudo find /var/log -name "*.log" -mtime +30 -delete
```

### 제거 검증

제거가 완료된 후 다음을 확인하세요:

```bash
# MSP 프로세스 확인
ps aux | grep -E 'msp|node.*301[01]'

# 포트 사용 확인
netstat -tuln | grep -E ':3010|:3011'

# 디렉토리 확인
ls -la /opt/ | grep msp

# Nginx 설정 확인
sudo nginx -t
grep -r "msp" /etc/nginx/ 2>/dev/null

# Node.js 확인 (완전 제거한 경우)
command -v node
command -v npm

# PM2 확인
command -v pm2
```

## 🔄 재설치 방법

MSP Checklist를 다시 설치하려면:

### 1. 저장소 클론
```bash
cd /opt
sudo git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system
```

### 2. 설치 스크립트 실행
```bash
# 전체 설치
sudo ./msp-deployment-suite-refined.sh

# 또는 단계별 설치
sudo ./msp-deployment-suite-refined.sh --deps-only
sudo ./msp-deployment-suite-refined.sh --nginx-only
```

### 3. 백업에서 데이터 복원 (선택사항)
```bash
# 환경 변수 복원
sudo cp /path/to/backup/.env.unified /opt/msp-checklist-system/

# 데이터베이스 복원
sudo cp /path/to/backup/*.db /opt/msp-checklist-system/msp-checklist/

# 업로드 파일 복원
sudo cp -r /path/to/backup/uploads /opt/msp-checklist-system/msp-checklist/
```

## 📊 제거 체크리스트

제거 완료 후 다음 체크리스트를 확인하세요:

### ✅ 프로세스 및 서비스
- [ ] MSP 관련 프로세스 모두 종료됨
- [ ] PM2 프로세스 정리됨
- [ ] 포트 3010, 3011 해제됨
- [ ] Nginx 정상 동작 (유지하는 경우)

### ✅ 파일 및 디렉토리
- [ ] `/opt/msp-checklist-system/` 제거됨
- [ ] MSP 관련 로그 파일 제거됨
- [ ] 임시 파일 정리됨
- [ ] 백업 파일 생성됨 (선택한 경우)

### ✅ 설정 및 구성
- [ ] Nginx MSP 설정 제거됨
- [ ] 방화벽 규칙 정리됨
- [ ] 시스템 서비스 정리됨
- [ ] cron 작업 정리됨

### ✅ 소프트웨어
- [ ] Node.js 제거됨 (선택한 경우)
- [ ] PM2 제거됨
- [ ] Nginx 제거됨 (선택한 경우)

## 📞 지원 및 문의

제거 과정에서 문제가 발생하는 경우:

1. **로그 확인**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   journalctl -u nginx -f
   ```

2. **시스템 상태 확인**
   ```bash
   sudo systemctl status nginx
   ps aux | grep -E 'node|nginx|pm2'
   ```

3. **디스크 공간 확인**
   ```bash
   df -h
   du -sh /opt/msp-checklist-system
   ```

4. **권한 확인**
   ```bash
   ls -la /opt/
   whoami
   ```

---

이 가이드를 통해 MSP Checklist 시스템을 안전하고 완전하게 제거할 수 있습니다. 중요한 데이터는 반드시 백업하고, 제거 후에는 시스템 상태를 확인하여 정상적으로 정리되었는지 검증하세요.