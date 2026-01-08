#!/bin/bash
#===============================================================================
# MSP Checklist System - EC2 Amazon Linux 완벽 설치 스크립트
# 
# 사용법:
#   curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/scripts/install/install-full.sh | bash
#   또는
#   chmod +x install-full.sh && ./install-full.sh
#
# 요구사항:
#   - Amazon Linux 2023 또는 Amazon Linux 2
#   - 최소 2GB RAM, 10GB 디스크
#   - 인터넷 연결
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
INSTALL_DIR="/opt/msp-checklist-system"
GITHUB_REPO="https://github.com/randykwon/msp-checklist-system.git"
NODE_VERSION="20"
MAIN_PORT=3010
ADMIN_PORT=3011

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 헤더 출력
print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  MSP Checklist System - EC2 설치 스크립트"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# 시스템 요구사항 확인
check_requirements() {
    log_info "시스템 요구사항 확인 중..."
    
    # OS 확인
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        log_info "OS: $NAME $VERSION"
    fi
    
    # 메모리 확인
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_MEM" -lt 1800 ]; then
        log_warn "메모리가 2GB 미만입니다. 성능 문제가 발생할 수 있습니다."
    fi
    
    # 디스크 확인
    DISK_FREE=$(df -m / | awk 'NR==2 {print $4}')
    if [ "$DISK_FREE" -lt 5000 ]; then
        log_warn "디스크 여유 공간이 5GB 미만입니다."
    fi
    
    log_success "시스템 요구사항 확인 완료"
}

# 시스템 패키지 업데이트 및 설치
install_system_packages() {
    log_info "시스템 패키지 업데이트 중..."
    
    sudo yum update -y
    sudo yum install -y git curl wget tar gzip gcc-c++ make
    
    log_success "시스템 패키지 설치 완료"
}

# Node.js 설치 (nvm 사용)
install_nodejs() {
    log_info "Node.js ${NODE_VERSION} 설치 중..."
    
    # nvm 설치
    if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    
    # nvm 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Node.js 설치
    nvm install ${NODE_VERSION}
    nvm use ${NODE_VERSION}
    nvm alias default ${NODE_VERSION}
    
    # 버전 확인
    log_success "Node.js $(node -v) 설치 완료"
    log_success "npm $(npm -v) 설치 완료"
}

# PM2 설치
install_pm2() {
    log_info "PM2 설치 중..."
    
    npm install -g pm2
    
    log_success "PM2 설치 완료"
}

