#!/bin/bash

# MSP Checklist 서버 초기 설정 스크립트
# Ubuntu 22.04 LTS 기준

set -e

echo "🚀 MSP Checklist 서버 초기 설정을 시작합니다..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
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

# 루트 권한 확인
if [[ $EUID -eq 0 ]]; then
   log_error "이 스크립트는 root 권한으로 실행하지 마세요. sudo 권한이 있는 일반 사용자로 실행하세요."
   exit 1
fi

# sudo 권한 확인
if ! sudo -n true 2>/dev/null; then
    log_error "sudo 권한이 필요합니다."
    exit 1
fi

log_info "시스템 업데이트 중..."
sudo apt update && sudo apt upgrade -y

log_info "필수 패키지 설치 중..."
sudo apt install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    sqlite3 \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

log_info "Node.js 18 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Node.js 버전 확인
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "Node.js $NODE_VERSION, npm $NPM_VERSION 설치 완료"

log_info "PM2 설치 중..."
sudo npm install -g pm2

log_info "방화벽 설정 중..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3010/tcp
sudo ufw allow 3011/tcp
sudo ufw --force enable

log_info "애플리케이션 디렉토리 생성 중..."
sudo mkdir -p /opt/msp-checklist
sudo chown -R $USER:$USER /opt/msp-checklist

log_info "로그 디렉토리 생성 중..."
mkdir -p /opt/msp-checklist/logs
mkdir -p /opt/msp-checklist/backups

log_info "Git 설정 확인 중..."
if ! git config --global user.name > /dev/null 2>&1; then
    read -p "Git 사용자 이름을 입력하세요: " git_name
    git config --global user.name "$git_name"
fi

if ! git config --global user.email > /dev/null 2>&1; then
    read -p "Git 이메일을 입력하세요: " git_email
    git config --global user.email "$git_email"
fi

log_info "시스템 서비스 활성화 중..."
sudo systemctl enable nginx
sudo systemctl start nginx

log_info "Nginx 기본 설정 제거 중..."
sudo rm -f /etc/nginx/sites-enabled/default

log_success "서버 초기 설정이 완료되었습니다!"

echo ""
echo "다음 단계:"
echo "1. 애플리케이션 코드를 /opt/msp-checklist에 클론하세요"
echo "2. deploy-app.sh 스크립트를 실행하세요"
echo "3. 도메인을 설정하고 SSL 인증서를 발급하세요"
echo ""

log_info "시스템 정보:"
echo "- OS: $(lsb_release -d | cut -f2)"
echo "- Node.js: $(node --version)"
echo "- npm: $(npm --version)"
echo "- PM2: $(pm2 --version)"
echo "- Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
echo ""

log_success "설정 완료! 🎉"