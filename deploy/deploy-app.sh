#!/bin/bash

# MSP Checklist 애플리케이션 배포 스크립트

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

APP_DIR="/opt/msp-checklist"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 MSP Checklist 애플리케이션 배포를 시작합니다..."

# 애플리케이션 디렉토리 확인
if [ ! -d "$APP_DIR" ]; then
    log_error "애플리케이션 디렉토리가 존재하지 않습니다: $APP_DIR"
    exit 1
fi

cd $APP_DIR

# 백업 생성
log_info "데이터베이스 백업 중..."
mkdir -p $BACKUP_DIR
if [ -f "msp-checklist/msp-assessment.db" ]; then
    cp msp-checklist/msp-assessment.db $BACKUP_DIR/msp-assessment_$DATE.db
    log_success "메인 DB 백업 완료"
fi

if [ -f "msp-checklist/admin/msp-assessment.db" ]; then
    cp msp-checklist/admin/msp-assessment.db $BACKUP_DIR/admin-msp-assessment_$DATE.db
    log_success "관리자 DB 백업 완료"
fi

# Git 업데이트 (선택사항)
if [ -d ".git" ]; then
    log_info "Git 저장소 업데이트 중..."
    git fetch origin
    
    read -p "최신 코드를 pull 하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git pull origin main
        log_success "코드 업데이트 완료"
    fi
fi

# 의존성 설치
log_info "루트 의존성 설치 중..."
npm install

log_info "메인 애플리케이션 의존성 설치 중..."
cd msp-checklist
npm install

log_info "관리자 애플리케이션 의존성 설치 중..."
cd admin
npm install
cd ../..

# 환경 변수 확인
log_info "환경 변수 확인 중..."
if [ ! -f "msp-checklist/.env.local" ]; then
    log_warning ".env.local 파일이 없습니다. 생성하세요."
    if [ -f "msp-checklist/.env.local.example" ]; then
        cp msp-checklist/.env.local.example msp-checklist/.env.local
        log_info "예제 파일에서 .env.local 생성됨. 설정을 확인하세요."
    fi
fi

if [ ! -f "msp-checklist/admin/.env.local" ]; then
    log_warning "admin/.env.local 파일이 없습니다. 생성하세요."
    if [ -f "msp-checklist/admin/.env.local.example" ]; then
        cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local
        log_info "예제 파일에서 admin/.env.local 생성됨. 설정을 확인하세요."
    fi
fi

# 빌드
log_info "메인 애플리케이션 빌드 중..."
cd msp-checklist
npm run build

log_info "관리자 애플리케이션 빌드 중..."
cd admin
npm run build
cd ../..

# PM2 설정
log_info "PM2 설정 중..."
if [ -f "deploy/ecosystem.config.js" ]; then
    cp deploy/ecosystem.config.js ecosystem.config.js
fi

# PM2로 애플리케이션 시작/재시작
if pm2 list | grep -q "msp-main"; then
    log_info "기존 애플리케이션 재시작 중..."
    pm2 restart ecosystem.config.js
else
    log_info "애플리케이션 시작 중..."
    pm2 start ecosystem.config.js
fi

# PM2 설정 저장
pm2 save

# PM2 startup 설정 (처음 한 번만)
if ! systemctl is-enabled pm2-$USER > /dev/null 2>&1; then
    log_info "PM2 자동 시작 설정 중..."
    pm2 startup systemd -u $USER --hp $HOME
fi

# 상태 확인
log_info "애플리케이션 상태 확인 중..."
sleep 3
pm2 status

# 로그 확인
log_info "최근 로그 확인..."
pm2 logs --lines 20 --nostream

log_success "배포가 완료되었습니다! 🎉"

echo ""
echo "유용한 명령어:"
echo "- 상태 확인: pm2 status"
echo "- 로그 확인: pm2 logs"
echo "- 재시작: pm2 restart all"
echo "- 중지: pm2 stop all"
echo ""

# 서비스 URL 표시
log_info "서비스 접속 주소:"
echo "- 메인 서비스: http://localhost:3010"
echo "- 관리자 시스템: http://localhost:3011"
echo ""

# 헬스 체크
log_info "헬스 체크 수행 중..."
sleep 5

if curl -s http://localhost:3010 > /dev/null; then
    log_success "메인 서비스 정상 작동 중"
else
    log_error "메인 서비스 접속 실패"
fi

if curl -s http://localhost:3011 > /dev/null; then
    log_success "관리자 서비스 정상 작동 중"
else
    log_error "관리자 서비스 접속 실패"
fi

echo ""
log_success "배포 완료! 🚀"