# MSP Checklist 배포 스크립트

Amazon Linux 2023에서 MSP Checklist 시스템을 배포하기 위한 자동화 스크립트 모음입니다.

## 📁 스크립트 목록

### 🚀 배포 스크립트

#### `amazon-linux-2023-deploy.sh`
**완전 자동 배포 스크립트** - 프로덕션 환경 구성
- 시스템 업데이트 및 필수 패키지 설치
- Node.js 20.9.0 설치
- PM2 프로세스 관리자 설정
- Nginx 리버스 프록시 구성
- SSL 인증서 설정 (선택사항)
- 방화벽 및 보안 설정
- 자동 백업 및 모니터링 설정

```bash
./deploy/amazon-linux-2023-deploy.sh
```

#### `quick-start-amazon-linux.sh`
**빠른 시작 스크립트** - 개발 환경 구성
- 최소한의 설정으로 빠른 환경 구성
- 의존성 설치 및 기본 설정
- 개발 모드 또는 프로덕션 빌드 선택

```bash
./deploy/quick-start-amazon-linux.sh
```

### 🔧 문제 해결 스크립트

#### `fix-amazon-linux-issues.sh`
**일반적인 문제 해결 스크립트**
- npm 설정 최적화
- 의존성 설치 문제 해결
- 메모리 및 타임아웃 설정
- 권한 문제 해결

```bash
./deploy/fix-amazon-linux-issues.sh
```

### 📊 모니터링 스크립트

#### `health-check.sh`
**시스템 헬스 체크 스크립트**
- 포트 상태 확인
- HTTP 응답 테스트
- PM2 프로세스 상태 확인
- 시스템 리소스 모니터링
- 자동 복구 기능

```bash
# 상태 확인만
./deploy/health-check.sh

# 문제 발견 시 자동 복구 시도
./deploy/health-check.sh --auto-fix
```

### 💾 백업 스크립트

#### `backup-system.sh`
**시스템 백업 스크립트**
- 데이터베이스 백업
- 설정 파일 백업
- 로그 및 시스템 정보 백업
- S3 업로드 지원 (선택사항)
- 오래된 백업 자동 정리

```bash
./deploy/backup-system.sh
```

## 🎯 사용 시나리오

### 1. 새로운 EC2 인스턴스에 완전 배포

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-username/msp-checklist-system.git
cd msp-checklist-system

# 2. 완전 자동 배포 실행
./deploy/amazon-linux-2023-deploy.sh
```

### 2. 개발 환경 빠른 구성

```bash
# 1. 빠른 시작 스크립트 실행
./deploy/quick-start-amazon-linux.sh

# 2. 개발 서버 시작
cd msp-checklist && npm run dev
```

### 3. 배포 중 문제 발생 시

```bash
# 1. 문제 해결 스크립트 실행
./deploy/fix-amazon-linux-issues.sh

# 2. 다시 배포 시도
./deploy/amazon-linux-2023-deploy.sh
```

### 4. 운영 중 모니터링

```bash
# 정기적인 헬스 체크
./deploy/health-check.sh

# 문제 발생 시 자동 복구
./deploy/health-check.sh --auto-fix

# 시스템 백업
./deploy/backup-system.sh
```

## ⚙️ 환경 요구사항

### 시스템 요구사항
- **OS**: Amazon Linux 2023
- **인스턴스**: t3.medium 이상 (2 vCPU, 4GB RAM)
- **스토리지**: 20GB 이상
- **네트워크**: 인터넷 연결 필요

### 보안 그룹 설정
```
인바운드 규칙:
- SSH (22): 관리자 IP
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Custom TCP (3010): 0.0.0.0/0 (개발용)
- Custom TCP (3011): 0.0.0.0/0 (개발용)
```

### 필요한 권한
- sudo 권한 (패키지 설치, 시스템 설정용)
- 방화벽 설정 권한
- systemd 서비스 관리 권한

## 🔍 문제 해결 가이드

### 일반적인 문제들

#### 1. npm install 실패
```bash
# 해결 방법
./deploy/fix-amazon-linux-issues.sh
```

**원인**: 네트워크 타임아웃, 메모리 부족, 의존성 충돌

#### 2. 빌드 실패
```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**원인**: 메모리 부족, TypeScript 오류

