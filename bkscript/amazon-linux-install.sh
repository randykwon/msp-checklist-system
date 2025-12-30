#!/bin/bash

# MSP Checklist 자동 설치 스크립트 (Amazon Linux 2023)
# 이 스크립트는 Amazon Linux 2023에서 MSP Checklist 시스템을 자동으로 설치합니다.

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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# 배너 출력
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist 자동 설치 스크립트                  ║"
echo "║                Amazon Linux 2023                          ║"
echo "║                                                            ║"
echo "║  이 스크립트는 MSP Checklist 시스템을 자동으로 설치하고   ║"
echo "║  설정합니다. 약 10-15분이 소요됩니다.                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# OS 확인
if ! grep -q "Amazon Linux" /etc/os-release; then
    log_error "이 스크립트는 Amazon Linux 2023에서만 실행할 수 있습니다."
    exit 1
fi

# 사용자 확인
read -p "설치를 계속하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "설치가 취소되었습니다."
    exit 0
fi

# 설치 옵션 수집
echo ""
log_info "설치 옵션을 설정합니다..."

# 저장소 URL
read -p "GitHub 저장소 URL을 입력하세요 (기본값: https://github.com/randykwon/msp-checklist-system.git): " REPO_URL
REPO_URL=${REPO_URL:-"https://github.com/randykwon/msp-checklist-system.git"}

# 설치 디렉토리
read -p "설치 디렉토리를 입력하세요 (기본값: /opt/msp-checklist): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-"/opt/msp-checklist"}

# Nginx 설치 여부
read -p "Nginx 리버스 프록시를 설치하시겠습니까? (y/n): " -n 1 -r INSTALL_NGINX
echo

# 도메인 설정 (Nginx 설치 시)
DOMAIN=""
if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    read -p "도메인을 입력하세요 (IP 주소 사용 시 엔터): " DOMAIN
fi

# SSL 설정 (도메인이 있는 경우)
SETUP_SSL=false
if [[ $INSTALL_NGINX =~ ^[Yy]$ ]] && [ ! -z "$DOMAIN" ]; then
    read -p "Let's Encrypt SSL 인증서를 설정하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SETUP_SSL=true
        read -p "SSL 인증서용 이메일을 입력하세요: " SSL_EMAIL
    fi
fi

# systemd 서비스 등록 여부
read -p "시스템 부팅 시 자동 시작하도록 설정하시겠습니까? (y/n): " -n 1 -r SETUP_SYSTEMD
echo

# PM2 설치 여부
read -p "PM2 프로세스 매니저를 설치하시겠습니까? (권장) (y/n): " -n 1 -r INSTALL_PM2
echo

echo ""
log_info "설치 설정 요약:"
echo "- 저장소: $REPO_URL"
echo "- 설치 디렉토리: $INSTALL_DIR"
echo "- Nginx 설치: $([[ $INSTALL_NGINX =~ ^[Yy]$ ]] && echo "예" || echo "아니오")"
echo "- 도메인: ${DOMAIN:-'없음 (IP 접속)'}"
echo "- SSL 설정: $($SETUP_SSL && echo "예" || echo "아니오")"
echo "- 자동 시작: $([[ $SETUP_SYSTEMD =~ ^[Yy]$ ]] && echo "예" || echo "아니오")"
echo "- PM2 설치: $([[ $INSTALL_PM2 =~ ^[Yy]$ ]] && echo "예" || echo "아니오")"
echo ""

read -p "설정이 맞습니까? 계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "설치가 취소되었습니다."
    exit 0
fi

# 시작 시간 기록
START_TIME=$(date +%s)

# 1단계: 시스템 업데이트
log_step "1단계: 시스템 업데이트 및 필수 패키지 설치"
sudo dnf update -y
sudo dnf install -y curl wget git gcc gcc-c++ make
sudo dnf groupinstall -y "Development Tools"
log_success "시스템 업데이트 완료"

