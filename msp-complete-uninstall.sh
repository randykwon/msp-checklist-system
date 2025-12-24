#!/bin/bash

# MSP Checklist 완전 제거 스크립트
# 모든 구성 요소를 안전하게 제거합니다

set -e

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
OS_TYPE=""
REMOVED_ITEMS=()
BACKUP_DIR="/tmp/msp-backup-$(date +%Y%m%d_%H%M%S)"

# 배너 출력
show_banner() {
    echo -e "${RED}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║           MSP Checklist 완전 제거 스크립트                ║"
    echo "║                                                            ║"
    echo "║  🗑️  모든 MSP 구성 요소 제거                              ║"
    echo "║  🔄 Nginx 설정 복원                                       ║"
    echo "║  🧹 PM2 프로세스 정리                                     ║"
    echo "║  📁 프로젝트 파일 삭제                                    ║"
    echo "║  💾 백업 생성 (선택사항)                                  ║"
    echo "║  ⚠️  주의: 이 작업은 되돌릴 수 없습니다!                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 명령행 옵션 처리
KEEP_NGINX=false
KEEP_NODEJS=false
CREATE_BACKUP=false
FORCE_REMOVE=false
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-nginx)
            KEEP_NGINX=true
            shift
            ;;
        --keep-nodejs)
            KEEP_NODEJS=true
            shift
            ;;
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --force)
            FORCE_REMOVE=true
            shift
            ;;
        --help|-h)
            HELP=true
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            HELP=true
            shift
            ;;
    esac
done

# 도움말 표시
show_help() {
    echo "MSP Checklist 완전 제거 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --keep-nginx      Nginx 설치는 유지 (MSP 설정만 제거)"
    echo "  --keep-nodejs     Node.js 설치는 유지 (MSP 앱만 제거)"
    echo "  --backup          제거 전 백업 생성"
    echo "  --force           확인 없이 강제 제거"
    echo "  --help, -h        이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                        # 완전 제거"
    echo "  $0 --keep-nginx           # Nginx는 유지하고 MSP만 제거"
    echo "  $0 --backup --keep-nodejs # 백업 생성 후 Node.js는 유지"
    echo "  $0 --force                # 확인 없이 강제 제거"
    echo ""
    echo "⚠️  주의사항:"
    echo "- 이 스크립트는 MSP Checklist 관련 모든 데이터를 삭제합니다"
    echo "- 데이터베이스, 업로드된 파일, 로그 등이 모두 삭제됩니다"
    echo "- 중요한 데이터가 있다면 --backup 옵션을 사용하세요"
    echo ""
}

if [ "$HELP" = true ]; then
    show_help
    exit 0
fi

# OS 감지
detect_os() {
    log_step "운영체제 감지 중..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        
        if [[ "$ID" == "ubuntu" ]]; then
            OS_TYPE="ubuntu"
            log_success "Ubuntu 감지됨: $NAME $VERSION"
        elif [[ "$ID" == "amzn" ]] && [[ "$VERSION_ID" == "2023" ]]; then
            OS_TYPE="amazon-linux-2023"
            log_success "Amazon Linux 2023 감지됨: $NAME $VERSION"
        else
            log_warning "지원되지 않는 OS이지만 계속 진행합니다: $NAME"
            OS_TYPE="unknown"
        fi
    else
        log_warning "/etc/os-release 파일을 찾을 수 없습니다. 계속 진행합니다."
        OS_TYPE="unknown"
    fi
}

