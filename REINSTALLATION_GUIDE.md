# MSP Checklist 재설치 가이드

기존 MSP Checklist 설치를 완전히 제거하고 새로 설치하는 방법을 안내합니다.

## 🚨 주의사항

**⚠️ 경고: 재설치 시 모든 데이터가 삭제됩니다!**

재설치 전에 다음 사항을 확인하세요:
- 중요한 데이터베이스 파일 백업
- 환경 변수 설정 백업
- 사용자 정의 설정 백업

## 📋 재설치 스크립트 목록

### 🤖 자동 OS 감지 재설치
- **`auto-reinstall.sh`**: OS를 자동 감지하고 적절한 재설치 스크립트 실행

### 🐧 Ubuntu 22.04 LTS
- **`ubuntu-reinstall.sh`**: Ubuntu 전용 완전 재설치 스크립트

### 🟠 Amazon Linux 2023
- **`amazon-linux-reinstall.sh`**: Amazon Linux 전용 완전 재설치 스크립트

## 🚀 빠른 재설치

### 방법 1: 자동 OS 감지 (권장)
```bash
# 스크립트 다운로드 및 실행
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/auto-reinstall.sh | bash

# 또는 저장소에서 실행
chmod +x auto-reinstall.sh
./auto-reinstall.sh
```

### 방법 2: OS별 직접 실행

#### Ubuntu 22.04 LTS
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ubuntu-reinstall.sh | bash

# 또는
chmod +x ubuntu-reinstall.sh
./ubuntu-reinstall.sh
```

#### Amazon Linux 2023
```bash
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/amazon-linux-reinstall.sh | bash

# 또는
chmod +x amazon-linux-reinstall.sh
./amazon-linux-reinstall.sh
```

## 📝 재설치 과정

### 1단계: 제거 과정
1. **데이터베이스 백업** (선택사항)
   - `msp-assessment.db`
   - `advice-cache.db`
   - 환경 변수 파일 (`.env.local`)

2. **프로세스 중지**
   - PM2 프로세스 종료
   - Node.js 프로세스 강제 종료
   - 포트 사용 프로세스 정리

3. **시스템 서비스 제거**
   - systemd 서비스 중지 및 제거
   - crontab 작업 정리

4. **파일 제거**
   - 애플리케이션 디렉토리 완전 삭제
   - npm 캐시 및 설정 정리

5. **설정 정리**
   - Nginx 설정 제거
   - 방화벽 규칙 정리

### 2단계: 설치 과정
1. **시스템 업데이트**
2. **Node.js 20.9.0 설치**
3. **방화벽 설정**
4. **프로젝트 클론**
5. **의존성 설치**
6. **환경 변수 설정**
7. **데이터베이스 복원** (백업한 경우)
8. **애플리케이션 빌드**
9. **선택적 구성요소 설치** (Nginx, PM2, SSL 등)
10. **서버 시작 및 검증**

## ⚙️ 재설치 옵션

재설치 스크립트 실행 시 다음 옵션들을 설정할 수 있습니다:

### 기본 설정
- **저장소 URL**: GitHub 저장소 주소
- **설치 디렉토리**: 기본값 `/opt/msp-checklist`
- **데이터 백업**: 기존 데이터베이스 백업 여부

### 웹 서버 설정
- **Nginx 설치**: 리버스 프록시 설정
- **도메인 설정**: 사용자 도메인 (선택사항)
- **SSL 인증서**: Let's Encrypt 자동 설정

### 시스템 설정
- **systemd 서비스**: 자동 시작 서비스 등록
- **PM2 설치**: 프로세스 매니저 (Amazon Linux만)

## 🔄 재설치 시나리오별 가이드

### 시나리오 1: 문제 해결을 위한 재설치
```bash
# 데이터 백업 권장
./auto-reinstall.sh
# 백업 옵션에서 'y' 선택
```

### 시나리오 2: 완전히 새로운 설치
```bash
# 데이터 백업 불필요
./auto-reinstall.sh
# 백업 옵션에서 'n' 선택
```

### 시나리오 3: 프로덕션 환경 재설치
```bash
# 모든 옵션 활성화 권장
./auto-reinstall.sh
# Nginx: y
# SSL: y (도메인 있는 경우)
# systemd: y
# PM2: y (Amazon Linux)
```

## 📊 재설치 시간

| 환경 | 예상 시간 | 주요 요소 |
|------|-----------|-----------|
| 기본 재설치 | 10-15분 | 의존성 설치, 빌드 |
| Nginx + SSL | 15-20분 | 인증서 발급 시간 |
| 데이터 복원 포함 | 12-18분 | 백업 크기에 따라 |

## 🔍 재설치 후 확인사항

### 1. 서비스 상태 확인
```bash
# 프로세스 확인
ps aux | grep node

