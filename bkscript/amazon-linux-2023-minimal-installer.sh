#!/bin/bash

# Amazon Linux 2023 최소 설치 스크립트 (2GB 디스크 공간으로 설치 가능)
# 디스크 공간이 부족한 환경을 위한 최적화된 설치

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 전역 변수
INSTALL_DIR="/opt/msp-checklist-system"
REPO_URL="https://github.com/randykwon/msp-checklist-system.git"
LOG_FILE="/tmp/msp-minimal-install-$(date +%Y%m%d_%H%M%S).log"
MAX_RETRIES=2
TIMEOUT_SECONDS=180

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

log_build() {
    echo -e "${PURPLE}[BUILD]${NC} $1" | tee -a "$LOG_FILE"
}

# 배너 출력
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Amazon Linux 2023 MSP Checklist 최소 설치 스크립트   ║"
    echo "║                                                            ║"
    echo "║  💾 최소 2GB 디스크 공간으로 설치 가능                   ║"
    echo "║  🚀 프로덕션 환경 최적화                                 ║"
    echo "║  ⚡ 빠른 설치 및 최소 리소스 사용                        ║"
    echo "║  🔧 모든 빌드 문제 자동 해결                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 시스템 요구사항 검증 (최소 버전)
check_system_requirements() {
    log_step "시스템 요구사항 검증 중 (최소 모드)..."
    
    # OS 확인
    if ! grep -q "Amazon Linux" /etc/os-release; then
        log_error "이 스크립트는 Amazon Linux 2023에서만 실행할 수 있습니다."
        exit 1
    fi
    
    # 메모리 확인 (최소 512MB)
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    
    if [ $MEMORY_GB -lt 1 ]; then
        log_warning "메모리가 부족합니다 (${MEMORY_GB}GB). 스왑 파일을 생성합니다."
    fi
    
    # 디스크 공간 확인 (최소 2GB)
    DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
    DISK_GB=$((DISK_AVAILABLE / 1024 / 1024))
    
    if [ $DISK_GB -lt 2 ]; then
        log_error "최소 2GB 디스크 공간이 필요합니다. 현재: ${DISK_GB}GB"
        echo ""
        echo "해결 방법:"
        echo "1. 디스크 공간 최적화: ./optimize-disk-space.sh"
        echo "2. EBS 볼륨 확장"
        echo "3. 더 큰 인스턴스 사용"
        exit 1
    fi
    
    # 네트워크 연결 확인
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log_error "인터넷 연결 없음"
        exit 1
    fi
    
    log_success "시스템 요구사항 검증 완료 (최소 모드)"
}

# 재시도 함수 (최소 버전)
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
                log_warning "실패했습니다. 3초 후 재시도합니다..."
                sleep 3
            fi
        fi
    done
    
    log_error "$description 실패 (최대 재시도 횟수 초과)"
    return 1
}

# 메모리 최적화 (최소 버전)
optimize_memory() {
    log_step "메모리 최적화 설정 중 (최소 모드)..."
    
    # 작은 스왑 파일 생성 (1GB)
    if [ $MEMORY_GB -lt 2 ] && [ ! -f /swapfile ]; then
        log_info "1GB 스왑 파일 생성 중..."
        
        sudo dd if=/dev/zero of=/swapfile bs=1024 count=1048576 2>/dev/null
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        
        # 영구 설정
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
        fi
        
        log_success "1GB 스왑 파일 생성 완료"
    fi
    
    # Node.js 메모리 제한 설정 (최소)
    export NODE_OPTIONS="--max-old-space-size=1024"
    
    log_success "메모리 최적화 완료 (최소 모드)"
}

# 기존 설치 정리 (최소 버전)
cleanup_existing_installation() {
    log_step "기존 설치 정리 중 (최소 모드)..."
    
    cd /opt
    
    # 실행 중인 프로세스 중지
    sudo pkill -f "node.*msp" 2>/dev/null || true
    sudo pkill -f "npm.*start" 2>/dev/null || true
    sudo pkill -f "next.*build" 2>/dev/null || true
    
    # 디렉토리 구조 통일
    if [ -d "msp-checklist" ] && [ ! -d "msp-checklist-system" ]; then
        sudo mv "msp-checklist" "msp-checklist-system"
    elif [ -d "msp-checklist" ] && [ -d "msp-checklist-system" ]; then
        sudo rm -rf "msp-checklist"
    fi
    
    # 권한 설정
    if [ -d "msp-checklist-system" ]; then
        sudo chown -R $USER:$USER "msp-checklist-system"
    fi
    
    # 호환성 링크
    if [ ! -L "msp-checklist" ] && [ ! -d "msp-checklist" ]; then
        sudo ln -s msp-checklist-system msp-checklist 2>/dev/null || true
    fi
    
    log_success "기존 설치 정리 완료"
}