# 사용자 확인
confirm_removal() {
    if [ "$FORCE_REMOVE" = true ]; then
        log_warning "강제 제거 모드로 실행됩니다."
        return 0
    fi
    
    echo -e "${RED}⚠️  경고: 이 작업은 MSP Checklist 시스템을 완전히 제거합니다!${NC}"
    echo ""
    echo "제거될 항목들:"
    echo "- MSP Checklist 애플리케이션 (/opt/msp-checklist-system)"
    echo "- PM2 프로세스 및 설정"
    echo "- Nginx MSP 관련 설정"
    if [ "$KEEP_NGINX" = false ]; then
        echo "- Nginx 완전 제거"
    fi
    if [ "$KEEP_NODEJS" = false ]; then
        echo "- Node.js 및 npm 제거"
    fi
    echo "- 데이터베이스 파일"
    echo "- 로그 파일"
    echo "- 업로드된 파일"
    echo ""
    
    if [ "$CREATE_BACKUP" = true ]; then
        echo "✅ 백업이 생성됩니다: $BACKUP_DIR"
        echo ""
    fi
    
    read -p "정말로 MSP Checklist를 완전히 제거하시겠습니까? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "제거가 취소되었습니다."
        exit 0
    fi
    
    echo ""
    read -p "마지막 확인: 'DELETE'를 입력하여 제거를 확인하세요: " -r
    if [[ "$REPLY" != "DELETE" ]]; then
        echo "제거가 취소되었습니다."
        exit 0
    fi
}

