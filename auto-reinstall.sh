#!/bin/bash

# MSP Checklist 자동 재설치 스크립트
# OS를 자동 감지하고 적절한 재설치 스크립트를 실행합니다.

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

# 배너 출력
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist 자동 재설치 스크립트                ║"
echo "║                                                            ║"
echo "║  OS를 자동 감지하고 적절한 재설치 스크립트를 실행합니다.  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# OS 감지
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    log_error "OS를 감지할 수 없습니다."
    exit 1
fi

log_info "감지된 OS: $OS $VERSION"

# OS별 재설치 스크립트 실행
case "$OS" in
    "Ubuntu")
        if [[ "$VERSION" == "22.04" ]]; then
            log_info "Ubuntu 22.04 LTS 재설치 스크립트를 실행합니다..."
            
            if [ -f "ubuntu-reinstall.sh" ]; then
                chmod +x ubuntu-reinstall.sh
                ./ubuntu-reinstall.sh
            else
                log_error "ubuntu-reinstall.sh 파일을 찾을 수 없습니다."
                log_info "다음 명령어로 다운로드하세요:"
                echo "curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ubuntu-reinstall.sh -o ubuntu-reinstall.sh"
                exit 1
            fi
        else
            log_warning "Ubuntu $VERSION는 테스트되지 않았습니다. Ubuntu 22.04 LTS를 권장합니다."
            read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ -f "ubuntu-reinstall.sh" ]; then
                    chmod +x ubuntu-reinstall.sh
                    ./ubuntu-reinstall.sh
                else
                    log_error "ubuntu-reinstall.sh 파일을 찾을 수 없습니다."
                    exit 1
                fi
            else
                exit 0
            fi
        fi
        ;;
    "Amazon Linux")
        if [[ "$VERSION" == "2023" ]]; then
            log_info "Amazon Linux 2023 재설치 스크립트를 실행합니다..."
            
            if [ -f "amazon-linux-reinstall.sh" ]; then
                chmod +x amazon-linux-reinstall.sh
                ./amazon-linux-reinstall.sh
            else
                log_error "amazon-linux-reinstall.sh 파일을 찾을 수 없습니다."
                log_info "다음 명령어로 다운로드하세요:"
                echo "curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/amazon-linux-reinstall.sh -o amazon-linux-reinstall.sh"
                exit 1
            fi
        else
            log_warning "Amazon Linux $VERSION는 테스트되지 않았습니다. Amazon Linux 2023을 권장합니다."
            read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ -f "amazon-linux-reinstall.sh" ]; then
                    chmod +x amazon-linux-reinstall.sh
                    ./amazon-linux-reinstall.sh
                else
                    log_error "amazon-linux-reinstall.sh 파일을 찾을 수 없습니다."
                    exit 1
                fi
            else
                exit 0
            fi
        fi
        ;;
    *)
        log_error "지원하지 않는 OS입니다: $OS"
        log_info "지원하는 OS:"
        echo "- Ubuntu 22.04 LTS"
        echo "- Amazon Linux 2023"
        echo ""
        log_info "수동으로 적절한 재설치 스크립트를 실행하세요:"
        echo "- Ubuntu: ./ubuntu-reinstall.sh"
        echo "- Amazon Linux: ./amazon-linux-reinstall.sh"
        exit 1
        ;;
esac

log_success "재설치 스크립트 실행이 완료되었습니다!"