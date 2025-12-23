#!/bin/bash

# MSP Checklist 강화된 설치 스크립트 (Amazon Linux 2023)
# 설치 중 장애 및 정지 상태 방지를 위한 개선된 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 전역 변수
INSTALL_DIR="/opt/msp-checklist"
REPO_URL="https://github.com/randykwon/msp-checklist-system.git"
LOG_FILE="/tmp/msp-install-$(date +%Y%m%d_%H%M%S).log"
MAX_RETRIES=3
TIMEOUT_SECONDS=300

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# 오류 발생 시 정리 함수
cleanup_on_error() {
    log_error "설치 중 오류가 발생했습니다. 정리 작업을 수행합니다..."
    
    # 실행 중인 프로세스 정리
    sudo pkill -f "npm install" 2>/dev/null || true
    sudo pkill -f "node.*install" 2>/dev/null || true
    
    # 임시 파일 정리
    rm -rf /tmp/node-* 2>/dev/null || true
    
    log_info "로그 파일: $LOG_FILE"
    log_info "문제 해결을 위해 로그를 확인하세요."
    
    exit 1
}

# 시그널 핸들러 설정
trap cleanup_on_error ERR
trap cleanup_on_error INT
trap cleanup_on_error TERM

# 시스템 요구사항 검증
check_system_requirements() {
    log_step "시스템 요구사항 검증 중..."
    
    # OS 확인
    if ! grep -q "Amazon Linux" /etc/os-release; then
        log_error "이 스크립트는 Amazon Linux 2023에서만 실행할 수 있습니다."
        exit 1
    fi
    
    # 메모리 확인 (최소 1GB)
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    
    if [ $MEMORY_GB -lt 1 ]; then
        log_error "최소 1GB 메모리가 필요합니다. 현재: ${MEMORY_GB}GB"
        exit 1
    fi
    
    # 디스크 공간 확인 (최소 5GB)
    DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
    DISK_GB=$((DISK_AVAILABLE / 1024 / 1024))
    
    if [ $DISK_GB -lt 5 ]; then
        log_error "최소 5GB 디스크 공간이 필요합니다. 현재: ${DISK_GB}GB"
        exit 1
    fi
    
    # 네트워크 연결 확인
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log_error "인터넷 연결 없음"
        exit 1
    fi
    
    # GitHub 연결 확인 (curl 또는 wget 사용)
    if command -v curl > /dev/null; then
        if ! curl -s --connect-timeout 10 https://github.com > /dev/null; then
            log_error "GitHub 연결 실패"
            exit 1
        fi
    elif command -v wget > /dev/null; then
        if ! wget --timeout=10 --tries=1 -q --spider https://github.com; then
            log_error "GitHub 연결 실패"
            exit 1
        fi
    else
        log_warning "curl 또는 wget이 없어 GitHub 연결을 확인할 수 없습니다"
    fi
    
    log_success "시스템 요구사항 검증 완료"
}

# 재시도 함수
retry_command() {
    local cmd="$1"
    local description="$2"
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        log_info "$description (시도 $((retries + 1))/$MAX_RETRIES)"
        
        if timeout $TIMEOUT_SECONDS bash -c "$cmd"; then
            return 0
        else
            retries=$((retries + 1))
            if [ $retries -lt $MAX_RETRIES ]; then
                log_warning "실패했습니다. 5초 후 재시도합니다..."
                sleep 5
            fi
        fi
    done
    
    log_error "$description 실패 (최대 재시도 횟수 초과)"
    return 1
}

# 메모리 최적화
optimize_memory() {
    log_step "메모리 최적화 설정 중..."
    
    # 스왑 파일 생성 (메모리가 2GB 미만인 경우)
    if [ $MEMORY_GB -lt 2 ] && [ ! -f /swapfile ]; then
        log_info "스왑 파일 생성 중..."
        
        sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152 2>/dev/null
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # 영구 설정
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "2GB 스왑 파일 생성 완료"
    fi
    
    # Node.js 메모리 제한 설정
    export NODE_OPTIONS="--max-old-space-size=1536"
    
    # 시스템 메모리 최적화
    echo 'vm.swappiness = 10' | sudo tee -a /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure = 50' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p 2>/dev/null || true
    
    log_success "메모리 최적화 완료"
}

