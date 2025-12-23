# LightningCSS 호환성 문제 해결 가이드

## 🚨 문제 상황

### 오류 메시지
```bash
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
Error: Turbopack build failed with 1 errors:
./msp-checklist/app/globals.css
```

### 원인 분석
1. **Tailwind CSS v4**: 새로운 LightningCSS 엔진 사용
2. **네이티브 바이너리**: 시스템별 컴파일된 바이너리 필요
3. **호환성 문제**: Amazon Linux 2023/Ubuntu에서 바이너리 누락 또는 호환성 문제

## ✅ 해결 방법

### 방법 1: 자동 해결 스크립트 (권장)
```bash
chmod +x fix-lightningcss-issue.sh
./fix-lightningcss-issue.sh
```

### 방법 2: 수동 해결 - Tailwind CSS v3 다운그레이드
```bash
cd msp-checklist

# Tailwind CSS v4 제거
npm uninstall @tailwindcss/postcss tailwindcss

# Tailwind CSS v3 설치
npm install tailwindcss@^3.4.0 postcss autoprefixer --save-dev

# 설정 파일 생성
npx tailwindcss init -p

# 빌드 재시도
npm run build
```

### 방법 3: 기본 CSS로 대체
```bash
cd msp-checklist

# Tailwind 제거
npm uninstall tailwindcss @tailwindcss/postcss

# globals.css를 기본 CSS로 교체
# (스크립트에서 자동 생성됨)
```

## 🔧 설정 파일 수정

### postcss.config.js (Tailwind v3용)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 🚀 자동 해결 기능

### 강화된 설치 스크립트
설치 스크립트가 자동으로 다음을 수행합니다:

1. **빌드 실패 감지**
2. **Tailwind CSS v4 → v3 다운그레이드**
3. **호환 가능한 설정 파일 생성**
4. **재빌드 시도**

### 설치 스크립트 업데이트
```bash
# 업데이트된 스크립트 사용
./amazon-linux-robust-install.sh
```

## 📊 호환성 매트릭스

| 환경 | Tailwind v4 | Tailwind v3 | 기본 CSS |
|------|-------------|-------------|----------|
| Amazon Linux 2023 | ❌ | ✅ | ✅ |
| Ubuntu 20.04+ | ❌ | ✅ | ✅ |
| CentOS/RHEL | ❌ | ✅ | ✅ |
| Alpine Linux | ❌ | ✅ | ✅ |

## 🔍 문제 진단

### LightningCSS 바이너리 확인
```bash
cd msp-checklist
find node_modules -name "*lightningcss*" -type f
ls -la node_modules/lightningcss/
```

### 시스템 호환성 확인
```bash
# 아키텍처 확인
uname -m

# glibc 버전 확인
ldd --version

# Node.js 네이티브 모듈 지원 확인
node -p "process.arch"
node -p "process.platform"
```

## 🛠️ 고급 해결 방법

### 네이티브 모듈 재빌드
```bash
cd msp-checklist

# 개발 도구 설치
sudo dnf install -y python3-devel gcc-c++ make

# 네이티브 모듈 재빌드
npm rebuild

# 또는 완전 재설치
rm -rf node_modules package-lock.json
npm install
```

### Docker 환경에서 해결
```dockerfile
# Dockerfile에서 네이티브 의존성 설치
RUN dnf install -y python3-devel gcc-c++ make
RUN npm install --build-from-source
```

## 📋 예방 조치

### 1. 안정적인 의존성 사용
```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### 2. 플랫폼별 설치 스크립트
- Amazon Linux 2023: Tailwind v3 강제 사용
- Ubuntu: 호환성 확인 후 설치
- 기타 환경: 기본 CSS 대체

### 3. CI/CD 파이프라인 설정
```yaml
# GitHub Actions 예시
- name: Install dependencies with compatibility check
  run: |
    if npm install; then
      echo "Standard install successful"
    else
      echo "Falling back to compatible versions"
      npm install tailwindcss@^3.4.0 postcss autoprefixer
    fi
```

## 🆘 추가 지원

### 문제 지속 시
1. **시스템 정보 수집**:
   ```bash
   uname -a > system-info.txt
   node --version >> system-info.txt
   npm --version >> system-info.txt
   ```

2. **오류 로그 수집**:
   ```bash
   npm run build 2>&1 | tee build-error.log
   ```

3. **의존성 트리 확인**:
   ```bash
   npm ls lightningcss
   npm ls @tailwindcss/postcss
   ```

---

**업데이트**: 2024년 12월 24일  
**적용 대상**: Tailwind CSS v4 LightningCSS 호환성 문제  
**해결 도구**: `fix-lightningcss-issue.sh`, 업데이트된 설치 스크립트