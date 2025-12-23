#!/bin/bash

# Amazon Linux 2023 빠른 설정 스크립트
# 기본적인 MSP Checklist 설정을 빠르게 완료합니다.

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
echo "║         MSP Checklist 빠른 설정 스크립트                  ║"
echo "║                Amazon Linux 2023                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    log_warning "MSP Checklist 프로젝트 디렉토리에서 실행해주세요."
    exit 1
fi

# 1. 환경 변수 설정
log_info "1. 환경 변수 설정"
if [ ! -f "msp-checklist/.env.local" ]; then
    cp msp-checklist/.env.local.example msp-checklist/.env.local
    log_success "MSP 체크리스트 환경 변수 파일 생성"
fi

if [ ! -f "admin/.env.local" ]; then
    cp admin/.env.local.example admin/.env.local
    log_success "관리자 시스템 환경 변수 파일 생성"
fi

# 2. 시스템 패키지 업데이트 (선택사항)
read -p "시스템 패키지를 업데이트하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "2. 시스템 패키지 업데이트"
    sudo dnf update -y
    log_success "시스템 패키지 업데이트 완료"
fi

# 3. Node.js 버전 확인
log_info "3. Node.js 버전 확인"
NODE_VERSION=$(node --version)
log_info "현재 Node.js 버전: $NODE_VERSION"

if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
    log_warning "Node.js 20.9.0 이상이 필요합니다."
    read -p "Node.js를 업데이트하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
        log_success "Node.js 업데이트 완료: $(node --version)"
    fi
fi

# 4. npm 설정 최적화
log_info "4. npm 설정 최적화"
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
log_success "npm 설정 최적화 완료"

# 5. 의존성 재설치 (문제가 있는 경우)
read -p "의존성을 다시 설치하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "5. 의존성 재설치"
    
    # MSP 체크리스트
    cd msp-checklist
    rm -rf node_modules package-lock.json
    npm cache clean --force
    npm install --no-optional --legacy-peer-deps
    
    # 관리자 시스템
    cd ../admin
    rm -rf node_modules package-lock.json
    npm cache clean --force
    npm install
    
    cd ..
    log_success "의존성 재설치 완료"
fi

# 6. 빌드
log_info "6. 애플리케이션 빌드"
export NODE_OPTIONS="--max-old-space-size=2048"

cd msp-checklist && npm run build
cd ../admin && npm run build
cd ..
log_success "빌드 완료"

# 7. 방화벽 확인 및 설정
log_info "7. 방화벽 상태 확인"
if sudo firewall-cmd --list-ports | grep -q "3010/tcp"; then
    log_success "포트 3010 열려있음"
else
    sudo firewall-cmd --permanent --add-port=3010/tcp
    log_info "포트 3010 열림"
fi

if sudo firewall-cmd --list-ports | grep -q "3011/tcp"; then
    log_success "포트 3011 열려있음"
else
    sudo firewall-cmd --permanent --add-port=3011/tcp
    log_info "포트 3011 열림"
fi

sudo firewall-cmd --reload
log_success "방화벽 설정 완료"

# 8. 메모리 최적화 (선택사항)
read -p "메모리 최적화를 적용하시겠습니까? (스왑 파일 생성) (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "8. 메모리 최적화"
    
    if [ ! -f /swapfile ]; then
        sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # 영구 설정
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "2GB 스왑 파일 생성 완료"
    else
        log_info "스왑 파일이 이미 존재합니다"
    fi
fi

# 9. 서버 재시작
log_info "9. 서버 재시작"
./restart-server.sh
sleep 10

# 10. 상태 확인
log_info "10. 서버 상태 확인"
if curl -f http://localhost:3010 > /dev/null 2>&1; then
    log_success "메인 서버가 정상적으로 실행 중입니다!"
else
    log_warning "메인 서버 상태를 확인할 수 없습니다."
fi

if curl -f http://localhost:3011 > /dev/null 2>&1; then
    log_success "관리자 서버가 정상적으로 실행 중입니다!"
else
    log_warning "관리자 서버 상태를 확인할 수 없습니다."
fi

echo ""
log_success "빠른 설정이 완료되었습니다!"

# 접속 정보 표시
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
echo ""
echo "접속 주소:"
echo "- 메인 서비스: http://$PUBLIC_IP:3010"
echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
echo ""
echo "유용한 명령어:"
echo "- 로그 확인: tail -f server.log admin-server.log"
echo "- 서버 상태: ./server-status.sh"
echo "- 서버 재시작: ./restart-server.sh"
echo ""
echo "⚠️  AWS 보안 그룹에서 포트 3010, 3011 인바운드 규칙을 확인하세요!"