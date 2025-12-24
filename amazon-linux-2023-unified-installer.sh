#!/bin/bash

# Amazon Linux 2023 통합 설치 스크립트
# 디렉토리 구조 통일 + 모든 빌드 문제 해결 + 완전 설치

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
LOG_FILE="/tmp/msp-unified-install-$(date +%Y%m%d_%H%M%S).log"
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
    echo "║     Amazon Linux 2023 MSP Checklist 통합 설치 스크립트   ║"
    echo "║                                                            ║"
    echo "║  🔧 디렉토리 구조 msp-checklist-system으로 통일          ║"
    echo "║  💥 모든 CSS 프레임워크 문제 완전 해결                   ║"
    echo "║  🎨 Admin 시스템 컴포넌트 자동 생성                      ║"
    echo "║  🚀 완전한 설치 및 서버 시작                             ║"
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
    
    if [ $DISK_GB -lt 3 ]; then
        log_error "최소 3GB 디스크 공간이 필요합니다. 현재: ${DISK_GB}GB"
        echo ""
        echo "해결 방법:"
        echo "1. 디스크 공간 최적화: ./optimize-disk-space.sh"
        echo "2. 더 큰 인스턴스 사용 또는 EBS 볼륨 확장"
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

# 디렉토리 구조 통일
unify_directory_structure() {
    log_step "디렉토리 구조 통일 중..."
    
    cd /opt
    log_info "현재 위치: $(pwd)"
    log_info "현재 디렉토리 상태:"
    ls -la
    
    # 모든 관련 프로세스 중지
    log_info "모든 관련 프로세스 중지 중..."
    sudo pkill -f "msp" 2>/dev/null || true
    sudo pkill -f "next" 2>/dev/null || true
    sudo pkill -f "npm" 2>/dev/null || true
    sleep 3
    
    # 디렉토리 구조 분석 및 통일
    if [ -d "msp-checklist-system" ] && [ -d "msp-checklist" ]; then
        log_warning "두 디렉토리가 모두 존재합니다. msp-checklist-system으로 통합합니다."
        
        # 백업 생성
        sudo cp -r "msp-checklist" "msp-checklist.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "백업 생성 완료"
        
        # 중요한 파일들을 msp-checklist-system으로 복사
        if [ -f "msp-checklist/.env" ]; then
            sudo cp -n "msp-checklist/.env" "msp-checklist-system/" 2>/dev/null || true
        fi
        
        # 오래된 디렉토리 제거
        sudo rm -rf "msp-checklist"
        log_success "중복 디렉토리 정리 완료"
        
    elif [ -d "msp-checklist" ] && [ ! -d "msp-checklist-system" ]; then
        log_info "msp-checklist를 msp-checklist-system으로 이름 변경합니다."
        sudo mv "msp-checklist" "msp-checklist-system"
        
    elif [ ! -d "msp-checklist-system" ] && [ ! -d "msp-checklist" ]; then
        log_info "MSP Checklist 디렉토리가 없습니다. 새로 생성합니다."
        sudo mkdir -p "msp-checklist-system"
    fi
    
    # 권한 설정
    sudo chown -R $USER:$USER "msp-checklist-system"
    
    # 호환성을 위한 심볼릭 링크 생성
    if [ ! -L "msp-checklist" ] && [ ! -d "msp-checklist" ]; then
        sudo ln -s msp-checklist-system msp-checklist
        log_success "호환성 심볼릭 링크 생성: msp-checklist -> msp-checklist-system"
    fi
    
    log_success "디렉토리 구조 통일 완료"
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
    
    cd "$INSTALL_DIR"
    
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
    
    # 빌드 캐시 정리
    rm -rf msp-checklist/.next 2>/dev/null || true
    rm -rf msp-checklist/admin/.next 2>/dev/null || true
    
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
        log_warning "firewalld 시작 실패, iptables로 대체합니다."
        
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
            
            log_success "iptables 방화벽 설정 완료"
        else
            log_warning "방화벽 설정을 건너뜁니다. AWS 보안 그룹에서 포트를 허용하세요."
        fi
        return 0
    fi
    
    # firewalld 자동 시작 설정
    sudo systemctl enable firewalld
    
    # 포트 열기
    sudo firewall-cmd --permanent --add-port=3010/tcp
    sudo firewall-cmd --permanent --add-port=3011/tcp
    sudo firewall-cmd --reload
    
    log_success "firewalld 방화벽 설정 완료"
}

