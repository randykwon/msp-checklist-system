#!/bin/bash

# 즉시 LightningCSS 문제 해결 스크립트
# 현재 진행 중인 설치에서 발생한 LightningCSS 문제를 즉시 해결합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            즉시 LightningCSS 문제 해결                    ║"
echo "║                                                            ║"
echo "║  현재 설치 중인 MSP Checklist의 빌드 문제를 해결합니다.   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# MSP Checklist 디렉토리로 이동
if [ -d "/opt/msp-checklist/msp-checklist" ]; then
    cd /opt/msp-checklist/msp-checklist
    log_info "MSP Checklist 디렉토리로 이동: $(pwd)"
elif [ -d "msp-checklist" ]; then
    cd msp-checklist
    log_info "MSP Checklist 디렉토리로 이동: $(pwd)"
else
    log_warning "MSP Checklist 디렉토리를 찾을 수 없습니다."
    echo "현재 위치에서 실행합니다: $(pwd)"
fi

log_info "현재 Tailwind CSS 상태 확인 중..."
if npm ls @tailwindcss/postcss 2>/dev/null | grep -q "@tailwindcss/postcss"; then
    log_warning "Tailwind CSS v4 (@tailwindcss/postcss) 감지됨"
    NEEDS_FIX=true
else
    log_info "Tailwind CSS 상태 확인 중..."
    NEEDS_FIX=false
fi

if [ "$NEEDS_FIX" = true ] || npm ls tailwindcss 2>/dev/null | grep -q "tailwindcss@4"; then
    log_info "LightningCSS 호환성 문제 해결 시작..."
    
    # 1. 현재 빌드 프로세스 중지 (있다면)
    log_info "기존 빌드 프로세스 정리 중..."
    pkill -f "next build" 2>/dev/null || true
    pkill -f "npm run build" 2>/dev/null || true
    
    # 2. .next 디렉토리 정리
    log_info "빌드 캐시 정리 중..."
    rm -rf .next
    
    # 3. Tailwind CSS v4 관련 패키지 제거
    log_info "Tailwind CSS v4 패키지 제거 중..."
    npm uninstall @tailwindcss/postcss @tailwindcss/node tailwindcss 2>/dev/null || true
    
    # 4. Tailwind CSS v3 설치
    log_info "Tailwind CSS v3 설치 중..."
    npm install tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0 --save-dev
    
    # 5. postcss.config.js 생성 (v3 호환)
    log_info "PostCSS 설정 파일 생성 중..."
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
    
    # 6. tailwind.config.js 생성
    log_info "Tailwind 설정 파일 생성 중..."
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
EOF
    
    # 7. 기존 v4 설정 파일 제거
    log_info "기존 v4 설정 파일 정리 중..."
    rm -f postcss.config.mjs
    rm -f postcss.config.ts
    
    # 8. package.json에서 v4 관련 스크립트 확인
    if grep -q "@tailwindcss" package.json 2>/dev/null; then
        log_info "package.json 정리 중..."
        # 백업 생성
        cp package.json package.json.backup
    fi
    
    log_success "Tailwind CSS v3로 다운그레이드 완료!"
    
    # 9. 테스트 빌드
    log_info "테스트 빌드 실행 중..."
    if npm run build; then
        log_success "빌드 성공! LightningCSS 문제가 해결되었습니다."
        echo ""
        echo "이제 설치 스크립트가 정상적으로 계속 진행됩니다."
        echo "설치 스크립트를 다시 실행하거나 현재 진행 중인 설치를 기다리세요."
    else
        log_warning "빌드가 여전히 실패합니다. 추가 조치가 필요합니다."
        echo ""
        echo "추가 해결 방법:"
        echo "1. npm 캐시 정리: npm cache clean --force"
        echo "2. node_modules 재설치: rm -rf node_modules && npm install"
        echo "3. 기본 CSS로 대체: ./fix-lightningcss-issue.sh 실행"
    fi
    
else
    log_info "Tailwind CSS v4가 감지되지 않았습니다."
    log_info "다른 빌드 문제일 수 있습니다. 일반적인 해결 방법을 시도합니다..."
    
    # 일반적인 빌드 문제 해결
    log_info "빌드 캐시 정리 중..."
    rm -rf .next
    
    log_info "npm 캐시 정리 중..."
    npm cache clean --force
    
    log_info "테스트 빌드 실행 중..."
    if npm run build; then
        log_success "빌드 성공!"
    else
        log_warning "빌드 실패. 수동 확인이 필요합니다."
        echo ""
        echo "오류 로그를 확인하고 다음을 시도해보세요:"
        echo "1. ./fix-lightningcss-issue.sh"
        echo "2. node_modules 재설치"
        echo "3. 시스템 재부팅"
    fi
fi

echo ""
log_info "스크립트 완료. 설치를 계속 진행하세요."