# 백업 생성
create_backup() {
    if [ "$CREATE_BACKUP" = false ]; then
        return 0
    fi
    
    log_step "백업 생성 중..."
    
    mkdir -p "$BACKUP_DIR"
    
    # MSP 프로젝트 백업
    if [ -d "/opt/msp-checklist-system" ]; then
        log_info "MSP 프로젝트 파일 백업 중..."
        sudo cp -r /opt/msp-checklist-system "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # Nginx 설정 백업
    if [ -d "/etc/nginx" ]; then
        log_info "Nginx 설정 백업 중..."
        sudo cp -r /etc/nginx "$BACKUP_DIR/nginx-config" 2>/dev/null || true
    fi
    
    # PM2 설정 백업
    if command -v pm2 > /dev/null 2>&1; then
        log_info "PM2 설정 백업 중..."
        pm2 save 2>/dev/null || true
        cp ~/.pm2/dump.pm2 "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # 환경 변수 백업
    if [ -f "/opt/msp-checklist-system/.env.unified" ]; then
        log_info "환경 변수 백업 중..."
        sudo cp /opt/msp-checklist-system/.env.unified "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # 백업 정보 파일 생성
    cat > "$BACKUP_DIR/backup-info.txt" << EOF
MSP Checklist 백업 정보
생성 시간: $(date)
OS: $OS_TYPE
백업 위치: $BACKUP_DIR

포함된 항목:
- MSP Checklist 프로젝트 파일
- Nginx 설정 파일
- PM2 설정
- 환경 변수 파일

복원 방법:
1. MSP 프로젝트: sudo cp -r $BACKUP_DIR/msp-checklist-system /opt/
2. Nginx 설정: sudo cp -r $BACKUP_DIR/nginx-config/* /etc/nginx/
3. PM2 설정: pm2 resurrect $BACKUP_DIR/dump.pm2
EOF
    
    # 백업 디렉토리 권한 설정
    sudo chown -R $USER:$USER "$BACKUP_DIR" 2>/dev/null || true
    
    log_success "✅ 백업 생성 완료: $BACKUP_DIR"
    REMOVED_ITEMS+=("backup_created:$BACKUP_DIR")
}

# PM2 프로세스 정리
stop_pm2_processes() {
    log_step "PM2 프로세스 정리 중..."
    
    if ! command -v pm2 > /dev/null 2>&1; then
        log_info "PM2가 설치되지 않음"
        return 0
    fi
    
    # MSP 관련 프로세스 중지
    log_info "MSP 관련 PM2 프로세스 중지 중..."
    pm2 stop msp-checklist-main 2>/dev/null || true
    pm2 stop msp-checklist-admin 2>/dev/null || true
    pm2 delete msp-checklist-main 2>/dev/null || true
    pm2 delete msp-checklist-admin 2>/dev/null || true
    
    # 모든 프로세스 중지 (사용자 확인 후)
    local pm2_count=$(pm2 list 2>/dev/null | grep -c "online\|stopped\|errored" || echo "0")
    if [ "$pm2_count" -gt 0 ]; then
        if [ "$FORCE_REMOVE" = true ]; then
            log_warning "모든 PM2 프로세스를 강제로 중지합니다..."
            pm2 kill 2>/dev/null || true
        else
            read -p "다른 PM2 프로세스가 실행 중입니다. 모두 중지하시겠습니까? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                pm2 kill 2>/dev/null || true
            fi
        fi
    fi
    
    # PM2 설정 파일 제거
    rm -rf ~/.pm2 2>/dev/null || true
    
    REMOVED_ITEMS+=("pm2_processes_stopped")
    log_success "✅ PM2 프로세스 정리 완료"
}

# Node.js 서버 프로세스 중지
stop_nodejs_processes() {
    log_step "Node.js 서버 프로세스 중지 중..."
    
    # MSP 관련 Node.js 프로세스 찾기 및 중지
    local msp_pids=$(pgrep -f "msp.*node\|node.*msp" 2>/dev/null || true)
    if [ -n "$msp_pids" ]; then
        log_info "MSP 관련 Node.js 프로세스 중지 중..."
        echo "$msp_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        echo "$msp_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    # 포트 3010, 3011에서 실행 중인 프로세스 중지
    local port_pids=$(lsof -ti:3010,3011 2>/dev/null || true)
    if [ -n "$port_pids" ]; then
        log_info "포트 3010, 3011 사용 프로세스 중지 중..."
        echo "$port_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        echo "$port_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    REMOVED_ITEMS+=("nodejs_processes_stopped")
    log_success "✅ Node.js 프로세스 중지 완료"
}

# Nginx 설정 정리
cleanup_nginx_config() {
    log_step "Nginx 설정 정리 중..."
    
    if [ "$KEEP_NGINX" = true ]; then
        log_info "Nginx 설치는 유지하고 MSP 설정만 제거합니다..."
        
        # MSP 관련 설정 파일만 제거
        sudo rm -f /etc/nginx/conf.d/msp-*.conf 2>/dev/null || true
        sudo rm -f /etc/nginx/sites-available/msp-checklist 2>/dev/null || true
        sudo rm -f /etc/nginx/sites-enabled/msp-checklist 2>/dev/null || true
        
        # 기본 설정 복원
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            if [ ! -f "/etc/nginx/sites-enabled/default" ] && [ -f "/etc/nginx/sites-available/default" ]; then
                sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
                log_info "Ubuntu 기본 사이트 복원됨"
            fi
        elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
            if [ -f "/etc/nginx/conf.d/default.conf.disabled" ]; then
                sudo mv /etc/nginx/conf.d/default.conf.disabled /etc/nginx/conf.d/default.conf
                log_info "Amazon Linux 기본 설정 복원됨"
            fi
        fi
        
        # Nginx 재시작
        if sudo nginx -t 2>/dev/null; then
            sudo systemctl restart nginx 2>/dev/null || true
            log_success "✅ Nginx 설정 정리 및 재시작 완료"
        else
            log_warning "⚠️ Nginx 설정에 문제가 있습니다. 수동 확인이 필요합니다."
        fi
        
        REMOVED_ITEMS+=("nginx_msp_config_removed")
        
    else
        log_info "Nginx 완전 제거 중..."
        
        # Nginx 서비스 중지
        sudo systemctl stop nginx 2>/dev/null || true
        sudo systemctl disable nginx 2>/dev/null || true
        
        # Nginx 패키지 제거
        if [[ "$OS_TYPE" == "ubuntu" ]]; then
            sudo apt remove --purge -y nginx nginx-common nginx-core 2>/dev/null || true
            sudo apt autoremove -y 2>/dev/null || true
        elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
            sudo dnf remove -y nginx 2>/dev/null || true
        fi
        
        # Nginx 설정 디렉토리 제거
        sudo rm -rf /etc/nginx 2>/dev/null || true
        sudo rm -rf /var/log/nginx 2>/dev/null || true
        sudo rm -rf /var/cache/nginx 2>/dev/null || true
        sudo rm -rf /usr/share/nginx 2>/dev/null || true
        
        REMOVED_ITEMS+=("nginx_completely_removed")
        log_success "✅ Nginx 완전 제거 완료"
    fi
}

# Node.js 제거
remove_nodejs() {
    if [ "$KEEP_NODEJS" = true ]; then
        log_info "Node.js 설치는 유지합니다..."
        
        # PM2만 제거
        if command -v npm > /dev/null 2>&1; then
            sudo npm uninstall -g pm2 2>/dev/null || true
            log_info "PM2 글로벌 패키지 제거됨"
        fi
        
        REMOVED_ITEMS+=("pm2_removed_nodejs_kept")
        return 0
    fi
    
    log_step "Node.js 완전 제거 중..."
    
    # PM2 및 기타 글로벌 패키지 제거
    if command -v npm > /dev/null 2>&1; then
        log_info "글로벌 npm 패키지 제거 중..."
        sudo npm uninstall -g pm2 2>/dev/null || true
        
        # 다른 글로벌 패키지들 확인
        local global_packages=$(npm list -g --depth=0 2>/dev/null | grep -v npm | wc -l || echo "0")
        if [ "$global_packages" -gt 1 ]; then
            if [ "$FORCE_REMOVE" = false ]; then
                read -p "다른 글로벌 npm 패키지가 설치되어 있습니다. Node.js를 제거하시겠습니까? (y/n): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Node.js 제거를 건너뜁니다."
                    REMOVED_ITEMS+=("nodejs_removal_skipped")
                    return 0
                fi
            fi
        fi
    fi
    
    # Node.js 패키지 제거
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt remove --purge -y nodejs npm 2>/dev/null || true
        sudo apt autoremove -y 2>/dev/null || true
        
        # NodeSource 저장소 제거
        sudo rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true
        sudo rm -f /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf remove -y nodejs npm 2>/dev/null || true
        
        # NodeSource 저장소 제거
        sudo rm -f /etc/yum.repos.d/nodesource-*.repo 2>/dev/null || true
    fi
    
    # Node.js 관련 디렉토리 제거
    sudo rm -rf /usr/local/lib/node_modules 2>/dev/null || true
    sudo rm -rf /usr/local/bin/node 2>/dev/null || true
    sudo rm -rf /usr/local/bin/npm 2>/dev/null || true
    sudo rm -rf ~/.npm 2>/dev/null || true
    sudo rm -rf ~/.node-gyp 2>/dev/null || true
    
    REMOVED_ITEMS+=("nodejs_completely_removed")
    log_success "✅ Node.js 완전 제거 완료"
}

# MSP 프로젝트 파일 제거
remove_msp_project() {
    log_step "MSP Checklist 프로젝트 파일 제거 중..."
    
    # 메인 프로젝트 디렉토리 제거
    if [ -d "/opt/msp-checklist-system" ]; then
        log_info "MSP 프로젝트 디렉토리 제거 중..."
        sudo rm -rf /opt/msp-checklist-system
        REMOVED_ITEMS+=("msp_project_directory_removed")
    fi
    
    # 다른 위치의 MSP 관련 파일들 제거
    sudo rm -rf /opt/msp-checklist 2>/dev/null || true
    sudo rm -rf /var/www/msp-* 2>/dev/null || true
    sudo rm -rf /home/*/msp-checklist* 2>/dev/null || true
    
    # 시스템 서비스 파일 제거 (있는 경우)
    sudo rm -f /etc/systemd/system/msp-*.service 2>/dev/null || true
    sudo systemctl daemon-reload 2>/dev/null || true
    
    # 로그 파일 제거
    sudo rm -rf /var/log/msp-* 2>/dev/null || true
    sudo rm -f /var/log/nginx/msp-* 2>/dev/null || true
    
    REMOVED_ITEMS+=("msp_files_removed")
    log_success "✅ MSP 프로젝트 파일 제거 완료"
}