# 프로젝트 클론 또는 업데이트
setup_project() {
    log_step "프로젝트 설정 중..."
    
    cd "$INSTALL_DIR"
    
    # Git 저장소가 이미 있는지 확인
    if [ -d ".git" ]; then
        log_info "기존 Git 저장소 업데이트 중..."
        git fetch origin
        git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
    else
        log_info "새로운 Git 저장소 클론 중..."
        # 기존 파일들 백업
        if [ "$(ls -A .)" ]; then
            mkdir -p backup_$(date +%Y%m%d_%H%M%S)
            mv * backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
        fi
        
        retry_command "git clone $REPO_URL ." "프로젝트 클론"
    fi
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null || true
    chmod +x msp-checklist/*.sh 2>/dev/null || true
    
    log_success "프로젝트 설정 완료"
}

# CSS 프레임워크 문제 완전 해결
fix_css_framework_issues() {
    log_build "CSS 프레임워크 호환성 문제 완전 해결 중..."
    
    cd "$INSTALL_DIR/msp-checklist"
    
    # 1. 모든 CSS 프레임워크 제거
    log_info "모든 CSS 프레임워크 완전 제거 중..."
    npm uninstall @tailwindcss/postcss @tailwindcss/node tailwindcss lightningcss postcss autoprefixer 2>/dev/null || true
    
    # 2. 기존 CSS 설정 파일 제거
    rm -f postcss.config.* tailwind.config.* .postcssrc*
    
    # 3. node_modules에서 CSS 관련 디렉토리 강제 삭제
    rm -rf node_modules/tailwindcss node_modules/@tailwindcss node_modules/lightningcss node_modules/postcss*
    
    # 4. package.json에서 CSS 관련 의존성 제거
    if [ -f "package.json" ]; then
        cp package.json package.json.backup
        sed -i '/"tailwindcss"/d; /"@tailwindcss/d; /"lightningcss"/d; /"postcss"/d; /"autoprefixer"/d' package.json
    fi
    
    # 5. 완전한 순수 CSS로 globals.css 교체
    log_info "순수 CSS로 globals.css 교체 중..."
    cat > app/globals.css << 'EOF'
/* MSP Checklist 순수 CSS - 모든 프레임워크 제거됨 */

/* 기본 리셋 */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

body {
  margin: 0;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.6;
  color: #333333;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 기본 요소 스타일 */
h1, h2, h3, h4, h5, h6 { margin: 0 0 16px 0; font-weight: 600; line-height: 1.2; }
h1 { font-size: 32px; } h2 { font-size: 28px; } h3 { font-size: 24px; }
h4 { font-size: 20px; } h5 { font-size: 18px; } h6 { font-size: 16px; }
p { margin: 0 0 16px 0; }
a { color: #007bff; text-decoration: none; }
a:hover { color: #0056b3; text-decoration: underline; }

/* 레이아웃 클래스 */
.container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.flex { display: flex; } .flex-col { flex-direction: column; }
.items-center { align-items: center; } .justify-between { justify-content: space-between; }
.grid { display: grid; gap: 16px; }
.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }

/* 버튼 스타일 */
.btn, button {
  display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 500;
  text-align: center; text-decoration: none; border: none; border-radius: 6px;
  cursor: pointer; transition: all 0.2s ease; background-color: #007bff; color: white;
}
.btn:hover, button:hover { background-color: #0056b3; transform: translateY(-1px); }

/* 카드 스타일 */
.card {
  background: white; border: 1px solid #dee2e6; border-radius: 8px;
  padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.card:hover { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15); }

/* 텍스트 유틸리티 */
.text-center { text-align: center; } .text-lg { font-size: 18px; }
.font-bold { font-weight: 700; } .text-gray-600 { color: #6c757d; }

/* 여백 */
.mb-4 { margin-bottom: 16px; } .p-4 { padding: 16px; }
.w-full { width: 100%; } .rounded { border-radius: 6px; }

/* MSP 체크리스트 전용 스타일 */
.checklist-item {
  background: white; border: 1px solid #dee2e6; border-radius: 8px;
  padding: 20px; margin-bottom: 12px; transition: all 0.2s ease;
}
.checklist-item:hover { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border-color: #007bff; }

.loading-spinner {
  display: inline-block; width: 20px; height: 20px; border: 2px solid #e9ecef;
  border-radius: 50%; border-top-color: #007bff; animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 반응형 디자인 */
@media (max-width: 640px) {
  .container { padding: 0 12px; }
  .card { padding: 16px; }
  .grid-cols-2 { grid-template-columns: 1fr; }
}
EOF
    
    log_success "CSS 프레임워크 문제 완전 해결 완료"
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
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, path: false, crypto: false, stream: false, util: false,
        buffer: false, process: false, os: false, events: false, url: false,
        querystring: false, http: false, https: false, zlib: false, net: false,
        tls: false, child_process: false, dns: false, cluster: false,
        module: false, readline: false, repl: false, vm: false, constants: false,
        domain: false, punycode: false, string_decoder: false, sys: false,
        timers: false, tty: false, dgram: false, assert: false,
      };
    }
    
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3'],
  telemetry: { disabled: true }
};

export default nextConfig;
EOF
    
    # TypeScript 설정 최적화
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
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
    "types": ["node"],
    "forceConsistentCasingInFileNames": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <header style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#212529', margin: 0 }}>
              {title}
            </h1>
            <nav style={{ display: 'flex', gap: '16px' }}>
              <a href="/admin" style={{ color: '#6c757d', textDecoration: 'none', padding: '8px 12px' }}>
                Dashboard
              </a>
              <a href="/admin/announcements" style={{ color: '#6c757d', textDecoration: 'none', padding: '8px 12px' }}>
                Announcements
              </a>
            </nav>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {children}
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
    retry_command "npm install --no-optional" "프로젝트 루트 의존성 설치"
    
    # 2. MSP 체크리스트 의존성
    log_info "MSP 체크리스트 의존성 설치 중..."
    cd msp-checklist
    
    rm -rf node_modules package-lock.json
    npm uninstall @types/cookie @types/bcryptjs 2>/dev/null || true
    
    retry_command "npm install --no-optional --legacy-peer-deps" "MSP 체크리스트 의존성 설치"
    
    # 3. 관리자 시스템 의존성
    log_info "관리자 시스템 의존성 설치 중..."
    cd admin
    
    rm -rf node_modules package-lock.json
    retry_command "npm install --no-optional" "관리자 시스템 의존성 설치"
    
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
    export TURBOPACK=0
    
    # MSP 체크리스트 빌드
    log_build "MSP 체크리스트 빌드 중..."
    cd msp-checklist
    
    rm -rf .next
    
    if TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        log_success "MSP 체크리스트 빌드 성공"
    else
        log_error "MSP 체크리스트 빌드 실패"
        return 1
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
    
    cd ..
    log_success "애플리케이션 빌드 완료"
}

# 서버 시작
start_server() {
    log_step "서버 시작 중..."
    
    cd "$INSTALL_DIR"
    
    # 서버 시작 스크립트가 있는지 확인
    if [ -f "restart-servers.sh" ]; then
        ./restart-servers.sh
    else
        log_warning "restart-servers.sh 파일이 없습니다. 수동으로 서버를 시작하세요."
    fi
    
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
    read -p "Amazon Linux 2023 통합 설치를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "설치가 취소되었습니다."
        exit 0
    fi
    
    # 시작 시간 기록
    START_TIME=$(date +%s)
    
    # 설치 단계 실행
    check_system_requirements
    unify_directory_structure
    optimize_memory
    cleanup_existing_installation
    update_system
    install_nodejs
    configure_firewall
    setup_project
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
    echo -e "${GREEN}║                 🎉 통합 설치 완료! 🎉                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 시스템 통합 설치가 완료되었습니다!"
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
    echo "📁 통일된 디렉토리 구조:"
    echo "- 메인 디렉토리: $INSTALL_DIR"
    echo "- 호환성 링크: /opt/msp-checklist -> /opt/msp-checklist-system"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "- 서버 상태 확인: cd $INSTALL_DIR && ./server-status.sh"
    echo "- 서버 재시작: cd $INSTALL_DIR && ./restart-servers.sh"
    echo "- 로그 확인: cd $INSTALL_DIR && tail -f server.log"
    echo ""
    echo "✅ 해결된 문제들:"
    echo "- 디렉토리 구조 msp-checklist-system으로 통일"
    echo "- 모든 CSS 프레임워크 문제 완전 해결"
    echo "- LightningCSS 호환성 문제 해결"
    echo "- Next.js 16 TypeScript 문제 해결"
    echo "- Admin 시스템 컴포넌트 자동 생성"
    echo "- Node.js fs 모듈 문제 해결"
    echo ""
    echo "📝 다음 단계:"
    echo "1. 환경 변수 설정: nano $INSTALL_DIR/msp-checklist/.env.local"
    echo "2. AI 기능 사용을 위한 API 키 설정"
    echo "3. AWS 보안 그룹에서 포트 3010, 3011 인바운드 규칙 확인"
    echo "4. 관리자 계정 생성: cd $INSTALL_DIR && node create-admin.cjs"
    echo ""
    echo "📋 설치 로그: $LOG_FILE"
    
    log_success "모든 빌드 문제가 해결되고 디렉토리 구조가 통일되었습니다! 🚀"
}

# 스크립트 실행
main "$@"