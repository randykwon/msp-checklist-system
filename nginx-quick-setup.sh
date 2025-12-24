#!/bin/bash

# Nginx 빠른 설정 스크립트 (MSP Checklist용)
# 기본적인 Nginx + Node.js 연동만 빠르게 설정

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

echo -e "${BLUE}🚀 MSP Checklist Nginx 빠른 설정${NC}"
echo "=================================="

# OS 감지
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]]; then
        OS_TYPE="ubuntu"
        PACKAGE_MANAGER="apt"
    elif [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
        OS_TYPE="amazon-linux-2023"
        PACKAGE_MANAGER="dnf"
    else
        log_error "지원되지 않는 OS입니다"
        exit 1
    fi
else
    log_error "OS를 감지할 수 없습니다"
    exit 1
fi

log_info "감지된 OS: $ID $VERSION_ID"

# Nginx 설치
log_info "Nginx 설치 중..."
if [[ "$OS_TYPE" == "ubuntu" ]]; then
    sudo apt update -y
    sudo apt install -y nginx
elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
    sudo dnf update -y
    sudo dnf install -y nginx
fi

# Nginx 서비스 시작
sudo systemctl enable nginx
sudo systemctl start nginx

# 기본 설정 파일 생성
log_info "Nginx 설정 파일 생성 중..."

sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 관리자 시스템
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3010;
        expires 1d;
        add_header Cache-Control "public";
    }
}
EOF

# Ubuntu의 경우 sites-enabled 링크 생성
if [[ "$OS_TYPE" == "ubuntu" ]]; then
    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
    sudo cp /etc/nginx/sites-available/msp-checklist /etc/nginx/conf.d/msp-checklist.conf
fi

# 설정 테스트 및 재시작
log_info "Nginx 재시작 중..."
if sudo nginx -t; then
    sudo systemctl restart nginx
    log_success "✅ Nginx 설정 완료!"
else
    log_error "❌ Nginx 설정 오류"
    exit 1
fi

# 방화벽 설정
log_info "방화벽 설정 중..."
if [[ "$OS_TYPE" == "ubuntu" ]]; then
    sudo ufw --force enable
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow ssh
elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
    sudo systemctl enable firewalld
    sudo systemctl start firewalld
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --reload
fi

# 상태 확인
echo ""
echo "🎉 설정 완료!"
echo ""
echo "📊 상태 확인:"

# Nginx 상태
if systemctl is-active --quiet nginx; then
    log_success "✅ Nginx: 실행 중"
else
    log_warning "⚠️ Nginx: 중지됨"
fi

# Node.js 서버 확인
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    log_success "✅ 메인 서버 (포트 3010): 실행 중"
else
    log_warning "⚠️ 메인 서버 (포트 3010): 실행되지 않음"
fi

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 관리자 서버 (포트 3011): 실행 중"
else
    log_warning "⚠️ 관리자 서버 (포트 3011): 실행되지 않음"
fi

# 접속 정보
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
echo "🌐 접속 주소:"
echo "  - 메인 서비스: http://$PUBLIC_IP"
echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
echo ""
echo "📝 다음 단계:"
echo "1. Node.js 서버가 실행 중인지 확인하세요"
echo "2. AWS 보안 그룹에서 포트 80 인바운드 규칙을 확인하세요"
echo "3. 고급 설정이 필요하면 ./setup-nginx-node.sh를 실행하세요"
echo ""

log_success "Nginx 빠른 설정이 완료되었습니다! 🚀"