# 시스템 정리
cleanup_system() {
    log_step "시스템 정리 중..."
    
    # 관리 스크립트 제거
    sudo rm -f /usr/local/bin/msp-status.sh 2>/dev/null || true
    sudo rm -f /usr/local/bin/check-msp-status.sh 2>/dev/null || true
    
    # cron 작업 제거 (MSP 관련)
    (crontab -l 2>/dev/null | grep -v msp || true) | crontab - 2>/dev/null || true
    
    # 임시 파일 정리
    sudo rm -rf /tmp/msp-* 2>/dev/null || true
    sudo rm -rf /tmp/npm-* 2>/dev/null || true
    sudo rm -rf /tmp/next-* 2>/dev/null || true
    
    # 패키지 캐시 정리
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt autoremove -y 2>/dev/null || true
        sudo apt autoclean 2>/dev/null || true
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf autoremove -y 2>/dev/null || true
        sudo dnf clean all 2>/dev/null || true
    fi
    
    REMOVED_ITEMS+=("system_cleanup_completed")
    log_success "✅ 시스템 정리 완료"
}

# 방화벽 규칙 정리
cleanup_firewall() {
    log_step "방화벽 규칙 정리 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        if command -v ufw > /dev/null 2>&1; then
            # MSP 관련 포트 규칙 제거
            sudo ufw delete allow 3010/tcp 2>/dev/null || true
            sudo ufw delete allow 3011/tcp 2>/dev/null || true
            
            # HTTP/HTTPS는 유지 (다른 서비스에서 사용할 수 있음)
            log_info "Ubuntu UFW에서 MSP 포트 규칙 제거됨"
        fi
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        if command -v firewall-cmd > /dev/null 2>&1; then
            # MSP 관련 포트 규칙 제거
            sudo firewall-cmd --permanent --remove-port=3010/tcp 2>/dev/null || true
            sudo firewall-cmd --permanent --remove-port=3011/tcp 2>/dev/null || true
            sudo firewall-cmd --reload 2>/dev/null || true
            
            log_info "Amazon Linux firewalld에서 MSP 포트 규칙 제거됨"
        fi
    fi
    
    REMOVED_ITEMS+=("firewall_rules_cleaned")
    log_success "✅ 방화벽 규칙 정리 완료"
}

