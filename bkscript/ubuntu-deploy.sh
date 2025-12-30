#!/bin/bash

# MSP Checklist - Ubuntu 22.04 LTS 자동 배포 스크립트
# 이 스크립트는 Ubuntu 22.04 LTS에서 MSP Checklist 시스템을 완전히 설정합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수들
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

# 배너 출력
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist - Ubuntu 22.04 LTS 배포            ║"
echo "║                                                            ║"
echo "║  이 스크립트는 Ubuntu 22.04 LTS에서 MSP Checklist        ║"
echo "║  시스템을 완전히 설정하고 배포합니다.                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 시스템 정보 확인
log_info "시스템 정보 확인 중..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "OS: $NAME $VERSION"
    if [[ "$ID" != "ubuntu" ]]; then
        log_warning "이 스크립트는 Ubuntu 22.04 LTS용으로 최적화되었습니다."
        read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    log_warning "OS 정보를 확인할 수 없습니다."
fi

# 사용자 입력 받기
echo ""
log_info "배포 설정을 입력해주세요:"
read -p "GitHub 저장소 URL (선택사항, 엔터로 건너뛰기): " REPO_URL
read -p "도메인 이름 (선택사항, 엔터로 건너뛰기): " DOMAIN
read -p "SSL 인증서를 설정하시겠습니까? (y/n): " -n 1 -r SETUP_SSL
echo

if [[ $SETUP_SSL =~ ^[Yy]$ ]] && [ -z "$DOMAIN" ]; then
    log_error "SSL 설정을 위해서는 도메인이 필요합니다."
    exit 1
fi

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    read -p "Let's Encrypt 알림용 이메일을 입력하세요: " EMAIL
fi

# 설정 확인
echo ""
log_info "배포 설정 확인:"
echo "- 저장소: ${REPO_URL:-'현재 디렉토리 사용'}"
echo "- 도메인: ${DOMAIN:-'없음 (IP 접속)'}"
echo "- SSL 설정: ${SETUP_SSL}"
echo ""

read -p "설정이 올바른가요? 계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1단계: 시스템 업데이트
log_info "1단계: 시스템 업데이트 중..."
sudo apt update -y
sudo apt upgrade -y

# 2단계: 필수 패키지 설치
log_info "2단계: 필수 패키지 설치 중..."
sudo apt install -y \
    git \
    curl \
    wget \
    unzip \
    tar \
    build-essential \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    sqlite3 \
    nginx \
    ufw \
    htop \
    vim

# 3단계: Node.js 20.9.0 설치
log_info "3단계: Node.js 20.9.0 설치 중..."
if ! command -v node &> /dev/null || [[ $(node --version) < "v20.9.0" ]]; then
    # NodeSource 저장소 추가
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # 버전 확인
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_success "Node.js 설치 완료: $NODE_VERSION"
    log_success "npm 설치 완료: $NPM_VERSION"
else
    log_success "Node.js가 이미 설치되어 있습니다: $(node --version)"
fi

# 4단계: PM2 설치 (프로세스 관리자)
log_info "4단계: PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    log_success "PM2 설치 완료"
else
    log_success "PM2가 이미 설치되어 있습니다"
fi

# 5단계: 프로젝트 설정
log_info "5단계: 프로젝트 설정 중..."

# 애플리케이션 디렉토리 생성
APP_DIR="/opt/msp-checklist"
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
fi

cd "$APP_DIR"

# 저장소 클론 또는 업데이트
if [ ! -z "$REPO_URL" ]; then
    if [ -d ".git" ]; then
        log_info "기존 저장소 업데이트 중..."
        git pull origin main
    else
        log_info "저장소 클론 중..."
        git clone "$REPO_URL" .
    fi
