#!/bin/bash

# MSP Checklist 자동 설치 스크립트 (Ubuntu & Amazon Linux 2023 지원)
# OS를 자동 감지하여 적절한 설치 스크립트를 실행합니다.

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

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         MSP Checklist 자동 설치 스크립트                  ║"
    echo "║                                                            ║"
    echo "║  🐧 Ubuntu 22.04 LTS 자동 지원                           ║"
    echo "║  🚀 Amazon Linux 2023 자동 지원                          ║"
    echo "║  🔍 OS 자동 감지 및 최적화된 설치                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# OS 감지 함수
detect_os() {
    log_info "운영체제 감지 중..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME="$NAME"
        OS_VERSION="$VERSION"
        
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            PACKAGE_MANAGER="apt"
            USER_NAME="ubuntu"
            log_success "Ubuntu 감지됨: $OS_NAME $OS_VERSION"
            
        elif [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
            OS_TYPE="amazon-linux-2023"
            PACKAGE_MANAGER="dnf"
            USER_NAME="ec2-user"
            log_success "Amazon Linux 2023 감지됨: $OS_NAME $OS_VERSION"
            
        else
            log_error "지원되지 않는 운영체제입니다: $OS_NAME"
            echo "지원되는 OS:"
            echo "- Ubuntu 22.04 LTS"
            echo "- Amazon Linux 2023"
            exit 1
        fi
    else
        log_error "/etc/os-release 파일을 찾을 수 없습니다."
        exit 1
    fi
}

# 패키지 관리자별 시스템 업데이트
update_system() {
    log_info "시스템 패키지 업데이트 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu 업데이트
        sudo apt update -y
        sudo apt upgrade -y
        sudo apt install -y curl wget git nginx sqlite3 htop unzip build-essential
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux 2023 업데이트
        sudo dnf update -y
        
        # curl 충돌 문제 해결
        if ! curl --version > /dev/null 2>&1; then
            log_warning "curl 패키지 충돌 해결 중..."
            sudo dnf remove -y curl-minimal 2>/dev/null || true
            sudo dnf install -y curl --allowerasing 2>/dev/null || true
        fi
        
        sudo dnf install -y curl wget git nginx sqlite htop unzip gcc gcc-c++ make
        sudo dnf groupinstall -y 'Development Tools'
    fi
    
    log_success "시스템 업데이트 완료"
}

# 프로젝트 클론
clone_project() {
    log_info "MSP Checklist 프로젝트 클론 중..."
    
    cd /opt
    
    # 기존 디렉토리 제거
    if [ -d "msp-checklist-system" ]; then
        log_warning "기존 msp-checklist-system 디렉토리 제거 중..."
        sudo rm -rf msp-checklist-system
    fi
    
    if [ -d "msp-checklist" ]; then
        log_warning "기존 msp-checklist 디렉토리 제거 중..."
        sudo rm -rf msp-checklist
    fi
    
    # Git 클론
    sudo git clone https://github.com/randykwon/msp-checklist-system.git
    
    # 소유권 설정
    sudo chown -R $USER_NAME:$USER_NAME msp-checklist-system
    
    # 실행 권한 부여
    cd msp-checklist-system
    sudo chmod +x *.sh
    
    log_success "프로젝트 클론 완료"
}

# OS별 설치 스크립트 실행
run_installation() {
    log_info "OS별 최적화된 설치 스크립트 실행 중..."
    
    cd /opt/msp-checklist-system
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        log_info "Ubuntu 전용 설치 스크립트 실행 중..."
        
        # Ubuntu 설치 스크립트 우선순위
        if [ -f "ubuntu-robust-install.sh" ]; then
            log_info "Ubuntu 강화 설치 스크립트 실행..."
            sudo ./ubuntu-robust-install.sh
            
        elif [ -f "ubuntu-deploy.sh" ]; then
            log_info "Ubuntu 배포 스크립트 실행..."
            sudo ./ubuntu-deploy.sh
            
        elif [ -f "ubuntu-quick-setup.sh" ]; then
            log_info "Ubuntu 빠른 설정 스크립트 실행..."
            sudo ./ubuntu-quick-setup.sh
            
        else
            log_warning "Ubuntu 전용 설치 스크립트를 찾을 수 없습니다. 통합 설치 스크립트를 실행합니다."
            
            # 통합 설치 스크립트가 있다면 실행
            if [ -f "amazon-linux-2023-unified-installer.sh" ]; then
                sudo ./amazon-linux-2023-unified-installer.sh
            else
                log_error "설치 스크립트를 찾을 수 없습니다."
                exit 1
            fi
        fi
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        log_info "Amazon Linux 2023 전용 설치 스크립트 실행 중..."
        
        # Amazon Linux 설치 스크립트 우선순위
        if [ -f "amazon-linux-2023-unified-installer.sh" ]; then
            log_info "Amazon Linux 2023 통합 설치 스크립트 실행..."
            sudo ./amazon-linux-2023-unified-installer.sh
            
        elif [ -f "amazon-linux-2023-complete-installer.sh" ]; then
            log_info "Amazon Linux 2023 완전 설치 스크립트 실행..."
            sudo ./amazon-linux-2023-complete-installer.sh
            
        elif [ -f "amazon-linux-robust-install.sh" ]; then
            log_info "Amazon Linux 강화 설치 스크립트 실행..."
            sudo ./amazon-linux-robust-install.sh
            
        elif [ -f "amazon-linux-install.sh" ]; then
            log_info "Amazon Linux 기본 설치 스크립트 실행..."
            sudo ./amazon-linux-install.sh
            
        elif [ -f "amazon-linux-quick-setup.sh" ]; then
            log_info "Amazon Linux 빠른 설정 스크립트 실행..."
            sudo ./amazon-linux-quick-setup.sh
            
        else
            log_error "Amazon Linux 2023 설치 스크립트를 찾을 수 없습니다."
            exit 1
        fi
    fi
    
    log_success "설치 스크립트 실행 완료"
}

# 설치 후 검증
verify_installation() {
    log_info "설치 검증 중..."
    
    # 디렉토리 확인
    if [ -d "/opt/msp-checklist-system/msp-checklist" ]; then
        log_success "✅ MSP Checklist 디렉토리 확인됨"
    else
        log_error "❌ MSP Checklist 디렉토리 없음"
        return 1
    fi
    
    # 빌드 파일 확인
    if [ -d "/opt/msp-checklist-system/msp-checklist/.next" ]; then
        log_success "✅ 메인 애플리케이션 빌드 확인됨"
    else
        log_warning "⚠️ 메인 애플리케이션 빌드 파일 없음"
    fi
    
    if [ -d "/opt/msp-checklist-system/msp-checklist/admin/.next" ]; then
        log_success "✅ 관리자 시스템 빌드 확인됨"
    else
        log_warning "⚠️ 관리자 시스템 빌드 파일 없음"
    fi
    
    # 서버 프로세스 확인
    if pgrep -f "node.*msp" > /dev/null; then
        log_success "✅ MSP Checklist 서버 실행 중"
    else
        log_warning "⚠️ MSP Checklist 서버가 실행되지 않음"
    fi
    
    log_success "설치 검증 완료"
}

# 설치 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 🎉 설치 완료! 🎉                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 시스템이 성공적으로 설치되었습니다!"
    
    # 공용 IP 주소 가져오기
    if command -v curl > /dev/null; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    elif command -v wget > /dev/null; then
        PUBLIC_IP=$(wget -qO- http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || wget -qO- http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    else
        PUBLIC_IP="YOUR_SERVER_IP"
    fi
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    echo "- 메인 서비스: http://$PUBLIC_IP:3010"
    echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
    echo ""
    echo "💻 감지된 시스템 정보:"
    echo "- OS: $OS_NAME $OS_VERSION"
    echo "- 패키지 관리자: $PACKAGE_MANAGER"
    echo "- 사용자: $USER_NAME"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "- 서버 상태 확인: cd /opt/msp-checklist-system && ./server-status.sh"
    echo "- 서버 재시작: cd /opt/msp-checklist-system && ./restart-servers.sh"
    echo "- 로그 확인: cd /opt/msp-checklist-system && tail -f server.log"
    echo ""
    echo "📝 다음 단계:"
    echo "1. AWS 보안 그룹에서 포트 3010, 3011 인바운드 규칙 확인"
    echo "2. 환경 변수 설정: nano /opt/msp-checklist-system/msp-checklist/.env.local"
    echo "3. 관리자 계정 생성: cd /opt/msp-checklist-system && node create-admin.cjs"
    echo ""
}

# 오류 처리 함수
handle_error() {
    log_error "설치 중 오류가 발생했습니다."
    echo ""
    echo "문제 해결 방법:"
    echo "1. 네트워크 연결 확인"
    echo "2. 디스크 공간 확인: df -h"
    echo "3. 메모리 확인: free -h"
    echo "4. 로그 확인: journalctl -xe"
    echo ""
    echo "수동 설치 방법:"
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        echo "- Ubuntu: cd /opt/msp-checklist-system && sudo ./ubuntu-deploy.sh"
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        echo "- Amazon Linux: cd /opt/msp-checklist-system && sudo ./amazon-linux-2023-unified-installer.sh"
    fi
    
    exit 1
}

# 메인 실행 함수
main() {
    # 배너 출력
    show_banner
    
    # 사용자 확인
    read -p "MSP Checklist 자동 설치를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치가 취소되었습니다."
        exit 0
    fi
    
    # 오류 처리 설정
    trap handle_error ERR
    
    # 설치 과정 실행
    detect_os
    update_system
    clone_project
    run_installation
    verify_installation
    show_completion_info
    
    log_success "모든 설치 과정이 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"

