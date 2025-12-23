#!/bin/bash

# MSP Checklist 설치 장애 진단 및 복구 스크립트
# 설치 중 발생할 수 있는 문제들을 자동으로 진단하고 해결합니다.

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
DIAGNOSTIC_LOG="/tmp/msp-diagnostic-$(date +%Y%m%d_%H%M%S).log"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DIAGNOSTIC_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DIAGNOSTIC_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DIAGNOSTIC_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DIAGNOSTIC_LOG"
}

log_step() {
    echo -e "${CYAN}[DIAGNOSTIC]${NC} $1" | tee -a "$DIAGNOSTIC_LOG"
}

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME=$NAME
        OS_VERSION=$VERSION_ID
    else
        OS_NAME="Unknown"
        OS_VERSION="Unknown"
    fi
    
    log_info "감지된 OS: $OS_NAME $OS_VERSION"
}

# 시스템 리소스 진단
diagnose_system_resources() {
    log_step "시스템 리소스 진단 중..."
    
    # 메모리 확인
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    MEMORY_AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEMORY_AVAILABLE_GB=$((MEMORY_AVAILABLE_KB / 1024 / 1024))
    
    log_info "총 메모리: ${MEMORY_GB}GB"
    log_info "사용 가능한 메모리: ${MEMORY_AVAILABLE_GB}GB"
    
    if [ $MEMORY_GB -lt 1 ]; then
        log_error "메모리 부족: 최소 1GB 필요, 현재 ${MEMORY_GB}GB"
        return 1
    elif [ $MEMORY_AVAILABLE_GB -lt 1 ]; then
        log_warning "사용 가능한 메모리 부족: ${MEMORY_AVAILABLE_GB}GB"
        
        # 스왑 확인
        SWAP_TOTAL=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
        if [ $SWAP_TOTAL -eq 0 ]; then
            log_warning "스왑 파일이 없습니다. 생성을 권장합니다."
        fi
    fi
    
    # 디스크 공간 확인
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
    DISK_AVAILABLE_GB=$((DISK_AVAILABLE / 1024 / 1024))
    
    log_info "디스크 사용률: ${DISK_USAGE}%"
    log_info "사용 가능한 디스크 공간: ${DISK_AVAILABLE_GB}GB"
    
    if [ $DISK_USAGE -gt 90 ]; then
        log_error "디스크 공간 부족: 사용률 ${DISK_USAGE}%"
        return 1
    elif [ $DISK_AVAILABLE_GB -lt 5 ]; then
        log_error "사용 가능한 디스크 공간 부족: ${DISK_AVAILABLE_GB}GB (최소 5GB 필요)"
        return 1
    fi
    
    log_success "시스템 리소스 진단 완료"
}

# 네트워크 연결 진단
diagnose_network() {
    log_step "네트워크 연결 진단 중..."
    
    # 기본 연결 확인
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log_error "인터넷 연결 없음"
        return 1
    fi
    
    # GitHub 연결 확인
    if ! curl -s --connect-timeout 10 https://github.com > /dev/null; then
        log_error "GitHub 연결 실패"
        return 1
    fi
    
    # npm 레지스트리 연결 확인
    if ! curl -s --connect-timeout 10 https://registry.npmjs.org > /dev/null; then
        log_error "npm 레지스트리 연결 실패"
        return 1
    fi
    
    # NodeSource 연결 확인
    if ! curl -s --connect-timeout 10 https://deb.nodesource.com > /dev/null && ! curl -s --connect-timeout 10 https://rpm.nodesource.com > /dev/null; then
        log_error "NodeSource 연결 실패"
        return 1
    fi
    
    log_success "네트워크 연결 진단 완료"
}