# 포트 확인
sudo netstat -tlnp | grep :301  # Ubuntu
sudo ss -tlnp | grep :301       # Amazon Linux

# 서비스 응답 확인
curl -I http://localhost:3010
curl -I http://localhost:3011
```

### 2. 웹 브라우저 접속 테스트
- 메인 서비스: `http://서버IP:3010`
- 관리자 시스템: `http://서버IP:3011`
- Nginx 사용 시: `http://도메인` 또는 `http://서버IP`

### 3. 로그 확인
```bash
# 애플리케이션 로그
tail -f /opt/msp-checklist/server.log
tail -f /opt/msp-checklist/admin-server.log

# PM2 로그 (설치한 경우)
pm2 logs

# 시스템 로그
sudo journalctl -u msp-checklist -f
```

## 🛠️ 재설치 실패 시 대처방법

### 1. 스크립트 실행 실패
```bash
# 권한 문제
chmod +x *.sh

# 의존성 문제
sudo apt update  # Ubuntu
sudo dnf update  # Amazon Linux

# 네트워크 문제
curl -I https://github.com
```

### 2. 빌드 실패
```bash
# 메모리 부족
export NODE_OPTIONS="--max-old-space-size=4096"

# 캐시 정리
npm cache clean --force
rm -rf node_modules package-lock.json
```

### 3. 서버 시작 실패
```bash
# 포트 충돌 확인
sudo netstat -tlnp | grep :301

# 환경 변수 확인
cat msp-checklist/.env.local

# 수동 시작
cd /opt/msp-checklist
./restart-server.sh
```

## 📋 백업 및 복원

### 수동 백업
```bash
# 백업 디렉토리 생성
BACKUP_DIR="/tmp/msp-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 데이터베이스 백업
cp /opt/msp-checklist/msp-checklist/msp-assessment.db $BACKUP_DIR/
cp /opt/msp-checklist/msp-checklist/advice-cache.db $BACKUP_DIR/

# 환경 변수 백업
cp /opt/msp-checklist/msp-checklist/.env.local $BACKUP_DIR/
cp /opt/msp-checklist/admin/.env.local $BACKUP_DIR/admin.env.local
```

### 수동 복원
```bash
# 재설치 후 복원
cp $BACKUP_DIR/msp-assessment.db /opt/msp-checklist/msp-checklist/
cp $BACKUP_DIR/advice-cache.db /opt/msp-checklist/msp-checklist/
cp $BACKUP_DIR/.env.local /opt/msp-checklist/msp-checklist/
cp $BACKUP_DIR/admin.env.local /opt/msp-checklist/admin/.env.local
```

## 🔒 보안 고려사항

### 재설치 전
- 중요한 API 키 및 인증 정보 별도 보관
- 사용자 계정 정보 백업
- 접근 로그 보관

### 재설치 후
- 새로운 API 키 설정 권장
- 관리자 계정 재생성
- 방화벽 및 보안 그룹 재확인

## 📞 지원 및 문의

재설치 과정에서 문제가 발생하면:

1. **로그 확인**: 스크립트 실행 로그 및 애플리케이션 로그
2. **시스템 상태**: 메모리, 디스크, 네트워크 상태
3. **문제 해결 가이드**: OS별 트러블슈팅 가이드 참조
4. **GitHub Issues**: 상세한 오류 정보와 함께 이슈 등록

### 관련 문서
- [Ubuntu 문제 해결 가이드](UBUNTU_TROUBLESHOOTING_GUIDE.md)
- [Amazon Linux 문제 해결 가이드](AMAZON_LINUX_2023_TROUBLESHOOTING_GUIDE.md)
- [설치 가이드 요약](INSTALLATION_GUIDES_SUMMARY.md)

---

이 가이드를 통해 안전하고 효율적으로 MSP Checklist 시스템을 재설치할 수 있습니다.