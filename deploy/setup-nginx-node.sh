#!/bin/bash

# Nginx + Node.js 통합 설정 스크립트
# Ubuntu 22.04 LTS 및 Amazon Linux 2023 지원

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

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            Nginx + Node.js 통합 설정 스크립트             ║"
echo "║                                                            ║"
echo "║  이 스크립트는 Nginx를 리버스 프록시로 설정하고           ║"
echo "║  Node.js 애플리케이션과 통합합니다.                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 루트 권한 확인
if [[ $EUID -eq 0 ]]; then
   log_error "이 스크립트는 root 권한으로 실행하지 마세요."
   exit 1
fi

# sudo 권한 확인
if ! sudo -n true 2>/dev/null; then
    log_error "sudo 권한이 필요합니다."
    exit 1
fi

# OS 감지
detect_os
log_info "감지된 OS: $OS $VER"

# 사용자 입력 받기
read -p "도메인을 입력하세요 (예: example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    log_error "도메인은 필수입니다."
    exit 1
fi

read -p "SSL 인증서를 설정하시겠습니까? (y/n): " -n 1 -r SETUP_SSL
echo

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    read -p "Let's Encrypt 알림용 이메일을 입력하세요: " EMAIL
    if [ -z "$EMAIL" ]; then
        log_error "SSL 설정을 위해서는 이메일이 필요합니다."
        exit 1
    fi
fi

read -p "PM2 클러스터 인스턴스 수 (기본값: 2): " INSTANCES
INSTANCES=${INSTANCES:-2}

log_info "설정 정보:"
echo "- 도메인: $DOMAIN"
echo "- SSL 설정: ${SETUP_SSL}"
echo "- PM2 인스턴스: $INSTANCES"
echo "- OS: $OS $VER"
echo ""

read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1단계: 기본 패키지 설치
log_info "1단계: 기본 패키지 설치 중..."

if [[ "$OS" == *"Ubuntu"* ]]; then
    sudo apt update
    sudo apt install -y nginx certbot python3-certbot-nginx
elif [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo dnf update -y
    sudo dnf install -y nginx python3-pip
    sudo pip3 install certbot certbot-nginx
else
    log_error "지원되지 않는 OS입니다: $OS"
    exit 1
fi

# 2단계: Nginx 설정
log_info "2단계: Nginx 설정 중..."

# OS별 설정 파일 경로 결정
if [[ "$OS" == *"Ubuntu"* ]]; then
    NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
    NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
    sudo rm -f $NGINX_SITES_ENABLED/default
else
    NGINX_SITES_AVAILABLE="/etc/nginx/conf.d"
    NGINX_SITES_ENABLED="/etc/nginx/conf.d"
fi

# Nginx 설정 파일 생성
sudo tee $NGINX_SITES_AVAILABLE/msp-checklist.conf > /dev/null << EOF
# MSP Checklist Nginx Configuration
upstream msp_main {
    server 127.0.0.1:3010;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011;
    keepalive 16;
}

# HTTP 서버 (HTTPS로 리다이렉트)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt 인증을 위한 경로
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # 모든 HTTP 요청을 HTTPS로 리다이렉트 (SSL 설정 후)
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 관리자 애플리케이션
    location /admin {
        proxy_pass http://msp_admin/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Ubuntu의 경우 sites-enabled 링크 생성
if [[ "$OS" == *"Ubuntu"* ]]; then
    sudo ln -sf $NGINX_SITES_AVAILABLE/msp-checklist.conf $NGINX_SITES_ENABLED/
fi

# 3단계: Nginx 테스트 및 시작
log_info "3단계: Nginx 설정 테스트 및 시작..."

if sudo nginx -t; then
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    log_success "Nginx 설정 완료"
else
    log_error "Nginx 설정 오류"
    exit 1
fi

# 4단계: 방화벽 설정
log_info "4단계: 방화벽 설정 중..."

if [[ "$OS" == *"Ubuntu"* ]]; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow ssh
    sudo ufw --force enable
else
    sudo systemctl start firewalld
    sudo systemctl enable firewalld
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --reload
fi

# 5단계: PM2 Ecosystem 설정
log_info "5단계: PM2 Ecosystem 설정 중..."

mkdir -p /opt/msp-checklist/logs

cat > /opt/msp-checklist/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '/opt/msp-checklist/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: $INSTANCES,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist/logs/main-error.log',
      out_file: '/opt/msp-checklist/logs/main-out.log',
      log_file: '/opt/msp-checklist/logs/main-combined.log',
      time: true
    },
    {
      name: 'msp-admin',
      cwd: '/opt/msp-checklist/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/opt/msp-checklist/logs/admin-error.log',
      out_file: '/opt/msp-checklist/logs/admin-out.log',
      log_file: '/opt/msp-checklist/logs/admin-combined.log',
      time: true
    }
  ]
};
EOF

log_success "PM2 Ecosystem 설정 완료"

