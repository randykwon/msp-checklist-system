# Amazon Linux 2023 문제 해결 가이드

## 🚨 긴급 문제 해결

### 1. curl 패키지 충돌 해결

**증상**: 
```bash
Error: Problem: problem with installed package curl-minimal-8.11.1-4.amzn2023.0.3.x86_64
- package curl-minimal-8.11.1-4.amzn2023.0.3.x86_64 from @System conflicts with curl
```

**즉시 해결 방법**:
```bash
# 방법 1: 자동 해결 스크립트 실행
./fix-amazon-linux-curl-conflict.sh

# 방법 2: 수동 해결
sudo dnf remove -y curl-minimal
sudo dnf install -y curl --allowerasing

# 방법 3: 패키지 교체
sudo dnf swap -y curl-minimal curl
```

### 2. firewalld 서비스 누락 해결

**증상**:
```bash
Failed to start firewalld.service: Unit firewalld.service not found.
```

**해결 방법**:
```bash
# firewalld 설치
sudo dnf install -y firewalld

# 서비스 데몬 리로드
sudo systemctl daemon-reload

# 서비스 시작 및 활성화
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 포트 허용
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload
```

**대체 방법 (iptables 사용)**:
```bash
# firewalld 실패 시 iptables 사용
sudo iptables -A INPUT -p tcp --dport 3010 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3011 -j ACCEPT
```

### 4. admin 디렉토리 경로 문제 해결

**증상**:
```bash
./amazon-linux-robust-install.sh: line 306: cd: ../admin: No such file or directory
```

**해결 방법**:
```bash
# 자동 수정 스크립트 실행
chmod +x fix-admin-path.sh
./fix-admin-path.sh

# 또는 수동 수정
# 설치 스크립트에서 'cd ../admin'을 'cd admin'으로 변경
```

### 5. 메모리 부족 문제 해결

**증상**: npm install 중 프로세스 종료, 시스템 응답 없음

**해결 방법**:
```bash
# 스왑 파일 생성 (2GB)
sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Node.js 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=1536"
```

## 🔧 단계별 문제 해결

### 1단계: 시스템 상태 확인

```bash
# OS 버전 확인
cat /etc/os-release

# 메모리 상태 확인
free -h

# 디스크 공간 확인
df -h

# 네트워크 연결 확인
ping -c 3 8.8.8.8
```

### 2단계: 패키지 관리자 상태 확인

```bash
# dnf 캐시 정리
sudo dnf clean all
sudo dnf makecache

# 패키지 업데이트
sudo dnf update -y

# 손상된 패키지 확인
sudo dnf check
```

### 3단계: Node.js 환경 확인

```bash
# Node.js 버전 확인
node --version
npm --version

# npm 캐시 정리
npm cache clean --force

# npm 설정 확인
npm config list
```

### 4단계: 프로세스 및 포트 확인

```bash
# 실행 중인 Node.js 프로세스 확인
ps aux | grep node

# 포트 사용 상태 확인
sudo ss -tlnp | grep -E ':(3010|3011)'

# 충돌 프로세스 종료
sudo pkill -f "node.*msp"
```

## 🛠️ 고급 문제 해결

### npm 설치 실패 해결

**문제**: 의존성 설치 중 타임아웃 또는 실패

**해결책**:
```bash
# npm 설정 최적화
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
npm config set fetch-retries 5

# 단계별 설치
cd /opt/msp-checklist
rm -rf node_modules package-lock.json
npm install --no-optional --verbose

cd msp-checklist
rm -rf node_modules package-lock.json
npm install --no-optional --legacy-peer-deps --verbose
```

### 빌드 실패 해결

**문제**: Next.js 빌드 중 오류 발생

**해결책**:
```bash
# PostCSS 플러그인 설치
cd /opt/msp-checklist/msp-checklist
npm install @tailwindcss/postcss

# 또는 admin 디렉토리에서
cd /opt/msp-checklist/admin
npm install @tailwindcss/postcss

# 빌드 재시도
npm run build
```