# 2단계: Node.js 설치
log_step "2단계: Node.js 20.9.0 설치"
if ! command -v node &> /dev/null || [[ $(node --version) < "v20.9.0" ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
    log_success "Node.js 설치 완료: $(node --version)"
else
    log_info "Node.js가 이미 설치되어 있습니다: $(node --version)"
fi

# npm 설정 최적화
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000

# 3단계: 방화벽 설정
log_step "3단계: 방화벽 설정"
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 기존 규칙 확인 후 추가
if ! sudo firewall-cmd --list-ports | grep -q "3010/tcp"; then
    sudo firewall-cmd --permanent --add-port=3010/tcp
fi

if ! sudo firewall-cmd --list-ports | grep -q "3011/tcp"; then
    sudo firewall-cmd --permanent --add-port=3011/tcp
fi

if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    if ! sudo firewall-cmd --list-services | grep -q "http"; then
        sudo firewall-cmd --permanent --add-service=http
    fi
    if ! sudo firewall-cmd --list-services | grep -q "https"; then
        sudo firewall-cmd --permanent --add-service=https
    fi
fi

sudo firewall-cmd --reload
log_success "방화벽 설정 완료"

# 4단계: 프로젝트 클론
log_step "4단계: 프로젝트 클론 및 설정"
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

cd $INSTALL_DIR
if [ -d ".git" ]; then
    log_info "기존 저장소 업데이트 중..."
    git pull origin main
else
    log_info "새 저장소 클론 중..."
    git clone $REPO_URL .
fi

# 실행 권한 부여
chmod +x *.sh 2>/dev/null || true
chmod +x msp-checklist/*.sh 2>/dev/null || true

log_success "프로젝트 클론 완료"

# 5단계: 의존성 설치
log_step "5단계: 의존성 설치"

# 프로젝트 루트 의존성
log_info "프로젝트 루트 의존성 설치 중..."
npm install

# MSP 체크리스트 의존성
log_info "MSP 체크리스트 의존성 설치 중..."
cd msp-checklist

# 기존 설치 정리
rm -rf node_modules package-lock.json

# 서버 환경에 최적화된 설치
if npm install --no-optional --legacy-peer-deps; then
    log_success "MSP 체크리스트 의존성 설치 완료"
else
    log_warning "의존성 설치 중 경고가 있었지만 계속 진행합니다."
fi

# 관리자 시스템 의존성
log_info "관리자 시스템 의존성 설치 중..."
cd admin
npm install

log_success "의존성 설치 완료"

# 6단계: 환경 변수 설정
log_step "6단계: 환경 변수 설정"
cd $INSTALL_DIR

# MSP 체크리스트 환경 변수
if [ -f "msp-checklist/.env.local.example" ] && [ ! -f "msp-checklist/.env.local" ]; then
    cp msp-checklist/.env.local.example msp-checklist/.env.local
    log_info "MSP 체크리스트 환경 변수 파일 생성됨"
fi

# 관리자 시스템 환경 변수
if [ -f "admin/.env.local.example" ] && [ ! -f "admin/.env.local" ]; then
    cp admin/.env.local.example admin/.env.local
    log_info "관리자 시스템 환경 변수 파일 생성됨"
fi

log_success "환경 변수 설정 완료"

# 7단계: 애플리케이션 빌드
log_step "7단계: 애플리케이션 빌드"
export NODE_OPTIONS="--max-old-space-size=2048"

cd msp-checklist
if npm run build; then
    log_success "MSP 체크리스트 빌드 완료"
else
    log_warning "MSP 체크리스트 빌드 중 경고가 있었습니다."
fi

cd admin
if npm run build; then
    log_success "관리자 시스템 빌드 완료"
else
    log_warning "관리자 시스템 빌드 중 경고가 있었습니다."
fi

cd ..
log_success "애플리케이션 빌드 완료"

# 8단계: PM2 설치 (선택사항)
if [[ $INSTALL_PM2 =~ ^[Yy]$ ]]; then
    log_step "8단계: PM2 프로세스 매니저 설치"
    sudo npm install -g pm2
    log_success "PM2 설치 완료"
fi

# 9단계: Nginx 설정 (선택사항)
if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    log_step "9단계: Nginx 설치 및 설정"
    
    sudo dnf install -y nginx
    
    # Nginx 설정 파일 생성
    SERVER_NAME=${DOMAIN:-"_"}
    
    sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 메인 애플리케이션
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # 관리자 시스템
    location /admin {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

    # 기본 설정 비활성화
    sudo mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup 2>/dev/null || true
    
    # 새 nginx.conf 생성
    sudo tee /etc/nginx/nginx.conf > /dev/null <<EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format  main  '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                      '\$status \$body_bytes_sent "\$http_referer" '
                      '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 2048;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    include /etc/nginx/conf.d/*.conf;
}
EOF
    
    # Nginx 설정 테스트
    if sudo nginx -t; then
        sudo systemctl start nginx
        sudo systemctl enable nginx
        log_success "Nginx 설정 완료"
    else
        log_error "Nginx 설정 오류"
    fi
fi

# 10단계: SSL 설정 (선택사항)
if [ "$SETUP_SSL" = true ]; then
    log_step "10단계: SSL 인증서 설정"
    
    # EPEL 저장소 활성화
    sudo dnf install -y epel-release
    sudo dnf install -y certbot python3-certbot-nginx
    
    if sudo certbot --nginx -d $DOMAIN --email $SSL_EMAIL --agree-tos --non-interactive; then
        log_success "SSL 인증서 설정 완료"
        
        # 자동 갱신 설정
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        log_info "SSL 인증서 자동 갱신 설정 완료"
    else
        log_warning "SSL 인증서 설정 실패 - 수동으로 설정하세요"
    fi
fi

# 11단계: systemd 서비스 설정 (선택사항)
if [[ $SETUP_SYSTEMD =~ ^[Yy]$ ]]; then
    log_step "11단계: systemd 서비스 설정"
    
    sudo tee /etc/systemd/system/msp-checklist.service > /dev/null <<EOF
[Unit]
Description=MSP Checklist Application
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/restart-server.sh
ExecStop=$INSTALL_DIR/stop-server.sh
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=2048

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable msp-checklist
    log_success "systemd 서비스 설정 완료"
fi

# 12단계: 서버 시작
log_step "12단계: 서버 시작"
cd $INSTALL_DIR

if [[ $INSTALL_PM2 =~ ^[Yy]$ ]]; then
    # PM2로 시작
    pm2 start msp-checklist/server.js --name "msp-main"
    pm2 start admin/server.js --name "msp-admin"
    pm2 startup
    pm2 save
    log_info "PM2로 서버 시작됨"
else
    # 일반 스크립트로 시작
    ./restart-server.sh
    log_info "일반 스크립트로 서버 시작됨"
fi

# 서버 시작 대기
sleep 15

# 13단계: 설치 검증
log_step "13단계: 설치 검증"
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

# 설치 완료 시간 계산
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# 설치 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    설치 완료! 🎉                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "MSP Checklist 시스템 설치가 완료되었습니다!"
log_info "설치 시간: ${MINUTES}분 ${SECONDS}초"

echo ""
echo "🌐 서비스 접속 주소:"
if [[ $INSTALL_NGINX =~ ^[Yy]$ ]] && [ ! -z "$DOMAIN" ]; then
    if [ "$SETUP_SSL" = true ]; then
        echo "- 메인 서비스: https://$DOMAIN"
        echo "- 관리자 시스템: https://$DOMAIN/admin"
    else
        echo "- 메인 서비스: http://$DOMAIN"
        echo "- 관리자 시스템: http://$DOMAIN/admin"
    fi
else
    # EC2 퍼블릭 IP 가져오기
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
    if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
        echo "- 메인 서비스: http://$PUBLIC_IP"
        echo "- 관리자 시스템: http://$PUBLIC_IP/admin"
    else
        echo "- 메인 서비스: http://$PUBLIC_IP:3010"
        echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
    fi
fi

echo ""
echo "🔧 유용한 명령어:"
if [[ $INSTALL_PM2 =~ ^[Yy]$ ]]; then
    echo "- 서버 상태 확인: pm2 status"
    echo "- 서버 재시작: pm2 restart all"
    echo "- 로그 확인: pm2 logs"
    echo "- 모니터링: pm2 monit"
else
    echo "- 서버 상태 확인: cd $INSTALL_DIR && ./server-status.sh"
    echo "- 서버 재시작: cd $INSTALL_DIR && ./restart-server.sh"
    echo "- 서버 중지: cd $INSTALL_DIR && ./stop-server.sh"
    echo "- 로그 확인: cd $INSTALL_DIR && tail -f server.log"
fi

if [[ $SETUP_SYSTEMD =~ ^[Yy]$ ]]; then
    echo "- 시스템 서비스 상태: sudo systemctl status msp-checklist"
    echo "- 시스템 서비스 재시작: sudo systemctl restart msp-checklist"
fi

echo ""
echo "📝 다음 단계:"
echo "1. 환경 변수 설정: nano $INSTALL_DIR/msp-checklist/.env.local"
echo "2. AI 기능 사용을 위한 API 키 설정"
echo "3. 관리자 계정 생성: cd $INSTALL_DIR && node create-admin.cjs"
echo "4. AWS 보안 그룹에서 포트 3010, 3011 인바운드 규칙 확인"

echo ""
log_success "설치가 완전히 완료되었습니다! 🚀"