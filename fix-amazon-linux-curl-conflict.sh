#!/bin/bash

# Amazon Linux 2023 curl 패키지 충돌 해결 스크립트
# curl-minimal과 curl 패키지 간의 충돌을 해결합니다.

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
echo "║         Amazon Linux 2023 curl 충돌 해결 스크립트        ║"
echo "║                                                            ║"
echo "║  curl-minimal과 curl 패키지 충돌을 해결합니다.            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# OS 확인
if ! grep -q "Amazon Linux" /etc/os-release; then
    log_error "이 스크립트는 Amazon Linux 2023에서만 실행할 수 있습니다."
    exit 1
fi

log_info "현재 curl 관련 패키지 상태 확인 중..."

# 현재 설치된 curl 관련 패키지 확인
dnf list installed | grep curl || true

echo ""
log_info "curl 충돌 문제 해결을 시작합니다..."

# 방법 1: curl-minimal 제거 후 curl 설치
log_info "방법 1: curl-minimal 제거 후 curl 설치 시도..."

if sudo dnf remove -y curl-minimal 2>/dev/null; then
    log_success "curl-minimal 제거 완료"
    
    if sudo dnf install -y curl; then
        log_success "curl 설치 완료"
        curl --version
        log_success "방법 1 성공: curl 패키지 충돌 해결 완료"
        exit 0
    else
        log_warning "curl 설치 실패, 방법 2 시도..."
    fi
else
    log_warning "curl-minimal 제거 실패, 방법 2 시도..."
fi

# 방법 2: 강제로 curl-minimal 교체
log_info "방법 2: curl-minimal을 curl로 강제 교체..."

if sudo dnf swap -y curl-minimal curl; then
    log_success "curl-minimal을 curl로 교체 완료"
    curl --version
    log_success "방법 2 성공: curl 패키지 충돌 해결 완료"
    exit 0
else
    log_warning "패키지 교체 실패, 방법 3 시도..."
fi

# 방법 3: 패키지 캐시 정리 후 재시도
log_info "방법 3: 패키지 캐시 정리 후 재시도..."

sudo dnf clean all
sudo dnf makecache

if sudo dnf remove -y curl-minimal --skip-broken 2>/dev/null; then
    if sudo dnf install -y curl --skip-broken; then
        log_success "curl 설치 완료"
        curl --version
        log_success "방법 3 성공: curl 패키지 충돌 해결 완료"
        exit 0
    fi
fi

# 방법 4: 특정 버전으로 다운그레이드 후 설치
log_info "방법 4: 패키지 버전 조정..."

# 사용 가능한 curl 버전 확인
log_info "사용 가능한 curl 버전 확인 중..."
dnf list available curl* | grep curl

# curl-minimal을 최신 버전으로 업데이트 시도
if sudo dnf update -y curl-minimal; then
    log_success "curl-minimal 업데이트 완료"
    
    # 이제 curl 설치 시도
    if sudo dnf install -y curl --allowerasing; then
        log_success "curl 설치 완료 (--allowerasing 옵션 사용)"
        curl --version
        log_success "방법 4 성공: curl 패키지 충돌 해결 완료"
        exit 0
    fi
fi

# 방법 5: 수동으로 패키지 관리
log_info "방법 5: 수동 패키지 관리..."

# 모든 curl 관련 패키지 제거
sudo dnf remove -y curl* --skip-broken 2>/dev/null || true

# 캐시 정리
sudo dnf clean all
sudo dnf makecache

# curl 재설치
if sudo dnf install -y curl; then
    log_success "curl 재설치 완료"
    curl --version
    log_success "방법 5 성공: curl 패키지 충돌 해결 완료"
    exit 0
fi

# 모든 방법 실패 시
log_error "모든 해결 방법이 실패했습니다."
echo ""
echo "수동 해결 방법:"
echo "1. 시스템 재부팅 후 다시 시도"
echo "2. 다음 명령어 수동 실행:"
echo "   sudo dnf distro-sync"
echo "   sudo dnf remove curl-minimal --skip-broken"
echo "   sudo dnf install curl"
echo ""
echo "3. 또는 curl 없이 wget 사용:"
echo "   wget 명령어로 파일 다운로드 가능"

exit 1