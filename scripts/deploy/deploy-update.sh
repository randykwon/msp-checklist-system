#!/bin/bash

# =============================================================================
# MSP Checklist 배포 업데이트 스크립트
# GitHub에서 최신 코드를 가져와 빌드하고 서비스를 재시작합니다.
# =============================================================================
# 사용법: ./deploy-update.sh [옵션]
#   --force       변경사항 없어도 강제 빌드
#   --skip-build  빌드 건너뛰기 (서비스 재시작만)
#   --main-only   메인 앱만 빌드
#   --admin-only  Admin 앱만 빌드
#   -h, --help    도움말 표시
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# 옵션 변수
FORCE_BUILD=false
SKIP_BUILD=false
MAIN_ONLY=false
ADMIN_ONLY=false
PROJECT_DIR=""

# 옵션 파싱
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force) FORCE_BUILD=true ;;
        --skip-build) SKIP_BUILD=true ;;
        --main-only) MAIN_ONLY=true ;;
        --admin-only) ADMIN_ONLY=true ;;
        -h|--help) 
            echo "MSP Checklist 배포 업데이트 스크립트"
            echo ""
            echo "사용법: $0 [옵션]"
            echo ""
            echo "옵션:"
            echo "  --force       변경사항 없어도 강제 빌드"
            echo "  --skip-build  빌드 건너뛰기 (서비스 재시작만)"
            echo "  --main-only   메인 앱만 빌드/재시작"
            echo "  --admin-only  Admin 앱만 빌드/재시작"
            echo "  -h, --help    도움말 표시"
            echo ""
            echo "예시:"
            echo "  $0                  # 전체 업데이트"
            echo "  $0 --force          # 강제 빌드"
            echo "  $0 --skip-build     # 서비스 재시작만"
            echo "  $0 --admin-only     # Admin만 업데이트"
            exit 0
            ;;
        *) log_error "알 수 없는 옵션: $1"; exit 1 ;;
    esac
    shift
done

# NVM 환경 로드 (EC2에서 npm 사용을 위해 필요)
load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        source "$NVM_DIR/nvm.sh"
        log_info "NVM 환경 로드됨 (Node $(node -v))"
    elif [ -s "/usr/local/nvm/nvm.sh" ]; then
        source "/usr/local/nvm/nvm.sh"
        log_info "NVM 환경 로드됨 (Node $(node -v))"
    else
        # nvm이 없으면 시스템 node 사용 시도
        if ! command -v node &> /dev/null; then
            log_error "Node.js를 찾을 수 없습니다. NVM 또는 Node.js를 설치해주세요."
            exit 1
        fi
    fi
}

# 배너 출력
show_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           MSP Checklist 배포 업데이트 스크립트               ║"
    echo "║                                                               ║"
    echo "║  🔄 Git Pull → 🔨 Build → 🚀 Restart                         ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 프로젝트 디렉토리 감지
detect_project_dir() {
    log_step "프로젝트 디렉토리 확인"
    
    # 스크립트 위치 기준
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    if [ -d "$SCRIPT_DIR/msp-checklist" ]; then
        PROJECT_DIR="$SCRIPT_DIR"
    elif [ -d "/opt/msp-checklist-system/msp-checklist" ]; then
        PROJECT_DIR="/opt/msp-checklist-system"
    elif [ -d "$(pwd)/msp-checklist" ]; then
        PROJECT_DIR="$(pwd)"
    else
        log_error "프로젝트 디렉토리를 찾을 수 없습니다."
        log_info "예상 위치: /opt/msp-checklist-system 또는 현재 디렉토리"
        exit 1
    fi
    
    log_success "프로젝트 디렉토리: $PROJECT_DIR"
    cd "$PROJECT_DIR"
}

