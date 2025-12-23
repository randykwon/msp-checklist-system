#!/bin/bash

# Ubuntu 빠른 설정 스크립트
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
echo "║                Ubuntu 22.04 LTS                           ║"
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

# 2. 의존성 재설치 (문제가 있는 경우)
read -p "의존성을 다시 설치하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "2. 의존성 재설치"
    
    # MSP 체크리스트
    cd msp-checklist
    rm -rf node_modules package-lock.json
    npm install --no-optional --legacy-peer-deps
    
    # 관리자 시스템
    cd admin
    rm -rf node_modules package-lock.json
    npm install
    
    cd ..
    log_success "의존성 재설치 완료"
fi

# 3. 빌드
log_info "3. 애플리케이션 빌드"
cd msp-checklist && npm run build
cd admin && npm run build
cd ..
log_success "빌드 완료"

# 4. 방화벽 확인
log_info "4. 방화벽 상태 확인"
if sudo ufw status | grep -q "3010/tcp"; then
    log_success "포트 3010 열려있음"
else
    sudo ufw allow 3010/tcp
    log_info "포트 3010 열림"
fi

if sudo ufw status | grep -q "3011/tcp"; then
    log_success "포트 3011 열려있음"
else
    sudo ufw allow 3011/tcp
    log_info "포트 3011 열림"
fi

# 5. 서버 재시작
log_info "5. 서버 재시작"
./restart-server.sh
sleep 5

# 6. 상태 확인
log_info "6. 서버 상태 확인"
if ./server-status.sh; then
    log_success "서버가 정상적으로 실행 중입니다!"
else
    log_warning "서버 상태를 확인할 수 없습니다."
fi

echo ""
log_success "빠른 설정이 완료되었습니다!"

# 접속 정보 표시
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "YOUR_SERVER_IP")
echo ""
echo "접속 주소:"
echo "- 메인 서비스: http://$PUBLIC_IP:3010"
echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
echo ""
echo "로그 확인: tail -f server.log admin-server.log"