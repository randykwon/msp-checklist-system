#!/bin/bash

# MSP Checklist 배포 업데이트 스크립트
# GitHub에서 최신 코드를 가져와 빌드하고 서비스를 재시작합니다.
# 사용법: ./deploy-update.sh [--force] [--skip-build]

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
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 옵션 파싱
FORCE_BUILD=false
SKIP_BUILD=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --force) FORCE_BUILD=true ;;
        --skip-build) SKIP_BUILD=true ;;
        -h|--help) 
            echo "사용법: $0 [옵션]"
            echo "옵션:"
            echo "  --force       변경사항 없어도 강제 빌드"
            echo "  --skip-build  빌드 건너뛰기 (서비스 재시작만)"
            echo "  -h, --help    도움말 표시"
            exit 0
            ;;
        *) log_error "알 수 없는 옵션: $1"; exit 1 ;;
    esac
    shift
done

# 프로젝트 루트 디렉토리 감지
detect_project_dir() {
    # 현재 디렉토리에서 msp-checklist 폴더 확인
    if [ -d "./msp-checklist" ]; then
        PROJECT_DIR="$(pwd)"
    elif [ -d "/opt/msp-checklist-system/msp-checklist" ]; then
        PROJECT_DIR="/opt/msp-checklist-system"
    else
        log_error "프로젝트 디렉토리를 찾을 수 없습니다."
        exit 1
    fi
    log_info "프로젝트 디렉토리: $PROJECT_DIR"
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

# Git 변경사항 가져오기
pull_changes() {
    log_step "1/5 GitHub에서 변경사항 가져오기"
    
    cd "$PROJECT_DIR"
    
    # Git 저장소 확인
    if [ ! -d ".git" ]; then
        log_error "Git 저장소가 아닙니다."
        exit 1
    fi
    
    # 현재 브랜치 확인
    CURRENT_BRANCH=$(git branch --show-current)
    log_info "현재 브랜치: $CURRENT_BRANCH"
    
    # 현재 커밋 해시
    BEFORE_COMMIT=$(git rev-parse --short HEAD)
    
    # 로컬 변경사항 stash
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "로컬 변경사항 발견 - stash 처리"
        git stash push -m "auto-stash-$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Fetch 및 Pull
    git fetch origin
    
    REMOTE_COMMIT=$(git rev-parse --short origin/$CURRENT_BRANCH 2>/dev/null || git rev-parse --short origin/main)
    
    if [ "$BEFORE_COMMIT" = "$REMOTE_COMMIT" ] && [ "$FORCE_BUILD" = false ]; then
        log_success "이미 최신 상태입니다 ($BEFORE_COMMIT)"
        if [ "$SKIP_BUILD" = false ]; then
            read -p "빌드를 강제로 실행하시겠습니까? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "업데이트 취소됨"
                exit 0
            fi
        fi
    else
        git pull origin $CURRENT_BRANCH 2>/dev/null || git pull origin main
        AFTER_COMMIT=$(git rev-parse --short HEAD)
        log_success "Pull 완료: $BEFORE_COMMIT → $AFTER_COMMIT"
        
        # 변경된 파일 표시
        echo ""
        log_info "변경된 파일:"
        git diff --name-only $BEFORE_COMMIT $AFTER_COMMIT | head -20
        echo ""
    fi
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null || true
}

# 서비스 중지
stop_services() {
    log_step "2/5 서비스 중지"
    
    # PM2 프로세스 중지
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        log_success "PM2 프로세스 중지됨"
    fi
    
    # 직접 실행 중인 Node 프로세스 중지
    pkill -f "next-server.*3010" 2>/dev/null || true
    pkill -f "next-server.*3011" 2>/dev/null || true
    
    sleep 2
}

# 애플리케이션 빌드
build_apps() {
    if [ "$SKIP_BUILD" = true ]; then
        log_step "3/5 빌드 건너뛰기 (--skip-build)"
        return
    fi
    
    log_step "3/5 애플리케이션 빌드"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    
    # 메인 앱 빌드
    log_info "메인 애플리케이션 빌드 중..."
    cd "$PROJECT_DIR/msp-checklist"
    
    # 의존성 설치 (필요시)
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        npm install --legacy-peer-deps 2>/dev/null || npm install
    fi
    
    npm run build
    log_success "메인 앱 빌드 완료"
    
    # Admin 앱 빌드
    if [ -d "admin" ]; then
        log_info "Admin 애플리케이션 빌드 중..."
        cd admin
        
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
            npm install --legacy-peer-deps 2>/dev/null || npm install
        fi
        
        npm run build
        log_success "Admin 앱 빌드 완료"
        cd ..
    fi
}

# 서비스 시작
start_services() {
    log_step "4/5 서비스 시작"
    
    cd "$PROJECT_DIR/msp-checklist"
    
    if command -v pm2 &> /dev/null; then
        # PM2로 시작
        pm2 delete msp-main 2>/dev/null || true
        pm2 delete msp-admin 2>/dev/null || true
        
        pm2 start npm --name "msp-main" -- start -- -p 3010
        
        if [ -d "admin" ]; then
            cd admin
            pm2 start npm --name "msp-admin" -- start -- -p 3011
            cd ..
        fi
        
        pm2 save
        log_success "PM2로 서비스 시작됨"
    else
        # 직접 시작 (백그라운드)
        log_warning "PM2가 없어 직접 시작합니다"
        nohup npm start -- -p 3010 > ../main-server.log 2>&1 &
        echo $! > ../main-server.pid
        
        if [ -d "admin" ]; then
            cd admin
            nohup npm start -- -p 3011 > ../../admin-server.log 2>&1 &
            echo $! > ../../admin-server.pid
            cd ..
        fi
        
        log_success "서비스 시작됨 (백그라운드)"
    fi
}

# 상태 확인
check_status() {
    log_step "5/5 상태 확인"
    
    sleep 3
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    
    # PM2 상태
    if command -v pm2 &> /dev/null; then
        echo -e "${CYAN}PM2 프로세스 상태:${NC}"
        pm2 list
    fi
    
    # 포트 확인
    echo ""
    echo -e "${CYAN}포트 상태:${NC}"
    if command -v netstat &> /dev/null; then
        netstat -tuln 2>/dev/null | grep -E ":3010|:3011" || echo "  포트 확인 중..."
    else
        ss -tuln | grep -E ":3010|:3011" || echo "  포트 확인 중..."
    fi
    
    # 헬스 체크
    echo ""
    echo -e "${CYAN}헬스 체크:${NC}"
    sleep 2
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200\|302"; then
        echo -e "  메인 앱 (3010): ${GREEN}정상${NC}"
    else
        echo -e "  메인 앱 (3010): ${YELLOW}시작 중...${NC}"
    fi
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 | grep -q "200\|302"; then
        echo -e "  Admin 앱 (3011): ${GREEN}정상${NC}"
    else
        echo -e "  Admin 앱 (3011): ${YELLOW}시작 중...${NC}"
    fi
    
    echo "═══════════════════════════════════════════════════════════════"
}

# 완료 메시지
show_complete() {
    echo ""
    log_success "배포 업데이트 완료!"
    echo ""
    echo -e "${GREEN}접속 URL:${NC}"
    
    # IP 주소 감지
    if command -v hostname &> /dev/null; then
        IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    IP=${IP:-localhost}
    
    echo "  📱 메인 앱:  http://$IP:3010"
    echo "  🔧 Admin:   http://$IP:3011"
    echo ""
}

# 메인 실행
main() {
    show_banner
    detect_project_dir
    pull_changes
    stop_services
    build_apps
    start_services
    check_status
    show_complete
}

main "$@"
