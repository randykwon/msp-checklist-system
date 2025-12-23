# 디스크 공간 부족 해결 가이드

## 🚨 문제 상황

설치 중 다음과 같은 오류가 발생하는 경우:
```bash
[ERROR] 최소 5GB 디스크 공간이 필요합니다. 현재: 4GB
```

## 🔍 현재 상태 확인

### 빠른 확인
```bash
./check-disk-space.sh
```

### 상세 확인
```bash
# 디스크 사용량 확인
df -h

# 디렉토리별 사용량 확인
du -h / 2>/dev/null | sort -hr | head -10
```

## 🛠️ 해결 방법

### 방법 1: 자동 디스크 최적화 (권장)
```bash
# 디스크 공간 최적화 스크립트 실행
chmod +x optimize-disk-space.sh
./optimize-disk-space.sh
```

**최적화 내용:**
- 시스템 캐시 정리 (dnf/apt, npm)
- 임시 파일 정리 (/tmp, /var/tmp)
- 오래된 로그 파일 정리
- 불필요한 패키지 제거
- 저널 로그 정리

### 방법 2: 최소 설치 모드
디스크 공간이 3-5GB인 경우:
```bash
MSP_MINIMAL_INSTALL=true ./amazon-linux-robust-install.sh
```

**최소 설치 특징:**
- 개발 의존성 제외 (--production)
- 선택적 패키지 제외 (--no-optional)
- 약 2-3GB 공간 필요

### 방법 3: 수동 정리

#### 패키지 캐시 정리
```bash
# Amazon Linux
sudo dnf clean all

# Ubuntu
sudo apt clean && sudo apt autoclean
```

#### npm 캐시 정리
```bash
npm cache clean --force
sudo npm cache clean --force
```

#### 임시 파일 정리
```bash
# 7일 이상 된 임시 파일 삭제
sudo find /tmp -type f -atime +7 -delete
sudo find /var/tmp -type f -atime +7 -delete

# 오래된 로그 파일 정리
sudo find /var/log -name "*.log" -type f -mtime +30 -delete
```

#### 저널 로그 정리
```bash
# 1주일 이상 된 로그 삭제
sudo journalctl --vacuum-time=7d

# 100MB 이상 로그 삭제
sudo journalctl --vacuum-size=100M
```

### 방법 4: 스왑 파일 생성
메모리 부족으로 인한 디스크 사용량 증가 방지:
```bash
# 1GB 스왑 파일 생성
sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

## 🚀 AWS EC2 인스턴스 최적화

### EBS 볼륨 확장
```bash
# 1. AWS 콘솔에서 EBS 볼륨 크기 증가
# 2. 파일시스템 확장
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1
```

### 인스턴스 타입 업그레이드
- **t2.micro** (1GB RAM, 8GB 디스크) → **t3.small** (2GB RAM, 20GB 디스크)
- **t3.nano** → **t3.micro** 또는 **t3.small**

## 📊 디스크 공간 요구사항

### 일반 설치
- **최소**: 5GB
- **권장**: 10GB 이상
- **포함**: 모든 개발 의존성, 빌드 도구

### 최소 설치
- **최소**: 3GB
- **권장**: 5GB 이상
- **포함**: 프로덕션 의존성만

### 프로덕션 배포
- **최소**: 2GB
- **권장**: 3GB 이상
- **포함**: 빌드된 파일만

## 🔧 사전 예방

### 설치 전 확인사항
```bash
# 1. 디스크 공간 확인
./check-disk-space.sh

# 2. 필요시 최적화
./optimize-disk-space.sh

# 3. 설치 실행
./amazon-linux-robust-install.sh
```

### 정기적인 유지보수
```bash
# 주간 정리 스크립트 생성
cat > weekly-cleanup.sh << 'EOF'
#!/bin/bash
sudo dnf clean all
npm cache clean --force
sudo journalctl --vacuum-time=7d
sudo find /tmp -type f -atime +7 -delete
EOF

chmod +x weekly-cleanup.sh
```

## 🆘 추가 지원

### 여전히 공간이 부족한 경우
1. **더 큰 인스턴스 사용**: t3.small 이상 권장
2. **외부 빌드**: 다른 서버에서 빌드 후 배포
3. **컨테이너 사용**: Docker 이미지로 배포

### 문의 및 지원
- 디스크 사용량 분석 결과 공유
- 인스턴스 사양 및 사용 목적 명시
- 오류 로그 첨부

---

**업데이트**: 2024년 12월 24일  
**적용 대상**: 모든 Linux 배포판  
**관련 스크립트**: `optimize-disk-space.sh`, `check-disk-space.sh`