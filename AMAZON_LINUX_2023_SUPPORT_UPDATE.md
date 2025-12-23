# Amazon Linux 2023 지원 업데이트

## 🎯 개요
Amazon Linux 2023에서 발생하는 설치 장애 및 패키지 충돌 문제를 해결하고 안정적인 설치 환경을 제공합니다.

## 🚨 해결된 주요 문제

### 1. curl 패키지 충돌 문제
**문제**: curl-minimal과 curl 패키지 간 충돌로 설치 실패
```bash
Error: Problem: problem with installed package curl-minimal-8.11.1-4.amzn2023.0.3.x86_64
- package curl-minimal-8.11.1-4.amzn2023.0.3.x86_64 from @System conflicts with curl provided by curl-7.87.0-2.amzn2023.0.2.x86_64
```

**해결책**: 
- `fix-amazon-linux-curl-conflict.sh` 스크립트로 자동 해결
- curl-minimal 제거 후 curl 설치
- 패키지 교체 및 강제 설치 옵션 제공

### 2. firewalld 서비스 누락 문제
**문제**: firewalld.service not found 오류
```bash
Failed to start firewalld.service: Unit firewalld.service not found.
```

**해결책**:
- firewalld 패키지 자동 설치 및 검증
- 서비스 데몬 리로드 추가
- iptables 대체 방화벽 설정 제공

### 3. 메모리 부족으로 인한 설치 중단
**문제**: npm install 중 메모리 부족으로 프로세스 종료

**해결책**:
- 자동 스왑 파일 생성 (2GB)
- Node.js 메모리 제한 설정
- 시스템 메모리 최적화

### 4. 네트워크 타임아웃 및 연결 실패
**문제**: 패키지 다운로드 중 타임아웃 발생

**해결책**:
- 재시도 메커니즘 구현 (최대 3회)
- 타임아웃 설정 최적화 (300초)
- 연결 상태 사전 검증

## 📋 업데이트된 스크립트

### 1. 강화된 설치 스크립트
- **파일**: `amazon-linux-robust-install.sh`
- **특징**: 장애 방지 및 자동 복구 기능
- **개선사항**:
  - 시스템 요구사항 사전 검증
  - 메모리 최적화 및 스왑 파일 자동 생성
  - 재시도 메커니즘 및 타임아웃 설정
  - 오류 발생 시 자동 정리
  - 단계별 검증 및 로깅

### 2. 빠른 문제 해결 스크립트
- **파일**: `quick-fix-amazon-linux.sh`
- **용도**: 일반적인 문제들을 빠르게 해결
- **기능**:
  - curl 충돌 자동 해결
  - 패키지 캐시 정리
  - 기본 패키지 설치 확인
  - 시스템 리소스 점검
  - 방화벽 설정 검증

### 3. curl 충돌 전용 해결 스크립트
- **파일**: `fix-amazon-linux-curl-conflict.sh`
- **용도**: curl 패키지 충돌 문제 전용 해결
- **방법**: 5단계 해결 방법 제공

## 🔧 설치 가이드

### 권장 설치 순서

1. **빠른 문제 해결 실행**
   ```bash
   chmod +x quick-fix-amazon-linux.sh
   ./quick-fix-amazon-linux.sh
   ```

2. **강화된 설치 스크립트 실행**
   ```bash
   chmod +x amazon-linux-robust-install.sh
   ./amazon-linux-robust-install.sh
   ```

### 문제 발생 시 대응

1. **curl 충돌 문제**
   ```bash
   ./fix-amazon-linux-curl-conflict.sh
   ```

2. **설치 진단**
   ```bash
   chmod +x installation-diagnostic.sh
   ./installation-diagnostic.sh
   ```

## 📊 시스템 요구사항

### 최소 요구사항
- **OS**: Amazon Linux 2023
- **메모리**: 1GB (권장: 2GB 이상)
- **디스크**: 5GB 여유 공간
- **네트워크**: 인터넷 연결 필수

### 권장 사양
- **메모리**: 4GB 이상
- **디스크**: 10GB 이상 여유 공간
- **CPU**: 2 코어 이상

## 🛡️ 보안 설정

### 방화벽 설정
- **포트 3010**: 메인 서비스
- **포트 3011**: 관리자 시스템
- **자동 설정**: firewalld 또는 iptables

### AWS 보안 그룹
```bash
# 인바운드 규칙 추가 필요
포트 3010: 0.0.0.0/0 (HTTP)
포트 3011: 관리자 IP만 허용 권장
```

## 🔍 문제 해결

### 일반적인 오류 및 해결책

1. **메모리 부족**
   ```bash
   # 스왑 파일 수동 생성
   sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **포트 사용 중**
   ```bash
   # 포트 사용 프로세스 확인 및 종료
   sudo ss -tlnp | grep :3010
   sudo kill -9 [PID]
   ```

3. **권한 문제**
   ```bash
   # 디렉토리 권한 설정
   sudo chown -R $USER:$USER /opt/msp-checklist
   ```

### 로그 확인
- **설치 로그**: `/tmp/msp-install-[날짜시간].log`
- **서버 로그**: `/opt/msp-checklist/server.log`
- **시스템 로그**: `journalctl -u firewalld`

## 📈 성능 최적화

### Node.js 설정
```bash
export NODE_OPTIONS="--max-old-space-size=1536"
```

### npm 설정
```bash
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
npm config set fetch-retries 5
```

### 시스템 최적화
```bash
echo 'vm.swappiness = 10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure = 50' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 🚀 다음 단계

### 설치 완료 후 확인사항
1. 서비스 상태 확인: `./server-status.sh`
2. 포트 접근 테스트: `curl http://localhost:3010`
3. 로그 모니터링: `tail -f server.log`

### 운영 환경 설정
1. 환경 변수 설정: `.env.local` 파일 편집
2. SSL 인증서 설정 (프로덕션 환경)
3. 백업 및 모니터링 설정

## 📞 지원

### 추가 도움이 필요한 경우
1. 설치 로그 파일 확인
2. 시스템 사양 및 오류 메시지 수집
3. GitHub Issues 또는 지원 채널 문의

---

**업데이트 날짜**: 2024년 12월 24일  
**버전**: 2.0  
**지원 OS**: Amazon Linux 2023