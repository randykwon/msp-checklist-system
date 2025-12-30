#!/bin/bash

# Amazon Linux 2023 빠른 문제 해결 스크립트
# curl 충돌 및 기타 일반적인 문제들을 빠르게 해결합니다.

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

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Amazon Linux 2023 빠른 문제 해결                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# OS 확인
if ! grep -q "Amazon Linux" /etc/os-release; then
    log_error "이 스크립트는 Amazon Linux 2023에서만 실행할 수 있습니다."
    exit 1
fi

# 1. curl 충돌 문제 해결
log_info "1. curl 패키지 충돌 문제 해결 중..."
if ! curl --version > /dev/null 2>&1; then
    log_warning "curl 명령어 사용 불가, 해결 시도 중..."
    
    # curl-minimal 제거 후 curl 설치
    if sudo dnf remove -y curl-minimal 2>/dev/null; then
        log_info "curl-minimal 제거 완료"
    fi
    
    if sudo dnf install -y curl --allowerasing 2>/dev/null; then
        log_success "curl 설치 완료"
    elif sudo dnf swap -y curl-minimal curl 2>/dev/null; then
        log_success "curl-minimal을 curl로 교체 완료"
    else
        log_warning "curl 설치 실패, wget으로 계속 진행"
    fi
else
    log_success "curl 정상 작동"
fi

# 2. 패키지 캐시 정리
log_info "2. 패키지 캐시 정리 중..."
sudo dnf clean all
sudo dnf makecache
log_success "패키지 캐시 정리 완료"

# 3. 기본 패키지 설치 확인
log_info "3. 기본 패키지 설치 확인 중..."
PACKAGES="wget git gcc gcc-c++ make python3"

for package in $PACKAGES; do
    if ! rpm -q $package > /dev/null 2>&1; then
        log_info "$package 설치 중..."
        sudo dnf install -y $package
    else
        log_success "$package 이미 설치됨"
    fi
done

# 4. 개발 도구 설치 확인
log_info "4. 개발 도구 설치 확인 중..."
if ! dnf group list installed | grep -q "Development Tools"; then
    log_info "개발 도구 설치 중..."
    sudo dnf groupinstall -y "Development Tools"
else
    log_success "개발 도구 이미 설치됨"
fi

# 5. Node.js 설치 상태 확인
log_info "5. Node.js 설치 상태 확인 중..."
if command -v node > /dev/null; then
    NODE_VERSION=$(node --version)
    log_info "Node.js 버전: $NODE_VERSION"
    
    if [[ "$NODE_VERSION" < "v20.9.0" ]]; then
        log_warning "Node.js 버전이 낮습니다. 업데이트를 권장합니다."
    else
        log_success "Node.js 버전 적합"
    fi
else
    log_warning "Node.js가 설치되지 않았습니다"
fi

# 6. npm 캐시 정리
if command -v npm > /dev/null; then
    log_info "6. npm 캐시 정리 중..."
    npm cache clean --force 2>/dev/null || true
    log_success "npm 캐시 정리 완료"
fi

# 7. 방화벽 상태 확인
log_info "7. 방화벽 상태 확인 중..."
if systemctl is-active firewalld > /dev/null; then
    ALLOWED_PORTS=$(sudo firewall-cmd --list-ports)
    log_info "허용된 포트: $ALLOWED_PORTS"
    
    for port in 3010 3011; do
        if echo "$ALLOWED_PORTS" | grep -q "${port}/tcp"; then
            log_success "포트 $port: 허용됨"
        else
            log_warning "포트 $port: 차단됨"
            sudo firewall-cmd --permanent --add-port=${port}/tcp
            FIREWALL_CHANGED=true
        fi
    done
    
    if [ "$FIREWALL_CHANGED" = true ]; then
        sudo firewall-cmd --reload
        log_success "방화벽 규칙 업데이트 완료"
    fi
else
    log_warning "firewalld가 비활성 상태입니다"
fi

# 8. 실행 중인 프로세스 정리
log_info "8. 충돌 프로세스 정리 중..."
sudo pkill -f "node.*msp" 2>/dev/null || true
sudo pkill -f "npm.*start" 2>/dev/null || true

for port in 3010 3011; do
    PID=$(sudo ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
    if [ ! -z "$PID" ]; then
        log_info "포트 $port 사용 프로세스 $PID 종료 중..."
        sudo kill -9 $PID 2>/dev/null || true
    fi
done

log_success "프로세스 정리 완료"

# 9. 메모리 상태 확인
log_info "9. 시스템 리소스 확인 중..."
MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
MEMORY_AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
MEMORY_AVAILABLE_GB=$((MEMORY_AVAILABLE_KB / 1024 / 1024))

log_info "총 메모리: ${MEMORY_GB}GB, 사용 가능: ${MEMORY_AVAILABLE_GB}GB"

if [ $MEMORY_AVAILABLE_GB -lt 1 ] && [ ! -f /swapfile ]; then
    log_warning "메모리 부족, 스왑 파일 생성 권장"
    read -p "스왑 파일을 생성하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "2GB 스왑 파일 생성 중..."
        sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152 2>/dev/null
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "스왑 파일 생성 완료"
    fi
fi

# 10. 디스크 공간 확인
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
DISK_AVAILABLE_GB=$((DISK_AVAILABLE / 1024 / 1024))

log_info "디스크 사용률: ${DISK_USAGE}%, 사용 가능: ${DISK_AVAILABLE_GB}GB"

if [ $DISK_USAGE -gt 85 ]; then
    log_warning "디스크 공간 부족 (${DISK_USAGE}% 사용 중)"
    log_info "임시 파일 정리를 권장합니다"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    문제 해결 완료! ✅                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "Amazon Linux 2023 시스템 문제 해결이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 강화된 설치 스크립트 실행:"
echo "   ./amazon-linux-robust-install.sh"
echo ""
echo "2. 또는 일반 설치 스크립트 실행:"
echo "   ./amazon-linux-install.sh"
echo ""
echo "3. 기존 설치가 있는 경우 빠른 설정:"
echo "   ./amazon-linux-quick-setup.sh"