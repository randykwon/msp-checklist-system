#!/bin/bash

# MSP Checklist 업데이트 및 빌드 스크립트
# GitHub에서 변경된 내용만 다운로드 받아 빌드
# 사용법: sudo ./update-and-build.sh

set -o pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} ⚠️ $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} ❌ $1"; }

# 전역 변수
PROJECT_DIR="/opt/msp-checklist-system"
GITHUB_REPO="https://github.com/randykwon/msp-checklist-system.git"

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║      MSP Checklist 업데이트 및 빌드 스크립트              ║"
    echo "║                                                            ║"
    echo "║  🔄 GitHub에서 변경사항 Pull                              ║"
    echo "║  🔨 애플리케이션 빌드                                     ║"
    echo "║  🚀 서비스 재시작                                         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 프로젝트 디렉토리 확인
check_project_directory() {
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "프로젝트 디렉토리가 존재하지 않습니다: $PROJECT_DIR"
        log_info "전체 설치를 먼저 실행해주세요: sudo ./msp-deployment-suite-refined.sh"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        log_error "Git 저장소가 아닙니다. 전체 설치가 필요합니다."
        exit 1
    fi
    
    log_success "프로젝트 디렉토리 확인 완료"
}

# GitHub에서 변경사항 Pull
pull_changes() {
    log_info "GitHub에서 변경사항 확인 중..."
    
    cd "$PROJECT_DIR"
    
    # 현재 커밋 해시 저장
    local before_commit=$(git rev-parse HEAD)
    
    # 로컬 변경사항 확인
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "로컬 변경사항이 있습니다. stash 처리합니다..."
        git stash
    fi
    
    # 원격 저장소에서 fetch
    log_info "원격 저장소에서 fetch 중..."
    git fetch origin
    
    # 변경사항 확인
    local local_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/main)
    
    if [ "$local_commit" = "$remote_commit" ]; then
        log_success "이미 최신 상태입니다. 변경사항이 없습니다."
        return 1  # 변경사항 없음
    fi
    
    # 변경된 파일 목록 표시
    log_info "변경된 파일 목록:"
    git diff --name-only HEAD origin/main
    
    # Pull 실행
    log_info "변경사항 Pull 중..."
    git pull origin main
    
    # 변경 후 커밋 해시
    local after_commit=$(git rev-parse HEAD)
    
    log_success "Pull 완료: $before_commit -> $after_commit"
    
    # 실행 권한 부여
    chmod +x *.sh 2>/dev/null || true
    
    return 0  # 변경사항 있음
}

# PM2 프로세스 중지
stop_services() {
    log_info "서비스 중지 중..."
    
    if command -v pm2 > /dev/null 2>&1; then
        pm2 stop all 2>/dev/null || true
        log_success "PM2 프로세스 중지 완료"
    fi
}

# 애플리케이션 빌드
build_application() {
    log_info "애플리케이션 빌드 시작..."
    
    cd "$PROJECT_DIR/msp-checklist"
    
    # 환경 변수 설정
    export NODE_OPTIONS="--max-old-space-size=2048"
    export NEXT_TELEMETRY_DISABLED=1
    export NODE_ENV=production
    
    # 의존성 업데이트 (변경된 경우만)
    if [ -f "package-lock.json" ]; then
        log_info "의존성 확인 및 업데이트 중..."
        npm ci --omit=optional 2>/dev/null || npm install --omit=optional --legacy-peer-deps
    else
        npm install --omit=optional --legacy-peer-deps
    fi
    
    # 메인 애플리케이션 빌드
    log_info "메인 애플리케이션 빌드 중..."
    if npm run build; then
        log_success "메인 애플리케이션 빌드 성공"
    else
        log_error "메인 애플리케이션 빌드 실패"
        return 1
    fi
    
    # Admin 애플리케이션 빌드
    if [ -d "admin" ]; then
        cd admin
        log_info "Admin 애플리케이션 빌드 중..."
        
        if [ -f "package-lock.json" ]; then
            npm ci --omit=optional 2>/dev/null || npm install --omit=optional --legacy-peer-deps
        else
            npm install --omit=optional --legacy-peer-deps
        fi
        
        if npm run build; then
            log_success "Admin 애플리케이션 빌드 성공"
        else
            log_warning "Admin 애플리케이션 빌드 실패 (메인 시스템은 정상)"
        fi
        cd ..
    fi
    
    log_success "애플리케이션 빌드 완료"
}

# 관리자 계정 확인 및 생성
setup_admin_account() {
    log_info "관리자 계정 확인 중..."
    
    cd "$PROJECT_DIR"
    
    if [ -f "create-admin.cjs" ]; then
        if node create-admin.cjs 2>/dev/null; then
            log_success "관리자 계정 확인 완료"
        else
            log_warning "관리자 계정 생성 스크립트 실행 실패 (무시하고 계속 진행)"
        fi
    else
        log_warning "create-admin.cjs 파일이 없습니다. 관리자 계정을 수동으로 생성하세요."
    fi
}

# PM2 프로세스 시작
start_services() {
    log_info "서비스 시작 중..."
    
    cd "$PROJECT_DIR"
    
    if command -v pm2 > /dev/null 2>&1; then
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
        else
            # ecosystem.config.js가 없으면 직접 시작
            cd msp-checklist
            pm2 start npm --name "msp-checklist-main" -- start
            
            if [ -d "admin" ]; then
                cd admin
                pm2 start npm --name "msp-checklist-admin" -- start
            fi
        fi
        
        pm2 save
        log_success "PM2 프로세스 시작 완료"
    else
        log_warning "PM2가 설치되지 않았습니다. 수동으로 서비스를 시작해주세요."
    fi
}

# Nginx 재시작
restart_nginx() {
    log_info "Nginx 재시작 중..."
    
    if command -v nginx > /dev/null 2>&1; then
        sudo nginx -t && sudo systemctl restart nginx
        log_success "Nginx 재시작 완료"
    fi
}

# 상태 확인
check_status() {
    log_info "서비스 상태 확인 중..."
    
    echo ""
    echo "=== PM2 프로세스 상태 ==="
    pm2 list 2>/dev/null || echo "PM2 상태 확인 불가"
    
    echo ""
    echo "=== Nginx 상태 ==="
    sudo systemctl status nginx --no-pager -l 2>/dev/null | head -5 || echo "Nginx 상태 확인 불가"
    
    echo ""
    echo "=== 포트 상태 ==="
    netstat -tuln 2>/dev/null | grep -E ":80|:3010|:3011" || ss -tuln | grep -E ":80|:3010|:3011"
}

# 메인 실행
main() {
    show_banner
    
    # 프로젝트 디렉토리 확인
    check_project_directory
    
    # GitHub에서 변경사항 Pull
    if pull_changes; then
        # 변경사항이 있으면 빌드 및 재시작
        stop_services
        build_application
        setup_admin_account
        start_services
        restart_nginx
    fi
    
    # 상태 확인
    check_status
    
    echo ""
    log_success "업데이트 및 빌드 완료!"
    echo ""
    echo "접속 URL:"
    echo "  - 메인: http://$(hostname -I | awk '{print $1}')"
    echo "  - 관리자: http://$(hostname -I | awk '{print $1}')/admin"
}

# 스크립트 실행
main "$@"