# 기존 설치 정리
cleanup_existing_installation() {
    log_step "기존 설치 정리 중..."
    
    # 실행 중인 프로세스 중지
    sudo pkill -f "node.*msp" 2>/dev/null || true
    sudo pkill -f "npm.*start" 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    
    # 포트 사용 프로세스 정리
    for port in 3010 3011; do
        PID=$(sudo ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
        if [ ! -z "$PID" ]; then
            log_info "포트 $port 사용 프로세스 $PID 종료 중..."
            sudo kill -9 $PID 2>/dev/null || true
            sleep 2
        fi
    done
    
    # 기존 디렉토리 정리
    if [ -d "$INSTALL_DIR" ]; then
        log_info "기존 설치 디렉토리 제거 중..."
        sudo rm -rf "$INSTALL_DIR"
    fi
    
    # npm 캐시 정리
    npm cache clean --force 2>/dev/null || true
    sudo npm cache clean --force 2>/dev/null || true
    
    log_success "기존 설치 정리 완료"
}

# 시스템 업데이트
update_system() {
    log_step "시스템 업데이트 중..."
    
    retry_command "sudo dnf update -y" "시스템 패키지 업데이트"
    
    # curl 충돌 문제 해결
    log_info "curl 패키지 충돌 확인 및 해결 중..."
    if ! curl --version > /dev/null 2>&1; then
        log_warning "curl 명령어를 사용할 수 없습니다. 패키지 충돌 해결 중..."
        
        # curl-minimal 제거 후 curl 설치 시도
        if sudo dnf remove -y curl-minimal 2>/dev/null; then
            log_info "curl-minimal 제거 완료"
        fi
        
        if sudo dnf install -y curl --allowerasing 2>/dev/null; then
            log_success "curl 설치 완료"
        elif sudo dnf swap -y curl-minimal curl 2>/dev/null; then
            log_success "curl-minimal을 curl로 교체 완료"
        else
            log_warning "curl 설치 실패, wget 사용으로 계속 진행"
        fi
    fi
    
    retry_command "sudo dnf install -y wget git gcc gcc-c++ make python3 python3-pip" "필수 패키지 설치"
    retry_command "sudo dnf groupinstall -y 'Development Tools'" "개발 도구 설치"
    
    log_success "시스템 업데이트 완료"
}

# Node.js 설치
install_nodejs() {
    log_step "Node.js 20.9.0 설치 중..."
    
    # 기존 Node.js 제거
    sudo dnf remove -y nodejs npm 2>/dev/null || true
    
    # NodeSource 저장소 추가 및 설치 (curl 또는 wget 사용)
    if command -v curl > /dev/null; then
        retry_command "curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -" "NodeSource 저장소 추가"
    elif command -v wget > /dev/null; then
        retry_command "wget -qO- https://rpm.nodesource.com/setup_20.x | sudo bash -" "NodeSource 저장소 추가"
    else
        log_error "curl 또는 wget이 필요합니다"
        exit 1
    fi
    
    retry_command "sudo dnf install -y nodejs" "Node.js 설치"
    
    # 버전 확인
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log_info "설치된 Node.js 버전: $NODE_VERSION"
    log_info "설치된 npm 버전: $NPM_VERSION"
    
    # npm 설정 최적화
    npm config set registry https://registry.npmjs.org/
    npm config set fetch-timeout 600000
    npm config set fetch-retry-mintimeout 10000
    npm config set fetch-retry-maxtimeout 60000
    npm config set fetch-retries 5
    
    log_success "Node.js 설치 완료"
}

# 방화벽 설정
configure_firewall() {
    log_step "방화벽 설정 중..."
    
    # firewalld 설치 확인 및 설치
    if ! command -v firewall-cmd > /dev/null; then
        log_info "firewalld 설치 중..."
        retry_command "sudo dnf install -y firewalld" "firewalld 설치"
    fi
    
    # firewalld 서비스 시작
    if ! sudo systemctl start firewalld 2>/dev/null; then
        log_warning "firewalld 시작 실패, 설치 후 재시도..."
        retry_command "sudo dnf install -y firewalld" "firewalld 재설치"
        
        # 서비스 데몬 리로드
        sudo systemctl daemon-reload
        
        if ! sudo systemctl start firewalld 2>/dev/null; then
            log_warning "firewalld를 사용할 수 없습니다. iptables로 대체합니다."
            
            # iptables 사용
            if command -v iptables > /dev/null; then
                log_info "iptables로 방화벽 설정 중..."
                
                # 기본 정책 설정 (허용)
                sudo iptables -P INPUT ACCEPT
                sudo iptables -P FORWARD ACCEPT
                sudo iptables -P OUTPUT ACCEPT
                
                # 기존 규칙 정리
                sudo iptables -F
                
                # 기본 허용 규칙
                sudo iptables -A INPUT -i lo -j ACCEPT
                sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
                
                # SSH 허용 (포트 22)
                sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
                
                # MSP Checklist 포트 허용
                sudo iptables -A INPUT -p tcp --dport 3010 -j ACCEPT
                sudo iptables -A INPUT -p tcp --dport 3011 -j ACCEPT
                
                # 규칙 저장 시도
                if command -v iptables-save > /dev/null; then
                    sudo iptables-save > /tmp/iptables.rules 2>/dev/null || true
                fi
                
                log_success "iptables 방화벽 설정 완료"
            else
                log_warning "방화벽 설정을 건너뜁니다. AWS 보안 그룹에서 포트를 허용하세요."
            fi
            return 0
        fi
    fi
    
    # firewalld 자동 시작 설정
    sudo systemctl enable firewalld
    
    # 포트 열기
    sudo firewall-cmd --permanent --add-port=3010/tcp
    sudo firewall-cmd --permanent --add-port=3011/tcp
    sudo firewall-cmd --reload
    
    log_success "firewalld 방화벽 설정 완료"
}

# 프로젝트 클론
clone_project() {
    log_step "프로젝트 클론 중..."
    
    # 디렉토리 생성 및 권한 설정
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown -R $USER:$USER "$INSTALL_DIR"
    
    cd "$INSTALL_DIR"
    
    # Git 클론 (재시도 포함)
    retry_command "git clone $REPO_URL ." "프로젝트 클론"
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null || true
    chmod +x msp-checklist/*.sh 2>/dev/null || true
    
    log_success "프로젝트 클론 완료"
}

# 의존성 설치 (단계별)
install_dependencies() {
    log_step "의존성 설치 중..."
    
    cd "$INSTALL_DIR"
    
    # 1. 프로젝트 루트 의존성
    log_info "프로젝트 루트 의존성 설치 중..."
    retry_command "npm install --no-optional" "프로젝트 루트 의존성 설치"
    
    # 2. MSP 체크리스트 의존성
    log_info "MSP 체크리스트 의존성 설치 중..."
    cd msp-checklist
    
    # 기존 설치 정리
    rm -rf node_modules package-lock.json
    
    # 단계별 설치
    retry_command "npm install --no-optional --legacy-peer-deps --verbose" "MSP 체크리스트 의존성 설치"
    
    # 3. 관리자 시스템 의존성
    log_info "관리자 시스템 의존성 설치 중..."
    cd admin
    
    rm -rf node_modules package-lock.json
    retry_command "npm install --no-optional --verbose" "관리자 시스템 의존성 설치"
    
    cd ..
    log_success "의존성 설치 완료"
}

# 환경 변수 설정
setup_environment() {
    log_step "환경 변수 설정 중..."
    
    cd "$INSTALL_DIR"
    
    # MSP 체크리스트 환경 변수
    if [ -f "msp-checklist/.env.local.example" ] && [ ! -f "msp-checklist/.env.local" ]; then
        cp msp-checklist/.env.local.example msp-checklist/.env.local
        log_info "MSP 체크리스트 환경 변수 파일 생성됨"
    fi
    
    # 관리자 시스템 환경 변수
    if [ -f "msp-checklist/admin/.env.local.example" ] && [ ! -f "msp-checklist/admin/.env.local" ]; then
        cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local
        log_info "관리자 시스템 환경 변수 파일 생성됨"
    fi
    
    log_success "환경 변수 설정 완료"
}

# 애플리케이션 빌드
build_application() {
    log_step "애플리케이션 빌드 중..."
    
    cd "$INSTALL_DIR"
    
    # MSP 체크리스트 빌드
    log_info "MSP 체크리스트 빌드 중..."
    cd msp-checklist
    retry_command "npm run build" "MSP 체크리스트 빌드"
    
    # 관리자 시스템 빌드
    log_info "관리자 시스템 빌드 중..."
    cd admin
    retry_command "npm run build" "관리자 시스템 빌드"
    
    cd ..
    log_success "애플리케이션 빌드 완료"
}

# 서버 시작
start_server() {
    log_step "서버 시작 중..."
    
    cd "$INSTALL_DIR"
    
    # 서버 시작
    ./restart-server.sh
    
    # 시작 대기
    sleep 15
    
    # 상태 확인 (curl 또는 wget 사용)
    if command -v curl > /dev/null; then
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
    elif command -v wget > /dev/null; then
        if wget --timeout=5 --tries=1 -q --spider http://localhost:3010; then
            log_success "메인 서버가 정상적으로 실행 중입니다!"
        else
            log_warning "메인 서버 상태를 확인할 수 없습니다."
        fi
        
        if wget --timeout=5 --tries=1 -q --spider http://localhost:3011; then
            log_success "관리자 서버가 정상적으로 실행 중입니다!"
        else
            log_warning "관리자 서버 상태를 확인할 수 없습니다."
        fi
    else
        log_warning "curl 또는 wget이 없어 서버 상태를 확인할 수 없습니다."
    fi
}

# 설치 검증
verify_installation() {
    log_step "설치 검증 중..."
    
    cd "$INSTALL_DIR"
    
    # 파일 존재 확인
    if [ ! -f "msp-checklist/package.json" ]; then
        log_error "MSP 체크리스트 파일이 없습니다."
        return 1
    fi
    
    if [ ! -f "msp-checklist/admin/package.json" ]; then
        log_error "관리자 시스템 파일이 없습니다."
        return 1
    fi
    
    # 프로세스 확인
    if ! pgrep -f "node.*3010" > /dev/null; then
        log_warning "메인 서버 프로세스를 찾을 수 없습니다."
    fi
    
    if ! pgrep -f "node.*3011" > /dev/null; then
        log_warning "관리자 서버 프로세스를 찾을 수 없습니다."
    fi
    
    # 네트워크 연결 확인 (curl 또는 wget 사용)
    if command -v curl > /dev/null; then
        if curl -f http://localhost:3010 > /dev/null 2>&1; then
            log_success "메인 서버 연결 확인 완료"
        fi
        if curl -f http://localhost:3011 > /dev/null 2>&1; then
            log_success "관리자 서버 연결 확인 완료"
        fi
    elif command -v wget > /dev/null; then
        if wget --timeout=5 --tries=1 -q --spider http://localhost:3010; then
            log_success "메인 서버 연결 확인 완료"
        fi
        if wget --timeout=5 --tries=1 -q --spider http://localhost:3011; then
            log_success "관리자 서버 연결 확인 완료"
        fi
    fi
    
    log_success "설치 검증 완료"
}

# 메인 설치 함수
main() {
    # 배너 출력
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         MSP Checklist 강화된 설치 스크립트                ║"
    echo "║                Amazon Linux 2023                          ║"
    echo "║                                                            ║"
    echo "║  장애 방지 및 안정성 강화 버전                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    log_info "설치 로그: $LOG_FILE"
    
    # 사용자 확인
    read -p "강화된 설치를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치가 취소되었습니다."
        exit 0
    fi
    
    # 시작 시간 기록
    START_TIME=$(date +%s)
    
    # 설치 단계 실행
    check_system_requirements
    optimize_memory
    cleanup_existing_installation
    update_system
    install_nodejs
    configure_firewall
    clone_project
    install_dependencies
    setup_environment
    build_application
    start_server
    verify_installation
    
    # 완료 시간 계산
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    # 완료 메시지
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    설치 완료! 🎉                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 시스템 설치가 완료되었습니다!"
    log_info "설치 시간: ${MINUTES}분 ${SECONDS}초"
    
    # 접속 정보 표시
    if command -v curl > /dev/null; then
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
    elif command -v wget > /dev/null; then
        PUBLIC_IP=$(wget -qO- http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
    else
        PUBLIC_IP="YOUR_SERVER_IP"
    fi
    echo ""
    echo "🌐 서비스 접속 주소:"
    echo "- 메인 서비스: http://$PUBLIC_IP:3010"
    echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "- 서버 상태 확인: cd $INSTALL_DIR && ./server-status.sh"
    echo "- 서버 재시작: cd $INSTALL_DIR && ./restart-server.sh"
    echo "- 로그 확인: cd $INSTALL_DIR && tail -f server.log"
    echo ""
    echo "📝 다음 단계:"
    echo "1. 환경 변수 설정: nano $INSTALL_DIR/msp-checklist/.env.local"
    echo "2. AI 기능 사용을 위한 API 키 설정"
    echo "3. AWS 보안 그룹에서 포트 3010, 3011 인바운드 규칙 확인"
    echo ""
    echo "📋 설치 로그: $LOG_FILE"
    
    log_success "설치가 완전히 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"