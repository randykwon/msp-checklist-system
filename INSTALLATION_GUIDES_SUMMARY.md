# MSP Checklist 설치 가이드 요약

MSP Checklist 시스템을 다양한 환경에서 설치하고 운영하기 위한 종합 가이드 모음입니다.

## 📚 가이드 목록

### 🐧 Ubuntu 22.04 LTS
- **[UBUNTU_DEPLOYMENT_GUIDE.md](UBUNTU_DEPLOYMENT_GUIDE.md)**: 완전한 Ubuntu 배포 가이드
- **[ubuntu-install.sh](ubuntu-install.sh)**: 자동 설치 스크립트
- **[ubuntu-robust-install.sh](ubuntu-robust-install.sh)**: 🆕 강화된 설치 스크립트 (장애 방지)
- **[ubuntu-quick-setup.sh](ubuntu-quick-setup.sh)**: 빠른 설정 스크립트
- **[ubuntu-reinstall.sh](ubuntu-reinstall.sh)**: 완전 재설치 스크립트
- **[UBUNTU_TROUBLESHOOTING_GUIDE.md](UBUNTU_TROUBLESHOOTING_GUIDE.md)**: 문제 해결 가이드

### 🟠 Amazon Linux 2023
- **[AMAZON_LINUX_2023_DEPLOYMENT_GUIDE.md](AMAZON_LINUX_2023_DEPLOYMENT_GUIDE.md)**: 완전한 Amazon Linux 배포 가이드
- **[amazon-linux-install.sh](amazon-linux-install.sh)**: 자동 설치 스크립트
- **[amazon-linux-robust-install.sh](amazon-linux-robust-install.sh)**: 🆕 강화된 설치 스크립트 (장애 방지)
- **[amazon-linux-quick-setup.sh](amazon-linux-quick-setup.sh)**: 빠른 설정 스크립트
- **[amazon-linux-reinstall.sh](amazon-linux-reinstall.sh)**: 완전 재설치 스크립트
- **[AMAZON_LINUX_2023_TROUBLESHOOTING_GUIDE.md](AMAZON_LINUX_2023_TROUBLESHOOTING_GUIDE.md)**: 문제 해결 가이드
- **[AMAZON_LINUX_2023_CLEAN_REMOVAL_GUIDE.md](AMAZON_LINUX_2023_CLEAN_REMOVAL_GUIDE.md)**: 완전 제거 가이드
- **[clean-remove.sh](clean-remove.sh)**: 완전 제거 스크립트

### 🔧 설치 장애 해결 도구 (🆕 신규)
- **[installation-diagnostic.sh](installation-diagnostic.sh)**: 설치 전 시스템 진단 및 자동 복구
- **[INSTALLATION_TROUBLESHOOTING_ANALYSIS.md](INSTALLATION_TROUBLESHOOTING_ANALYSIS.md)**: 설치 장애 원인 분석
- **[auto-reinstall.sh](auto-reinstall.sh)**: OS 자동 감지 재설치

### 🌐 웹 서버 설정
- **[NGINX_NODE_SETUP_GUIDE.md](NGINX_NODE_SETUP_GUIDE.md)**: Nginx + Node.js 통합 설정
- **[NGINX_QUICK_START.md](NGINX_QUICK_START.md)**: Nginx 빠른 시작 가이드
- **[NODEJS_SERVER_SETUP_GUIDE.md](NODEJS_SERVER_SETUP_GUIDE.md)**: Node.js 서버 설정 가이드

### ☁️ AWS 클라우드 배포
- **[AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md)**: AWS EC2 배포 가이드
- **[AWS_ECS_DEPLOYMENT_GUIDE.md](AWS_ECS_DEPLOYMENT_GUIDE.md)**: AWS ECS 배포 가이드
- **[AWS_EKS_DEPLOYMENT_GUIDE.md](AWS_EKS_DEPLOYMENT_GUIDE.md)**: AWS EKS 배포 가이드
- **[AWS_IAC_DEPLOYMENT_GUIDE.md](AWS_IAC_DEPLOYMENT_GUIDE.md)**: Infrastructure as Code 배포

