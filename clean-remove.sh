#!/bin/bash

# MSP Checklist 완전 제거 스크립트 (Amazon Linux 2023)
# 주의: 이 스크립트는 모든 관련 파일과 설정을 제거합니다.

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

echo -e "${RED}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ⚠️  경고  ⚠️                           ║"
echo "║                                                            ║"
echo "║  이 스크립트는 MSP Checklist 시스템을 완전히 제거합니다.  ║"
echo "║  모든 데이터, 설정, 로그가 삭제됩니다.                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

read -p "정말로 완전히 제거하시겠습니까? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "제거가 취소되었습니다."
    exit 0
fi

echo ""
log_info "MSP Checklist 시스템 완전 제거를 시작합니다..."

# 1단계: 실행 중인 프로세스 중지
log_info "1단계: 실행 중인 프로세스 중지..."
pm2 kill 2>/dev/null || true
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

# 2단계: 시스템 서비스 제거
log_info "2단계: 시스템 서비스 제거..."
sudo systemctl stop msp-checklist 2>/dev/null || true
sudo systemctl disable msp-checklist 2>/dev/null || true
sudo rm -f /etc/systemd/system/msp-checklist.service
sudo systemctl daemon-reload 2>/dev/null || true

# crontab 정리
crontab -l 2>/dev/null | grep -v msp-checklist | crontab - 2>/dev/null || true

log_success "시스템 서비스 제거 완료"

# 3단계: 애플리케이션 파일 제거
log_info "3단계: 애플리케이션 파일 제거..."
sudo rm -rf /opt/msp-checklist
rm -rf ~/msp-checklist
rm -rf ~/msp-qna
rm -rf ~/.npm/_logs/*msp* 2>/dev/null || true
rm -rf ~/.pm2 2>/dev/null || true

log_success "애플리케이션 파일 제거 완료"

# 4단계: 방화벽 규칙 정리
log_info "4단계: 방화벽 규칙 정리..."
sudo firewall-cmd --permanent --remove-port=3010/tcp 2>/dev/null || true
sudo firewall-cmd --permanent --remove-port=3011/tcp 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true

log_success "방화벽 규칙 정리 완료"

# 5단계: 로그 파일 정리
log_info "5단계: 로그 파일 정리..."
sudo rm -f /var/log/msp-checklist* 2>/dev/null || true
sudo rm -f /var/log/node* 2>/dev/null || true
sudo journalctl --vacuum-time=1d 2>/dev/null || true

log_success "로그 파일 정리 완료"

# 6단계: Node.js 제거 (선택사항)
read -p "Node.js도 함께 제거하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "6단계: Node.js 제거..."
    sudo dnf remove -y nodejs npm 2>/dev/null || true
    sudo rm -rf /usr/local/bin/node 2>/dev/null || true
    sudo rm -rf /usr/local/bin/npm 2>/dev/null || true
    sudo rm -rf /usr/local/lib/node_modules 2>/dev/null || true
    rm -rf ~/.npm 2>/dev/null || true
    rm -rf ~/.node-gyp 2>/dev/null || true
    rm -rf ~/.config/configstore/update-notifier-npm.json 2>/dev/null || true
    log_success "Node.js 제거 완료"
else
    log_info "Node.js는 유지됩니다."
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    제거 완료! ✅                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "MSP Checklist 시스템이 완전히 제거되었습니다!"
echo ""
echo "재설치를 원하시면 다음 가이드를 참조하세요:"
echo "- AMAZON_LINUX_2023_CLEAN_REMOVAL_GUIDE.md"
echo "- AWS_DEPLOYMENT_GUIDE.md"
echo ""