# 프로젝트 클론 및 설정
setup_project() {
    log_info "프로젝트 설정 중..."
    
    # 설치 디렉토리 생성
    sudo mkdir -p ${INSTALL_DIR}
    sudo chown $(whoami):$(whoami) ${INSTALL_DIR}
    
    # 기존 설치 백업
    if [ -d "${INSTALL_DIR}/msp-checklist" ]; then
        log_warn "기존 설치가 발견되었습니다. 백업 중..."
        BACKUP_DIR="${INSTALL_DIR}/backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p ${BACKUP_DIR}
        
        # DB 파일 백업
        [ -f "${INSTALL_DIR}/msp-checklist/msp-assessment.db" ] && cp "${INSTALL_DIR}/msp-checklist/msp-assessment.db" ${BACKUP_DIR}/
        [ -f "${INSTALL_DIR}/msp-checklist/advice-cache.db" ] && cp "${INSTALL_DIR}/msp-checklist/advice-cache.db" ${BACKUP_DIR}/
        [ -f "${INSTALL_DIR}/msp-checklist/virtual-evidence-cache.db" ] && cp "${INSTALL_DIR}/msp-checklist/virtual-evidence-cache.db" ${BACKUP_DIR}/
        [ -f "${INSTALL_DIR}/msp-checklist/.env.local" ] && cp "${INSTALL_DIR}/msp-checklist/.env.local" ${BACKUP_DIR}/
        [ -f "${INSTALL_DIR}/msp-checklist/admin/.env.local" ] && cp "${INSTALL_DIR}/msp-checklist/admin/.env.local" ${BACKUP_DIR}/
        
        log_success "백업 완료: ${BACKUP_DIR}"
    fi
    
    # Git 클론 또는 업데이트
    if [ -d "${INSTALL_DIR}/.git" ]; then
        log_info "기존 저장소 업데이트 중..."
        cd ${INSTALL_DIR}
        git fetch origin
        git reset --hard origin/main
    else
        log_info "저장소 클론 중..."
        cd ${INSTALL_DIR}
        rm -rf ${INSTALL_DIR}/*
        git clone ${GITHUB_REPO} .
    fi
    
    # 로그 디렉토리 생성
    mkdir -p ${INSTALL_DIR}/logs
    
    log_success "프로젝트 설정 완료"
}

# 의존성 설치 및 빌드
build_project() {
    log_info "메인 앱 의존성 설치 중..."
    cd ${INSTALL_DIR}/msp-checklist
    npm install
    
    log_info "메인 앱 빌드 중..."
    npm run build
    
    log_info "Admin 앱 의존성 설치 중..."
    cd ${INSTALL_DIR}/msp-checklist/admin
    npm install
    
    log_info "Admin 앱 빌드 중..."
    npm run build
    
    log_success "빌드 완료"
}

# 환경 변수 설정
setup_env() {
    log_info "환경 변수 설정 중..."
    
    # 메인 앱 .env.local
    MAIN_ENV="${INSTALL_DIR}/msp-checklist/.env.local"
    if [ ! -f "$MAIN_ENV" ]; then
        cat > "$MAIN_ENV" << 'EOF'
# LLM API Keys (필요한 것만 설정)
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# AWS Bedrock 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

# 기본 LLM Provider (openai, gemini, claude, bedrock)
DEFAULT_LLM_PROVIDER=bedrock
EOF
        log_warn "메인 앱 .env.local 파일이 생성되었습니다. API 키를 설정해주세요."
        log_warn "파일 위치: $MAIN_ENV"
    else
        log_info "기존 메인 앱 .env.local 파일 유지"
    fi
    
    # Admin 앱 .env.local
    ADMIN_ENV="${INSTALL_DIR}/msp-checklist/admin/.env.local"
    if [ ! -f "$ADMIN_ENV" ]; then
        cat > "$ADMIN_ENV" << EOF
# 메인 앱 URL
MAIN_APP_URL=http://localhost:${MAIN_PORT}

# JWT Secret (변경 권장)
JWT_SECRET=$(openssl rand -base64 32)

# Admin 초기 비밀번호
ADMIN_DEFAULT_PASSWORD=admin123
EOF
        log_warn "Admin 앱 .env.local 파일이 생성되었습니다."
        log_warn "파일 위치: $ADMIN_ENV"
    else
        log_info "기존 Admin 앱 .env.local 파일 유지"
    fi
    
    log_success "환경 변수 설정 완료"
}

# PM2 설정 및 서비스 시작
setup_pm2() {
    log_info "PM2 서비스 설정 중..."
    
    # PM2 ecosystem 파일 생성
    cat > ${INSTALL_DIR}/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '${INSTALL_DIR}/msp-checklist',
      script: 'npm',
      args: 'start -- -p ${MAIN_PORT}',
      env: {
        NODE_ENV: 'production',
        PORT: ${MAIN_PORT}
      },
      log_file: '${INSTALL_DIR}/logs/main-server.log',
      error_file: '${INSTALL_DIR}/logs/main-error.log',
      out_file: '${INSTALL_DIR}/logs/main-out.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10
    },
    {
      name: 'msp-admin',
      cwd: '${INSTALL_DIR}/msp-checklist/admin',
      script: 'npm',
      args: 'start -- -p ${ADMIN_PORT}',
      env: {
        NODE_ENV: 'production',
        PORT: ${ADMIN_PORT}
      },
      log_file: '${INSTALL_DIR}/logs/admin-server.log',
      error_file: '${INSTALL_DIR}/logs/admin-error.log',
      out_file: '${INSTALL_DIR}/logs/admin-out.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
EOF
    
    # 기존 PM2 프로세스 정리
    pm2 delete all 2>/dev/null || true
    
    # PM2로 서비스 시작
    cd ${INSTALL_DIR}
    pm2 start ecosystem.config.js
    
    # PM2 시작 스크립트 저장 (재부팅 시 자동 시작)
    pm2 save
    pm2 startup | tail -1 | bash 2>/dev/null || true
    
    log_success "PM2 서비스 설정 완료"
}

# 관리 스크립트 생성
create_management_scripts() {
    log_info "관리 스크립트 생성 중..."
    
    # 시작 스크립트
    cat > ${INSTALL_DIR}/start.sh << 'EOF'
#!/bin/bash
cd /opt/msp-checklist-system
pm2 start ecosystem.config.js
pm2 status
EOF
    
    # 중지 스크립트
    cat > ${INSTALL_DIR}/stop.sh << 'EOF'
#!/bin/bash
pm2 stop all
pm2 status
EOF
    
    # 재시작 스크립트
    cat > ${INSTALL_DIR}/restart.sh << 'EOF'
#!/bin/bash
pm2 restart all
pm2 status
EOF
    
    # 상태 확인 스크립트
    cat > ${INSTALL_DIR}/status.sh << 'EOF'
#!/bin/bash
echo "═══════════════════════════════════════════════════════════════"
echo "  MSP Checklist System 상태"
echo "═══════════════════════════════════════════════════════════════"
pm2 status
echo ""
echo "포트 상태:"
echo "  메인 앱 (3010): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3010 || echo 'DOWN')"
echo "  Admin 앱 (3011): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3011 || echo 'DOWN')"
echo ""
echo "로그 확인:"
echo "  pm2 logs msp-main"
echo "  pm2 logs msp-admin"
echo "═══════════════════════════════════════════════════════════════"
EOF
    
    # 업데이트 스크립트
    cat > ${INSTALL_DIR}/update.sh << 'EOF'
#!/bin/bash
set -e
cd /opt/msp-checklist-system

echo "[INFO] 서비스 중지..."
pm2 stop all

echo "[INFO] 최신 코드 가져오기..."
git pull

echo "[INFO] 메인 앱 빌드..."
cd msp-checklist
npm install
rm -rf .next
npm run build

echo "[INFO] Admin 앱 빌드..."
cd admin
npm install
rm -rf .next
npm run build

echo "[INFO] 서비스 재시작..."
cd /opt/msp-checklist-system
pm2 restart all

echo "[✓] 업데이트 완료!"
pm2 status
EOF
    
    # 실행 권한 부여
    chmod +x ${INSTALL_DIR}/*.sh
    
    log_success "관리 스크립트 생성 완료"
}

# 방화벽 설정
setup_firewall() {
    log_info "방화벽 설정 확인 중..."
    
    # iptables 규칙 추가 (필요시)
    # sudo iptables -A INPUT -p tcp --dport 3010 -j ACCEPT
    # sudo iptables -A INPUT -p tcp --dport 3011 -j ACCEPT
    
    log_warn "EC2 보안 그룹에서 포트 3010, 3011을 열어주세요."
    log_warn "또는 Nginx 리버스 프록시를 설정하여 80/443 포트를 사용하세요."
}

# 설치 완료 메시지
print_completion() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "  ${GREEN}MSP Checklist System 설치 완료!${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  접속 URL:"
    echo "    메인 앱:  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_IP'):${MAIN_PORT}"
    echo "    Admin:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_IP'):${ADMIN_PORT}"
    echo ""
    echo "  관리 명령어:"
    echo "    상태 확인:  ${INSTALL_DIR}/status.sh"
    echo "    시작:      ${INSTALL_DIR}/start.sh"
    echo "    중지:      ${INSTALL_DIR}/stop.sh"
    echo "    재시작:    ${INSTALL_DIR}/restart.sh"
    echo "    업데이트:  ${INSTALL_DIR}/update.sh"
    echo ""
    echo "  PM2 명령어:"
    echo "    pm2 status          - 상태 확인"
    echo "    pm2 logs            - 로그 보기"
    echo "    pm2 restart all     - 재시작"
    echo ""
    echo "  중요: API 키 설정이 필요합니다!"
    echo "    nano ${INSTALL_DIR}/msp-checklist/.env.local"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# 메인 실행
main() {
    print_header
    check_requirements
    install_system_packages
    install_nodejs
    install_pm2
    setup_project
    build_project
    setup_env
    setup_pm2
    create_management_scripts
    setup_firewall
    print_completion
}

# 스크립트 실행
main "$@"