else
    log_info "현재 디렉토리의 코드를 사용합니다."
    if [ "$PWD" != "$APP_DIR" ]; then
        log_info "코드를 $APP_DIR로 복사 중..."
        cp -r "$(dirname "$0")"/* "$APP_DIR/"
    fi
fi

# 6단계: 의존성 설치
log_info "6단계: 의존성 설치 중..."

# npm 설정 최적화
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
npm config set registry https://registry.npmjs.org/

# 루트 프로젝트 의존성 설치
log_info "루트 프로젝트 의존성 설치 중..."
npm install

# MSP 체크리스트 앱 의존성 설치
log_info "MSP 체크리스트 앱 의존성 설치 중..."
cd msp-checklist

# 기존 node_modules 정리
if [ -d "node_modules" ]; then
    rm -rf node_modules package-lock.json
fi

# 의존성 설치 (재시도 로직 포함)
RETRY_COUNT=0
MAX_RETRIES=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    log_info "의존성 설치 시도 $((RETRY_COUNT + 1))/$MAX_RETRIES..."

    if npm install --no-optional --legacy-peer-deps; then
        log_success "의존성 설치 완료"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_warning "설치 실패. 5초 후 재시도..."
            sleep 5
            npm cache clean --force
        else
            log_error "의존성 설치에 실패했습니다."
            exit 1
        fi
    fi
done

# 관리자 앱 의존성 설치
log_info "관리자 앱 의존성 설치 중..."
cd admin

if [ -d "node_modules" ]; then
    rm -rf node_modules package-lock.json
fi

RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    log_info "관리자 앱 의존성 설치 시도 $((RETRY_COUNT + 1))/$MAX_RETRIES..."

    if npm install --no-optional --legacy-peer-deps; then
        log_success "관리자 앱 의존성 설치 완료"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            log_warning "설치 실패. 5초 후 재시도..."
            sleep 5
            npm cache clean --force
        else
            log_error "관리자 앱 의존성 설치에 실패했습니다."
            exit 1
        fi
    fi
done

cd ..

# 7단계: 환경 변수 설정
log_info "7단계: 환경 변수 설정 중..."
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        log_success "환경 변수 파일 생성 완료"
        log_warning "필요한 경우 .env.local 파일을 편집하여 API 키를 설정하세요."
    else
        log_warning ".env.local.example 파일이 없습니다."
    fi
fi

# 관리자 앱 환경 변수 설정
cd admin
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        log_success "관리자 앱 환경 변수 파일 생성 완료"
    fi
fi
cd ..

# 8단계: 애플리케이션 빌드
log_info "8단계: 애플리케이션 빌드 중..."

# Node.js 메모리 설정
export NODE_OPTIONS="--max-old-space-size=4096"

# 메인 앱 빌드
log_info "메인 애플리케이션 빌드 중..."
if npm run build; then
    log_success "메인 애플리케이션 빌드 완료"
else
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
    if npm run build; then
        log_success "메인 애플리케이션 빌드 완료 (호환성 수정 후)"
    else
        log_error "메인 애플리케이션 빌드 실패"
        exit 1
    fi
fi

# 관리자 앱 빌드
log_info "관리자 애플리케이션 빌드 중..."
cd admin
if npm run build; then
    log_success "관리자 애플리케이션 빌드 완료"
else
    log_error "관리자 애플리케이션 빌드 실패"
    exit 1
fi
cd ..

# 9단계: PM2 설정
log_info "9단계: PM2 프로세스 관리 설정 중..."

cd "$APP_DIR"

# PM2 ecosystem 파일 생성
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'msp-checklist',
      script: 'npm',
      args: 'start',
      cwd: '/opt/msp-checklist/msp-checklist',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      error_file: '/opt/msp-checklist/logs/msp-checklist-error.log',
      out_file: '/opt/msp-checklist/logs/msp-checklist-out.log',
      log_file: '/opt/msp-checklist/logs/msp-checklist.log'
    },
    {
      name: 'msp-admin',
      script: 'npm',
      args: 'start',
      cwd: '/opt/msp-checklist/msp-checklist/admin',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      error_file: '/opt/msp-checklist/logs/msp-admin-error.log',
      out_file: '/opt/msp-checklist/logs/msp-admin-out.log',
      log_file: '/opt/msp-checklist/logs/msp-admin.log'
    }
  ]
};
EOF

# 로그 디렉토리 생성
mkdir -p logs

# 기존 PM2 프로세스 중지
pm2 delete all 2>/dev/null || true

# PM2로 애플리케이션 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup

log_success "PM2 설정 완료"

# 10단계: Nginx 설정
log_info "10단계: Nginx 설정 중..."

# Nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << EOF
upstream msp_checklist {
    server 127.0.0.1:3010;
}

upstream msp_admin {
    server 127.0.0.1:3011;
}

server {
    listen 80;
    server_name ${DOMAIN:-_};

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # 관리자 시스템
    location /admin {
        proxy_pass http://msp_admin;
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

    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_checklist;
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

    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Nginx 사이트 활성화
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 테스트 및 시작
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

log_success "Nginx 설정 완료"

# 11단계: 방화벽 설정
log_info "11단계: 방화벽 설정 중..."

sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 기본 서비스 허용
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# 개발용 포트 (선택사항)
read -p "개발용 직접 포트 접근을 허용하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo ufw allow 3010/tcp
    sudo ufw allow 3011/tcp
    log_info "포트 3010, 3011 직접 접근 허용"
fi

sudo ufw reload

log_success "방화벽 설정 완료"

# 12단계: SSL 설정 (선택사항)
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    log_info "12단계: SSL 인증서 설정 중..."

    # Certbot 설치
    sudo apt install -y certbot python3-certbot-nginx

    # SSL 인증서 발급
    sudo certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

    # 자동 갱신 설정
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

    log_success "SSL 인증서 설정 완료"
fi

# 13단계: 시스템 서비스 등록
log_info "13단계: 시스템 서비스 등록 중..."

# systemd 서비스 파일 생성
sudo tee /etc/systemd/system/msp-checklist.service > /dev/null << EOF
[Unit]
Description=MSP Checklist Application
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=/opt/msp-checklist
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 delete all
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable msp-checklist

log_success "시스템 서비스 등록 완료"

# 14단계: 백업 스크립트 설정
log_info "14단계: 백업 스크립트 설정 중..."

# 백업 스크립트 생성
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/msp-checklist/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 데이터베이스 백업
mkdir -p "$BACKUP_DIR/db_backup_$DATE"
cp /opt/msp-checklist/msp-checklist/*.db "$BACKUP_DIR/db_backup_$DATE/" 2>/dev/null || true

# 로그 백업
tar -czf "$BACKUP_DIR/logs_backup_$DATE.tar.gz" /opt/msp-checklist/logs/ 2>/dev/null || true

# 오래된 백업 정리 (30일 이상)
find "$BACKUP_DIR" -type f -mtime +30 -delete
find "$BACKUP_DIR" -type d -empty -delete

echo "백업 완료: $DATE"
EOF

chmod +x backup.sh

# 모니터링 스크립트 생성
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== MSP Checklist 시스템 상태 ==="
echo "날짜: $(date)"
echo ""

echo "=== PM2 프로세스 상태 ==="
pm2 status

echo ""
echo "=== 시스템 리소스 ==="
echo "메모리 사용량:"
free -h
echo ""
echo "디스크 사용량:"
df -h /opt/msp-checklist

echo ""
echo "=== 네트워크 연결 ==="
netstat -tlnp | grep -E ":301[01]" || echo "포트 사용 정보 없음"

echo ""
echo "=== 최근 로그 (마지막 5줄) ==="
echo "메인 앱:"
tail -n 5 /opt/msp-checklist/logs/msp-checklist.log 2>/dev/null || echo "로그 없음"
echo ""
echo "관리자 앱:"
tail -n 5 /opt/msp-checklist/logs/msp-admin.log 2>/dev/null || echo "로그 없음"
EOF

chmod +x monitor.sh

# cron 작업 설정
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/msp-checklist/backup.sh") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/msp-checklist/monitor.sh > /dev/null 2>&1") | crontab -

log_success "백업 및 모니터링 설정 완료"

# 15단계: 최종 확인
log_info "15단계: 최종 시스템 확인 중..."

sleep 10

# 서비스 상태 확인
if pm2 status | grep -q "online"; then
    log_success "애플리케이션이 정상적으로 실행 중입니다!"
else
    log_error "애플리케이션 실행에 문제가 있습니다."
    pm2 status
fi

# 포트 확인
if netstat -tlnp 2>/dev/null | grep -q ":3010"; then
    log_success "메인 애플리케이션 포트 3010 활성화"
else
    log_warning "메인 애플리케이션 포트 3010 확인 필요"
fi

if netstat -tlnp 2>/dev/null | grep -q ":3011"; then
    log_success "관리자 애플리케이션 포트 3011 활성화"
else
    log_warning "관리자 애플리케이션 포트 3011 확인 필요"
fi

# 배포 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    배포 완료! 🎉                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "MSP Checklist 시스템이 Ubuntu 22.04 LTS에 성공적으로 배포되었습니다!"

echo ""
echo "서비스 접속 주소:"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "IP 확인 실패")

if [ ! -z "$DOMAIN" ]; then
    if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
        echo "- 메인 서비스: https://$DOMAIN"
        echo "- 관리자 시스템: https://$DOMAIN/admin"
    else
        echo "- 메인 서비스: http://$DOMAIN"
        echo "- 관리자 시스템: http://$DOMAIN/admin"
    fi
else
    echo "- 메인 서비스: http://$PUBLIC_IP"
    echo "- 관리자 시스템: http://$PUBLIC_IP/admin"
    echo "- 직접 포트 접근 (허용한 경우):"
    echo "  - 메인: http://$PUBLIC_IP:3010"
    echo "  - 관리자: http://$PUBLIC_IP:3011"
fi

echo ""
echo "유용한 명령어:"
echo "- PM2 상태 확인: pm2 status"
echo "- PM2 로그 확인: pm2 logs"
echo "- 시스템 모니터링: ./monitor.sh"
echo "- 수동 백업: ./backup.sh"
echo "- Nginx 상태: sudo systemctl status nginx"
echo "- 방화벽 상태: sudo ufw status"

echo ""
echo "설정된 자동화:"
echo "- 매일 새벽 2시 자동 백업"
echo "- 5분마다 시스템 모니터링"
echo "- PM2 자동 재시작"
echo "- 시스템 부팅 시 자동 시작"
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    echo "- SSL 인증서 자동 갱신"
fi

echo ""
log_success "Ubuntu 22.04 LTS 배포가 완전히 완료되었습니다! 🚀"

# 마지막 상태 출력
echo ""
echo "=== 현재 시스템 상태 ==="
./monitor.sh