# 검증 및 최종 확인
verify_removal() {
    log_step "제거 검증 중..."
    
    local issues_found=false
    
    # MSP 프로세스 확인
    if pgrep -f "msp" > /dev/null 2>&1; then
        log_warning "⚠️ MSP 관련 프로세스가 여전히 실행 중입니다"
        issues_found=true
    fi
    
    # 포트 사용 확인
    if netstat -tuln 2>/dev/null | grep -E ':3010|:3011' > /dev/null; then
        log_warning "⚠️ 포트 3010 또는 3011이 여전히 사용 중입니다"
        issues_found=true
    fi
    
    # 디렉토리 확인
    if [ -d "/opt/msp-checklist-system" ]; then
        log_warning "⚠️ MSP 프로젝트 디렉토리가 여전히 존재합니다"
        issues_found=true
    fi
    
    # Nginx 설정 확인
    if [ "$KEEP_NGINX" = false ]; then
        if command -v nginx > /dev/null 2>&1; then
            log_warning "⚠️ Nginx가 여전히 설치되어 있습니다"
            issues_found=true
        fi
    else
        if grep -r "msp" /etc/nginx/ 2>/dev/null | grep -v ".backup" > /dev/null; then
            log_warning "⚠️ Nginx에 MSP 관련 설정이 여전히 남아있습니다"
            issues_found=true
        fi
    fi
    
    # Node.js 확인
    if [ "$KEEP_NODEJS" = false ]; then
        if command -v node > /dev/null 2>&1; then
            log_warning "⚠️ Node.js가 여전히 설치되어 있습니다"
            issues_found=true
        fi
    fi
    
    if [ "$issues_found" = false ]; then
        log_success "✅ 모든 구성 요소가 성공적으로 제거되었습니다"
    else
        log_warning "⚠️ 일부 구성 요소가 완전히 제거되지 않았습니다. 수동 확인이 필요할 수 있습니다."
    fi
}

