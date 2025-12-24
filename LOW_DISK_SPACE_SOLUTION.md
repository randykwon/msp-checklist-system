# 디스크 공간 부족 문제 해결 가이드

## 🚨 문제 상황

```
[ERROR] 최소 5GB 디스크 공간이 필요합니다. 현재: 4GB
```

MSP Checklist 설치 시 디스크 공간이 부족한 경우의 완전한 해결 방법을 제공합니다.

## 🔍 즉시 해결 방법

### 1. **디스크 공간 최적화 (권장)**
```bash
# 디스크 공간 최적화 스크립트 실행
sudo ./optimize-disk-space.sh
```

### 2. **최소 설치 모드**
```bash
# 2GB 디스크 공간으로 설치 가능
sudo ./amazon-linux-2023-minimal-installer.sh
```

### 3. **환경 변수로 최소 설치**
```bash
# 기존 통합 설치 스크립트를 최소 모드로 실행
MSP_MINIMAL_INSTALL=true sudo ./amazon-linux-2023-unified-installer.sh
```

## 📊 디스크 공간 요구사항

| 설치 모드 | 필요 공간 | 특징 |
|-----------|-----------|------|
| **일반 설치** | 3-5GB | 모든 기능 포함, 개발 의존성 포함 |
| **최소 설치** | 2GB | 프로덕션 최적화, 개발 의존성 제외 |
| **초소형 설치** | 1.5GB | 핵심 기능만, Admin 시스템 선택적 |

## 🧹 디스크 공간 최적화 스크립트

### `optimize-disk-space.sh` 기능

1. **패키지 캐시 정리**
   - APT/DNF 캐시 완전 정리
   - 불필요한 패키지 자동 제거

2. **시스템 로그 정리**
   - journald 로그 7일로 제한
   - 큰 로그 파일 truncate

3. **임시 파일 정리**
   - /tmp, /var/tmp 정리
   - npm, Node.js 캐시 정리

4. **Docker 정리** (설치된 경우)
   - 사용하지 않는 이미지/컨테이너 제거

5. **커널 파일 정리**
   - 오래된 커널 패키지 제거

6. **스왑 파일 최적화**
   - 1GB 스왑 파일 자동 생성

### 예상 확보 공간

- **패키지 캐시**: 200MB - 1GB
- **시스템 로그**: 100MB - 500MB  
- **임시 파일**: 50MB - 300MB
- **Docker**: 500MB - 2GB (설치된 경우)
- **오래된 커널**: 100MB - 500MB

**총 확보 가능 공간: 1GB - 4GB**

## 🚀 최소 설치 모드 특징

### `amazon-linux-2023-minimal-installer.sh`

#### ✅ 포함되는 기능
- MSP Checklist 메인 시스템
- Admin 시스템 (기본 기능)
- 순수 CSS (CSS 프레임워크 제거)
- 프로덕션 의존성만 설치
- 최적화된 빌드 설정

#### ❌ 제외되는 기능
- 개발 의존성 (devDependencies)
- CSS 프레임워크 (Tailwind CSS, LightningCSS)
- 불필요한 시스템 패키지
- 빌드 후 개발 도구 자동 제거

#### 🔧 최적화 사항
- Node.js 메모리 제한: 1GB
- 재시도 횟수 감소: 2회
- 타임아웃 단축: 3분
- 프로덕션 전용 빌드

## 📋 단계별 해결 과정

### 1단계: 현재 상태 확인
```bash
# 디스크 사용량 확인
df -h /

# 가장 큰 디렉토리 확인
sudo du -h / 2>/dev/null | sort -hr | head -10
```

### 2단계: 디스크 공간 최적화
```bash
# 최적화 스크립트 실행
sudo ./optimize-disk-space.sh

# 결과 확인
df -h /
```

### 3단계: 설치 모드 선택

#### A. 충분한 공간 확보된 경우 (3GB+)
```bash
sudo ./amazon-linux-2023-unified-installer.sh
```

#### B. 제한적 공간인 경우 (2-3GB)
```bash
MSP_MINIMAL_INSTALL=true sudo ./amazon-linux-2023-unified-installer.sh
```

#### C. 매우 제한적인 경우 (2GB 미만)
```bash
sudo ./amazon-linux-2023-minimal-installer.sh
```

