#!/bin/bash

# MSP Checklist 완전 재설치 스크립트 (Ubuntu 22.04 LTS)
# 기존 설치를 완전히 제거하고 새로 설치합니다.

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
echo -e "${RED}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ⚠️  경고  ⚠️                           ║"
echo "║                                                            ║"
echo "║  이 스크립트는 기존 MSP Checklist 설치를 완전히 제거하고  ║"
echo "║  새로 설치합니다. 모든 데이터가 삭제됩니다!               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# OS 확인
if ! grep -q "Ubuntu" /etc/os-release; then
    log_error "이 스크립트는 Ubuntu 22.04 LTS에서만 실행할 수 있습니다."
    exit 1
fi

# 사용자 확인
read -p "정말로 기존 설치를 제거하고 재설치하시겠습니까? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "재설치가 취소되었습니다."
    exit 0
fi

# 백업 여부 확인
read -p "데이터베이스를 백업하시겠습니까? (y/n): " -n 1 -r BACKUP_DB
echo

# 설치 옵션 수집
echo ""
log_info "재설치 옵션을 설정합니다..."

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

echo ""
log_info "재설치 설정 요약:"
echo "- 저장소: $REPO_URL"
echo "- 설치 디렉토리: $INSTALL_DIR"
echo "- 데이터 백업: $([[ $BACKUP_DB =~ ^[Yy]$ ]] && echo "예" || echo "아니오")"
echo "- Nginx 설치: $([[ $INSTALL_NGINX =~ ^[Yy]$ ]] && echo "예" || echo "아니오")"
echo "- 도메인: ${DOMAIN:-'없음 (IP 접속)'}"
echo "- SSL 설정: $($SETUP_SSL && echo "예" || echo "아니오")"
echo "- 자동 시작: $([[ $SETUP_SYSTEMD =~ ^[Yy]$ ]] && echo "예" || echo "아니오")"
echo ""

read -p "설정이 맞습니까? 계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "재설치가 취소되었습니다."
    exit 0
fi

# 시작 시간 기록
START_TIME=$(date +%s)

# ========== 제거 단계 ==========

log_step "제거 1단계: 데이터베이스 백업 (선택사항)"
if [[ $BACKUP_DB =~ ^[Yy]$ ]]; then
    BACKUP_DIR="/tmp/msp-checklist-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    # 데이터베이스 파일 백업
    if [ -f "$INSTALL_DIR/msp-checklist/msp-assessment.db" ]; then
        cp "$INSTALL_DIR/msp-checklist/msp-assessment.db" "$BACKUP_DIR/"
        log_success "메인 데이터베이스 백업됨"
    fi
    
    if [ -f "$INSTALL_DIR/msp-checklist/advice-cache.db" ]; then
        cp "$INSTALL_DIR/msp-checklist/advice-cache.db" "$BACKUP_DIR/"
        log_success "조언 캐시 데이터베이스 백업됨"
    fi
    
    # 환경 변수 백업
    if [ -f "$INSTALL_DIR/msp-checklist/.env.local" ]; then
        cp "$INSTALL_DIR/msp-checklist/.env.local" "$BACKUP_DIR/"
        log_success "환경 변수 백업됨"
    fi
    
    if [ -f "$INSTALL_DIR/admin/.env.local" ]; then
        cp "$INSTALL_DIR/admin/.env.local" "$BACKUP_DIR/admin.env.local"
        log_success "관리자 환경 변수 백업됨"
    fi
    
    log_success "백업 완료: $BACKUP_DIR"
fi

log_step "제거 2단계: 실행 중인 프로세스 중지"
# PM2 프로세스 중지
pm2 kill 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Node.js 프로세스 강제 종료
sudo pkill -f "node.*msp" 2>/dev/null || true
sudo pkill -f "npm.*start" 2>/dev/null || true