# 제거 완료 정보 표시
show_completion_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🗑️ MSP Checklist 제거 완료! 🗑️               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_success "MSP Checklist 시스템이 성공적으로 제거되었습니다!"
    
    echo ""
    echo "🗑️ 제거된 항목들:"
    for item in "${REMOVED_ITEMS[@]}"; do
        case $item in
            "backup_created:"*)
                echo "  ✅ 백업 생성: ${item#backup_created:}"
                ;;
            "pm2_processes_stopped")
                echo "  ✅ PM2 프로세스 중지 및 정리"
                ;;
            "nodejs_processes_stopped")
                echo "  ✅ Node.js 서버 프로세스 중지"
                ;;
            "nginx_msp_config_removed")
                echo "  ✅ Nginx MSP 설정 제거 (Nginx 유지됨)"
                ;;
            "nginx_completely_removed")
                echo "  ✅ Nginx 완전 제거"
                ;;
            "pm2_removed_nodejs_kept")
                echo "  ✅ PM2 제거 (Node.js 유지됨)"
                ;;
            "nodejs_completely_removed")
                echo "  ✅ Node.js 완전 제거"
                ;;
            "nodejs_removal_skipped")
                echo "  ⏭️ Node.js 제거 건너뜀 (사용자 선택)"
                ;;
            "msp_project_directory_removed")
                echo "  ✅ MSP 프로젝트 디렉토리 제거"
                ;;
            "msp_files_removed")
                echo "  ✅ MSP 관련 파일들 제거"
                ;;
            "system_cleanup_completed")
                echo "  ✅ 시스템 정리 완료"
                ;;
            "firewall_rules_cleaned")
                echo "  ✅ 방화벽 규칙 정리"
                ;;
        esac
    done
    
    echo ""
    echo "💾 백업 정보:"
    if [ "$CREATE_BACKUP" = true ]; then
        echo "  📁 백업 위치: $BACKUP_DIR"
        echo "  📄 복원 가이드: $BACKUP_DIR/backup-info.txt"
    else
        echo "  ⚠️ 백업이 생성되지 않았습니다"
    fi
    
    echo ""
    echo "🔧 남은 구성 요소:"
    if [ "$KEEP_NGINX" = true ]; then
        echo "  🌐 Nginx: 유지됨 (MSP 설정만 제거)"
        echo "    - 상태 확인: sudo systemctl status nginx"
        echo "    - 설정 확인: sudo nginx -t"
    fi
    
    if [ "$KEEP_NODEJS" = true ]; then
        echo "  🟢 Node.js: 유지됨"
        echo "    - 버전 확인: node --version"
        echo "    - npm 버전: npm --version"
    fi
    
    echo ""
    echo "📝 정리 후 권장사항:"
    echo "1. 시스템 재부팅 (선택사항): sudo reboot"
    echo "2. 디스크 공간 확인: df -h"
    echo "3. 실행 중인 프로세스 확인: ps aux | grep -E 'node|nginx|pm2'"
    
    if [ "$CREATE_BACKUP" = true ]; then
        echo "4. 백업 파일 정리 (필요시): rm -rf $BACKUP_DIR"
    fi
    
    echo ""
    echo "🔄 재설치 방법:"
    echo "MSP Checklist를 다시 설치하려면:"
    echo "  git clone https://github.com/randykwon/msp-checklist-system.git"
    echo "  cd msp-checklist-system"
    echo "  sudo ./msp-deployment-suite-refined.sh"
    
    echo ""
}

# 메인 실행 함수
main() {
    # 배너 출력
    show_banner
    
    # OS 감지
    detect_os
    
    # 사용자 확인
    confirm_removal
    
    # 백업 생성
    create_backup
    
    # 제거 과정 실행
    log_step "MSP Checklist 제거 시작..."
    
    stop_pm2_processes
    stop_nodejs_processes
    cleanup_nginx_config
    remove_nodejs
    remove_msp_project
    cleanup_firewall
    cleanup_system
    
    # 검증
    verify_removal
    
    # 완료 정보 표시
    show_completion_info
    
    log_success "MSP Checklist 제거가 성공적으로 완료되었습니다! 🎉"
}

# 스크립트 실행
main "$@"