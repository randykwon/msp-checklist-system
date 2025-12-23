# MSP Checklist 설치 가이드 요약

MSP Checklist 시스템을 다양한 환경에서 설치하고 운영하기 위한 종합 가이드 모음입니다.

## 📚 가이드 목록

### 🐧 Ubuntu 22.04 LTS
- **[UBUNTU_DEPLOYMENT_GUIDE.md](UBUNTU_DEPLOYMENT_GUIDE.md)**: 완전한 Ubuntu 배포 가이드
- **[ubuntu-install.sh](ubuntu-install.sh)**: 자동 설치 스크립트
- **[ubuntu-quick-setup.sh](ubuntu-quick-setup.sh)**: 빠른 설정 스크립트
- **[UBUNTU_TROUBLESHOOTING_GUIDE.md](UBUNTU_TROUBLESHOOTING_GUIDE.md)**: 문제 해결 가이드

### 🟠 Amazon Linux 2023
- **[AMAZON_LINUX_2023_DEPLOYMENT_GUIDE.md](AMAZON_LINUX_2023_DEPLOYMENT_GUIDE.md)**: 완전한 Amazon Linux 배포 가이드
- **[amazon-linux-install.sh](amazon-linux-install.sh)**: 자동 설치 스크립트
- **[amazon-linux-quick-setup.sh](amazon-linux-quick-setup.sh)**: 빠른 설정 스크립트
- **[AMAZON_LINUX_2023_TROUBLESHOOTING_GUIDE.md](AMAZON_LINUX_2023_TROUBLESHOOTING_GUIDE.md)**: 문제 해결 가이드
- **[AMAZON_LINUX_2023_CLEAN_REMOVAL_GUIDE.md](AMAZON_LINUX_2023_CLEAN_REMOVAL_GUIDE.md)**: 완전 제거 가이드
- **[clean-remove.sh](clean-remove.sh)**: 완전 제거 스크립트

### 🌐 웹 서버 설정
- **[NGINX_NODE_SETUP_GUIDE.md](NGINX_NODE_SETUP_GUIDE.md)**: Nginx + Node.js 통합 설정
- **[NGINX_QUICK_START.md](NGINX_QUICK_START.md)**: Nginx 빠른 시작 가이드
- **[NODEJS_SERVER_SETUP_GUIDE.md](NODEJS_SERVER_SETUP_GUIDE.md)**: Node.js 서버 설정 가이드

### ☁️ AWS 클라우드 배포
- **[AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md)**: AWS EC2 배포 가이드
- **[AWS_ECS_DEPLOYMENT_GUIDE.md](AWS_ECS_DEPLOYMENT_GUIDE.md)**: AWS ECS 배포 가이드
- **[AWS_EKS_DEPLOYMENT_GUIDE.md](AWS_EKS_DEPLOYMENT_GUIDE.md)**: AWS EKS 배포 가이드
- **[AWS_IAC_DEPLOYMENT_GUIDE.md](AWS_IAC_DEPLOYMENT_GUIDE.md)**: Infrastructure as Code 배포

## 🚀 빠른 시작

### Ubuntu 22.04 LTS에서 자동 설치
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ubuntu-install.sh | bash
```

### Amazon Linux 2023에서 자동 설치
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/amazon-linux-install.sh | bash
```

### 기존 설치에서 빠른 설정
```bash
# Ubuntu
./ubuntu-quick-setup.sh

# Amazon Linux 2023
./amazon-linux-quick-setup.sh
```

## 📋 시스템 요구사항

### 최소 요구사항
- **CPU**: 1 vCPU
- **RAM**: 2GB
- **디스크**: 10GB 여유 공간
- **OS**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023
- **Node.js**: 20.9.0 이상

### 권장 사양
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **디스크**: 20GB 여유 공간
- **네트워크**: 포트 3010, 3011 접근 허용

## 🔧 설치 방법 선택 가이드

### 1. 완전 자동 설치 (권장)
**사용 시기**: 새로운 서버에 처음 설치할 때
- Ubuntu: `ubuntu-install.sh`
- Amazon Linux: `amazon-linux-install.sh`

**특징**:
- 시스템 업데이트부터 서버 시작까지 모든 과정 자동화
- Nginx, SSL, systemd 서비스 설정 옵션 제공
- 약 10-15분 소요