## 🔧 수동 최적화 방법

### 1. 패키지 캐시 정리
```bash
# Amazon Linux 2023
sudo dnf clean all
sudo dnf autoremove -y

# Ubuntu (참고용)
sudo apt clean
sudo apt autoremove -y
```

### 2. 로그 파일 정리
```bash
# journald 로그 정리
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=100M

# 오래된 로그 파일 삭제
sudo find /var/log -name "*.log.*" -mtime +7 -delete
sudo find /var/log -name "*.gz" -mtime +7 -delete
```

### 3. 임시 파일 정리
```bash
# 임시 디렉토리 정리
sudo find /tmp -type f -mtime +7 -delete
sudo find /var/tmp -type f -mtime +7 -delete

# npm 캐시 정리
npm cache clean --force
```

### 4. 스왑 파일 생성
```bash
# 1GB 스왑 파일 생성
sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

## 🏗️ AWS 인프라 해결 방법

### 1. EBS 볼륨 확장
```bash
# 현재 볼륨 확인
lsblk

# 파일시스템 확장 (예: /dev/xvda1)
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1
```

### 2. 인스턴스 타입 업그레이드
- **t3.nano** (1GB 디스크) → **t3.micro** (8GB 디스크)
- **t3.micro** → **t3.small** (더 많은 메모리와 디스크)

### 3. 추가 EBS 볼륨 연결
```bash
# 새 볼륨을 /opt에 마운트
sudo mkfs.ext4 /dev/xvdf
sudo mkdir -p /opt
sudo mount /dev/xvdf /opt

# 영구 마운트 설정
echo '/dev/xvdf /opt ext4 defaults 0 0' | sudo tee -a /etc/fstab
```

## 🚨 응급 해결 방법

### 1. 외부 빌드 방식
```bash
# 다른 서버에서 빌드 후 파일 전송
# 1. 큰 서버에서 MSP Checklist 빌드
# 2. .next 디렉토리만 압축
# 3. 작은 서버로 전송 후 압축 해제
```

### 2. 단계별 설치
```bash
# 1단계: 메인 시스템만 설치
cd /opt/msp-checklist-system/msp-checklist
npm install --production
npm run build

# 2단계: Admin 시스템은 나중에 설치 (선택적)
cd admin
npm install --production
npm run build
```

### 3. 컨테이너 방식
```bash
# Docker를 사용한 최소 설치
# (Docker가 설치된 경우)
docker run -d -p 3010:3010 -p 3011:3011 msp-checklist:minimal
```

## ✅ 설치 성공 확인

### 1. 디스크 사용량 확인
```bash
df -h /
du -sh /opt/msp-checklist-system
```

### 2. 서비스 상태 확인
```bash
cd /opt/msp-checklist-system
./server-status.sh
```

### 3. 웹 접속 확인
```bash
curl http://localhost:3010
curl http://localhost:3011
```

## 📝 예방 방법

### 1. 정기적인 정리
```bash
# 주간 정리 스크립트 생성
cat > /etc/cron.weekly/cleanup-disk << 'EOF'
#!/bin/bash
dnf clean all
journalctl --vacuum-time=7d
find /tmp -type f -mtime +7 -delete
npm cache clean --force
EOF

chmod +x /etc/cron.weekly/cleanup-disk
```

### 2. 모니터링 설정
```bash
# 디스크 사용량 모니터링
cat > /usr/local/bin/disk-monitor << 'EOF'
#!/bin/bash
USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    echo "Warning: Disk usage is ${USAGE}%"
fi
EOF

chmod +x /usr/local/bin/disk-monitor
```

### 3. 로그 로테이션 설정
```bash
# 로그 로테이션 설정
cat > /etc/logrotate.d/msp-checklist << 'EOF'
/opt/msp-checklist-system/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF
```

## 🎯 결론

디스크 공간 부족 문제는 다음 순서로 해결하세요:

1. **`./optimize-disk-space.sh`** 실행으로 공간 확보
2. **`./amazon-linux-2023-minimal-installer.sh`** 로 최소 설치
3. 필요시 **AWS 인프라 확장** 고려

이 방법들을 통해 **2GB 디스크 공간으로도 MSP Checklist를 성공적으로 설치**할 수 있습니다! 🚀