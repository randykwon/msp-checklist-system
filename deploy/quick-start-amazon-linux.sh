#!/bin/bash

# MSP Checklist - Amazon Linux 2023 빠른 시작 스크립트
# 최소한의 설정으로 빠르게 개발 환경을 구성합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist - Amazon Linux 2023 빠른 시작       ║"
echo "║                                                            ║"
echo "║  개발 환경을 빠르게 구성하고 애플리케이션을 시작합니다.   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 시스템 확인
log_info "시스템 확인 중..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
        log_success "Amazon Linux 2023 확인됨"
    else
        log_warning "Amazon Linux 2023이 아닙니다: $NAME $VERSION"
    fi
fi

# Node.js 확인 및 설치
log_info "Node.js 확인 중..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js 설치됨: $NODE_VERSION"
    
    # 버전 확인
    if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
        log_warning "Node.js 버전이 20.9.0 미만입니다. 업그레이드를 권장합니다."
    fi
else
    log_info "Node.js 설치 중..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
    log_success "Node.js 설치 완료: $(node --version)"
fi

# 필수 패키지 설치
log_info "필수 패키지 확인 중..."
REQUIRED_PACKAGES=("git" "curl" "gcc-c++" "make" "python3" "sqlite-devel")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! dnf list installed "$package" &> /dev/null; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    log_info "필수 패키지 설치 중: ${MISSING_PACKAGES[*]}"
    sudo dnf install -y "${MISSING_PACKAGES[@]}"
    log_success "필수 패키지 설치 완료"
else
    log_success "모든 필수 패키지가 설치되어 있습니다"
fi

# npm 설정 최적화
log_info "npm 설정 최적화 중..."
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
npm config set fund false
npm config set audit false

# Node.js 메모리 설정
export NODE_OPTIONS="--max-old-space-size=2048"

# 프로젝트 디렉토리 확인
if [ ! -f "package.json" ]; then
    log_error "package.json 파일을 찾을 수 없습니다. 프로젝트 루트 디렉토리에서 실행하세요."
    exit 1
fi

# 의존성 설치
log_info "프로젝트 의존성 설치 중..."

# 루트 프로젝트
if npm install; then
    log_success "루트 프로젝트 의존성 설치 완료"
else
    log_error "루트 프로젝트 의존성 설치 실패"
    exit 1
fi

# 메인 앱
log_info "메인 앱 의존성 설치 중..."
cd msp-checklist

# 기존 설치 정리
rm -rf node_modules package-lock.json 2>/dev/null || true

if npm install --no-optional --legacy-peer-deps; then
    log_success "메인 앱 의존성 설치 완료"
else
    log_error "메인 앱 의존성 설치 실패"
    exit 1
fi

# 관리자 앱
log_info "관리자 앱 의존성 설치 중..."
cd admin

# 기존 설치 정리
rm -rf node_modules package-lock.json 2>/dev/null || true

if npm install --no-optional --legacy-peer-deps; then
    log_success "관리자 앱 의존성 설치 완료"
else
    log_error "관리자 앱 의존성 설치 실패"
    exit 1
fi

cd ../..

# 환경 변수 설정
log_info "환경 변수 설정 중..."

# 메인 앱
if [ ! -f "msp-checklist/.env.local" ]; then
    if [ -f "msp-checklist/.env.local.example" ]; then
        cp msp-checklist/.env.local.example msp-checklist/.env.local
        log_success "메인 앱 환경 변수 파일 생성"
    fi
fi

# 관리자 앱
if [ ! -f "msp-checklist/admin/.env.local" ]; then
    if [ -f "msp-checklist/admin/.env.local.example" ]; then
        cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local
        log_success "관리자 앱 환경 변수 파일 생성"
    fi
fi

# 빌드 (프로덕션용)
read -p "프로덕션 빌드를 수행하시겠습니까? (y/n): " -n 1 -r BUILD_PROD
echo

if [[ $BUILD_PROD =~ ^[Yy]$ ]]; then
    log_info "애플리케이션 빌드 중..."
    
    cd msp-checklist
    if npm run build; then
        log_success "메인 앱 빌드 완료"
    else
        log_error "메인 앱 빌드 실패"
        exit 1
    fi
    
    cd admin
    if npm run build; then
        log_success "관리자 앱 빌드 완료"
    else
        log_error "관리자 앱 빌드 실패"
        exit 1
    fi
    
    cd ../..
fi

# 포트 확인
log_info "포트 사용 확인 중..."
if netstat -tlnp 2>/dev/null | grep -q ":3010"; then
    log_warning "포트 3010이 이미 사용 중입니다."
    netstat -tlnp | grep ":3010"
fi

if netstat -tlnp 2>/dev/null | grep -q ":3011"; then
    log_warning "포트 3011이 이미 사용 중입니다."
    netstat -tlnp | grep ":3011"
fi

# 방화벽 확인 (EC2 환경)
log_info "방화벽 상태 확인 중..."
if systemctl is-active --quiet firewalld; then
    if ! sudo firewall-cmd --list-ports | grep -q "3010/tcp"; then
        log_warning "방화벽에서 포트 3010이 허용되지 않았습니다."
        read -p "포트 3010, 3011을 방화벽에서 허용하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo firewall-cmd --permanent --add-port=3010/tcp
            sudo firewall-cmd --permanent --add-port=3011/tcp
            sudo firewall-cmd --reload
            log_success "방화벽 포트 허용 완료"
        fi
    fi
fi

# 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    설정 완료! 🎉                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "Amazon Linux 2023에서 MSP Checklist 설정이 완료되었습니다!"

echo ""
echo "다음 단계:"
echo ""

if [[ $BUILD_PROD =~ ^[Yy]$ ]]; then
    echo "프로덕션 모드로 시작:"
    echo "1. 메인 앱: cd msp-checklist && npm start"
    echo "2. 관리자 앱: cd msp-checklist/admin && npm start"
    echo ""
    echo "또는 PM2로 시작 (권장):"
    echo "1. PM2 설치: sudo npm install -g pm2"
    echo "2. 앱 시작: pm2 start ecosystem.config.js"
else
    echo "개발 모드로 시작:"
    echo "1. 메인 앱: cd msp-checklist && npm run dev"
    echo "2. 관리자 앱: cd msp-checklist/admin && npm run dev"
fi

echo ""
echo "접속 주소:"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "IP 확인 실패")
echo "- 메인 서비스: http://$PUBLIC_IP:3010"
echo "- 관리자 시스템: http://$PUBLIC_IP:3011"

echo ""
echo "유용한 명령어:"
echo "- 상태 확인: ./deploy/health-check.sh"
echo "- 문제 해결: ./deploy/fix-amazon-linux-issues.sh"
echo "- 전체 배포: ./deploy/amazon-linux-2023-deploy.sh"

echo ""
log_success "빠른 시작 설정이 완료되었습니다! 🚀"