### 2. 빠른 설정
**사용 시기**: 이미 설치된 시스템의 문제 해결이나 재설정
- Ubuntu: `ubuntu-quick-setup.sh`
- Amazon Linux: `amazon-linux-quick-setup.sh`

**특징**:
- 의존성 재설치, 빌드, 서버 재시작
- 약 5-10분 소요

### 3. 수동 설치
**사용 시기**: 세밀한 제어가 필요하거나 커스터마이징이 필요할 때
- 각 배포 가이드의 단계별 지침 따라하기

**특징**:
- 각 단계를 개별적으로 제어 가능
- 문제 발생 시 디버깅 용이

## 🌐 배포 아키텍처 옵션

### 1. 단일 서버 배포 (기본)
```
[사용자] → [EC2 인스턴스:3010/3011] → [Node.js 앱]
```
- 가장 간단한 구성
- 개발/테스트 환경에 적합

### 2. Nginx 리버스 프록시
```
[사용자] → [EC2:80/443] → [Nginx] → [Node.js:3010/3011]
```
- SSL 인증서 지원
- 도메인 기반 접근
- 프로덕션 환경 권장

### 3. 로드 밸런서 + 다중 인스턴스
```
[사용자] → [ALB] → [EC2-1, EC2-2, EC2-3] → [Node.js 앱]
```
- 고가용성 구성
- 대규모 트래픽 처리

## 🔍 문제 해결 순서

### 1. 기본 확인사항
```bash
# 서버 프로세스 확인
ps aux | grep node

# 포트 상태 확인
sudo netstat -tlnp | grep :301  # Ubuntu
sudo ss -tlnp | grep :301       # Amazon Linux

# 로그 확인
tail -f server.log admin-server.log
```

### 2. 방화벽 확인
```bash
# Ubuntu
sudo ufw status

# Amazon Linux
sudo firewall-cmd --list-ports
```

### 3. AWS 보안 그룹 확인
- EC2 콘솔에서 보안 그룹 인바운드 규칙 확인
- 포트 3010, 3011이 0.0.0.0/0에서 TCP로 허용되어 있는지 확인

### 4. 상세 문제 해결
- Ubuntu: `UBUNTU_TROUBLESHOOTING_GUIDE.md` 참조
- Amazon Linux: `AMAZON_LINUX_2023_TROUBLESHOOTING_GUIDE.md` 참조

## 📊 모니터링 및 유지보수

### 자동화 스크립트
```bash
# 시스템 상태 모니터링
./monitor-system.sh

# 자동 복구 (crontab 설정)
*/5 * * * * /opt/msp-checklist/auto-recovery.sh

# 자동 백업 (매일 새벽 2시)
0 2 * * * /opt/msp-checklist/backup-system.sh
```

### PM2 프로세스 관리 (권장)
```bash
# PM2 설치
sudo npm install -g pm2

# 애플리케이션 시작
pm2 start msp-checklist/server.js --name "msp-main"
pm2 start admin/server.js --name "msp-admin"

# 자동 시작 설정
pm2 startup
pm2 save
```

## 🔒 보안 권장사항

### 1. 기본 보안 설정
- SSH 키 기반 인증 사용
- 불필요한 포트 차단
- 정기적인 시스템 업데이트

### 2. 애플리케이션 보안
- 환경 변수로 API 키 관리
- HTTPS 사용 (Let's Encrypt)
- 정기적인 백업

### 3. AWS 보안
- IAM 역할 최소 권한 원칙
- VPC 보안 그룹 적절한 설정
- CloudTrail 로깅 활성화

## 📞 지원 및 문의

### 문제 발생 시 확인사항
1. 해당 OS의 문제 해결 가이드 확인
2. 로그 파일 검토
3. 시스템 리소스 확인 (메모리, 디스크)
4. 네트워크 연결 상태 확인

### 지원 요청 시 필요 정보
- OS 버전 및 시스템 사양
- 오류 메시지 및 로그
- 설치 방법 및 설정 정보
- 네트워크 환경 정보

### 연락처
- GitHub Issues: https://github.com/randykwon/msp-checklist-system/issues
- 문서 업데이트 요청: Pull Request 환영

---

이 가이드들을 통해 다양한 환경에서 MSP Checklist 시스템을 성공적으로 배포하고 운영할 수 있습니다.