# 프로세스 및 포트 진단
diagnose_processes() {
    log_step "프로세스 및 포트 진단 중..."
    
    # 실행 중인 Node.js 프로세스 확인
    NODE_PROCESSES=$(pgrep -f node | wc -l)
    if [ $NODE_PROCESSES -gt 0 ]; then
        log_warning "실행 중인 Node.js 프로세스: $NODE_PROCESSES개"
        ps aux | grep -E "(node|npm)" | grep -v grep | tee -a "$DIAGNOSTIC_LOG"
    fi
    
    # 포트 사용 상태 확인
    for port in 3010 3011; do
        if command -v ss > /dev/null; then
            PORT_USAGE=$(sudo ss -tlnp | grep ":$port ")
        else
            PORT_USAGE=$(sudo netstat -tlnp | grep ":$port ")
        fi
        
        if [ ! -z "$PORT_USAGE" ]; then
            log_warning "포트 $port 사용 중:"
            echo "$PORT_USAGE" | tee -a "$DIAGNOSTIC_LOG"
        fi
    done
    
    # 좀비 프로세스 확인
    ZOMBIE_PROCESSES=$(ps aux | awk '$8 ~ /^Z/ { print $2 }' | wc -l)
    if [ $ZOMBIE_PROCESSES -gt 0 ]; then
        log_warning "좀비 프로세스: $ZOMBIE_PROCESSES개"
    fi
    
    log_success "프로세스 및 포트 진단 완료"
}

# 패키지 관리자 진단
diagnose_package_manager() {
    log_step "패키지 관리자 진단 중..."
    
    if [[ "$OS_NAME" == *"Ubuntu"* ]]; then
        # APT 잠금 확인
        if sudo lsof /var/lib/dpkg/lock-frontend 2>/dev/null; then
            log_error "APT 잠금 파일이 사용 중입니다"
            return 1
        fi
        
        # APT 소스 확인
        if ! sudo apt update > /dev/null 2>&1; then
            log_error "APT 소스 업데이트 실패"
            return 1
        fi
        
    elif [[ "$OS_NAME" == *"Amazon Linux"* ]]; then
        # DNF 상태 확인
        if ! sudo dnf check-update > /dev/null 2>&1; then
            log_warning "DNF 업데이트 확인 중 경고"
        fi
    fi
    
    log_success "패키지 관리자 진단 완료"
}

# Node.js 및 npm 진단
diagnose_nodejs() {
    log_step "Node.js 및 npm 진단 중..."
    
    # Node.js 설치 확인
    if command -v node > /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "설치된 Node.js 버전: $NODE_VERSION"
        
        # 버전 호환성 확인
        if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
            log_warning "Node.js 버전이 낮습니다. v20.9.0 이상 권장"
        fi
    else
        log_warning "Node.js가 설치되지 않았습니다"
    fi
    
    # npm 설치 확인
    if command -v npm > /dev/null; then
        NPM_VERSION=$(npm --version)
        log_info "설치된 npm 버전: $NPM_VERSION"
        
        # npm 캐시 상태 확인
        NPM_CACHE_SIZE=$(du -sh ~/.npm 2>/dev/null | awk '{print $1}' || echo "0")
        log_info "npm 캐시 크기: $NPM_CACHE_SIZE"
        
        # npm 설정 확인
        NPM_REGISTRY=$(npm config get registry)
        log_info "npm 레지스트리: $NPM_REGISTRY"
        
    else
        log_warning "npm이 설치되지 않았습니다"
    fi
    
    log_success "Node.js 및 npm 진단 완료"
}

# 방화벽 진단
diagnose_firewall() {
    log_step "방화벽 진단 중..."
    
    if [[ "$OS_NAME" == *"Ubuntu"* ]]; then
        # UFW 상태 확인
        if command -v ufw > /dev/null; then
            UFW_STATUS=$(sudo ufw status | head -1)
            log_info "UFW 상태: $UFW_STATUS"
            
            # 포트 허용 상태 확인
            for port in 3010 3011; do
                if sudo ufw status | grep -q "$port/tcp"; then
                    log_info "포트 $port: 허용됨"
                else
                    log_warning "포트 $port: 차단됨"
                fi
            done
        fi
        
    elif [[ "$OS_NAME" == *"Amazon Linux"* ]]; then
        # firewalld 상태 확인
        if command -v firewall-cmd > /dev/null; then
            if sudo systemctl is-active firewalld > /dev/null; then
                log_info "firewalld 상태: 활성"
                
                # 포트 허용 상태 확인
                ALLOWED_PORTS=$(sudo firewall-cmd --list-ports)
                log_info "허용된 포트: $ALLOWED_PORTS"
                
                for port in 3010 3011; do
                    if echo "$ALLOWED_PORTS" | grep -q "${port}/tcp"; then
                        log_info "포트 $port: 허용됨"
                    else
                        log_warning "포트 $port: 차단됨"
                    fi
                done
            else
                log_warning "firewalld가 비활성 상태입니다"
            fi
        fi
    fi
    
    log_success "방화벽 진단 완료"
}

