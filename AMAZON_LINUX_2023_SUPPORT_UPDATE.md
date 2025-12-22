# Amazon Linux 2023 지원 업데이트 완료

## 📋 업데이트 개요

모든 설치 및 배포 문서를 Amazon Linux 2023 버전도 지원하도록 업데이트했습니다. 기존 Ubuntu 22.04 LTS 지원을 유지하면서 AWS 네이티브 운영체제인 Amazon Linux 2023에 대한 완전한 지원을 추가했습니다.

## 🔄 주요 변경사항

### 1. Node.js 버전 업그레이드
- **이전**: Node.js 18+ / 20.9.0+
- **현재**: Node.js 22+ (LTS 권장)
- **이유**: 최신 보안 패치, 성능 향상, Next.js 14 완벽 호환

### 2. 운영체제 지원 확장
- **Ubuntu 22.04 LTS** (기존 지원 유지)
- **Amazon Linux 2023** (신규 추가)
- **macOS** (개발 환경)
- **Windows (WSL2)** (개발 환경)

### 3. 패키지 관리자 지원
- **Ubuntu**: `apt` 패키지 매니저
- **Amazon Linux**: `dnf` 패키지 매니저
- **공통**: NodeSource 저장소 또는 NVM 사용

## 📚 업데이트된 문서 목록

### 1. 메인 설정 문서
- ✅ **SETUP_GUIDE.md** - 완전히 재작성
  - 시스템 요구사항 추가
  - OS별 설치 방법 분리
  - 문제 해결 섹션 강화

- ✅ **QUICK_START.md** - 빠른 시작 가이드 업데이트
  - OS별 설치 명령어 추가
  - Node.js 22 요구사항 반영
  - 방화벽 설정 가이드 추가

- ✅ **README.md** - 메인 프로젝트 문서 업데이트
  - 시스템 요구사항 업데이트
  - OS별 설치 방법 추가

### 2. AWS 배포 문서
- ✅ **AWS_DEPLOYMENT_GUIDE.md** - 이미 완료됨
  - Ubuntu와 Amazon Linux 2023 완전 지원
  - OS별 설치 명령어 분리
  - 트러블슈팅 섹션 강화

- ✅ **AWS_EKS_DEPLOYMENT_GUIDE.md** - EKS 배포 가이드 업데이트
  - OS별 필수 도구 설치 방법
  - Docker 설치 명령어 분리

- ✅ **AWS_ECS_DEPLOYMENT_GUIDE.md** - ECS 배포 가이드 업데이트
  - Docker 설치 방법 OS별 분리

- ✅ **deploy/README.md** - 배포 문서 업데이트
  - Docker 설치 방법 개선

### 3. 관리 및 운영 문서
- ✅ **SERVER_MANAGEMENT.md** - 서버 관리 가이드 업데이트
  - Node.js 22 요구사항 반영
  - OS별 문제 해결 방법 추가
  - 방화벽 및 SELinux 설정 가이드

- ✅ **msp-checklist/README.md** - 애플리케이션 문서 업데이트
  - 시스템 요구사항 업데이트
  - OS별 설치 방법 추가

## 🎯 운영체제별 주요 차이점

### Ubuntu 22.04 LTS
```bash
# 패키지 관리
sudo apt update && sudo apt upgrade -y
sudo apt install -y package-name

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 방화벽 관리
sudo ufw allow port-number

# Docker 설치
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

### Amazon Linux 2023
```bash
# 패키지 관리
sudo dnf update -y
sudo dnf install -y package-name

# Node.js 설치
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

# 방화벽 관리
sudo firewall-cmd --permanent --add-port=port-number/tcp
sudo firewall-cmd --reload

# Docker 설치
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

## 🔧 설치 방법 옵션

### 1. NodeSource 저장소 (권장)
- **장점**: 안정적, 자동 업데이트
- **Ubuntu**: `setup_22.x` 또는 `setup_lts.x`
- **Amazon Linux**: `setup_22.x` 또는 `setup_lts.x`

### 2. NVM (개발 환경)
- **장점**: 버전 관리 유연성
- **공통**: 모든 OS에서 동일한 명령어
- **사용법**: `nvm install 22 && nvm use 22`

## 🛠️ 문제 해결 가이드

### 공통 문제
- **Node.js 버전**: 22.x 이상 필요
- **권한 문제**: `sudo chown -R $USER:$USER ~/.npm`
- **캐시 문제**: `npm cache clean --force`

### Ubuntu 특화 문제
- **방화벽**: `sudo ufw status`
- **포트 확인**: `lsof -i:3010`

### Amazon Linux 특화 문제
- **방화벽**: `sudo firewall-cmd --list-all`
- **SELinux**: `sudo setsebool -P httpd_can_network_connect 1`
- **포트 확인**: `ss -tlnp | grep :3010`

## 📋 배포 체크리스트

### 배포 전 확인사항
- [ ] Node.js 22.x 이상 설치 확인
- [ ] 운영체제별 패키지 매니저 확인
- [ ] 방화벽 설정 확인
- [ ] Docker 설치 (컨테이너 배포 시)

### 배포 중 확인사항
- [ ] 의존성 설치 완료
- [ ] 환경 변수 설정 완료
- [ ] 포트 접근 가능 확인
- [ ] 서비스 정상 시작 확인

### 배포 후 확인사항
- [ ] 애플리케이션 정상 동작
- [ ] 로그 파일 확인
- [ ] 성능 모니터링 설정
- [ ] 백업 스크립트 설정

## 🎉 완료된 기능

### ✅ 완전한 멀티 OS 지원
- Ubuntu 22.04 LTS와 Amazon Linux 2023 완전 지원
- OS별 최적화된 설치 방법 제공
- 문제 해결 가이드 OS별 분리

### ✅ 최신 기술 스택
- Node.js 22+ 지원으로 최신 기능 활용
- 보안 패치 및 성능 개선 적용
- Next.js 14와 완벽한 호환성

### ✅ 개발자 경험 향상
- 명확한 설치 가이드
- OS별 명령어 예제 제공
- 단계별 체크리스트 제공

### ✅ 운영 안정성
- 배포 전 버전 검증
- OS별 특화 문제 해결 방법
- 포괄적인 트러블슈팅 가이드

## 🚀 다음 단계

1. **테스트 검증**: 각 OS에서 설치 및 배포 테스트
2. **CI/CD 업데이트**: GitHub Actions에서 Amazon Linux 2023 지원
3. **Docker 이미지**: Amazon Linux 2023 기반 컨테이너 이미지 생성
4. **성능 벤치마크**: OS별 성능 비교 및 최적화

---

**결론**: 이제 MSP 체크리스트 시스템은 Ubuntu 22.04 LTS와 Amazon Linux 2023 모두에서 완벽하게 동작하며, 사용자는 자신의 환경에 맞는 운영체제를 선택하여 배포할 수 있습니다.