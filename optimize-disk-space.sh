#!/bin/bash

# 디스크 공간 최적화 스크립트
# 시스템 정리 및 공간 확보를 통해 MSP Checklist 설치 공간 확보

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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# 배너 출력
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              디스크 공간 최적화 스크립트                  ║"
    echo "║                                                            ║"
    echo "║  🧹 시스템 캐시 및 임시 파일 정리                        ║"
    echo "║  📦 불필요한 패키지 제거                                 ║"
    echo "║  🗂️  로그 파일 정리                                      ║"
    echo "║  💾 스왑 파일 최적화                                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 현재 디스크 사용량 확인
check_disk_usage() {
    log_step "현재 디스크 사용량 확인 중..."
    
    echo "📊 디스크 사용량 현황:"
    df -h /
    echo ""
    
    # 가장 큰 디렉토리들 확인
    echo "📁 가장 큰 디렉토리들 (상위 10개):"
    sudo du -h / 2>/dev/null | sort -hr | head -10 2>/dev/null || true
    echo ""
    
    # 현재 사용 가능한 공간 계산
    AVAILABLE_GB=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    log_info "현재 사용 가능한 공간: ${AVAILABLE_GB}GB"
    
    return $AVAILABLE_GB
}

# 패키지 캐시 정리
clean_package_cache() {
    log_step "패키지 캐시 정리 중..."
    
    # OS 감지
    if command -v apt > /dev/null; then
        # Ubuntu/Debian
        log_info "APT 캐시 정리 중..."
        sudo apt clean
        sudo apt autoclean
        sudo apt autoremove -y
        
        # APT 캐시 디렉토리 정리
        sudo rm -rf /var/cache/apt/archives/*.deb
        
    elif command -v dnf > /dev/null; then
        # Amazon Linux 2023 / RHEL / CentOS
        log_info "DNF 캐시 정리 중..."
        sudo dnf clean all
        sudo dnf autoremove -y
        
        # DNF 캐시 디렉토리 정리
        sudo rm -rf /var/cache/dnf/*
        
    elif command -v yum > /dev/null; then
        # 구버전 RHEL / CentOS
        log_info "YUM 캐시 정리 중..."
        sudo yum clean all
        sudo yum autoremove -y
        
        # YUM 캐시 디렉토리 정리
        sudo rm -rf /var/cache/yum/*
    fi
    
    log_success "패키지 캐시 정리 완료"
}

# 시스템 로그 정리
clean_system_logs() {
    log_step "시스템 로그 정리 중..."
    
    # journald 로그 정리 (최근 7일만 유지)
    if command -v journalctl > /dev/null; then
        log_info "journald 로그 정리 중..."
        sudo journalctl --vacuum-time=7d
        sudo journalctl --vacuum-size=100M
    fi
    
    # 오래된 로그 파일 정리
    log_info "오래된 로그 파일 정리 중..."
    
    # /var/log 디렉토리의 오래된 로그 파일들
    sudo find /var/log -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
    sudo find /var/log -name "*.gz" -mtime +7 -delete 2>/dev/null || true
    sudo find /var/log -name "*.old" -mtime +7 -delete 2>/dev/null || true
    
    # 큰 로그 파일들 truncate
    for logfile in /var/log/messages /var/log/syslog /var/log/kern.log /var/log/auth.log; do
        if [ -f "$logfile" ] && [ $(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null || echo 0) -gt 104857600 ]; then
            log_info "큰 로그 파일 정리: $logfile"
            sudo truncate -s 10M "$logfile" 2>/dev/null || true
        fi
    done
    
    log_success "시스템 로그 정리 완료"
}

# 임시 파일 정리
clean_temp_files() {
    log_step "임시 파일 정리 중..."
    
    # /tmp 디렉토리 정리 (7일 이상 된 파일)
    log_info "/tmp 디렉토리 정리 중..."
    sudo find /tmp -type f -mtime +7 -delete 2>/dev/null || true
    sudo find /tmp -type d -empty -delete 2>/dev/null || true
    
    # /var/tmp 디렉토리 정리
    log_info "/var/tmp 디렉토리 정리 중..."
    sudo find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true
    
    # 사용자 임시 파일 정리
    if [ -d "$HOME/.cache" ]; then
        log_info "사용자 캐시 정리 중..."
        rm -rf "$HOME/.cache/*" 2>/dev/null || true
    fi
    
    # npm 캐시 정리
    if command -v npm > /dev/null; then
        log_info "npm 캐시 정리 중..."
        npm cache clean --force 2>/dev/null || true
    fi
    
    # Node.js 관련 임시 파일 정리
    sudo rm -rf /tmp/npm-* 2>/dev/null || true
    sudo rm -rf /tmp/node-* 2>/dev/null || true
    sudo rm -rf /tmp/next-* 2>/dev/null || true
    
    log_success "임시 파일 정리 완료"
}

# Docker 정리 (설치되어 있는 경우)
clean_docker() {
    if command -v docker > /dev/null; then
        log_step "Docker 정리 중..."
        
        # 사용하지 않는 Docker 이미지, 컨테이너, 볼륨 정리
        log_info "사용하지 않는 Docker 리소스 정리 중..."
        sudo docker system prune -af 2>/dev/null || true
        
        log_success "Docker 정리 완료"
    fi
}

# 커널 모듈 및 헤더 정리
clean_kernel_files() {
    log_step "오래된 커널 파일 정리 중..."
    
    if command -v apt > /dev/null; then
        # Ubuntu에서 오래된 커널 제거
        log_info "오래된 커널 패키지 제거 중..."
        sudo apt autoremove --purge -y 2>/dev/null || true
        
    elif command -v dnf > /dev/null; then
        # Amazon Linux에서 오래된 커널 제거
        log_info "오래된 커널 패키지 확인 중..."
        # 현재 실행 중인 커널 제외하고 오래된 커널 제거
        CURRENT_KERNEL=$(uname -r)
        OLD_KERNELS=$(rpm -qa kernel | grep -v "$CURRENT_KERNEL" | head -n -1)
        
        if [ ! -z "$OLD_KERNELS" ]; then
            log_info "오래된 커널 제거: $OLD_KERNELS"
            sudo dnf remove -y $OLD_KERNELS 2>/dev/null || true
        fi
    fi
    
    log_success "커널 파일 정리 완료"
}

# 불필요한 개발 패키지 정리
clean_dev_packages() {
    log_step "불필요한 개발 패키지 확인 중..."
    
    # 개발 도구가 설치되어 있지만 MSP Checklist에 필요하지 않은 패키지들
    UNNECESSARY_PACKAGES=""
    
    if command -v apt > /dev/null; then
        # Ubuntu에서 불필요할 수 있는 패키지들 확인
        for pkg in "libreoffice*" "thunderbird*" "firefox*" "games-*" "ubuntu-desktop-minimal"; do
            if dpkg -l | grep -q "^ii.*$pkg" 2>/dev/null; then
                UNNECESSARY_PACKAGES="$UNNECESSARY_PACKAGES $pkg"
            fi
        done
        
        if [ ! -z "$UNNECESSARY_PACKAGES" ]; then
            log_warning "불필요한 패키지 발견: $UNNECESSARY_PACKAGES"
            read -p "이 패키지들을 제거하시겠습니까? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo apt remove --purge -y $UNNECESSARY_PACKAGES 2>/dev/null || true
                sudo apt autoremove -y
            fi
        fi
        
    elif command -v dnf > /dev/null; then
        # Amazon Linux에서는 일반적으로 최소 설치이므로 큰 패키지가 없음
        log_info "Amazon Linux는 일반적으로 최소 설치입니다."
    fi
    
    log_success "개발 패키지 정리 완료"
}

# 스왑 파일 최적화
optimize_swap() {
    log_step "스왑 파일 최적화 중..."
    
    # 현재 스왑 상태 확인
    CURRENT_SWAP=$(free -m | awk '/^Swap:/ {print $2}')
    
    if [ "$CURRENT_SWAP" -eq 0 ]; then
        log_info "스왑 파일이 없습니다. 1GB 스왑 파일 생성 중..."
        
        # 1GB 스왑 파일 생성
        sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576 2>/dev/null
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # /etc/fstab에 추가 (영구 설정)
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "1GB 스왑 파일 생성 완료"
        
    elif [ "$CURRENT_SWAP" -lt 1024 ]; then
        log_info "현재 스왑: ${CURRENT_SWAP}MB - 충분합니다."
        
    else
        log_info "현재 스왑: ${CURRENT_SWAP}MB - 이미 충분합니다."
    fi
}

# 최소 설치 모드 안내
suggest_minimal_install() {
    log_step "최소 설치 모드 안내"
    
    echo ""
    echo "💡 디스크 공간이 부족한 경우 다음 옵션들을 사용할 수 있습니다:"
    echo ""
    echo "1. 최소 설치 모드:"
    echo "   MSP_MINIMAL_INSTALL=true ./amazon-linux-2023-unified-installer.sh"
    echo ""
    echo "2. 개발 의존성 제외 설치:"
    echo "   - 빌드 후 개발 의존성 자동 제거"
    echo "   - 프로덕션 환경에 최적화"
    echo ""
    echo "3. 단계별 설치:"
    echo "   - 메인 시스템만 먼저 설치"
    echo "   - 관리자 시스템은 나중에 설치"
    echo ""
    echo "4. 외부 빌드:"
    echo "   - 다른 서버에서 빌드 후 파일 복사"
    echo "   - 빌드 완료된 .next 디렉토리만 전송"
    echo ""
}

# 디스크 공간 확보 결과 확인
check_space_gained() {
    log_step "디스크 공간 확보 결과 확인 중..."
    
    echo ""
    echo "📊 정리 후 디스크 사용량:"
    df -h /
    echo ""
    
    NEW_AVAILABLE_GB=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    SPACE_GAINED=$((NEW_AVAILABLE_GB - AVAILABLE_GB))
    
    log_info "확보된 공간: ${SPACE_GAINED}GB"
    log_info "현재 사용 가능한 공간: ${NEW_AVAILABLE_GB}GB"
    
    if [ $NEW_AVAILABLE_GB -ge 3 ]; then
        log_success "✅ MSP Checklist 설치에 충분한 공간이 확보되었습니다!"
        echo ""
        echo "다음 단계:"
        echo "1. 일반 설치: ./amazon-linux-2023-unified-installer.sh"
        echo "2. 최소 설치: MSP_MINIMAL_INSTALL=true ./amazon-linux-2023-unified-installer.sh"
        
    elif [ $NEW_AVAILABLE_GB -ge 2 ]; then
        log_warning "⚠️ 최소 설치 모드로 설치 가능합니다."
        echo ""
        echo "권장 설치 방법:"
        echo "MSP_MINIMAL_INSTALL=true ./amazon-linux-2023-unified-installer.sh"
        
    else
        log_error "❌ 여전히 공간이 부족합니다."
        echo ""
        echo "추가 해결 방법:"
        echo "1. EBS 볼륨 확장"
        echo "2. 더 큰 인스턴스로 업그레이드"
        echo "3. 외부 빌드 후 파일 전송"
    fi
}

# 메인 실행 함수
main() {
    show_banner
    
    # 사용자 확인
    read -p "디스크 공간 최적화를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "최적화가 취소되었습니다."
        exit 0
    fi
    
    # 현재 상태 확인
    check_disk_usage
    AVAILABLE_GB=$?
    
    echo ""
    log_info "디스크 공간 최적화를 시작합니다..."
    echo ""
    
    # 최적화 단계들 실행
    clean_package_cache
    clean_system_logs
    clean_temp_files
    clean_docker
    clean_kernel_files
    clean_dev_packages
    optimize_swap
    
    # 결과 확인
    check_space_gained
    
    # 최소 설치 모드 안내
    suggest_minimal_install
    
    echo ""
    log_success "디스크 공간 최적화가 완료되었습니다! 🎉"
}

# 스크립트 실행
main "$@"