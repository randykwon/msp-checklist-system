#!/bin/bash
#===============================================================================
# MSP 어드바이저 - EC2 완벽 설치 스크립트
# 
# 사용법:
#   curl -fsSL https://raw.githubusercontent.com/your-repo/msp-advisor/main/scripts/install/install-full.sh | bash
#   또는
#   chmod +x install-full.sh && ./install-full.sh
#
# 요구사항:
#   - Amazon Linux 2023 / Amazon Linux 2 / Ubuntu 20.04+
#   - 최소 2GB RAM, 10GB 디스크
#   - 인터넷 연결
#
# 설치 항목:
#   - Node.js 20.x (nvm)
#   - PM2 (프로세스 관리자)
#   - @msp/shared 패키지
#   - 메인 앱 (포트 3010)
#   - Admin 앱 (포트 3011)
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 설정
INSTALL_DIR="/opt/msp-advisor"
GITHUB_REPO="https://github.com/your-repo/msp-advisor.git"
NODE_VERSION="20"
NVM_VERSION="0.39.7"
MAIN_PORT=3010
ADMIN_PORT=3011

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 헤더 출력
print_header() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║       AWS MSP 자체 평가 어드바이저 - 설치 스크립트            ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# OS 감지
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            amzn)
                OS_TYPE="amazon"
                PKG_MANAGER="yum"
                log_info "Amazon Linux 감지됨: $VERSION"
                ;;
            ubuntu)
                OS_TYPE="ubuntu"
                PKG_MANAGER="apt-get"
                log_info "Ubuntu 감지됨: $VERSION"
                ;;
            *)
                OS_TYPE="linux"
                PKG_MANAGER="yum"
                log_warn "알 수 없는 Linux 배포판: $ID"
                ;;
        esac
    else
        log_error "지원되지 않는 운영체제입니다."
        exit 1
    fi
}

# 시스템 요구사항 확인
check_requirements() {
    log_step "시스템 요구사항 확인 중..."
    
    # 메모리 확인
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_MEM" -lt 1800 ]; then
        log_warn "메모리가 2GB 미만입니다 (${TOTAL_MEM}MB). 성능 문제가 발생할 수 있습니다."
    else
        log_success "메모리: ${TOTAL_MEM}MB"
    fi
    
    # 디스크 확인
    DISK_FREE=$(df -m / | awk 'NR==2 {print $4}')
    if [ "$DISK_FREE" -lt 5000 ]; then
        log_warn "디스크 여유 공간이 5GB 미만입니다 (${DISK_FREE}MB)."
    else
        log_success "디스크 여유 공간: ${DISK_FREE}MB"
    fi
}

# 시스템 패키지 설치
install_system_packages() {
    log_step "시스템 패키지 설치 중..."
    
    if [ "$PKG_MANAGER" = "yum" ]; then
        sudo yum update -y
        # curl은 Amazon Linux 2023에서 curl-minimal로 이미 설치되어 있음
        # curl 패키지 설치 시 충돌 발생하므로 제외
        sudo yum install -y git wget tar gzip gcc-c++ make python3 || {
            log_warn "일부 패키지 설치 실패, 개별 설치 시도..."
            sudo yum install -y git || true
            sudo yum install -y wget || true
            sudo yum install -y tar gzip || true
            sudo yum install -y gcc-c++ make || true
            sudo yum install -y python3 || true
        }
    else
        sudo apt-get update
        sudo apt-get install -y git curl wget tar gzip build-essential python3
    fi
    
    # curl 확인 (curl-minimal도 curl 명령어 제공)
    if command -v curl &> /dev/null; then
        log_success "curl 사용 가능: $(curl --version | head -1)"
    else
        log_error "curl을 찾을 수 없습니다."
        exit 1
    fi
    
    log_success "시스템 패키지 설치 완료"
}