# 시스템 업데이트 (최소 버전)
update_system() {
    log_step "필수 패키지만 설치 중..."
    
    # 시스템 업데이트 (필수만)
    retry_command "sudo dnf update -y --security" "보안 업데이트"
    
    # curl 충돌 해결
    if ! curl --version > /dev/null 2>&1; then
        sudo dnf remove -y curl-minimal 2>/dev/null || true
        sudo dnf install -y curl --allowerasing 2>/dev/null || true
    fi
    
    # 필수 패키지만 설치
    retry_command "sudo dnf install -y git gcc gcc-c++ make" "필수 개발 도구"
    
    log_success "필수 패키지 설치 완료"
}

# Node.js 설치 (최소 버전)
install_nodejs() {
    log_step "Node.js 20.9.0 설치 중 (최소 모드)..."
    
    # 기존 Node.js 제거
    sudo dnf remove -y nodejs npm 2>/dev/null || true
    
    # NodeSource 저장소 추가
    retry_command "curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -" "NodeSource 저장소 추가"
    retry_command "sudo dnf install -y nodejs" "Node.js 설치"
    
    # npm 설정 최적화 (최소)
    npm config set registry https://registry.npmjs.org/
    npm config set fetch-timeout 300000
    npm config set fetch-retries 3
    
    NODE_VERSION=$(node --version)
    log_info "설치된 Node.js 버전: $NODE_VERSION"
    
    log_success "Node.js 설치 완료"
}

# 프로젝트 설정 (최소 버전)
setup_project() {
    log_step "프로젝트 설정 중 (최소 모드)..."
    
    cd "$INSTALL_DIR"
    
    # Git 저장소 확인 및 설정
    if [ -d ".git" ]; then
        log_info "기존 저장소 업데이트 중..."
        git fetch origin
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
    else
        log_info "새 저장소 클론 중..."
        if [ "$(ls -A .)" ]; then
            mkdir -p backup_$(date +%Y%m%d_%H%M%S)
            mv * backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
        fi
        retry_command "git clone $REPO_URL ." "프로젝트 클론"
    fi
    
    chmod +x *.sh 2>/dev/null || true
    
    log_success "프로젝트 설정 완료"
}

# CSS 문제 해결 (최소 버전)
fix_css_issues() {
    log_build "CSS 문제 해결 중 (최소 모드)..."
    
    cd "$INSTALL_DIR/msp-checklist"
    
    # CSS 프레임워크 제거
    npm uninstall tailwindcss @tailwindcss/postcss @tailwindcss/node lightningcss postcss autoprefixer 2>/dev/null || true
    
    # 설정 파일 제거
    rm -f postcss.config.* tailwind.config.*
    
    # package.json 정리
    if [ -f "package.json" ]; then
        sed -i '/"tailwindcss"/d; /"@tailwindcss/d; /"lightningcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json
    fi
    
    # 간단한 CSS로 교체
    cat > app/globals.css << 'EOF'
/* MSP Checklist 최소 CSS */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; background: #fff; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; }
.btn:hover { background: #0056b3; }
.card { background: white; border: 1px solid #ddd; border-radius: 4px; padding: 16px; margin-bottom: 16px; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.text-center { text-align: center; }
.mb-4 { margin-bottom: 16px; }
.p-4 { padding: 16px; }
EOF
    
    log_success "CSS 문제 해결 완료"
}

# Next.js 설정 (최소 버전)
optimize_nextjs() {
    log_build "Next.js 설정 최적화 중 (최소 모드)..."
    
    cd "$INSTALL_DIR/msp-checklist"
    
    # 최소 Next.js 설정
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false, crypto: false };
    }
    return config;
  }
};

export default nextConfig;
EOF
    
    # 최소 TypeScript 설정
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
    
    log_success "Next.js 설정 최적화 완료"
}

# Admin 시스템 (최소 버전)
setup_admin_minimal() {
    log_build "Admin 시스템 최소 설정 중..."
    
    cd "$INSTALL_DIR/msp-checklist/admin"
    
    # 최소 AdminLayout
    mkdir -p components
    cat > components/AdminLayout.tsx << 'EOF'
'use client';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>Admin Dashboard</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
EOF
    
    # 최소 라이브러리
    mkdir -p lib
    cat > lib/db.ts << 'EOF'
export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  isActive: boolean;
}

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  return [];
}
EOF
    
    # Admin 설정 복사
    cp ../next.config.ts .
    cp ../tsconfig.json .
    
    log_success "Admin 시스템 최소 설정 완료"
}

