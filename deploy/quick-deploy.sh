#!/bin/bash

# MSP Checklist 빠른 배포 스크립트
# 새로운 EC2 인스턴스에서 한 번에 모든 설정을 완료합니다.

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

# OS 감지 함수
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "OS를 감지할 수 없습니다."
        exit 1
    fi
}

# 현재 디렉토리 저장
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist 빠른 배포 스크립트                  ║"
echo "║                                                            ║"
echo "║  이 스크립트는 새로운 EC2 인스턴스에서 MSP Checklist      ║"
echo "║  시스템을 완전히 설정하고 배포합니다.                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# OS 감지
detect_os
log_info "감지된 OS: $OS $VER"

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

# 사용자 입력 받기
read -p "GitHub 저장소 URL을 입력하세요 (기본값: 현재 프로젝트 사용): " REPO_URL
if [ -z "$REPO_URL" ]; then
    REPO_URL="current"
    log_info "현재 프로젝트를 사용합니다."
fi

read -p "도메인을 입력하세요 (선택사항, 엔터로 건너뛰기): " DOMAIN
read -p "SSL 인증서를 설정하시겠습니까? (y/n): " -n 1 -r SETUP_SSL
echo

if [[ $SETUP_SSL =~ ^[Yy]$ ]] && [ -z "$DOMAIN" ]; then
    log_error "SSL 설정을 위해서는 도메인이 필요합니다."
    exit 1
fi

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    read -p "Let's Encrypt 알림용 이메일을 입력하세요: " EMAIL
fi

log_info "배포 설정:"
echo "- 저장소: ${REPO_URL}"
echo "- 도메인: ${DOMAIN:-'없음 (IP 접속)'}"
echo "- SSL 설정: ${SETUP_SSL}"
echo "- OS: $OS $VER"
echo ""

read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1단계: 서버 초기 설정
log_info "1단계: 서버 초기 설정 중..."
if [ -f "$SCRIPT_DIR/setup-server.sh" ]; then
    cd "$SCRIPT_DIR"
    chmod +x setup-server.sh
    ./setup-server.sh
else
    log_error "setup-server.sh 파일을 찾을 수 없습니다: $SCRIPT_DIR/setup-server.sh"
    exit 1
fi

# 2단계: 애플리케이션 코드 준비
log_info "2단계: 애플리케이션 코드 준비 중..."
if [ ! -d "/opt/msp-checklist" ]; then
    sudo mkdir -p /opt/msp-checklist
    sudo chown -R $USER:$USER /opt/msp-checklist
fi

cd /opt/msp-checklist

if [ "$REPO_URL" = "current" ]; then
    log_info "현재 프로젝트 복사 중..."
    # 현재 프로젝트를 /opt/msp-checklist로 복사
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' "$PROJECT_ROOT/" ./
else
    if [ -d ".git" ]; then
        log_info "기존 저장소 업데이트 중..."
        git pull origin main
    else
        log_info "새 저장소 클론 중..."
        git clone $REPO_URL .
    fi
fi

# 3단계: 애플리케이션 배포
log_info "3단계: 애플리케이션 배포 중..."
if [ -f "deploy/deploy-app.sh" ]; then
    chmod +x deploy/deploy-app.sh
    ./deploy/deploy-app.sh
else
    log_error "deploy-app.sh 파일을 찾을 수 없습니다."
    exit 1
fi

# 4단계: 관리자 계정 생성
log_info "4단계: 관리자 계정 생성 중..."
if [ -f "create-admin.cjs" ]; then
    log_info "관리자 계정을 생성합니다..."
    node create-admin.cjs
    log_success "관리자 계정 생성 완료"
else
    log_warning "create-admin.cjs 파일을 찾을 수 없습니다. 수동으로 관리자 계정을 생성하세요."
fi

# 5단계: Nginx 설정
log_info "5단계: Nginx 설정 중..."
if [ -f "deploy/nginx.conf" ]; then
    # OS별 Nginx 설정 경로 결정
    if [[ "$OS" == *"Ubuntu"* ]]; then
        NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
        NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
    else
        # Amazon Linux, CentOS, RHEL
        NGINX_SITES_AVAILABLE="/etc/nginx/conf.d"
        NGINX_SITES_ENABLED="/etc/nginx/conf.d"
    fi
    
    sudo cp deploy/nginx.conf $NGINX_SITES_AVAILABLE/msp-checklist.conf
    
    # 도메인 설정
    if [ ! -z "$DOMAIN" ]; then
        sudo sed -i "s/your-domain\.com/$DOMAIN/g" $NGINX_SITES_AVAILABLE/msp-checklist.conf
        sudo sed -i "s/www\.your-domain\.com/www.$DOMAIN/g" $NGINX_SITES_AVAILABLE/msp-checklist.conf
    fi
    
    # Ubuntu의 경우 sites-enabled 링크 생성
    if [[ "$OS" == *"Ubuntu"* ]]; then
        sudo ln -sf $NGINX_SITES_AVAILABLE/msp-checklist.conf $NGINX_SITES_ENABLED/
        sudo rm -f $NGINX_SITES_ENABLED/default
    fi
    
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "Nginx 설정 완료"
    else
        log_error "Nginx 설정 오류"
        exit 1
    fi
