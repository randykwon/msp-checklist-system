#!/bin/bash

# MSP Checklist 자동 시작 등록 스크립트
# OS 리부팅 시 자동으로 서비스가 시작되도록 설정합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MSP Checklist 자동 시작 등록 스크립트               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 프로젝트 경로
PROJECT_DIR="/opt/msp-checklist-system"
MAIN_DIR="$PROJECT_DIR/msp-checklist"
ADMIN_DIR="$PROJECT_DIR/msp-checklist/admin"

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            USER_NAME="ubuntu"
        elif [[ "$ID" == "amzn" ]]; then
            OS_TYPE="amazon-linux"
            USER_NAME="ec2-user"
        else
            OS_TYPE="linux"
            USER_NAME=$(whoami)
        fi
    else
        OS_TYPE="linux"
        USER_NAME=$(whoami)
    fi
    log_info "OS 감지됨: $OS_TYPE, 사용자: $USER_NAME"
}

# PM2 방식 자동 시작 설정
setup_pm2_autostart() {
    log_info "PM2 자동 시작 설정 중..."
    
    # PM2 설치 확인
    if ! command -v pm2 &> /dev/null; then
        log_info "PM2 설치 중..."
        sudo npm install -g pm2
    fi
    
    # PM2 ecosystem 파일 생성
    cat > "$PROJECT_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '/opt/msp-checklist-system/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist-system/logs/main-error.log',
      out_file: '/opt/msp-checklist-system/logs/main-out.log',
      time: true
    },
    {
      name: 'msp-admin',
      cwd: '/opt/msp-checklist-system/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/msp-checklist-system/logs/admin-error.log',
      out_file: '/opt/msp-checklist-system/logs/admin-out.log',
      time: true
    }
  ]
};
EOF

    # 로그 디렉토리 생성
    mkdir -p "$PROJECT_DIR/logs"
    
    # PM2 프로세스 시작
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.js
    
    # PM2 저장 및 시작 스크립트 생성
    pm2 save
    
    # PM2 startup 설정 (시스템 서비스로 등록)
    pm2 startup systemd -u $USER_NAME --hp /home/$USER_NAME 2>/dev/null || \
    pm2 startup -u $USER_NAME --hp /home/$USER_NAME 2>/dev/null || \
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER_NAME --hp /home/$USER_NAME
    
    log_success "PM2 자동 시작 설정 완료"
}

# systemd 서비스 방식 자동 시작 설정
setup_systemd_services() {
    log_info "systemd 서비스 등록 중..."
    
    # 메인 서비스 파일 생성
    sudo tee /etc/systemd/system/msp-main.service > /dev/null << EOF
[Unit]
Description=MSP Checklist Main Service
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$MAIN_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3010

[Install]
WantedBy=multi-user.target
EOF

    # Admin 서비스 파일 생성
    sudo tee /etc/systemd/system/msp-admin.service > /dev/null << EOF
[Unit]
Description=MSP Checklist Admin Service
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$ADMIN_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3011

[Install]
WantedBy=multi-user.target
EOF

    # systemd 데몬 리로드
    sudo systemctl daemon-reload
    
    # 서비스 활성화
    sudo systemctl enable msp-main.service
    sudo systemctl enable msp-admin.service
    
    # 서비스 시작
    sudo systemctl start msp-main.service
    sudo systemctl start msp-admin.service
    
    log_success "systemd 서비스 등록 완료"
}

# Nginx 자동 시작 확인
setup_nginx_autostart() {
    log_info "Nginx 자동 시작 설정 확인 중..."
    
    if command -v nginx &> /dev/null; then
        sudo systemctl enable nginx
        sudo systemctl start nginx
        log_success "Nginx 자동 시작 설정 완료"
    else
        log_warning "Nginx가 설치되지 않았습니다"
    fi
}

# 상태 확인
check_status() {
    echo ""
    log_info "서비스 상태 확인 중..."
    echo ""
    
    # PM2 상태
    if command -v pm2 &> /dev/null; then
        echo "📊 PM2 프로세스 상태:"
        pm2 list
        echo ""
    fi
    
    # systemd 서비스 상태
    if systemctl is-enabled msp-main.service &> /dev/null; then
        echo "🔧 systemd 서비스 상태:"
        echo "  - msp-main: $(systemctl is-active msp-main.service)"
        echo "  - msp-admin: $(systemctl is-active msp-admin.service)"
        echo ""
    fi
    
    # Nginx 상태
    if command -v nginx &> /dev/null; then
        echo "🌐 Nginx 상태: $(systemctl is-active nginx)"
        echo ""
    fi
}

# 완료 메시지
show_completion() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 자동 시작 설정 완료! 🎉                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "✅ OS 리부팅 시 다음 서비스가 자동으로 시작됩니다:"
    echo "   - MSP Checklist 메인 서비스 (포트 3010)"
    echo "   - MSP Checklist Admin 서비스 (포트 3011)"
    echo "   - Nginx 리버스 프록시 (포트 80)"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "   - PM2 상태 확인: pm2 status"
    echo "   - PM2 로그 확인: pm2 logs"
    echo "   - 서비스 재시작: pm2 restart all"
    echo "   - systemd 상태: sudo systemctl status msp-main msp-admin"
    echo ""
    echo "🔄 리부팅 테스트:"
    echo "   sudo reboot"
    echo ""
}

# 메인 실행
main() {
    detect_os
    
    echo ""
    echo "자동 시작 설정 방식을 선택하세요:"
    echo "1) PM2 (권장) - 프로세스 관리 및 모니터링 기능 포함"
    echo "2) systemd - 시스템 서비스로 등록"
    echo "3) 둘 다 설정"
    echo ""
    read -p "선택 (1/2/3) [기본: 1]: " choice
    choice=${choice:-1}
    
    case $choice in
        1)
            setup_pm2_autostart
            ;;
        2)
            setup_systemd_services
            ;;
        3)
            setup_pm2_autostart
            setup_systemd_services
            ;;
        *)
            setup_pm2_autostart
            ;;
    esac
    
    setup_nginx_autostart
    check_status
    show_completion
}

main "$@"