# 6단계: SSL 인증서 설정 (선택사항)
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    log_info "6단계: SSL 인증서 설정 중..."
    
    # 먼저 HTTP로 도메인 접근이 가능한지 확인
    log_info "도메인 접근성 확인 중..."
    sleep 5
    
    if sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive; then
        log_success "SSL 인증서 설정 완료"
        
        # 자동 갱신 설정
        echo "0 2 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo crontab -
        log_success "SSL 인증서 자동 갱신 설정 완료"
    else
        log_warning "SSL 인증서 설정에 실패했습니다. 수동으로 설정하세요."
        log_info "명령어: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    fi
fi

# 7단계: 헬스 체크 스크립트 생성
log_info "7단계: 헬스 체크 스크립트 생성 중..."

cat > /opt/msp-checklist/health-check.sh << 'EOF'
#!/bin/bash

# 헬스 체크 스크립트
check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    if curl -s --max-time 10 $url > /dev/null; then
        echo "✅ $service_name (포트 $port): 정상"
        return 0
    else
        echo "❌ $service_name (포트 $port): 오류"
        return 1
    fi
}

echo "🔍 MSP 체크리스트 시스템 헬스 체크"
echo "시간: $(date)"
echo ""

# 서비스 체크
check_service "메인 애플리케이션" "3010" "http://localhost:3010"
main_status=$?

check_service "관리자 애플리케이션" "3011" "http://localhost:3011"
admin_status=$?

check_service "Nginx" "80" "http://localhost"
nginx_status=$?

echo ""

# PM2 상태 체크
echo "📊 PM2 프로세스 상태:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || pm2 status

echo ""

# 전체 상태 요약
if [ $main_status -eq 0 ] && [ $admin_status -eq 0 ] && [ $nginx_status -eq 0 ]; then
    echo "🎉 모든 서비스가 정상적으로 실행 중입니다!"
    exit 0
else
    echo "⚠️  일부 서비스에 문제가 있습니다."
    exit 1
fi
EOF

chmod +x /opt/msp-checklist/health-check.sh

# 8단계: 모니터링 스크립트 생성
log_info "8단계: 모니터링 스크립트 생성 중..."

cat > /opt/msp-checklist/monitor.sh << 'EOF'
#!/bin/bash

# 실시간 모니터링 스크립트
echo "🖥️  MSP 체크리스트 시스템 모니터링"
echo "Ctrl+C로 종료"
echo ""

while true; do
    clear
    echo "🖥️  MSP 체크리스트 시스템 모니터링 - $(date)"
    echo "════════════════════════════════════════════════════════════"
    
    # 시스템 리소스
    echo "💻 시스템 리소스:"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% 사용"
    echo "메모리: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
    echo "디스크: $(df -h / | awk 'NR==2{printf "%s", $5}')"
    echo ""
    
    # PM2 상태
    echo "🚀 PM2 프로세스:"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, 메모리: \(.monit.memory/1024/1024 | floor)MB)"' 2>/dev/null || pm2 status
    echo ""
    
    # 네트워크 연결
    echo "🌐 네트워크 연결:"
    echo "포트 80: $(sudo netstat -tlnp | grep :80 | wc -l) 연결"
    echo "포트 443: $(sudo netstat -tlnp | grep :443 | wc -l) 연결"
    echo "포트 3010: $(sudo netstat -tlnp | grep :3010 | wc -l) 연결"
    echo "포트 3011: $(sudo netstat -tlnp | grep :3011 | wc -l) 연결"
    echo ""
    
    # 최근 로그 (에러만)
    echo "🚨 최근 에러 로그 (최근 5분):"
    find /opt/msp-checklist/logs -name "*error.log" -mmin -5 -exec tail -n 3 {} \; 2>/dev/null || echo "에러 없음"
    
    sleep 10
done
EOF

chmod +x /opt/msp-checklist/monitor.sh

# 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 설정 완료! 🎉                              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "Nginx + Node.js 통합 설정이 완료되었습니다!"

echo ""
echo "📋 설정 요약:"
echo "- 도메인: $DOMAIN"
echo "- Nginx 프록시: 포트 80/443 → 3010/3011"
echo "- PM2 클러스터: $INSTANCES 인스턴스"
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    echo "- SSL 인증서: Let's Encrypt"
fi
echo ""

echo "🔗 접속 주소:"
if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    echo "- 메인 서비스: https://$DOMAIN"
    echo "- 관리자 시스템: https://$DOMAIN/admin"
else
    echo "- 메인 서비스: http://$DOMAIN"
    echo "- 관리자 시스템: http://$DOMAIN/admin"
fi
echo ""

echo "🛠️  유용한 명령어:"
echo "- 헬스 체크: ./health-check.sh"
echo "- 실시간 모니터링: ./monitor.sh"
echo "- PM2 상태: pm2 status"
echo "- PM2 로그: pm2 logs"
echo "- Nginx 상태: sudo systemctl status nginx"
echo "- Nginx 로그: sudo tail -f /var/log/nginx/msp-checklist-*.log"
echo ""

echo "📝 다음 단계:"
echo "1. 애플리케이션을 빌드하고 PM2로 시작하세요"
echo "2. 도메인 DNS 설정을 확인하세요"
echo "3. 헬스 체크를 실행하여 모든 서비스가 정상인지 확인하세요"
echo ""

log_success "설정 완료! 🚀"