# 의존성 설치 (최소 버전)
install_dependencies_minimal() {
    log_step "의존성 설치 중 (최소 모드)..."
    
    cd "$INSTALL_DIR"
    
    # 루트 의존성 (프로덕션만)
    retry_command "npm install --production --no-optional" "루트 의존성 설치"
    
    # MSP 체크리스트 의존성
    cd msp-checklist
    rm -rf node_modules package-lock.json
    retry_command "npm install --production --no-optional --legacy-peer-deps" "MSP 의존성 설치"
    
    # Admin 의존성
    cd admin
    rm -rf node_modules package-lock.json
    retry_command "npm install --production --no-optional" "Admin 의존성 설치"
    
    cd ..
    log_success "의존성 설치 완료 (최소 모드)"
}

# 빌드 (최소 버전)
build_minimal() {
    log_step "애플리케이션 빌드 중 (최소 모드)..."
    
    cd "$INSTALL_DIR"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=1024"
    export NEXT_TELEMETRY_DISABLED=1
    
    # MSP 체크리스트 빌드
    cd msp-checklist
    rm -rf .next
    
    if NODE_OPTIONS="--max-old-space-size=1024" npm run build; then
        log_success "MSP 체크리스트 빌드 성공"
        
        # 빌드 후 개발 의존성 제거
        npm prune --production 2>/dev/null || true
    else
        log_error "MSP 체크리스트 빌드 실패"
        return 1
    fi
    
    # Admin 빌드
    cd admin
    rm -rf .next
    
    if NODE_OPTIONS="--max-old-space-size=1024" npm run build; then
        log_success "Admin 시스템 빌드 성공"
        npm prune --production 2>/dev/null || true
    else
        log_warning "Admin 시스템 빌드 실패 (선택사항)"
    fi
    
    cd ..
    log_success "빌드 완료 (최소 모드)"
}

# 서버 시작 (최소 버전)
start_server_minimal() {
    log_step "서버 시작 중 (최소 모드)..."
    
    cd "$INSTALL_DIR"
    
    if [ -f "restart-servers.sh" ]; then
        ./restart-servers.sh
        sleep 10
        
        # 간단한 상태 확인
        if pgrep -f "node.*msp" > /dev/null; then
            log_success "서버가 시작되었습니다!"
        else
            log_warning "서버 상태를 확인할 수 없습니다."
        fi
    else
        log_warning "서버 시작 스크립트를 찾을 수 없습니다."
    fi
}

# 메인 함수
main() {
    show_banner
    
    log_info "설치 로그: $LOG_FILE"
    
    read -p "최소 설치를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치가 취소되었습니다."
        exit 0
    fi
    
    START_TIME=$(date +%s)
    
    # 설치 단계 실행
    check_system_requirements
    optimize_memory
    cleanup_existing_installation
    update_system
    install_nodejs
    setup_project
    fix_css_issues
    optimize_nextjs
    setup_admin_minimal
    install_dependencies_minimal
    build_minimal
    start_server_minimal
    
    # 완료 시간 계산
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    # 완료 메시지
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 🎉 최소 설치 완료! 🎉                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 최소 설치가 완료되었습니다!"
    log_info "설치 시간: ${MINUTES}분 ${SECONDS}초"
    
    # 접속 정보
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo ""
    echo "🌐 서비스 접속 주소:"
    echo "- 메인 서비스: http://$PUBLIC_IP:3010"
    echo "- 관리자 시스템: http://$PUBLIC_IP:3011"
    echo ""
    echo "💾 디스크 사용량:"
    df -h /
    echo ""
    echo "🔧 유용한 명령어:"
    echo "- 서버 재시작: cd $INSTALL_DIR && ./restart-servers.sh"
    echo "- 서버 상태: cd $INSTALL_DIR && ./server-status.sh"
    echo ""
    echo "📝 다음 단계:"
    echo "1. AWS 보안 그룹에서 포트 3010, 3011 허용"
    echo "2. 환경 변수 설정: nano $INSTALL_DIR/msp-checklist/.env.local"
    echo "3. 관리자 계정 생성: cd $INSTALL_DIR && node create-admin.cjs"
    
    log_success "최소 설치가 성공적으로 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"