# 파일 시스템 권한 진단
diagnose_permissions() {
    log_step "파일 시스템 권한 진단 중..."
    
    # /opt 디렉토리 권한 확인
    if [ -d "/opt" ]; then
        OPT_PERMISSIONS=$(ls -ld /opt | awk '{print $1, $3, $4}')
        log_info "/opt 권한: $OPT_PERMISSIONS"
        
        if [ ! -w "/opt" ]; then
            log_warning "/opt 디렉토리에 쓰기 권한이 없습니다"
        fi
    fi
    
    # 설치 디렉토리 권한 확인
    if [ -d "$INSTALL_DIR" ]; then
        INSTALL_PERMISSIONS=$(ls -ld "$INSTALL_DIR" | awk '{print $1, $3, $4}')
        log_info "$INSTALL_DIR 권한: $INSTALL_PERMISSIONS"
    fi
    
    # 홈 디렉토리 권한 확인
    HOME_PERMISSIONS=$(ls -ld "$HOME" | awk '{print $1, $3, $4}')
    log_info "$HOME 권한: $HOME_PERMISSIONS"
    
    # npm 캐시 디렉토리 권한 확인
    if [ -d "$HOME/.npm" ]; then
        NPM_CACHE_PERMISSIONS=$(ls -ld "$HOME/.npm" | awk '{print $1, $3, $4}')
        log_info "$HOME/.npm 권한: $NPM_CACHE_PERMISSIONS"
    fi
    
    log_success "파일 시스템 권한 진단 완료"
}

# SELinux 진단 (Amazon Linux)
diagnose_selinux() {
    if [[ "$OS_NAME" == *"Amazon Linux"* ]] && command -v getenforce > /dev/null; then
        log_step "SELinux 진단 중..."
        
        SELINUX_STATUS=$(getenforce)
        log_info "SELinux 상태: $SELINUX_STATUS"
        
        if [ "$SELINUX_STATUS" = "Enforcing" ]; then
            log_warning "SELinux가 Enforcing 모드입니다. 설치 중 문제가 발생할 수 있습니다."
            
            # SELinux 거부 로그 확인
            SELINUX_DENIALS=$(sudo ausearch -m avc -ts recent 2>/dev/null | wc -l || echo "0")
            if [ $SELINUX_DENIALS -gt 0 ]; then
                log_warning "최근 SELinux 거부 로그: $SELINUX_DENIALS개"
            fi
        fi
        
        log_success "SELinux 진단 완료"
    fi
}

# 자동 복구 함수들
auto_fix_memory() {
    log_step "메모리 문제 자동 복구 중..."
    
    # 스왑 파일 생성
    if [ ! -f /swapfile ] && [ $MEMORY_GB -lt 2 ]; then
        log_info "스왑 파일 생성 중..."
        
        if [[ "$OS_NAME" == *"Ubuntu"* ]]; then
            sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152 2>/dev/null
        else
            sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152 2>/dev/null
        fi
        
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "2GB 스왑 파일 생성 완료"
    fi
}