# 포트 사용 프로세스 강제 종료
for port in 3010 3011; do
    PID=$(sudo netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        log_info "포트 $port 사용 프로세스 $PID 종료 중..."
        sudo kill -9 $PID 2>/dev/null || true
    fi
done

log_success "프로세스 중지 완료"

log_step "제거 3단계: 시스템 서비스 제거"
# systemd 서비스 중지 및 제거
sudo systemctl stop msp-checklist 2>/dev/null || true
sudo systemctl disable msp-checklist 2>/dev/null || true
sudo rm -f /etc/systemd/system/msp-checklist.service
sudo systemctl daemon-reload 2>/dev/null || true

# crontab 정리
crontab -l 2>/dev/null | grep -v msp-checklist | crontab - 2>/dev/null || true

log_success "시스템 서비스 제거 완료"

log_step "제거 4단계: 애플리케이션 파일 제거"
# 애플리케이션 디렉토리 제거
sudo rm -rf $INSTALL_DIR
rm -rf ~/msp-checklist
rm -rf ~/msp-qna

# npm 관련 파일 정리
rm -rf ~/.npm/_logs/*msp* 2>/dev/null || true
rm -rf ~/.pm2 2>/dev/null || true

log_success "애플리케이션 파일 제거 완료"

log_step "제거 5단계: Nginx 설정 제거 (있는 경우)"
sudo rm -f /etc/nginx/sites-available/msp-checklist
sudo rm -f /etc/nginx/sites-enabled/msp-checklist
sudo rm -f /etc/nginx/conf.d/msp-checklist.conf

# Nginx 재시작 (설치되어 있는 경우)
if command -v nginx &> /dev/null; then
    sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true
fi

log_success "Nginx 설정 제거 완료"

log_step "제거 6단계: 방화벽 규칙 정리"
sudo ufw delete allow 3010/tcp 2>/dev/null || true
sudo ufw delete allow 3011/tcp 2>/dev/null || true

log_success "방화벽 규칙 정리 완료"

# ========== 설치 단계 ==========

log_step "설치 1단계: 시스템 업데이트 및 필수 패키지 설치"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential software-properties-common python3 python3-pip
log_success "시스템 업데이트 및 빌드 도구 설치 완료"

log_step "설치 2단계: Node.js 20.9.0 설치"
if ! command -v node &> /dev/null || [[ $(node --version) < "v20.9.0" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_success "Node.js 설치 완료: $(node --version)"
else
    log_info "Node.js가 이미 설치되어 있습니다: $(node --version)"
fi

# npm 설정 최적화 및 Native 모듈 빌드 설정
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000

# Native 모듈 빌드를 위한 환경 변수 설정
export npm_config_build_from_source=true
export NODE_OPTIONS="--max-old-space-size=4096"
log_success "npm 설정 및 빌드 환경 완료"

log_step "설치 3단계: 방화벽 설정"
sudo ufw allow 3010/tcp
sudo ufw allow 3011/tcp

if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    sudo ufw allow 'Nginx Full'
fi

log_success "방화벽 설정 완료"

log_step "설치 4단계: 프로젝트 클론 및 설정"
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

cd $INSTALL_DIR
git clone $REPO_URL .

# 실행 권한 부여
chmod +x *.sh 2>/dev/null || true
chmod +x msp-checklist/*.sh 2>/dev/null || true

log_success "프로젝트 클론 완료"

log_step "설치 5단계: 의존성 설치"
# 프로젝트 루트 의존성
npm install

# MSP 체크리스트 의존성
cd msp-checklist
if [ -f "install-server.sh" ]; then
    chmod +x install-server.sh
    ./install-server.sh
else
    npm install --no-optional --legacy-peer-deps
fi

# 관리자 시스템 의존성
cd $INSTALL_DIR/msp-checklist/admin
npm install

log_success "의존성 설치 완료"

log_step "설치 6단계: 환경 변수 설정"
cd $INSTALL_DIR

# 백업된 환경 변수 복원
if [[ $BACKUP_DB =~ ^[Yy]$ ]] && [ -d "$BACKUP_DIR" ]; then
    if [ -f "$BACKUP_DIR/.env.local" ]; then
        cp "$BACKUP_DIR/.env.local" msp-checklist/.env.local
        log_info "메인 환경 변수 복원됨"
    fi
    
    if [ -f "$BACKUP_DIR/admin.env.local" ]; then
        cp "$BACKUP_DIR/admin.env.local" admin/.env.local
        log_info "관리자 환경 변수 복원됨"
    fi
else
    # 새 환경 변수 파일 생성
    if [ -f "msp-checklist/.env.local.example" ] && [ ! -f "msp-checklist/.env.local" ]; then
        cp msp-checklist/.env.local.example msp-checklist/.env.local
    fi
    
    if [ -f "admin/.env.local.example" ] && [ ! -f "admin/.env.local" ]; then
        cp admin/.env.local.example admin/.env.local
    fi
fi

log_success "환경 변수 설정 완료"

log_step "설치 7단계: 데이터베이스 복원 (선택사항)"
if [[ $BACKUP_DB =~ ^[Yy]$ ]] && [ -d "$BACKUP_DIR" ]; then
    if [ -f "$BACKUP_DIR/msp-assessment.db" ]; then
        cp "$BACKUP_DIR/msp-assessment.db" msp-checklist/
        log_success "메인 데이터베이스 복원됨"
    fi
    
    if [ -f "$BACKUP_DIR/advice-cache.db" ]; then
        cp "$BACKUP_DIR/advice-cache.db" msp-checklist/
        log_success "조언 캐시 데이터베이스 복원됨"
    fi
fi

log_step "설치 8단계: 애플리케이션 빌드"
cd $INSTALL_DIR/msp-checklist
export NODE_OPTIONS="--max-old-space-size=4096"

# LightningCSS 문제 해결 포함 빌드
if ! npm run build; then
    log_warning "빌드 실패. Tailwind CSS 호환성 문제 해결 중..."
    
    # Tailwind CSS v3로 다운그레이드
    npm uninstall @tailwindcss/postcss tailwindcss 2>/dev/null || true
    npm install tailwindcss@^3.4.0 postcss autoprefixer --save-dev
    
    # 호환 설정 파일 생성
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
    
    rm -f postcss.config.mjs
    log_success "Tailwind CSS v3로 다운그레이드 완료"
    
    # 재빌드
    npm run build
fi

cd $INSTALL_DIR/msp-checklist/admin
npm run build

cd $INSTALL_DIR

log_success "애플리케이션 빌드 완료"

# Nginx 설정 (선택사항)
if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    log_step "설치 9단계: Nginx 설치 및 설정"
    
    if ! command -v nginx &> /dev/null; then
        sudo apt install -y nginx
    fi
    
    # Nginx 설정 파일 생성
    SERVER_NAME=${DOMAIN:-"_"}
    
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

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
    }
}
EOF

    # 사이트 활성화
    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
    
    # Nginx 설정 테스트
    if sudo nginx -t; then
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        log_success "Nginx 설정 완료"
    else
        log_error "Nginx 설정 오류"
    fi
fi

# SSL 설정 (선택사항)
if [ "$SETUP_SSL" = true ]; then
    log_step "설치 10단계: SSL 인증서 설정"
    
    sudo apt install -y certbot python3-certbot-nginx
    
    if sudo certbot --nginx -d $DOMAIN --email $SSL_EMAIL --agree-tos --non-interactive; then
        log_success "SSL 인증서 설정 완료"
        
        # 자동 갱신 설정
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        log_info "SSL 인증서 자동 갱신 설정 완료"
    else
        log_warning "SSL 인증서 설정 실패 - 수동으로 설정하세요"
    fi
fi

# systemd 서비스 설정 (선택사항)
if [[ $SETUP_SYSTEMD =~ ^[Yy]$ ]]; then
    log_step "설치 11단계: systemd 서비스 설정"
    
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

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable msp-checklist
    log_success "systemd 서비스 설정 완료"
fi

log_step "설치 12단계: 서버 시작"
cd $INSTALL_DIR
./restart-server.sh

# 서버 시작 대기
sleep 15

# 설치 검증
log_step "설치 13단계: 설치 검증"
if ./server-status.sh > /dev/null 2>&1; then
    log_success "서버가 정상적으로 실행 중입니다!"
else
    log_warning "서버 상태를 확인할 수 없습니다. 수동으로 확인하세요."
fi

# 설치 완료 시간 계산
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# 설치 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    재설치 완료! 🎉                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "MSP Checklist 시스템 재설치가 완료되었습니다!"
log_info "재설치 시간: ${MINUTES}분 ${SECONDS}초"

if [[ $BACKUP_DB =~ ^[Yy]$ ]] && [ -d "$BACKUP_DIR" ]; then
    echo ""
    log_info "백업 파일 위치: $BACKUP_DIR"
    log_info "백업 파일은 수동으로 삭제하세요: rm -rf $BACKUP_DIR"
fi

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
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "YOUR_SERVER_IP")
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
echo "- 서버 상태 확인: cd $INSTALL_DIR && ./server-status.sh"
echo "- 서버 재시작: cd $INSTALL_DIR && ./restart-server.sh"
echo "- 로그 확인: cd $INSTALL_DIR && tail -f server.log"

echo ""
log_success "재설치가 완전히 완료되었습니다! 🚀"