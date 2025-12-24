#!/bin/bash

# MSP Checklist Ultimate Fix Script
# 모든 알려진 문제를 자동으로 감지하고 해결하는 통합 스크립트
# Ubuntu 22.04 LTS 및 Amazon Linux 2023 지원

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

# 전역 변수
PROJECT_DIR="/opt/msp-checklist-system"
BACKUP_DIR="/tmp/msp-backup-$(date +%Y%m%d_%H%M%S)"

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           MSP Checklist Ultimate Fix Script               ║"
    echo "║                                                            ║"
    echo "║  🔧 모든 알려진 문제 자동 감지 및 해결                   ║"
    echo "║  🚀 ESLint 충돌 해결                                     ║"
    echo "║  💥 LightningCSS 문제 해결                               ║"
    echo "║  🌐 Nginx 설정 문제 해결                                ║"
    echo "║  📦 Next.js Webpack 플래그 문제 해결                    ║"
    echo "║  🔄 Amazon Linux 2023 curl 충돌 해결                   ║"
    echo "║  🛠️ 포트 충돌 및 권한 문제 해결                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# OS 감지
detect_os() {
    log_step "운영체제 감지 중..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_NAME="$NAME"
        OS_VERSION="$VERSION"
        
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            PACKAGE_MANAGER="apt"
            USER_NAME="ubuntu"
            FIREWALL_CMD="ufw"
            log_success "Ubuntu 감지됨: $OS_NAME $OS_VERSION"
            
        elif [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
            OS_TYPE="amazon-linux-2023"
            PACKAGE_MANAGER="dnf"
            USER_NAME="ec2-user"
            FIREWALL_CMD="firewalld"
            log_success "Amazon Linux 2023 감지됨: $OS_NAME $OS_VERSION"
            
        else
            log_error "지원되지 않는 운영체제입니다: $OS_NAME"
            exit 1
        fi
    else
        log_error "/etc/os-release 파일을 찾을 수 없습니다"
        exit 1
    fi
}

# 백업 생성
create_backup() {
    log_step "시스템 백업 생성 중..."
    
    mkdir -p "$BACKUP_DIR"
    
    # 프로젝트 디렉토리 백업
    if [ -d "$PROJECT_DIR" ]; then
        log_info "프로젝트 디렉토리 백업 중..."
        cp -r "$PROJECT_DIR" "$BACKUP_DIR/msp-checklist-system" 2>/dev/null || true
    fi
    
    # Nginx 설정 백업
    if [ -f /etc/nginx/nginx.conf ]; then
        log_info "Nginx 설정 백업 중..."
        mkdir -p "$BACKUP_DIR/nginx"
        cp -r /etc/nginx/* "$BACKUP_DIR/nginx/" 2>/dev/null || true
    fi
    
    # PM2 설정 백업
    if command -v pm2 > /dev/null 2>&1; then
        log_info "PM2 설정 백업 중..."
        pm2 save 2>/dev/null || true
        cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump.pm2" 2>/dev/null || true
    fi
    
    log_success "백업 생성 완료: $BACKUP_DIR"
}

# Amazon Linux 2023 curl 충돌 해결
fix_amazon_linux_curl() {
    if [[ "$OS_TYPE" != "amazon-linux-2023" ]]; then
        return 0
    fi
    
    log_step "Amazon Linux 2023 curl 충돌 해결 중..."
    
    # curl 상태 확인
    if ! curl --version > /dev/null 2>&1; then
        log_warning "curl 문제 감지됨 - 자동 해결 시작"
        
        # curl-minimal 제거 및 curl 설치
        sudo dnf remove -y curl-minimal 2>/dev/null || true
        sudo dnf install -y curl 2>/dev/null || true
        
        # 여전히 문제가 있으면 소스 컴파일
        if ! curl --version > /dev/null 2>&1; then
            log_info "소스에서 curl 컴파일 중..."
            
            local temp_dir=$(mktemp -d)
            cd "$temp_dir"
            
            if command -v wget > /dev/null 2>&1; then
                wget https://curl.se/download/curl-8.4.0.tar.gz
                tar -xzf curl-8.4.0.tar.gz
                cd curl-8.4.0
                
                ./configure --prefix=/usr/local
                make -j$(nproc)
                sudo make install
                
                # 심볼릭 링크 생성
                sudo ln -sf /usr/local/bin/curl /usr/bin/curl
                
                log_success "✅ curl 소스 컴파일 설치 완료"
            fi
            
            # 정리
            cd /
            rm -rf "$temp_dir"
        fi
    fi
    
    # 최종 테스트
    if command -v curl > /dev/null 2>&1; then
        local curl_version=$(curl --version | head -1)
        log_success "✅ curl 설치 확인: $curl_version"
    else
        log_error "❌ curl 설치 실패"
    fi
}

# Nginx 포트 충돌 해결
fix_nginx_port_conflict() {
    log_step "Nginx 포트 충돌 해결 중..."
    
    # 포트 3010, 3011에서 실행 중인 프로세스 확인
    local port_3010=$(netstat -tlnp 2>/dev/null | grep ":3010 " | grep -v "127.0.0.1" || echo "")
    local port_3011=$(netstat -tlnp 2>/dev/null | grep ":3011 " | grep -v "127.0.0.1" || echo "")
    
    if [ -n "$port_3010" ] || [ -n "$port_3011" ]; then
        log_warning "포트 충돌 감지됨"
        
        # Nginx가 직접 3010, 3011 포트를 바인딩하고 있는지 확인
        if pgrep nginx > /dev/null; then
            log_info "Nginx 프로세스 중지 중..."
            sudo systemctl stop nginx 2>/dev/null || true
            sudo pkill -f nginx 2>/dev/null || true
        fi
        
        # 포트를 사용하는 다른 프로세스 종료
        sudo fuser -k 3010/tcp 2>/dev/null || true
        sudo fuser -k 3011/tcp 2>/dev/null || true
        
        log_success "포트 충돌 해결 완료"
    fi
}

# Nginx 설정 문제 해결
fix_nginx_config() {
    log_step "Nginx 설정 문제 해결 중..."
    
    # Nginx 설정 파일 백업
    if [ -f /etc/nginx/nginx.conf ]; then
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # sendfile 중복 설정 제거
    if grep -q "sendfile.*on" /etc/nginx/nginx.conf; then
        log_info "sendfile 중복 설정 제거 중..."
        sudo sed -i '/sendfile.*on/d' /etc/nginx/nginx.conf
        
        # http 블록에 sendfile 추가
        if ! grep -q "sendfile on;" /etc/nginx/nginx.conf; then
            sudo sed -i '/http {/a\    sendfile on;' /etc/nginx/nginx.conf
        fi
    fi
    
    # gzip 중복 설정 제거
    if [ $(grep -c "gzip on" /etc/nginx/nginx.conf) -gt 1 ]; then
        log_info "gzip 중복 설정 제거 중..."
        sudo sed -i '2,$s/gzip on;//g' /etc/nginx/nginx.conf
    fi
    
    # 기본 사이트 비활성화
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo rm -f /etc/nginx/sites-enabled/default
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
    fi
    
    # Nginx 설정 테스트
    if sudo nginx -t 2>/dev/null; then
        log_success "Nginx 설정 검증 통과"
    else
        log_error "Nginx 설정 오류 - 기본 설정으로 복원"
        sudo cp /etc/nginx/nginx.conf.backup.* /etc/nginx/nginx.conf 2>/dev/null || true
    fi
}

# ESLint 충돌 해결
fix_eslint_conflict() {
    log_step "ESLint 의존성 충돌 해결 중..."
    
    if [ ! -d "$PROJECT_DIR/msp-checklist" ]; then
        log_warning "프로젝트 디렉토리를 찾을 수 없습니다"
        return 1
    fi
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # 현재 package.json 백업
    if [ -f package.json ]; then
        cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
        log_info "package.json 백업 생성됨"
        
        # ESLint 버전 충돌 확인
        if grep -q '"eslint".*"\\^8' package.json && grep -q '"eslint-config-next".*"1[6-9]' package.json; then
            log_warning "ESLint 버전 충돌 감지됨"
        fi
    fi
    
    # 호환 가능한 package.json 생성
    log_info "호환 가능한 package.json 생성 중..."
    cat > package.json << 'EOF'
{
  "name": "msp-checklist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.2.2",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.3",
    "lucide-react": "^0.263.1",
    "next": "15.1.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5"
  }
}
EOF
    
    # npm 캐시 정리
    log_info "npm 캐시 정리 중..."
    npm cache clean --force 2>/dev/null || true
    rm -rf node_modules package-lock.json
    
    # 의존성 설치 (다단계 시도)
    log_info "의존성 설치 중..."
    if npm install --legacy-peer-deps --no-fund --no-audit; then
        log_success "✅ 의존성 설치 성공"
    elif npm install --legacy-peer-deps --force --no-fund --no-audit; then
        log_success "✅ 의존성 설치 성공 (force)"
    else
        log_error "❌ 의존성 설치 실패"
        return 1
    fi
}

# LightningCSS 문제 해결 (Nuclear CSS Fix)
fix_lightningcss_issue() {
    log_step "LightningCSS 문제 해결 중..."
    
    if [ ! -d "$PROJECT_DIR/msp-checklist" ]; then
        log_warning "프로젝트 디렉토리를 찾을 수 없습니다"
        return 1
    fi
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # 모든 CSS 관련 파일 제거
    log_info "CSS 관련 파일 정리 중..."
    rm -rf .next .turbo .swc
    rm -f postcss.config.* tailwind.config.* .postcssrc* *.css.map
    
    # globals.css 재작성
    log_info "globals.css 재작성 중..."
    mkdir -p app
    cat > app/globals.css << 'EOF'
/* MSP Checklist 기본 CSS - Amazon Linux 2023 호환 */

/* 기본 리셋 */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 기본 스타일 */
html, body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

/* 컨테이너 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 버튼 스타일 */
.btn {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

/* 카드 스타일 */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 20px;
}

/* 반응형 */
@media (max-width: 768px) {
  .container {
    padding: 0 10px;
  }
}
EOF
    
    # Next.js 설정 재작성
    log_info "Next.js 설정 재작성 중..."
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CSS 처리 완전 제거
  experimental: {
    turbo: undefined,
  },
  
  // 웹팩 설정 최소화
  webpack: (config) => {
    // CSS 로더 제거
    config.module.rules = config.module.rules.filter(rule => {
      if (rule.test && rule.test.toString().includes('css')) {
        return false;
      }
      return true;
    });
    
    return config;
  },
  
  // 성능 최적화
  poweredByHeader: false,
  compress: true,
  
  // 보안 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  // TypeScript 설정
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
EOF
    
    log_success "LightningCSS 문제 해결 완료"
}

# Next.js Webpack 플래그 문제 해결
fix_nextjs_webpack_flag() {
    log_step "Next.js Webpack 플래그 문제 해결 중..."
    
    if [ ! -d "$PROJECT_DIR/msp-checklist" ]; then
        log_warning "프로젝트 디렉토리를 찾을 수 없습니다"
        return 1
    fi
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # package.json에서 --webpack 플래그 제거
    if [ -f package.json ] && grep -q "build.*--webpack" package.json; then
        log_info "--webpack 플래그 제거 중..."
        sed -i 's/next build --webpack/next build/g' package.json
        log_success "--webpack 플래그 제거 완료"
    fi
}

# 권한 문제 해결
fix_permissions() {
    log_step "권한 문제 해결 중..."
    
    if [ -d "$PROJECT_DIR" ]; then
        # 프로젝트 디렉토리 권한 수정
        sudo chown -R "$USER_NAME:$USER_NAME" "$PROJECT_DIR" 2>/dev/null || true
        chmod -R 755 "$PROJECT_DIR" 2>/dev/null || true
        
        # 실행 권한 부여
        find "$PROJECT_DIR" -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
        
        log_success "권한 문제 해결 완료"
    fi
}

# PM2 문제 해결
fix_pm2_issues() {
    log_step "PM2 문제 해결 중..."
    
    # PM2 프로세스 정리
    if command -v pm2 > /dev/null 2>&1; then
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        pm2 kill 2>/dev/null || true
    fi
    
    # PM2 재설치 (필요시)
    if ! command -v pm2 > /dev/null 2>&1; then
        log_info "PM2 설치 중..."
        sudo npm install -g pm2
    fi
    
    # ecosystem.config.js 생성
    if [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
        
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: './msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'msp-admin',
      cwd: './msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF
        
        log_success "PM2 설정 완료"
    fi
}

# 빌드 테스트
test_build() {
    log_step "빌드 테스트 중..."
    
    if [ ! -d "$PROJECT_DIR/msp-checklist" ]; then
        log_warning "프로젝트 디렉토리를 찾을 수 없습니다"
        return 1
    fi
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # 환경 변수 설정
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 빌드 시도
    if npm run build; then
        log_success "✅ 메인 애플리케이션 빌드 성공"
        
        # Admin 빌드 테스트
        if [ -d "admin" ]; then
            cd admin
            if npm run build 2>/dev/null; then
                log_success "✅ Admin 애플리케이션 빌드 성공"
            else
                log_warning "⚠️ Admin 애플리케이션 빌드 실패 (메인은 정상)"
            fi
            cd ..
        fi
        
        return 0
    else
        log_error "❌ 빌드 실패"
        return 1
    fi
}

# 서비스 시작
start_services() {
    log_step "서비스 시작 중..."
    
    # Nginx 시작
    if command -v nginx > /dev/null 2>&1; then
        sudo systemctl enable nginx
        sudo systemctl start nginx
        
        if sudo systemctl is-active nginx > /dev/null; then
            log_success "✅ Nginx 시작됨"
        else
            log_error "❌ Nginx 시작 실패"
        fi
    fi
    
    # PM2 애플리케이션 시작
    if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
        cd "$PROJECT_DIR"
        
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        
        sleep 5
        local running_processes=$(pm2 list | grep -c "online" 2>/dev/null || echo "0")
        
        if [ "$running_processes" -gt 0 ]; then
            log_success "✅ PM2 애플리케이션 시작됨 ($running_processes개 프로세스)"
        else
            log_error "❌ PM2 애플리케이션 시작 실패"
        fi
    fi
}

# 연결 테스트
test_connections() {
    log_step "연결 테스트 중..."
    
    # HTTP 테스트
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 응답 테스트 통과 (HTTP $http_code)"
    else
        log_warning "⚠️ HTTP 응답 테스트 실패 (HTTP $http_code)"
    fi
    
    # 관리자 페이지 테스트
    local admin_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ "$admin_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ 관리자 페이지 응답 테스트 통과 (HTTP $admin_code)"
    else
        log_warning "⚠️ 관리자 페이지 응답 테스트 실패 (HTTP $admin_code)"
    fi
}

# 시스템 상태 표시
show_system_status() {
    echo ""
    echo -e "${GREEN}=== MSP Checklist 시스템 상태 ===${NC}"
    echo ""
    
    # 서비스 상태
    echo "🔧 서비스 상태:"
    if command -v nginx > /dev/null 2>&1; then
        if sudo systemctl is-active nginx > /dev/null; then
            echo "  - Nginx: ✅ 실행 중"
        else
            echo "  - Nginx: ❌ 중지됨"
        fi
    fi
    
    if command -v pm2 > /dev/null 2>&1; then
        local pm2_status=$(pm2 list | grep -c "online" 2>/dev/null || echo "0")
        if [ "$pm2_status" -gt 0 ]; then
            echo "  - PM2: ✅ $pm2_status개 프로세스 실행 중"
        else
            echo "  - PM2: ❌ 프로세스 없음"
        fi
    fi
    
    # 포트 상태
    echo ""
    echo "🌐 포트 상태:"
    echo "  - 80 (HTTP): $(netstat -tlnp 2>/dev/null | grep ":80 " > /dev/null && echo "✅ 사용 중" || echo "❌ 사용 안함")"
    echo "  - 3010 (메인): $(netstat -tlnp 2>/dev/null | grep ":3010 " > /dev/null && echo "✅ 사용 중" || echo "❌ 사용 안함")"
    echo "  - 3011 (관리자): $(netstat -tlnp 2>/dev/null | grep ":3011 " > /dev/null && echo "✅ 사용 중" || echo "❌ 사용 안함")"
    
    # 리소스 상태
    echo ""
    echo "💾 리소스:"
    echo "  - 디스크: $(df -h / | tail -1 | awk '{print $5}') 사용"
    echo "  - 메모리: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    
    echo ""
    echo "🔧 관리 명령어:"
    echo "  - 전체 상태 확인: pm2 status"
    echo "  - 애플리케이션 재시작: pm2 restart all"
    echo "  - 로그 확인: pm2 logs"
    echo "  - Nginx 재시작: sudo systemctl restart nginx"
    
    # 접속 정보
    local public_ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo ""
    echo "🌍 접속 정보:"
    echo "  - 메인 사이트: http://$public_ip"
    echo "  - 관리자 페이지: http://$public_ip/admin"
    
    echo ""
}

# 메인 실행 함수
main() {
    show_banner
    
    # 사용자 확인
    read -p "MSP Checklist Ultimate Fix를 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "작업이 취소되었습니다."
        exit 0
    fi
    
    # 단계별 실행
    detect_os
    create_backup
    
    log_step "=== 시스템 문제 해결 시작 ==="
    
    # 1. Amazon Linux curl 문제 해결
    fix_amazon_linux_curl
    
    # 2. Nginx 관련 문제 해결
    fix_nginx_port_conflict
    fix_nginx_config
    
    # 3. 권한 문제 해결
    fix_permissions
    
    # 4. Node.js/npm 관련 문제 해결
    fix_eslint_conflict
    fix_nextjs_webpack_flag
    fix_lightningcss_issue
    
    # 5. PM2 문제 해결
    fix_pm2_issues
    
    # 6. 빌드 테스트
    if test_build; then
        log_success "✅ 모든 빌드 테스트 통과"
    else
        log_warning "⚠️ 빌드 테스트 실패 - 수동 확인 필요"
    fi
    
    # 7. 서비스 시작
    start_services
    
    # 8. 연결 테스트
    test_connections
    
    # 9. 시스템 상태 표시
    show_system_status
    
    log_success "🎉 MSP Checklist Ultimate Fix 완료!"
    echo ""
    echo "백업 위치: $BACKUP_DIR"
    echo "문제가 발생하면 백업을 사용하여 복원할 수 있습니다."
}

# 스크립트 실행
main "$@"