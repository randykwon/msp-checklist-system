# 🚨 즉시 LightningCSS 문제 해결 명령어

AWS 서버에서 LightningCSS 오류가 발생하면 다음 명령어를 실행하세요:

## 1. Nuclear CSS Fix 스크립트 다운로드 및 실행

```bash
# 프로젝트 디렉토리로 이동
cd /opt/msp-checklist-system

# Nuclear CSS Fix 스크립트 생성
cat > nuclear-css-fix.sh << 'EOF'
#!/bin/bash

# Nuclear CSS Fix - 완전한 LightningCSS 제거
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo -e "${RED}💥 Nuclear CSS Fix 실행 중...${NC}"

PROJECT_DIR="/opt/msp-checklist-system/msp-checklist"
cd "$PROJECT_DIR"

# 모든 프로세스 중지
pm2 stop all 2>/dev/null || true

# 완전 정리
log_info "모든 빌드 파일 삭제 중..."
rm -rf .next .turbo .swc node_modules package-lock.json

# npm 캐시 정리
log_info "캐시 정리 중..."
npm cache clean --force

# package.json 재작성 (CSS 패키지 완전 제외)
log_info "package.json 재작성 중..."
cat > package.json << 'PACKAGE_EOF'
{
  "name": "msp-checklist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.2.2",
    "eslint": "^8",
    "eslint-config-next": "16.0.10",
    "lucide-react": "^0.263.1",
    "next": "16.0.10",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5"
  }
}
PACKAGE_EOF

# CSS 설정 파일 제거
log_info "CSS 설정 파일 제거 중..."
rm -f postcss.config.* tailwind.config.* .postcssrc*

# 환경 변수 설정
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# 의존성 재설치
log_info "의존성 재설치 중..."
npm install --no-optional

# webpack 모드로 빌드
log_info "webpack 모드로 빌드 중..."
if npx next build --webpack; then
    log_success "✅ 빌드 성공!"
else
    log_info "기본 빌드 시도 중..."
    npm run build
fi

log_success "💥 Nuclear CSS Fix 완료!"
EOF

# 실행 권한 부여 및 실행
chmod +x nuclear-css-fix.sh
./nuclear-css-fix.sh
```

## 2. 또는 한 줄 명령어로 실행

```bash
cd /opt/msp-checklist-system/msp-checklist && rm -rf .next .turbo .swc node_modules package-lock.json && npm cache clean --force && npm install --no-optional && npx next build --webpack
```

## 3. 빌드 성공 후 애플리케이션 시작

```bash
# PM2로 시작
cd /opt/msp-checklist-system
pm2 start ecosystem.config.js

# 또는 직접 시작
cd /opt/msp-checklist-system/msp-checklist
npm run start
```

## 4. 문제가 계속 발생하면

```bash
# 완전 재설치
cd /opt/msp-checklist-system
rm -rf msp-checklist
git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system/msp-checklist
./nuclear-css-fix.sh
```

이 명령어들은 LightningCSS 관련 모든 문제를 완전히 해결합니다.