# Git 변경사항 가져오기
pull_changes() {
    log_step "GitHub에서 변경사항 가져오기"
    
    # Git 저장소 확인
    if [ ! -d ".git" ]; then
        log_error "Git 저장소가 아닙니다: $PROJECT_DIR"
        exit 1
    fi
    
    # 현재 브랜치 확인
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    log_info "현재 브랜치: $CURRENT_BRANCH"
    
    # 현재 커밋 해시
    BEFORE_COMMIT=$(git rev-parse --short HEAD)
    log_info "현재 커밋: $BEFORE_COMMIT"
    
    # 로컬 변경사항 확인 및 stash
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "로컬 변경사항 발견 - stash 처리"
        git stash push -m "auto-stash-$(date +%Y%m%d_%H%M%S)" || true
    fi
    
    # Fetch
    git fetch origin --quiet
    
    # 원격 커밋 확인
    REMOTE_COMMIT=$(git rev-parse --short origin/$CURRENT_BRANCH 2>/dev/null || git rev-parse --short origin/main 2>/dev/null)
    
    if [ "$BEFORE_COMMIT" = "$REMOTE_COMMIT" ]; then
        log_success "이미 최신 상태입니다 ($BEFORE_COMMIT)"
        
        if [ "$FORCE_BUILD" = false ] && [ "$SKIP_BUILD" = false ]; then
            echo ""
            read -p "빌드를 강제로 실행하시겠습니까? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "업데이트 취소됨"
                exit 0
            fi
            FORCE_BUILD=true
        fi
    else
        # Pull 실행
        git pull origin $CURRENT_BRANCH 2>/dev/null || git pull origin main
        AFTER_COMMIT=$(git rev-parse --short HEAD)
        log_success "Pull 완료: $BEFORE_COMMIT → $AFTER_COMMIT"
        
        # 변경된 파일 표시
        echo ""
        log_info "변경된 파일:"
        git diff --name-only $BEFORE_COMMIT $AFTER_COMMIT 2>/dev/null | head -15 | sed 's/^/  /'
        CHANGED_COUNT=$(git diff --name-only $BEFORE_COMMIT $AFTER_COMMIT 2>/dev/null | wc -l)
        if [ "$CHANGED_COUNT" -gt 15 ]; then
            echo "  ... 외 $((CHANGED_COUNT - 15))개 파일"
        fi
    fi
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null || true
}

# 서비스 중지
stop_services() {
    log_step "서비스 중지"
    
    local stopped=false
    
    # PM2 프로세스 중지
    if command -v pm2 &> /dev/null; then
        if [ "$MAIN_ONLY" = true ]; then
            pm2 stop msp-main 2>/dev/null && stopped=true || true
        elif [ "$ADMIN_ONLY" = true ]; then
            pm2 stop msp-admin 2>/dev/null && stopped=true || true
        else
            pm2 stop all 2>/dev/null && stopped=true || true
        fi
        [ "$stopped" = true ] && log_success "PM2 프로세스 중지됨"
    fi
    
    # 직접 실행 중인 Node 프로세스 중지
    if [ "$MAIN_ONLY" != true ]; then
        pkill -f "next-server.*3011" 2>/dev/null || true
        pkill -f "node.*3011" 2>/dev/null || true
    fi
    
    if [ "$ADMIN_ONLY" != true ]; then
        pkill -f "next-server.*3010" 2>/dev/null || true
        pkill -f "node.*3010" 2>/dev/null || true
    fi
    
    # PID 파일로 중지
    if [ -f "$PROJECT_DIR/main-server.pid" ] && [ "$ADMIN_ONLY" != true ]; then
        kill $(cat "$PROJECT_DIR/main-server.pid") 2>/dev/null || true
        rm -f "$PROJECT_DIR/main-server.pid"
    fi
    
    if [ -f "$PROJECT_DIR/admin-server.pid" ] && [ "$MAIN_ONLY" != true ]; then
        kill $(cat "$PROJECT_DIR/admin-server.pid") 2>/dev/null || true
        rm -f "$PROJECT_DIR/admin-server.pid"
    fi
    
    sleep 2
    log_success "서비스 중지 완료"
}

