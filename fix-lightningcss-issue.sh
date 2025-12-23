#!/bin/bash

# LightningCSS 네이티브 바이너리 문제 해결 스크립트
# Tailwind CSS v4와 LightningCSS 호환성 문제를 해결합니다.

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         LightningCSS 네이티브 바이너리 문제 해결          ║"
echo "║                                                            ║"
echo "║  Tailwind CSS v4 LightningCSS 호환성 문제를 해결합니다.   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 현재 디렉토리 확인
if [ ! -d "msp-checklist" ]; then
    log_error "msp-checklist 디렉토리를 찾을 수 없습니다."
    log_info "MSP Checklist 루트 디렉토리에서 실행해주세요."
    exit 1
fi

cd msp-checklist

log_info "현재 시스템 정보 확인 중..."
echo "OS: $(uname -a)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# 방법 1: Tailwind CSS v3로 다운그레이드
fix_method_1() {
    log_info "방법 1: Tailwind CSS v3로 다운그레이드..."
    
    # 기존 Tailwind 관련 패키지 제거
    npm uninstall tailwindcss @tailwindcss/postcss 2>/dev/null || true
    
    # Tailwind CSS v3 설치
    npm install tailwindcss@^3.4.0 postcss autoprefixer --save-dev
    
    # tailwind.config.js 생성
    cat > tailwind.config.js << 'EOF'
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
EOF

    # postcss.config.js 생성
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

    log_success "Tailwind CSS v3 설정 완료"
}

# 방법 2: LightningCSS 재설치
fix_method_2() {
    log_info "방법 2: LightningCSS 네이티브 바이너리 재설치..."
    
    # node_modules 정리
    rm -rf node_modules package-lock.json
    
    # 캐시 정리
    npm cache clean --force
    
    # 네이티브 모듈 재빌드를 위한 도구 설치
    if command -v dnf > /dev/null; then
        sudo dnf install -y python3-devel gcc-c++ make
    elif command -v apt > /dev/null; then
        sudo apt update
        sudo apt install -y python3-dev build-essential
    fi
    
    # 의존성 재설치
    npm install
    
    log_success "LightningCSS 재설치 완료"
}

# 방법 3: CSS 처리 방식 변경
fix_method_3() {
    log_info "방법 3: CSS 처리 방식을 기존 PostCSS로 변경..."
    
    # Tailwind CSS v4 제거
    npm uninstall @tailwindcss/postcss tailwindcss 2>/dev/null || true
    
    # 기존 Tailwind CSS v3 + PostCSS 설치
    npm install tailwindcss@^3.4.0 postcss autoprefixer --save-dev
    
    # postcss.config.mjs를 postcss.config.js로 변경
    if [ -f "postcss.config.mjs" ]; then
        rm postcss.config.mjs
    fi
    
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

    # tailwind.config.js 생성
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

    log_success "PostCSS 기반 CSS 처리로 변경 완료"
}

# 방법 4: 대체 CSS 프레임워크 사용
fix_method_4() {
    log_info "방법 4: 대체 CSS 솔루션 적용..."
    
    # Tailwind 제거
    npm uninstall tailwindcss @tailwindcss/postcss 2>/dev/null || true
    
    # 기본 CSS로 대체
    cat > app/globals.css << 'EOF'
/* 기본 CSS 스타일 */
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #2563eb;
}

.card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.text-center {
  text-align: center;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-4 {
  padding: 1rem;
}
EOF

    log_success "기본 CSS 스타일로 대체 완료"
}

# 메인 실행 함수
main() {
    log_info "LightningCSS 문제 해결을 시작합니다..."
    
    echo "사용 가능한 해결 방법:"
    echo "1. Tailwind CSS v3로 다운그레이드 (권장)"
    echo "2. LightningCSS 네이티브 바이너리 재설치"
    echo "3. PostCSS 기반 CSS 처리로 변경"
    echo "4. 기본 CSS로 대체"
    echo "5. 자동 선택 (권장 방법 순서대로 시도)"
    echo ""
    
    read -p "선택하세요 (1-5): " choice
    
    case $choice in
        1)
            fix_method_1
            ;;
        2)
            fix_method_2
            ;;
        3)
            fix_method_3
            ;;
        4)
            fix_method_4
            ;;
        5)
            log_info "자동 해결 모드: 순서대로 시도합니다..."
            
            # 방법 1 시도
            if fix_method_1 && npm run build; then
                log_success "방법 1로 해결 완료!"
                return 0
            fi
            
            log_warning "방법 1 실패, 방법 3 시도 중..."
            
            # 방법 3 시도
            if fix_method_3 && npm run build; then
                log_success "방법 3으로 해결 완료!"
                return 0
            fi
            
            log_warning "방법 3 실패, 방법 4 시도 중..."
            
            # 방법 4 시도
            fix_method_4
            log_success "방법 4로 해결 완료!"
            ;;
        *)
            log_error "잘못된 선택입니다."
            exit 1
            ;;
    esac
    
    echo ""
    log_info "빌드 테스트 중..."
    
    if npm run build; then
        log_success "빌드 성공! 문제가 해결되었습니다."
    else
        log_error "빌드 실패. 추가 조치가 필요합니다."
        echo ""
        echo "추가 해결 방법:"
        echo "1. Node.js 버전 확인: node --version"
        echo "2. 시스템 업데이트: sudo dnf update -y"
        echo "3. 개발 도구 재설치: sudo dnf groupinstall -y 'Development Tools'"
        return 1
    fi
}

# 스크립트 실행
main "$@"