else
    log_error "nginx.conf 파일을 찾을 수 없습니다."
    exit 1
fi

# 6단계: SSL 설정 (선택사항)
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    log_info "6단계: SSL 인증서 설정 중..."
    if [ -f "deploy/setup-ssl.sh" ]; then
        chmod +x deploy/setup-ssl.sh
        echo "$EMAIL" | ./deploy/setup-ssl.sh $DOMAIN
    else
        log_error "setup-ssl.sh 파일을 찾을 수 없습니다."
        log_warning "SSL 설정을 건너뜁니다."
    fi
fi

# 7단계: 백업 설정
log_info "7단계: 자동 백업 설정 중..."
if [ -f "deploy/backup-db.sh" ]; then
    chmod +x deploy/backup-db.sh
    
    # crontab에 백업 작업 추가
    CRON_JOB="0 2 * * * /opt/msp-checklist/deploy/backup-db.sh"
    (crontab -l 2>/dev/null | grep -v "backup-db.sh"; echo "$CRON_JOB") | crontab -
    
    log_success "매일 새벽 2시 자동 백업 설정 완료"
fi

# 8단계: 헬스 체크 설정
log_info "8단계: 헬스 체크 설정 중..."
if [ -f "deploy/health-check.sh" ]; then
    chmod +x deploy/health-check.sh
    
    # 5분마다 헬스 체크
    HEALTH_CRON="*/5 * * * * /opt/msp-checklist/deploy/health-check.sh > /dev/null 2>&1"
    (crontab -l 2>/dev/null | grep -v "health-check.sh"; echo "$HEALTH_CRON") | crontab -
    
    log_success "5분마다 헬스 체크 설정 완료"
fi

# 9단계: 방화벽 최종 설정
log_info "9단계: 방화벽 최종 설정 중..."

if [[ "$OS" == *"Ubuntu"* ]]; then
    # Ubuntu - ufw 사용
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    
    # 개발 중에만 직접 포트 접근 허용 (선택사항)
    read -p "개발용 직접 포트 접근을 허용하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ufw allow 3010/tcp
        sudo ufw allow 3011/tcp
        log_info "포트 3010, 3011 직접 접근 허용"
    fi
    
    sudo ufw --force enable
else
    # Amazon Linux, CentOS, RHEL - firewalld 사용
    sudo systemctl start firewalld
    sudo systemctl enable firewalld
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    
    # 개발 중에만 직접 포트 접근 허용 (선택사항)
    read -p "개발용 직접 포트 접근을 허용하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo firewall-cmd --permanent --add-port=3010/tcp
        sudo firewall-cmd --permanent --add-port=3011/tcp
        log_info "포트 3010, 3011 직접 접근 허용"
    fi
    
    sudo firewall-cmd --reload
fi

# 최종 헬스 체크
log_info "최종 헬스 체크 수행 중..."
sleep 10

if [ -f "deploy/health-check.sh" ]; then
    if ./deploy/health-check.sh; then
        log_success "모든 서비스가 정상적으로 실행 중입니다!"
    else
        log_warning "일부 서비스에 문제가 있을 수 있습니다."
        log_info "수동으로 확인해보세요: pm2 status"
    fi
fi

# 배포 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    배포 완료! 🎉                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "MSP Checklist 시스템이 성공적으로 배포되었습니다!"

echo ""
echo "서비스 접속 주소:"
if [ ! -z "$DOMAIN" ]; then
    if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
        echo "- 메인 서비스: https://$DOMAIN"
        echo "- 관리자 시스템: https://$DOMAIN/admin"
    else
        echo "- 메인 서비스: http://$DOMAIN"
        echo "- 관리자 시스템: http://$DOMAIN/admin"
    fi
else
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ || echo "IP를 가져올 수 없음")
    echo "- 메인 서비스: http://$PUBLIC_IP:3010"
    echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
    if [[ "$OS" != *"Ubuntu"* ]] || [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "- Nginx를 통한 접속: http://$PUBLIC_IP"
    fi
fi

echo ""
echo "유용한 명령어:"
echo "- 상태 확인: pm2 status"
echo "- 로그 확인: pm2 logs"
echo "- 모니터링: cd /opt/msp-checklist && ./deploy/monitor.sh"
echo "- 헬스 체크: cd /opt/msp-checklist && ./deploy/health-check.sh"
echo "- 백업: cd /opt/msp-checklist && ./deploy/backup-db.sh"
echo ""

echo "설정된 자동화:"
echo "- 매일 새벽 2시 자동 백업"
echo "- 5분마다 헬스 체크"
echo "- PM2 자동 재시작"
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    echo "- SSL 인증서 자동 갱신"
fi

echo ""
echo "다음 단계:"
echo "1. 웹 브라우저에서 서비스에 접속해보세요"
echo "2. 관리자 계정으로 로그인하세요"
echo "3. 도메인 DNS 설정을 확인하세요 (도메인 사용 시)"
echo "4. 정기적으로 백업을 확인하세요"

echo ""
log_success "배포가 완전히 완료되었습니다! 🚀"