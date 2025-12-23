# Ubuntu LightningCSS 호환성 문제 해결

## 🚨 Ubuntu에서 발생하는 동일한 문제

Amazon Linux 2023에서 발생한 LightningCSS 문제가 Ubuntu 환경에서도 동일하게 발생할 수 있습니다.

### 오류 증상
```bash
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
Error: Turbopack build failed with 1 errors:
./msp-checklist/app/globals.css
```

## ✅ Ubuntu 스크립트 업데이트 완료

### 수정된 Ubuntu 스크립트들
1. **`ubuntu-robust-install.sh`** ✅ - 자동 LightningCSS 문제 해결 추가
2. **`ubuntu-quick-setup.sh`** ✅ - 빌드 실패 시 자동 복구
3. **`ubuntu-reinstall.sh`** ✅ - 재설치 시 호환성 문제 해결
4. **`ubuntu-deploy.sh`** ✅ - 배포 시 빌드 문제 자동 해결

### 자동 해결 로직
모든 Ubuntu 스크립트에 다음 로직이 추가되었습니다:

```bash
# 빌드 시도
if ! npm run build; then
    # 실패 시 Tailwind CSS v3로 다운그레이드
    npm uninstall @tailwindcss/postcss tailwindcss
    npm install tailwindcss@^3.4.0 postcss autoprefixer --save-dev
    
    # 호환 설정 파일 생성
    # 재빌드 시도
fi
```

## 🛠️ Ubuntu 수동 해결 방법

### 방법 1: 공통 해결 스크립트 사용
```bash
# Amazon Linux와 동일한 해결 스크립트 사용 가능
chmod +x fix-lightningcss-issue.sh
./fix-lightningcss-issue.sh
```

### 방법 2: Ubuntu 전용 수동 해결
```bash
cd msp-checklist

# 개발 도구 설치 (필요시)
sudo apt update
sudo apt install -y build-essential python3-dev

# Tailwind CSS v3로 다운그레이드
npm uninstall @tailwindcss/postcss tailwindcss
npm install tailwindcss@^3.4.0 postcss autoprefixer --save-dev

# 설정 파일 생성
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 기존 mjs 파일 제거
rm -f postcss.config.mjs

# 빌드 재시도
npm run build
```

## 📋 Ubuntu 버전별 호환성

### Ubuntu 20.04 LTS
- ✅ Tailwind CSS v3 완전 지원
- ❌ Tailwind CSS v4 LightningCSS 문제
- 🔧 자동 해결: 스크립트에서 v3로 다운그레이드

### Ubuntu 22.04 LTS
- ✅ Tailwind CSS v3 완전 지원
- ❌ Tailwind CSS v4 LightningCSS 문제
- 🔧 자동 해결: 스크립트에서 v3로 다운그레이드

### Ubuntu 24.04 LTS
- ✅ Tailwind CSS v3 완전 지원
- ⚠️ Tailwind CSS v4 부분 지원 (환경에 따라)
- 🔧 자동 해결: 실패 시 v3로 다운그레이드

## 🚀 Ubuntu 설치 가이드

### 권장 설치 순서

1. **시스템 업데이트**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **개발 도구 설치**
   ```bash
   sudo apt install -y build-essential python3-dev curl wget git
   ```

3. **MSP Checklist 설치**
   ```bash
   # 강화된 설치 (자동 문제 해결 포함)
   ./ubuntu-robust-install.sh
   
   # 또는 빠른 설정
   ./ubuntu-quick-setup.sh
   ```

### 디스크 공간 부족 시
```bash
# 디스크 최적화 후 설치
./optimize-disk-space.sh
MSP_MINIMAL_INSTALL=true ./ubuntu-robust-install.sh
```

## 🔍 Ubuntu 전용 문제 해결

### APT 패키지 충돌 해결
```bash
# 손상된 패키지 수정
sudo apt --fix-broken install

# 패키지 캐시 정리
sudo apt clean && sudo apt autoclean

# 불필요한 패키지 제거
sudo apt autoremove -y
```

### Node.js 버전 문제 (Ubuntu)
```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 20.x 설치
sudo apt install -y nodejs

# 버전 확인
node --version  # v20.9.0 이상 확인
```

### 권한 문제 해결 (Ubuntu)
```bash
# npm 글로벌 디렉토리 권한 설정
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## 📊 성능 최적화 (Ubuntu)

### 메모리 최적화
```bash
# 스왑 파일 생성 (Ubuntu)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 빌드 성능 향상
```bash
# 병렬 빌드 설정
export NODE_OPTIONS="--max-old-space-size=2048"
export UV_THREADPOOL_SIZE=4

# npm 캐시 최적화
npm config set cache ~/.npm-cache
npm config set prefer-offline true
```

## 🆘 Ubuntu 지원

### 문제 발생 시 확인사항
1. **Ubuntu 버전**: `lsb_release -a`
2. **Node.js 버전**: `node --version`
3. **빌드 도구**: `gcc --version`
4. **Python 버전**: `python3 --version`

### 로그 수집 (Ubuntu)
```bash
# 시스템 정보
uname -a > ubuntu-system-info.txt
lsb_release -a >> ubuntu-system-info.txt
node --version >> ubuntu-system-info.txt

# 빌드 오류 로그
cd msp-checklist
npm run build 2>&1 | tee ubuntu-build-error.log
```

---

**업데이트**: 2024년 12월 24일  
**적용 대상**: Ubuntu 20.04, 22.04, 24.04 LTS  
**상태**: ✅ 모든 Ubuntu 스크립트 업데이트 완료