### 권한 문제 해결

**문제**: 파일 생성 또는 수정 권한 없음

**해결책**:
```bash
# 디렉토리 소유권 변경
sudo chown -R $USER:$USER /opt/msp-checklist

# 실행 권한 부여
chmod +x /opt/msp-checklist/*.sh

# SELinux 설정 (필요시)
sudo setsebool -P httpd_can_network_connect 1
```

## 🔍 진단 도구

### 자동 진단 스크립트 실행

```bash
# 종합 진단
chmod +x installation-diagnostic.sh
./installation-diagnostic.sh

# 빠른 문제 해결
./quick-fix-amazon-linux.sh
```

### 수동 진단 체크리스트

1. **시스템 리소스**
   - [ ] 메모리 1GB 이상 사용 가능
   - [ ] 디스크 5GB 이상 여유 공간
   - [ ] 네트워크 연결 정상

2. **패키지 상태**
   - [ ] curl 명령어 정상 작동
   - [ ] git 설치 확인
   - [ ] Node.js 20.9.0 이상

3. **서비스 상태**
   - [ ] firewalld 또는 iptables 설정
   - [ ] 포트 3010, 3011 허용
   - [ ] 기존 프로세스 정리

4. **파일 시스템**
   - [ ] /opt 디렉토리 쓰기 권한
   - [ ] 임시 디렉토리 접근 가능
   - [ ] 로그 파일 생성 가능

## 🚨 응급 복구 절차

### 완전 초기화 및 재설치

```bash
# 1. 모든 관련 프로세스 종료
sudo pkill -f "node.*msp"
sudo pkill -f "npm.*start"
pm2 kill 2>/dev/null || true

# 2. 설치 디렉토리 완전 제거
sudo rm -rf /opt/msp-checklist

# 3. Node.js 완전 제거
sudo dnf remove -y nodejs npm

# 4. 캐시 정리
sudo dnf clean all
npm cache clean --force 2>/dev/null || true

# 5. 시스템 재부팅 (권장)
sudo reboot

# 6. 재부팅 후 강화된 설치 스크립트 실행
./amazon-linux-robust-install.sh
```

### 부분 복구 (설정 보존)

```bash
# 1. 서버 중지
cd /opt/msp-checklist
./stop-servers.sh

# 2. node_modules 재설치
cd msp-checklist
rm -rf node_modules package-lock.json
npm install --no-optional --legacy-peer-deps

cd ../admin
rm -rf node_modules package-lock.json
npm install --no-optional

# 3. 빌드 및 재시작
npm run build
cd ..
./restart-servers.sh
```

## 📊 성능 모니터링

### 실시간 모니터링

```bash
# 시스템 리소스 모니터링
htop

# 메모리 사용량 확인
watch -n 1 free -h

# 디스크 I/O 모니터링
iostat -x 1

# 네트워크 연결 상태
watch -n 1 'ss -tlnp | grep -E ":(3010|3011)"'
```

### 로그 모니터링

```bash
# 설치 로그 실시간 확인
tail -f /tmp/msp-install-*.log

# 서버 로그 확인
tail -f /opt/msp-checklist/server.log

# 시스템 로그 확인
journalctl -f -u firewalld
```

## 🆘 지원 요청 시 필요 정보

### 수집해야 할 정보

1. **시스템 정보**
   ```bash
   uname -a
   cat /etc/os-release
   free -h
   df -h
   ```

2. **설치 로그**
   ```bash
   # 최신 설치 로그 파일 위치
   ls -la /tmp/msp-install-*.log
   ```

3. **오류 메시지**
   - 정확한 오류 메시지 전문
   - 오류 발생 시점 및 상황
   - 실행한 명령어

4. **환경 설정**
   ```bash
   node --version
   npm --version
   curl --version
   systemctl status firewalld
   ```

---

**최종 업데이트**: 2024년 12월 24일  
**적용 대상**: Amazon Linux 2023  
**지원 버전**: MSP Checklist v2.0+