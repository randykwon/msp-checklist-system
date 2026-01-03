#!/bin/bash

# ============================================================================
# MSP Checklist System - 자동 시작 설정 스크립트
# 서버 재부팅 시 자동으로 서비스가 시작되도록 systemd 서비스 등록
# ============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 프로젝트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist - 자동 시작 설정                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    log_error "이 스크립트는 root 권한이 필요합니다."
    echo "다음 명령어로 실행하세요: sudo $0"
    exit 1
fi

# Node.js 경로 확인
NODE_PATH=$(which node 2>/dev/null || echo "")
if [ -z "$NODE_PATH" ]; then
    if [ -f "/root/.nvm/nvm.sh" ]; then
        source /root/.nvm/nvm.sh
        NODE_PATH=$(which node)
    fi
fi

if [ -z "$NODE_PATH" ]; then
    log_error "Node.js를 찾을 수 없습니다."
    exit 1
fi

log_info "Node.js 경로: $NODE_PATH"
log_info "프로젝트 경로: $PROJECT_DIR"

# 로그 디렉토리 생성
mkdir -p "$PROJECT_DIR/logs"

# 시작 스크립트 생성
cat > "$PROJECT_DIR/start-main.sh" << EOF
#!/bin/bash
export HOME=/root
export NVM_DIR="/root/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
cd $PROJECT_DIR/msp-checklist
exec node node_modules/.bin/next start -p $MAIN_PORT
EOF
chmod +x "$PROJECT_DIR/start-main.sh"

cat > "$PROJECT_DIR/start-admin.sh" << EOF
#!/bin/bash
export HOME=/root
export NVM_DIR="/root/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
cd $PROJECT_DIR/msp-checklist/admin
exec node node_modules/.bin/next start -p $ADMIN_PORT
EOF
chmod +x "$PROJECT_DIR/start-admin.sh"

# 메인 서비스 파일 생성
cat > /etc/systemd/system/msp-main.service << EOF
[Unit]
Description=MSP Checklist Main Server (Port $MAIN_PORT)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/msp-checklist
Environment=NODE_ENV=production
ExecStart=$PROJECT_DIR/start-main.sh
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/main-server.log
StandardError=append:$PROJECT_DIR/logs/main-server.log

[Install]
WantedBy=multi-user.target
EOF

# Admin 서비스 파일 생성
cat > /etc/systemd/system/msp-admin.service << EOF
[Unit]
Description=MSP Checklist Admin Server (Port $ADMIN_PORT)
After=network.target msp-main.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/msp-checklist/admin
Environment=NODE_ENV=production
ExecStart=$PROJECT_DIR/start-admin.sh
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/admin-server.log
StandardError=append:$PROJECT_DIR/logs/admin-server.log

[Install]
WantedBy=multi-user.target
EOF

# systemd 리로드 및 서비스 활성화
systemctl daemon-reload
systemctl enable msp-main.service
systemctl enable msp-admin.service

# 서비스 시작
systemctl stop msp-main.service 2>/dev/null || true
systemctl stop msp-admin.service 2>/dev/null || true
sleep 2
systemctl start msp-main.service
sleep 3
systemctl start msp-admin.service

log_success "자동 시작 설정 완료"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "서비스 관리 명령어:"
echo "  sudo systemctl status msp-main    # 메인 서버 상태"
echo "  sudo systemctl status msp-admin   # Admin 서버 상태"
echo "  sudo systemctl restart msp-main   # 메인 서버 재시작"
echo "  sudo systemctl restart msp-admin  # Admin 서버 재시작"
echo "  sudo journalctl -u msp-main -f    # 메인 서버 로그"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