auto_fix_processes() {
    log_step "프로세스 문제 자동 복구 중..."
    
    # 좀비 프로세스 정리
    ZOMBIE_PIDS=$(ps aux | awk '$8 ~ /^Z/ { print $2 }')
    if [ ! -z "$ZOMBIE_PIDS" ]; then
        log_info "좀비 프로세스 정리 중..."
        echo "$ZOMBIE_PIDS" | xargs -r sudo kill -9 2>/dev/null || true
    fi
    
    # 포트 사용 프로세스 정리
    for port in 3010 3011; do
        if command -v ss > /dev/null; then
            PID=$(sudo ss -tlnp | grep ":$port " | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
        else
            PID=$(sudo netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | head -1)
        fi
        
        if [ ! -z "$PID" ]; then
            log_info "포트 $port 사용 프로세스 $PID 종료 중..."
            sudo kill -9 $PID 2>/dev/null || true
        fi
    done
}

auto_fix_package_manager() {
    log_step "패키지 관리자 문제 자동 복구 중..."
    
    if [[ "$OS_NAME" == *"Ubuntu"* ]]; then
        # APT 잠금 해제
        sudo rm -f /var/lib/dpkg/lock-frontend 2>/dev/null || true
        sudo rm -f /var/lib/dpkg/lock 2>/dev/null || true
        sudo rm -f /var/cache/apt/archives/lock 2>/dev/null || true
        
        # 손상된 패키지 복구
        sudo dpkg --configure -a 2>/dev/null || true
        
        log_success "APT 문제 복구 완료"
    fi
}

auto_fix_npm() {
    log_step "npm 문제 자동 복구 중..."
    
    if command -v npm > /dev/null; then
        # npm 캐시 정리
        npm cache clean --force 2>/dev/null || true
        sudo npm cache clean --force 2>/dev/null || true
        
        # npm 설정 최적화
        npm config set registry https://registry.npmjs.org/
        npm config set fetch-timeout 600000
        npm config set fetch-retry-mintimeout 10000
        npm config set fetch-retry-maxtimeout 60000
        npm config set fetch-retries 5
        
        log_success "npm 문제 복구 완료"
    fi
}

# 메인 진단 함수
main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         MSP Checklist 설치 장애 진단 스크립트             ║"
    echo "║                                                            ║"
    echo "║  설치 중 발생할 수 있는 문제들을 진단하고 해결합니다.     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    log_info "진단 로그: $DIAGNOSTIC_LOG"
    
    # OS 감지
    detect_os
    
    # 진단 실행
    DIAGNOSTIC_FAILED=0
    
    diagnose_system_resources || DIAGNOSTIC_FAILED=1
    diagnose_network || DIAGNOSTIC_FAILED=1
    diagnose_processes
    diagnose_package_manager || DIAGNOSTIC_FAILED=1
    diagnose_nodejs
    diagnose_firewall
    diagnose_permissions
    diagnose_selinux
    
    # 자동 복구 제안
    if [ $DIAGNOSTIC_FAILED -eq 1 ]; then
        echo ""
        log_warning "일부 문제가 발견되었습니다. 자동 복구를 시도하시겠습니까?"
        read -p "자동 복구를 실행하시겠습니까? (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            auto_fix_memory
            auto_fix_processes
            auto_fix_package_manager
            auto_fix_npm
            
            log_success "자동 복구 완료"
        fi
    else
        log_success "모든 진단 항목이 정상입니다!"
    fi
    
    echo ""
    echo "📋 진단 결과 요약:"
    echo "- OS: $OS_NAME $OS_VERSION"
    echo "- 메모리: ${MEMORY_GB}GB (사용 가능: ${MEMORY_AVAILABLE_GB}GB)"
    echo "- 디스크: ${DISK_AVAILABLE_GB}GB 사용 가능 (사용률: ${DISK_USAGE}%)"
    echo "- Node.js: $(command -v node > /dev/null && node --version || echo '미설치')"
    echo "- npm: $(command -v npm > /dev/null && npm --version || echo '미설치')"
    echo ""
    echo "📄 상세 진단 로그: $DIAGNOSTIC_LOG"
    
    if [ $DIAGNOSTIC_FAILED -eq 0 ]; then
        echo ""
        log_success "시스템이 MSP Checklist 설치에 적합합니다!"
        echo ""
        echo "다음 명령어로 강화된 설치를 시작할 수 있습니다:"
        if [[ "$OS_NAME" == *"Ubuntu"* ]]; then
            echo "  ./ubuntu-robust-install.sh"
        elif [[ "$OS_NAME" == *"Amazon Linux"* ]]; then
            echo "  ./amazon-linux-robust-install.sh"
        fi
    else
        echo ""
        log_warning "일부 문제를 해결한 후 설치를 진행하세요."
    fi
}

# 스크립트 실행
main "$@"