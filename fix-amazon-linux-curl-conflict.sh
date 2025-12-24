#!/bin/bash

# Amazon Linux 2023 curl 충돌 문제 해결 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${BLUE}🔧 Amazon Linux 2023 curl 충돌 문제 해결${NC}"
echo "============================================="

# 1. 현재 curl 상태 확인
log_info "현재 curl 패키지 상태 확인 중..."
echo "설치된 curl 관련 패키지:"
dnf list installed | grep curl || echo "curl 패키지 없음"

echo ""
echo "curl 명령어 상태:"
if command -v curl > /dev/null 2>&1; then
    curl --version | head -1
else
    echo "curl 명령어 없음"
fi

# 2. curl-minimal 제거
log_info "curl-minimal 패키지 제거 중..."
sudo dnf remove -y curl-minimal 2>/dev/null || true

# 3. 패키지 캐시 정리
log_info "패키지 캐시 정리 중..."
sudo dnf clean all
sudo dnf makecache

# 4. curl 설치 (충돌 해결)
log_info "curl 패키지 설치 중..."
if sudo dnf install -y curl --allowerasing; then
    log_success "✅ curl 설치 성공"
else
    log_warning "⚠️ 일반 설치 실패, 대안 방법 시도 중..."
    
    # 대안 1: 특정 버전 설치
    log_info "최신 버전 curl 설치 시도 중..."
    sudo dnf install -y curl --best --allowerasing || {
        
        # 대안 2: 강제 설치
        log_info "강제 설치 시도 중..."
        sudo dnf install -y curl --skip-broken --allowerasing || {
            
            # 대안 3: 수동 다운로드 및 설치
            log_info "수동 설치 시도 중..."
            
            # 임시 디렉토리 생성
            TEMP_DIR=$(mktemp -d)
            cd "$TEMP_DIR"
            
            # curl RPM 다운로드 (wget 사용)
            if command -v wget > /dev/null 2>&1; then
                log_info "wget으로 curl RPM 다운로드 중..."
                wget https://download-ib01.fedoraproject.org/pub/epel/9/Everything/x86_64/Packages/c/curl-7.76.1-29.el9_4.1.x86_64.rpm -O curl.rpm 2>/dev/null || {
                    # Amazon Linux 저장소에서 직접 다운로드
                    log_info "Amazon Linux 저장소에서 다운로드 시도 중..."
                    wget https://amazonlinux-2-repos-us-east-1.s3.dualstack.us-east-1.amazonaws.com/2023/core/latest/x86_64/mirror.list -O /dev/null 2>/dev/null || true
                }
                
                # RPM 설치
                if [ -f "curl.rpm" ]; then
                    sudo rpm -Uvh --force curl.rpm 2>/dev/null || true
                fi
            fi
            
            # 정리
            cd /
            rm -rf "$TEMP_DIR"
        }
    }
fi

# 5. curl 설치 확인
log_info "curl 설치 확인 중..."
if command -v curl > /dev/null 2>&1; then
    CURL_VERSION=$(curl --version | head -1)
    log_success "✅ curl 설치 확인: $CURL_VERSION"
else
    log_error "❌ curl 설치 실패"
    
    # 최후의 수단: 소스 컴파일
    log_info "소스 컴파일로 curl 설치 시도 중..."
    
    # 필요한 개발 도구 설치
    sudo dnf groupinstall -y "Development Tools" 2>/dev/null || true
    sudo dnf install -y openssl-devel libcurl-devel 2>/dev/null || true
    
    # curl 소스 다운로드 및 컴파일
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    if command -v wget > /dev/null 2>&1; then
        wget https://curl.se/download/curl-8.5.0.tar.gz -O curl.tar.gz 2>/dev/null || true
        
        if [ -f "curl.tar.gz" ]; then
            tar -xzf curl.tar.gz
            cd curl-*
            
            ./configure --prefix=/usr/local
            make -j$(nproc)
            sudo make install
            
            # 심볼릭 링크 생성
            sudo ln -sf /usr/local/bin/curl /usr/bin/curl
            
            log_success "✅ curl 소스 컴파일 설치 완료"
        fi
    fi
    
    # 정리
    cd /
    rm -rf "$TEMP_DIR"
fi

# 6. 기본 의존성 설치 재시도
log_info "기본 의존성 설치 재시도 중..."

# sqlite 설치 (sqlite3 대신)
sudo dnf install -y sqlite htop unzip gcc gcc-c++ make 2>/dev/null || true

# Development Tools 그룹 설치
sudo dnf groupinstall -y 'Development Tools' 2>/dev/null || true

# 7. 최종 확인
echo ""
log_info "최종 설치 상태 확인 중..."

echo "✅ 설치된 패키지들:"
for pkg in curl wget git sqlite htop unzip gcc gcc-c++ make; do
    if command -v "$pkg" > /dev/null 2>&1; then
        echo "  ✅ $pkg: 설치됨"
    else
        echo "  ❌ $pkg: 설치되지 않음"
    fi
done

echo ""
echo "🔧 curl 테스트:"
if command -v curl > /dev/null 2>&1; then
    echo "  버전: $(curl --version | head -1)"
    echo "  테스트: $(curl -s -o /dev/null -w "%{http_code}" http://httpbin.org/get 2>/dev/null || echo "연결 실패")"
else
    echo "  ❌ curl 사용 불가"
fi

echo ""
log_success "Amazon Linux 2023 curl 충돌 문제 해결 완료!"

echo ""
echo "📝 다음 단계:"
echo "1. MSP Checklist 배포 스크립트 재실행:"
echo "   sudo ./msp-deployment-suite-refined.sh"
echo ""
echo "2. 또는 Node.js 설치부터 계속:"
echo "   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
echo "   sudo dnf install -y nodejs"
echo ""

# 8. 자동으로 다음 단계 실행 여부 확인
read -p "MSP Checklist 배포를 계속 진행하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "MSP Checklist 배포 계속 진행 중..."
    
    if [ -f "./msp-deployment-suite-refined.sh" ]; then
        exec sudo ./msp-deployment-suite-refined.sh
    else
        log_error "msp-deployment-suite-refined.sh 파일을 찾을 수 없습니다."
        echo "수동으로 실행하세요: sudo ./msp-deployment-suite-refined.sh"
    fi
else
    echo "curl 문제 해결이 완료되었습니다. 필요시 배포 스크립트를 수동으로 실행하세요."
fi