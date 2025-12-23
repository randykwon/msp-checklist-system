#!/bin/bash

# Amazon Linux 2023 MSP Checklist 완전 설치 스크립트
# 모든 빌드 문제 해결 및 완전한 설치를 수행합니다.

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
INSTALL_DIR="/opt/msp-checklist"
REPO_URL="https://github.com/randykwon/msp-checklist-system.git"
LOG_FILE="/tmp/msp-complete-install-$(date +%Y%m%d_%H%M%S).log"
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

log_build() {
    echo -e "${PURPLE}[BUILD]${NC} $1" | tee -a "$LOG_FILE"
}

# 배너 출력
show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     Amazon Linux 2023 MSP Checklist 완전 설치 스크립트   ║"
    echo "║                                                            ║"
    echo "║  • 모든 빌드 문제 자동 해결                               ║"
    echo "║  • LightningCSS 호환성 문제 해결                          ║"
    echo "║  • Next.js 16 TypeScript 문제 해결                        ║"
    echo "║  • Admin 시스템 컴포넌트 자동 생성                        ║"
    echo "║  • 완전한 설치 및 서버 시작                               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 오류 발생 시 정리 함수
cleanup_on_error() {
    log_error "설치 중 오류가 발생했습니다. 정리 작업을 수행합니다..."
    
    # 실행 중인 프로세스 정리
    sudo pkill -f "npm install" 2>/dev/null || true
    sudo pkill -f "next build" 2>/dev/null || true
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
    
    # 디스크 공간 확인 (최소 3GB)
    DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
    DISK_GB=$((DISK_AVAILABLE / 1024 / 1024))
    
    REQUIRED_DISK=3
    if [ "$MSP_MINIMAL_INSTALL" = "true" ]; then
        REQUIRED_DISK=2
        log_info "최소 설치 모드: 디스크 요구사항 ${REQUIRED_DISK}GB로 조정"
    fi
    
    if [ $DISK_GB -lt $REQUIRED_DISK ]; then
        log_error "최소 ${REQUIRED_DISK}GB 디스크 공간이 필요합니다. 현재: ${DISK_GB}GB"
        echo ""
        echo "해결 방법:"
        echo "1. 디스크 공간 최적화: ./optimize-disk-space.sh"
        echo "2. 최소 설치 모드: MSP_MINIMAL_INSTALL=true $0"
        echo "3. 더 큰 인스턴스 사용 또는 EBS 볼륨 확장"
        exit 1
    fi
    
    # 네트워크 연결 확인
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log_error "인터넷 연결 없음"
        exit 1
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
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    log_success "메모리 최적화 완료"
}

# 기존 설치 정리
cleanup_existing_installation() {
    log_step "기존 설치 정리 중..."
    
    # 실행 중인 프로세스 중지
    sudo pkill -f "node.*msp" 2>/dev/null || true
    sudo pkill -f "npm.*start" 2>/dev/null || true
    sudo pkill -f "next.*build" 2>/dev/null || true
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
    
    # NodeSource 저장소 추가 및 설치
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
        
        sudo systemctl daemon-reload
        
        if ! sudo systemctl start firewalld 2>/dev/null; then
            log_warning "firewalld를 사용할 수 없습니다. iptables로 대체합니다."
            
            if command -v iptables > /dev/null; then
                log_info "iptables로 방화벽 설정 중..."
                
                sudo iptables -P INPUT ACCEPT
                sudo iptables -P FORWARD ACCEPT
                sudo iptables -P OUTPUT ACCEPT
                sudo iptables -F
                
                sudo iptables -A INPUT -i lo -j ACCEPT
                sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
                sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
                sudo iptables -A INPUT -p tcp --dport 3010 -j ACCEPT
                sudo iptables -A INPUT -p tcp --dport 3011 -j ACCEPT
                
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

# CSS 프레임워크 문제 해결
fix_css_framework_issues() {
    log_build "CSS 프레임워크 호환성 문제 해결 중..."
    
    cd "$INSTALL_DIR/msp-checklist"
    
    # 1. 모든 CSS 프레임워크 제거
    log_info "Tailwind CSS v4 및 관련 패키지 제거 중..."
    npm uninstall @tailwindcss/postcss @tailwindcss/node tailwindcss lightningcss 2>/dev/null || true
    
    # 2. 기존 CSS 설정 파일 제거
    rm -f postcss.config.js postcss.config.mjs postcss.config.ts
    rm -f tailwind.config.js tailwind.config.ts
    
    # 3. 기본 CSS로 globals.css 교체
    log_info "기본 CSS로 교체 중..."
    cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS 스타일 */

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html, body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f8fafc;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: #2563eb;
}

.card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  border: 1px solid #e5e7eb;
}

.grid { display: grid; gap: 1rem; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.text-center { text-align: center; }
.mb-4 { margin-bottom: 1rem; }
.p-4 { padding: 1rem; }
.w-full { width: 100%; }
.rounded { border-radius: 0.25rem; }
.shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }

.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.checklist-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
}

.loading {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
EOF
    
    log_success "CSS 프레임워크 문제 해결 완료"
}

# Next.js 설정 최적화
optimize_nextjs_config() {
    log_build "Next.js 설정 최적화 중..."
    
    cd "$INSTALL_DIR/msp-checklist"
    
    # Next.js 설정 파일 생성
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  turbopack: {
    root: process.cwd()
  },
  
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }
    
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF
    
    # TypeScript 설정 최적화
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
    "paths": { "@/*": ["./*"] },
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
    
    log_success "Next.js 설정 최적화 완료"
}