# 애플리케이션 빌드
build_apps() {
    if [ "$SKIP_BUILD" = true ]; then
        log_step "빌드 건너뛰기 (--skip-build)"
        return 0
    fi
    
    log_step "애플리케이션 빌드"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 메인 앱 빌드
    if [ "$ADMIN_ONLY" != true ]; then
        log_info "메인 애플리케이션 빌드 중..."
        cd "$PROJECT_DIR/msp-checklist"
        
        # 의존성 설치 (필요시)
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
            log_info "의존성 설치 중..."
            npm install --legacy-peer-deps 2>/dev/null || npm install
        fi
        
        # @aws-sdk/client-bedrock 패키지 확인 및 설치
        if [ ! -d "node_modules/@aws-sdk/client-bedrock" ]; then
            log_info "@aws-sdk/client-bedrock 패키지 설치 중..."
            npm install @aws-sdk/client-bedrock --legacy-peer-deps 2>/dev/null || npm install @aws-sdk/client-bedrock
            log_success "@aws-sdk/client-bedrock 설치 완료"
        fi
        
        if npm run build; then
            log_success "메인 앱 빌드 완료"
        else
            log_error "메인 앱 빌드 실패"
            exit 1
        fi
    fi
    
    # Admin 앱 빌드
    if [ "$MAIN_ONLY" != true ] && [ -d "$PROJECT_DIR/msp-checklist/admin" ]; then
        log_info "Admin 애플리케이션 빌드 중..."
        cd "$PROJECT_DIR/msp-checklist/admin"
        
        # 의존성 설치 (필요시)
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
            log_info "의존성 설치 중..."
            npm install --legacy-peer-deps 2>/dev/null || npm install
        fi
        
        if npm run build; then
            log_success "Admin 앱 빌드 완료"
        else
            log_error "Admin 앱 빌드 실패"
            exit 1
        fi
    fi
    
    cd "$PROJECT_DIR"
}

# 서비스 시작
start_services() {
    log_step "서비스 시작"
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # PM2 사용 여부 확인
    if command -v pm2 &> /dev/null; then
        start_with_pm2
    else
        start_direct
    fi
}

# PM2로 서비스 시작
start_with_pm2() {
    log_info "PM2로 서비스 시작..."
    
    # 메인 앱 시작
    if [ "$ADMIN_ONLY" != true ]; then
        pm2 delete msp-main 2>/dev/null || true
        pm2 start npm --name "msp-main" -- start -- -p 3010
        log_success "메인 앱 시작됨 (PM2: msp-main, 포트: 3010)"
    fi
    
    # Admin 앱 시작
    if [ "$MAIN_ONLY" != true ] && [ -d "admin" ]; then
        cd admin
        pm2 delete msp-admin 2>/dev/null || true
        pm2 start npm --name "msp-admin" -- start -- -p 3011
        log_success "Admin 앱 시작됨 (PM2: msp-admin, 포트: 3011)"
        cd ..
    fi
    
    pm2 save --force
}

# 직접 서비스 시작 (PM2 없이)
start_direct() {
    log_warning "PM2가 설치되지 않아 직접 시작합니다"
    log_info "PM2 설치 권장: npm install -g pm2"
    
    # 메인 앱 시작
    if [ "$ADMIN_ONLY" != true ]; then
        nohup npm start -- -p 3010 > "$PROJECT_DIR/main-server.log" 2>&1 &
        echo $! > "$PROJECT_DIR/main-server.pid"
        log_success "메인 앱 시작됨 (PID: $(cat $PROJECT_DIR/main-server.pid), 포트: 3010)"
    fi
    
    # Admin 앱 시작
    if [ "$MAIN_ONLY" != true ] && [ -d "admin" ]; then
        cd admin
        nohup npm start -- -p 3011 > "$PROJECT_DIR/admin-server.log" 2>&1 &
        echo $! > "$PROJECT_DIR/admin-server.pid"
        log_success "Admin 앱 시작됨 (PID: $(cat $PROJECT_DIR/admin-server.pid), 포트: 3011)"
        cd ..
    fi
}