#### 3. 포트 접근 불가
```bash
# 방화벽 확인
sudo firewall-cmd --list-all

# 포트 허용
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload
```

**원인**: 방화벽 차단, 보안 그룹 설정 문제

#### 4. 서비스 시작 실패
```bash
# PM2 상태 확인
pm2 status
pm2 logs

# 서비스 재시작
pm2 restart all
```

**원인**: 환경 변수 누락, 데이터베이스 권한 문제

### 로그 확인 방법

```bash
# 애플리케이션 로그
pm2 logs

# 시스템 로그
sudo journalctl -u nginx -f
sudo journalctl -u msp-checklist -f

# 배포 스크립트 로그
tail -f /var/log/msp-deploy.log
```

## 📈 성능 최적화

### PM2 클러스터 모드
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'msp-checklist',
    instances: 'max',  // CPU 코어 수만큼
    exec_mode: 'cluster'
  }]
};
```

### Nginx 캐싱 설정
```nginx
# 정적 파일 캐싱
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 시스템 튜닝
```bash
# 파일 디스크립터 제한 증가
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 커널 파라미터 최적화
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 🔒 보안 강화

### SSL 인증서 자동 갱신
```bash
# Certbot 자동 갱신 설정
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 방화벽 강화
```bash
# SSH 접근 IP 제한
sudo firewall-cmd --permanent --remove-service=ssh
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='YOUR_IP' service name='ssh' accept"
```

### fail2ban 설정
```bash
# fail2ban 설치 및 설정
sudo dnf install -y epel-release fail2ban
sudo systemctl enable --now fail2ban
```

## 📋 체크리스트

### 배포 전 확인사항
- [ ] EC2 인스턴스 사양 확인 (t3.medium 이상)
- [ ] 보안 그룹 설정 완료
- [ ] 도메인 DNS 설정 (SSL 사용 시)
- [ ] 환경 변수 준비 (API 키 등)

### 배포 후 확인사항
- [ ] 애플리케이션 접속 확인
- [ ] PM2 프로세스 상태 확인
- [ ] Nginx 상태 확인
- [ ] SSL 인증서 확인 (설정한 경우)
- [ ] 백업 스케줄 확인
- [ ] 모니터링 설정 확인

## 🆘 지원 및 문의

### 로그 수집
문제 발생 시 다음 정보를 수집해주세요:

```bash
# 시스템 정보
uname -a
cat /etc/os-release

# 애플리케이션 상태
pm2 status
pm2 logs --lines 50

# 시스템 리소스
free -h
df -h

# 네트워크 상태
netstat -tlnp | grep :301
```

### 자주 묻는 질문

**Q: 메모리가 부족한 인스턴스에서도 실행 가능한가요?**
A: t3.small (2GB RAM)에서도 실행 가능하지만, 빌드 시 메모리 부족 오류가 발생할 수 있습니다. NODE_OPTIONS="--max-old-space-size=1024"로 설정하거나 스왑 파일을 생성하세요.

**Q: 다른 포트를 사용하고 싶습니다.**
A: ecosystem.config.js 파일에서 PORT 환경 변수를 수정하고, Nginx 설정도 함께 변경하세요.

**Q: SSL 인증서 갱신이 실패합니다.**
A: 도메인 DNS 설정과 방화벽 80/443 포트 허용을 확인하세요.

이 가이드를 따라하면 Amazon Linux 2023에서 MSP Checklist 시스템을 안정적으로 배포하고 운영할 수 있습니다.