#!/bin/bash

# MSP Checklist 디스크 공간 최적화 스크립트
# 설치에 필요한 디스크 공간을 확보합니다.

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

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MSP Checklist 디스크 공간 최적화                  ║"
echo "║                                                            ║"
echo "║  설치에 필요한 디스크 공간을 확보합니다.                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 현재 디스크 사용량 확인
show_disk_usage() {
    echo "현재 디스크 사용량:"
    df -h /
    echo ""
    
    echo "디렉토리별 사용량 (상위 10개):"
    du -h / 2>/dev/null | sort -hr | head -10 2>/dev/null || true
    echo ""
}

# 시스템 캐시 정리
clean_system_cache() {
    log_step "시스템 캐시 정리 중..."
    
    # 패키지 캐시 정리
    if command -v dnf > /dev/null; then
        log_info "dnf 캐시 정리 중..."
        sudo dnf clean all
        CLEANED_SIZE=$(du -sh /var/cache/dnf 2>/dev/null | cut -f1 || echo "0")
        log_success "dnf 캐시 정리 완료 (${CLEANED_SIZE} 확보)"
    fi
    
    if command -v apt > /dev/null; then
        log_info "apt 캐시 정리 중..."
        sudo apt clean
        sudo apt autoclean
        CLEANED_SIZE=$(du -sh /var/cache/apt 2>/dev/null | cut -f1 || echo "0")
        log_success "apt 캐시 정리 완료 (${CLEANED_SIZE} 확보)"
    fi
    
    # npm 캐시 정리
    if command -v npm > /dev/null; then
        log_info "npm 캐시 정리 중..."
        npm cache clean --force 2>/dev/null || true
        sudo npm cache clean --force 2>/dev/null || true
        log_success "npm 캐시 정리 완료"
    fi
}

# 임시 파일 정리
clean_temp_files() {
    log_step "임시 파일 정리 중..."
    
    # /tmp 디렉토리 정리 (7일 이상 된 파일)
    log_info "/tmp 디렉토리 정리 중..."
    sudo find /tmp -type f -atime +7 -delete 2>/dev/null || true
    sudo find /tmp -type d -empty -delete 2>/dev/null || true
    
    # /var/tmp 디렉토리 정리
    log_info "/var/tmp 디렉토리 정리 중..."
    sudo find /var/tmp -type f -atime +7 -delete 2>/dev/null || true
    
    # 로그 파일 정리 (30일 이상)
    log_info "오래된 로그 파일 정리 중..."
    sudo find /var/log -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true
    sudo find /var/log -name "*.gz" -type f -mtime +30 -delete 2>/dev/null || true
    
    log_success "임시 파일 정리 완료"
}

# 불필요한 패키지 제거
remove_unnecessary_packages() {
    log_step "불필요한 패키지 제거 중..."
    
    if command -v dnf > /dev/null; then
        log_info "사용하지 않는 패키지 제거 중..."
        sudo dnf autoremove -y 2>/dev/null || true
        
        # 개발 도구 중 불필요한 것들 제거 (선택적)
        read -p "개발 도구 패키지를 제거하시겠습니까? (설치 후 다시 설치됩니다) (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo dnf remove -y gcc-c++ make 2>/dev/null || true
            log_info "개발 도구 패키지 제거됨 (설치 시 다시 설치됩니다)"
        fi
    fi
    
    if command -v apt > /dev/null; then
        log_info "사용하지 않는 패키지 제거 중..."
        sudo apt autoremove -y 2>/dev/null || true
        sudo apt autoclean 2>/dev/null || true
    fi
    
    log_success "불필요한 패키지 제거 완료"
}

# 저널 로그 정리
clean_journal_logs() {
    log_step "시스템 저널 로그 정리 중..."
    
    if command -v journalctl > /dev/null; then
        # 1주일 이상 된 로그 삭제
        sudo journalctl --vacuum-time=7d 2>/dev/null || true
        
        # 100MB 이상 로그 삭제
        sudo journalctl --vacuum-size=100M 2>/dev/null || true
        
        log_success "저널 로그 정리 완료"
    fi
}

# Docker 관련 정리 (있는 경우)
clean_docker() {
    if command -v docker > /dev/null; then
        log_step "Docker 데이터 정리 중..."
        
        read -p "Docker 이미지와 컨테이너를 정리하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo docker system prune -af 2>/dev/null || true
            log_success "Docker 데이터 정리 완료"
        fi
    fi
}

# 스왑 파일 생성으로 가상 공간 확보
create_swap_for_space() {
    log_step "스왑 파일을 통한 가상 공간 확보..."
    
    if [ ! -f /swapfile ]; then
        read -p "1GB 스왑 파일을 생성하여 가상 메모리를 늘리시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "1GB 스왑 파일 생성 중..."
            sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576 2>/dev/null
            sudo chmod 600 /swapfile
            sudo mkswap /swapfile
            sudo swapon /swapfile
            
            # 영구 설정
            if ! grep -q "/swapfile" /etc/fstab; then
                echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
            fi
            
            log_success "스왑 파일 생성 완료 (메모리 압박 완화)"
        fi
    else
        log_info "스왑 파일이 이미 존재합니다"
    fi
}

# 최소 설치 모드 제안
suggest_minimal_install() {
    log_step "최소 설치 모드 옵션 제안..."
    
    echo ""
    echo "디스크 공간이 부족한 경우 다음 옵션을 고려하세요:"
    echo ""
    echo "1. 최소 설치 모드:"
    echo "   - 개발 의존성 제외"
    echo "   - 빌드된 파일만 설치"
    echo "   - 약 2-3GB 공간 필요"
    echo ""
    echo "2. 외부 빌드 후 배포:"
    echo "   - 다른 서버에서 빌드"
    echo "   - 빌드 결과물만 복사"
    echo "   - 약 1-2GB 공간 필요"
    echo ""
    
    read -p "최소 설치 모드로 진행하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        export MSP_MINIMAL_INSTALL=true
        log_success "최소 설치 모드가 활성화되었습니다"
        echo "환경 변수 MSP_MINIMAL_INSTALL=true 설정됨"
    fi
}

# 메인 실행 함수
main() {
    log_info "디스크 공간 최적화를 시작합니다..."
    echo ""
    
    # 현재 상태 표시
    show_disk_usage
    
    # 정리 작업 수행
    clean_system_cache
    clean_temp_files
    clean_journal_logs
    remove_unnecessary_packages
    clean_docker
    create_swap_for_space
    
    echo ""
    log_info "최적화 후 디스크 사용량:"
    show_disk_usage
    
    # 여전히 공간이 부족한 경우
    AVAILABLE_GB=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    if [ $AVAILABLE_GB -lt 5 ]; then
        log_warning "여전히 디스크 공간이 부족합니다 (${AVAILABLE_GB}GB 사용 가능)"
        suggest_minimal_install
    else
        log_success "충분한 디스크 공간이 확보되었습니다 (${AVAILABLE_GB}GB 사용 가능)"
    fi
    
    echo ""
    echo "다음 단계:"
    echo "1. 강화된 설치 스크립트 실행: ./amazon-linux-robust-install.sh"
    echo "2. 또는 최소 설치 모드: MSP_MINIMAL_INSTALL=true ./amazon-linux-robust-install.sh"
}

# 스크립트 실행
main "$@"