# 상태 확인
check_status() {
    log_step "상태 확인"
    
    # 서비스 시작 대기
    log_info "서비스 시작 대기 중..."
    sleep 5
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    # PM2 상태
    if command -v pm2 &> /dev/null; then
        echo -e "${CYAN}PM2 프로세스:${NC}"
        pm2 list --no-color 2>/dev/null | grep -E "msp-|Name" || echo "  (PM2 프로세스 없음)"
        echo ""
    fi
    
    # 포트 상태
    echo -e "${CYAN}포트 상태:${NC}"
    if command -v ss &> /dev/null; then
        ss -tuln 2>/dev/null | grep -E ":3010|:3011" | sed 's/^/  /' || echo "  (포트 확인 중...)"
    elif command -v netstat &> /dev/null; then
        netstat -tuln 2>/dev/null | grep -E ":3010|:3011" | sed 's/^/  /' || echo "  (포트 확인 중...)"
    fi
    echo ""
    
    # 헬스 체크
    echo -e "${CYAN}헬스 체크:${NC}"
    
    if [ "$ADMIN_ONLY" != true ]; then
        local main_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3010 2>/dev/null || echo "000")
        if [[ "$main_status" =~ ^(200|302|304)$ ]]; then
            echo -e "  메인 앱 (3010):  ${GREEN}✓ 정상 (HTTP $main_status)${NC}"
        elif [ "$main_status" = "000" ]; then
            echo -e "  메인 앱 (3010):  ${YELLOW}⏳ 시작 중...${NC}"
        else
            echo -e "  메인 앱 (3010):  ${RED}✗ HTTP $main_status${NC}"
        fi
    fi
    
    if [ "$MAIN_ONLY" != true ]; then
        local admin_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3011 2>/dev/null || echo "000")
        if [[ "$admin_status" =~ ^(200|302|304)$ ]]; then
            echo -e "  Admin 앱 (3011): ${GREEN}✓ 정상 (HTTP $admin_status)${NC}"
        elif [ "$admin_status" = "000" ]; then
            echo -e "  Admin 앱 (3011): ${YELLOW}⏳ 시작 중...${NC}"
        else
            echo -e "  Admin 앱 (3011): ${RED}✗ HTTP $admin_status${NC}"
        fi
    fi
    
    echo "═══════════════════════════════════════════════════════════════"
}

# 완료 메시지
show_complete() {
    # IP 주소 감지
    local IP=""
    IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null) || \
    IP=$(curl -s --connect-timeout 2 http://ipinfo.io/ip 2>/dev/null) || \
    IP=$(hostname -I 2>/dev/null | awk '{print $1}') || \
    IP="localhost"
    
    echo ""
    log_success "배포 업데이트 완료!"
    echo ""
    echo -e "${GREEN}🌐 접속 URL:${NC}"
    
    # Nginx 사용 여부 확인
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo "   메인 서비스:    http://$IP/"
        echo "   관리자 시스템:  http://$IP/admin"
    else
        echo "   메인 서비스:    http://$IP:3010"
        echo "   관리자 시스템:  http://$IP:3011"
    fi
    
    echo ""
    echo -e "${CYAN}📋 관리 명령어:${NC}"
    if command -v pm2 &> /dev/null; then
        echo "   상태 확인:  pm2 status"
        echo "   로그 확인:  pm2 logs"
        echo "   재시작:     pm2 restart all"
    else
        echo "   로그 확인:  tail -f $PROJECT_DIR/main-server.log"
        echo "   재시작:     $0 --skip-build"
    fi
    echo ""
}

# 에러 핸들러
error_handler() {
    log_error "오류 발생! (라인: $1)"
    log_info "로그 확인: $PROJECT_DIR/*.log"
    exit 1
}

trap 'error_handler $LINENO' ERR

# 메인 실행
main() {
    show_banner
    load_nvm
    detect_project_dir
    pull_changes
    stop_services
    build_apps
    start_services
    check_status
    show_complete
}

main "$@"