# Node.js 설치 (nvm 사용)
install_nodejs() {
    log_step "Node.js ${NODE_VERSION} 설치 중..."
    
    # nvm 설치
    if [ ! -d "$HOME/.nvm" ]; then
        log_info "nvm 설치 중..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash
    fi
    
    # nvm 로드
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Node.js 설치
    nvm install ${NODE_VERSION}
    nvm use ${NODE_VERSION}
    nvm alias default ${NODE_VERSION}
    
    log_success "Node.js $(node -v) 설치 완료"
    log_success "npm $(npm -v) 설치 완료"
}

# PM2 설치
install_pm2() {
    log_step "PM2 설치 중..."
    
    npm install -g pm2
    
    log_success "PM2 $(pm2 -v) 설치 완료"
}

# 프로젝트 클론 및 설정
setup_project() {
    log_step "프로젝트 설정 중..."
    
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
        rm -rf ${INSTALL_DIR}/*
        git clone ${GITHUB_REPO} ${INSTALL_DIR}
    fi
    
    # 로그 디렉토리 생성
    mkdir -p ${INSTALL_DIR}/logs
    
    log_success "프로젝트 설정 완료"
}

# 의존성 설치 및 빌드
build_project() {
    log_step "프로젝트 빌드 중..."
    
    cd ${INSTALL_DIR}
    
    # 1. Shared 패키지 빌드
    log_info "1/3 Shared 패키지 빌드 중..."
    cd ${INSTALL_DIR}/msp-checklist/packages/shared
    npm install
    npm run build
    log_success "Shared 패키지 빌드 완료"
    
    # 2. 메인 앱 빌드
    log_info "2/3 메인 앱 빌드 중..."
    cd ${INSTALL_DIR}/msp-checklist
    npm install
    npm run build
    log_success "메인 앱 빌드 완료"
    
    # 3. Admin 앱 빌드
    log_info "3/3 Admin 앱 빌드 중..."
    cd ${INSTALL_DIR}/msp-checklist/admin
    npm install
    npm run build
    log_success "Admin 앱 빌드 완료"
}

# 환경 변수 설정
setup_env() {
    log_step "환경 변수 설정 중..."
    
    # 메인 앱 .env.local
    MAIN_ENV="${INSTALL_DIR}/msp-checklist/.env.local"
    if [ ! -f "$MAIN_ENV" ]; then
        cat > "$MAIN_ENV" << 'EOF'
#===============================================================================
# MSP 어드바이저 - 메인 앱 환경 변수
#===============================================================================

# 기본 LLM Provider (openai, gemini, claude, bedrock)
DEFAULT_LLM_PROVIDER=bedrock

# AWS Bedrock 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

# OpenAI 설정
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o

# Google Gemini 설정
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro

# Anthropic Claude 설정
ANTHROPIC_API_KEY=your-anthropic-api-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# 서버 포트
PORT=3010
EOF
        log_warn "메인 앱 .env.local 파일이 생성되었습니다."
        log_warn "API 키를 설정해주세요: $MAIN_ENV"
    else
        log_info "기존 메인 앱 .env.local 파일 유지"
    fi
    
    # Admin 앱 .env.local
    ADMIN_ENV="${INSTALL_DIR}/msp-checklist/admin/.env.local"
    if [ ! -f "$ADMIN_ENV" ]; then
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
        cat > "$ADMIN_ENV" << EOF
#===============================================================================
# MSP 어드바이저 - Admin 앱 환경 변수
#===============================================================================

# 메인 앱 URL
MAIN_APP_URL=http://localhost:${MAIN_PORT}
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:${MAIN_PORT}

# JWT Secret
JWT_SECRET=${JWT_SECRET}

# Admin 초기 비밀번호
ADMIN_DEFAULT_PASSWORD=admin123

# 서버 포트
PORT=3011
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
    log_step "PM2 서비스 설정 중..."
    
    # PM2 ecosystem 파일 생성
    cat > ${INSTALL_DIR}/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '${INSTALL_DIR}/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: ${MAIN_PORT}
      },
      log_file: '${INSTALL_DIR}/logs/main-combined.log',
      error_file: '${INSTALL_DIR}/logs/main-error.log',
      out_file: '${INSTALL_DIR}/logs/main-out.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true
    },
    {
      name: 'msp-admin',
      cwd: '${INSTALL_DIR}/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: ${ADMIN_PORT}
      },
      log_file: '${INSTALL_DIR}/logs/admin-combined.log',
      error_file: '${INSTALL_DIR}/logs/admin-error.log',
      out_file: '${INSTALL_DIR}/logs/admin-out.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true
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
    
    # 시스템 시작 시 PM2 자동 실행 설정
    pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || log_warn "PM2 startup 설정을 수동으로 해주세요."
    
    log_success "PM2 서비스 설정 완료"
}

# 관리 스크립트 생성
create_management_scripts() {
    log_step "관리 스크립트 생성 중..."
    
    # 상태 확인 스크립트
    cat > ${INSTALL_DIR}/status.sh << 'SCRIPT'
#!/bin/bash
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          MSP 어드바이저 - 서비스 상태                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
pm2 status
echo ""
echo "포트 상태:"
MAIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3010 2>/dev/null || echo 'DOWN')
ADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3011 2>/dev/null || echo 'DOWN')
echo "  메인 앱 (3010): $MAIN_STATUS"
echo "  Admin 앱 (3011): $ADMIN_STATUS"
echo ""
echo "로그 확인: pm2 logs"
echo "═══════════════════════════════════════════════════════════════"
SCRIPT
    
    # 시작 스크립트
    cat > ${INSTALL_DIR}/start.sh << 'SCRIPT'
#!/bin/bash
cd /opt/msp-advisor
pm2 start ecosystem.config.js
pm2 status
SCRIPT
    
    # 중지 스크립트
    cat > ${INSTALL_DIR}/stop.sh << 'SCRIPT'
#!/bin/bash
pm2 stop all
pm2 status
SCRIPT
    
    # 재시작 스크립트
    cat > ${INSTALL_DIR}/restart.sh << 'SCRIPT'
#!/bin/bash
pm2 restart all
pm2 status
SCRIPT
    
    # 업데이트 스크립트
    cat > ${INSTALL_DIR}/update.sh << 'SCRIPT'
#!/bin/bash
set -e
cd /opt/msp-advisor

echo "[INFO] 서비스 중지..."
pm2 stop all

echo "[INFO] 최신 코드 가져오기..."
git pull

echo "[INFO] Shared 패키지 빌드..."
cd msp-checklist/packages/shared
npm install
npm run build

echo "[INFO] 메인 앱 빌드..."
cd ../..
npm install
rm -rf .next
npm run build

echo "[INFO] Admin 앱 빌드..."
cd admin
npm install
rm -rf .next
npm run build

echo "[INFO] 서비스 재시작..."
cd /opt/msp-advisor
pm2 restart all

echo "[✓] 업데이트 완료!"
pm2 status
SCRIPT
    
    # 실행 권한 부여
    chmod +x ${INSTALL_DIR}/*.sh
    
    log_success "관리 스크립트 생성 완료"
}

# 설치 완료 메시지
print_completion() {
    # EC2 퍼블릭 IP 가져오기
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_IP')
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo -e "║  ${GREEN}AWS MSP 자체 평가 어드바이저 설치 완료!${NC}                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  접속 URL:"
    echo "    메인 앱:  http://${PUBLIC_IP}:${MAIN_PORT}"
    echo "    Admin:   http://${PUBLIC_IP}:${ADMIN_PORT}"
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
    echo "  ⚠️  중요: API 키 설정이 필요합니다!"
    echo "    nano ${INSTALL_DIR}/msp-checklist/.env.local"
    echo ""
    echo "  ⚠️  EC2 보안 그룹에서 포트 ${MAIN_PORT}, ${ADMIN_PORT}을 열어주세요."
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# 메인 실행
main() {
    print_header
    detect_os
    check_requirements
    install_system_packages
    install_nodejs
    install_pm2
    setup_project
    build_project
    setup_env
    setup_pm2
    create_management_scripts
    print_completion
}

# 스크립트 실행
main "$@"