## 🚀 설치 방법 선택 가이드

### 🆕 설치 장애가 자주 발생하는 경우 (권장)

#### 1단계: 시스템 진단
```bash
# 설치 전 시스템 상태 진단 및 자동 복구
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/installation-diagnostic.sh | bash
```

#### 2단계: 강화된 설치 스크립트 사용
```bash
# Ubuntu 22.04 LTS
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ubuntu-robust-install.sh | bash

# Amazon Linux 2023
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/amazon-linux-robust-install.sh | bash
```

### 일반적인 설치

#### Ubuntu 22.04 LTS
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ubuntu-install.sh | bash
```

#### Amazon Linux 2023
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

## 🔍 설치 장애 해결 프로세스

### 1단계: 진단 실행
```bash
./installation-diagnostic.sh
```

### 2단계: 문제 확인
- 시스템 리소스 (메모리, 디스크)
- 네트워크 연결 상태
- 프로세스 및 포트 충돌
- 패키지 관리자 상태
- 권한 문제

### 3단계: 자동 복구
- 스왑 파일 생성
- 프로세스 정리
- 패키지 관리자 복구
- npm 캐시 정리

### 4단계: 강화된 설치
- 재시도 메커니즘
- 타임아웃 설정
- 단계별 검증
- 오류 시 자동 정리

## 📋 시스템 요구사항

### 최소 요구사항
- **CPU**: 1 vCPU
- **RAM**: 1GB (2GB 권장)
- **디스크**: 5GB 여유 공간
- **OS**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023
- **Node.js**: 20.9.0 이상

### 권장 사양
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **디스크**: 20GB 여유 공간
- **네트워크**: 안정적인 인터넷 연결
- **포트**: 3010, 3011 접근 허용

## 🛠️ 설치 장애 주요 원인 및 해결책

### 1. 메모리 부족
**원인**: npm install 중 메모리 고갈
**해결**: 스왑 파일 자동 생성, Node.js 메모리 제한 설정

### 2. 네트워크 문제
**원인**: 패키지 다운로드 중 연결 끊김
**해결**: 재시도 메커니즘, 타임아웃 최적화

### 3. 권한 문제
**원인**: 디렉토리 생성/파일 쓰기 권한 없음
**해결**: 사전 권한 확인 및 설정

### 4. 프로세스 충돌
**원인**: 기존 프로세스가 포트 사용 중
**해결**: 자동 프로세스 정리

### 5. 패키지 관리자 잠금
**원인**: APT/DNF 잠금 파일 충돌
**해결**: 잠금 해제 및 복구

## 🔧 강화된 설치 스크립트 특징

### 안정성 강화
- **재시도 메커니즘**: 네트워크 오류 시 자동 재시도
- **타임아웃 설정**: 무한 대기 방지
- **오류 처리**: 단계별 오류 감지 및 복구
- **시그널 핸들링**: 중단 시 자동 정리

### 리소스 관리
- **메모리 최적화**: 스왑 파일 자동 생성
- **디스크 관리**: 공간 부족 사전 감지
- **프로세스 관리**: 충돌 프로세스 자동 정리

### 로깅 및 진단
- **상세 로깅**: 모든 단계 로그 기록
- **진행 상황**: 실시간 진행 상황 표시
- **문제 진단**: 실패 시 원인 분석

## 📞 지원 및 문의

### 설치 장애 발생 시
1. **진단 스크립트 실행**: `./installation-diagnostic.sh`
2. **로그 확인**: `/tmp/msp-install-*.log`
3. **강화된 스크립트 사용**: `*-robust-install.sh`
4. **문제 해결 가이드 참조**: OS별 트러블슈팅 가이드

### 지원 요청 시 필요 정보
- OS 버전 및 시스템 사양
- 진단 스크립트 결과
- 설치 로그 파일
- 오류 메시지 및 스크린샷

### 연락처
- GitHub Issues: https://github.com/randykwon/msp-checklist-system/issues
- 문서 업데이트 요청: Pull Request 환영

---

🆕 **새로운 강화된 설치 도구를 통해 설치 장애 없이 안정적으로 MSP Checklist 시스템을 배포할 수 있습니다!**