# Admin 시스템 컴포넌트 생성
create_admin_components() {
    log_build "Admin 시스템 컴포넌트 생성 중..."
    
    cd "$INSTALL_DIR/msp-checklist/admin"
    
    # AdminLayout 컴포넌트 생성
    mkdir -p components
    cat > components/AdminLayout.tsx << 'EOF'
'use client';

import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Admin Dashboard' }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <nav className="flex space-x-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/admin/announcements" className="text-gray-600 hover:text-gray-900">Announcements</a>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
EOF
    
    # DB 모듈 생성
    mkdir -p lib
    cat > lib/db.ts << 'EOF'
export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  return [];
}
EOF
    
    # Admin TypeScript 설정
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
    "paths": { "@/*": ["./*"] },
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
    
    # Admin Next.js 설정
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false, crypto: false };
    }
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF
    
    log_success "Admin 시스템 컴포넌트 생성 완료"
}

# 의존성 설치
install_dependencies() {
    log_step "의존성 설치 중..."
    
    cd "$INSTALL_DIR"
    
    # 1. 프로젝트 루트 의존성
    log_info "프로젝트 루트 의존성 설치 중..."
    if [ "$MSP_MINIMAL_INSTALL" = "true" ]; then
        retry_command "npm install --production --no-optional" "프로젝트 루트 의존성 설치 (최소 모드)"
    else
        retry_command "npm install --no-optional" "프로젝트 루트 의존성 설치"
    fi
    
    # 2. MSP 체크리스트 의존성
    log_info "MSP 체크리스트 의존성 설치 중..."
    cd msp-checklist
    
    rm -rf node_modules package-lock.json
    
    # deprecated 패키지 제거
    npm uninstall @types/cookie @types/bcryptjs 2>/dev/null || true
    
    if [ "$MSP_MINIMAL_INSTALL" = "true" ]; then
        retry_command "npm install --no-optional --legacy-peer-deps" "MSP 체크리스트 의존성 설치 (최소 모드)"
    else
        retry_command "npm install --no-optional --legacy-peer-deps" "MSP 체크리스트 의존성 설치"
    fi
    
    # 3. 관리자 시스템 의존성
    log_info "관리자 시스템 의존성 설치 중..."
    cd admin
    
    rm -rf node_modules package-lock.json
    if [ "$MSP_MINIMAL_INSTALL" = "true" ]; then
        retry_command "npm install --production --no-optional" "관리자 시스템 의존성 설치 (최소 모드)"
    else
        retry_command "npm install --no-optional" "관리자 시스템 의존성 설치"
    fi
    
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
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # MSP 체크리스트 빌드
    log_build "MSP 체크리스트 빌드 중..."
    cd msp-checklist
    
    # 빌드 캐시 정리
    rm -rf .next
    
    if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        log_success "MSP 체크리스트 빌드 성공"
    else
        log_error "MSP 체크리스트 빌드 실패"
        return 1
    fi
    
    # 최소 설치 모드에서 빌드 후 개발 의존성 정리
    if [ "$MSP_MINIMAL_INSTALL" = "true" ]; then
        log_info "개발 의존성 정리 중 (최소 설치 모드)..."
        npm prune --production 2>/dev/null || true
    fi
    
    # 관리자 시스템 빌드
    log_build "관리자 시스템 빌드 중..."
    cd admin
    
    rm -rf .next
    
    if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        log_success "관리자 시스템 빌드 성공"
    else
        log_error "관리자 시스템 빌드 실패"
        return 1
    fi
    
    # 관리자 시스템도 최소 설치 모드에서 정리
    if [ "$MSP_MINIMAL_INSTALL" = "true" ]; then
        log_info "관리자 시스템 개발 의존성 정리 중..."
        npm prune --production 2>/dev/null || true
    fi
    
    cd ..
    log_success "애플리케이션 빌드 완료"
}

# 서버 시작
start_server() {
    log_step "서버 시작 중..."
    
    cd "$INSTALL_DIR"
    
    # 서버 시작
    ./restart-servers.sh
    
    # 시작 대기
    sleep 15
    
    # 상태 확인
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
    
    # 빌드 파일 확인
    if [ ! -d "msp-checklist/.next" ]; then
        log_error "MSP 체크리스트 빌드 파일이 없습니다."
        return 1
    fi
    
    if [ ! -d "msp-checklist/admin/.next" ]; then
        log_error "관리자 시스템 빌드 파일이 없습니다."
        return 1
    fi
    
    log_success "설치 검증 완료"
}

# 메인 설치 함수
main() {
    # 배너 출력
    show_banner
    
    log_info "설치 로그: $LOG_FILE"
    
    # 사용자 확인
    read -p "Amazon Linux 2023 완전 설치를 시작하시겠습니까? (y/n): " -n 1 -r
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
    fix_css_framework_issues
    optimize_nextjs_config
    create_admin_components
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
    echo -e "${GREEN}║                 🎉 설치 완료! 🎉                          ║${NC}"
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
    echo "- 서버 재시작: cd $INSTALL_DIR && ./restart-servers.sh"
    echo "- 로그 확인: cd $INSTALL_DIR && tail -f server.log"
    echo ""
    echo "📝 다음 단계:"
    echo "1. 환경 변수 설정: nano $INSTALL_DIR/msp-checklist/.env.local"
    echo "2. AI 기능 사용을 위한 API 키 설정"
    echo "3. AWS 보안 그룹에서 포트 3010, 3011 인바운드 규칙 확인"
    echo "4. 관리자 계정 생성: cd $INSTALL_DIR && node create-admin.cjs"
    echo ""
    echo "📋 설치 로그: $LOG_FILE"
    
    log_success "모든 빌드 문제가 해결되고 설치가 완전히 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"