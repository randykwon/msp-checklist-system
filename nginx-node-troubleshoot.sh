#!/bin/bash

# Nginx + Node.js 문제 해결 통합 스크립트
# 모든 알려진 문제를 자동으로 진단하고 해결합니다

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
ISSUES_FOUND=()
FIXES_APPLIED=()

# 배너 출력
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        Nginx + Node.js 문제 해결 통합 스크립트            ║"
    echo "║                                                            ║"
    echo "║  🔍 자동 문제 진단                                        ║"
    echo "║  🔧 sendfile 중복 오류 해결                               ║"
    echo "║  🚫 포트 충돌 문제 해결                                   ║"
    echo "║  📁 OS별 설정 구조 차이 해결                              ║"
    echo "║  ⚡ 성능 최적화 설정                                      ║"
    echo "║  🛡️ 보안 설정 검증                                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

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
            log_error "지원되지 않는 운영체제: $NAME"
            exit 1
        fi
    else
        log_error "/etc/os-release 파일을 찾을 수 없습니다."
        exit 1
    fi
}

# 문제 진단 함수들
diagnose_nginx_installation() {
    log_step "Nginx 설치 상태 진단 중..."
    
    if ! command -v nginx > /dev/null 2>&1; then
        ISSUES_FOUND+=("nginx_not_installed")
        log_error "❌ Nginx가 설치되지 않음"
        return 1
    fi
    
    if ! systemctl is-enabled --quiet nginx; then
        ISSUES_FOUND+=("nginx_not_enabled")
        log_warning "⚠️ Nginx 서비스가 활성화되지 않음"
    fi
    
    if ! systemctl is-active --quiet nginx; then
        ISSUES_FOUND+=("nginx_not_running")
        log_warning "⚠️ Nginx 서비스가 실행되지 않음"
    else
        log_success "✅ Nginx 설치 및 실행 상태 정상"
    fi
}

diagnose_nginx_configuration() {
    log_step "Nginx 설정 파일 진단 중..."
    
    # sendfile 중복 검사
    local sendfile_count=0
    
    # nginx.conf에서 sendfile 확인
    if grep -q "sendfile.*on" /etc/nginx/nginx.conf 2>/dev/null; then
        ((sendfile_count++))
        log_debug "nginx.conf에 sendfile 설정 발견"
    fi
    
    # conf.d 디렉토리에서 sendfile 확인
    if find /etc/nginx/conf.d/ -name "*.conf" -exec grep -l "sendfile.*on" {} \; 2>/dev/null | grep -q .; then
        ((sendfile_count++))
        ISSUES_FOUND+=("sendfile_duplicate")
        log_error "❌ sendfile 중복 설정 발견"
    fi
    
    # 포트 충돌 검사
    if [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        if grep -r "listen 3010\|listen 3011" /etc/nginx/conf.d/ 2>/dev/null | grep -q .; then
            ISSUES_FOUND+=("port_conflict")
            log_error "❌ Nginx가 Node.js 포트에 직접 바인딩 시도"
        fi
    fi
    
    # 설정 파일 문법 검사
    if ! sudo nginx -t >/dev/null 2>&1; then
        ISSUES_FOUND+=("nginx_config_error")
        log_error "❌ Nginx 설정 파일 문법 오류"
    else
        log_success "✅ Nginx 설정 파일 문법 정상"
    fi
}

diagnose_os_specific_issues() {
    log_step "OS별 설정 구조 진단 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # Ubuntu sites-available/sites-enabled 구조 확인
        if [ ! -d "/etc/nginx/sites-available" ] || [ ! -d "/etc/nginx/sites-enabled" ]; then
            ISSUES_FOUND+=("ubuntu_sites_structure_missing")
            log_warning "⚠️ Ubuntu sites-available/sites-enabled 구조 없음"
        fi
        
        # 기본 사이트 활성화 확인
        if [ -f "/etc/nginx/sites-enabled/default" ]; then
            ISSUES_FOUND+=("ubuntu_default_site_active")
            log_warning "⚠️ Ubuntu 기본 사이트가 활성화됨"
        fi
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # Amazon Linux conf.d 구조 확인
        if [ -f "/etc/nginx/conf.d/default.conf" ]; then
            ISSUES_FOUND+=("amazon_default_conf_active")
            log_warning "⚠️ Amazon Linux 기본 설정이 활성화됨"
        fi
        
        # sites-available 디렉토리가 있으면 문제
        if [ -d "/etc/nginx/sites-available" ]; then
            ISSUES_FOUND+=("amazon_ubuntu_structure_conflict")
            log_warning "⚠️ Amazon Linux에 Ubuntu 스타일 디렉토리 존재"
        fi
    fi
}

diagnose_nodejs_servers() {
    log_step "Node.js 서버 상태 진단 중..."
    
    # 포트 3010 확인
    if ! netstat -tuln 2>/dev/null | grep -q ":3010 " && ! ss -tuln 2>/dev/null | grep -q ":3010 "; then
        ISSUES_FOUND+=("nodejs_main_not_running")
        log_warning "⚠️ 메인 서버 (포트 3010) 실행되지 않음"
    else
        log_success "✅ 메인 서버 (포트 3010) 실행 중"
    fi
    
    # 포트 3011 확인
    if ! netstat -tuln 2>/dev/null | grep -q ":3011 " && ! ss -tuln 2>/dev/null | grep -q ":3011 "; then
        ISSUES_FOUND+=("nodejs_admin_not_running")
        log_warning "⚠️ 관리자 서버 (포트 3011) 실행되지 않음"
    else
        log_success "✅ 관리자 서버 (포트 3011) 실행 중"
    fi
    
    # PM2 상태 확인
    if command -v pm2 > /dev/null 2>&1; then
        local pm2_processes=$(pm2 list 2>/dev/null | grep -c "online" || echo "0")
        if [ "$pm2_processes" -eq 0 ]; then
            ISSUES_FOUND+=("pm2_no_processes")
            log_warning "⚠️ PM2 프로세스가 실행되지 않음"
        else
            log_success "✅ PM2 프로세스 $pm2_processes개 실행 중"
        fi
    else
        ISSUES_FOUND+=("pm2_not_installed")
        log_warning "⚠️ PM2가 설치되지 않음"
    fi
}

diagnose_connectivity() {
    log_step "연결성 진단 중..."
    
    # HTTP 응답 테스트
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ ! "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        ISSUES_FOUND+=("http_connectivity_issue")
        log_warning "⚠️ HTTP 연결 문제 (응답 코드: $http_code)"
    else
        log_success "✅ HTTP 연결 정상 (응답 코드: $http_code)"
    fi
    
    # 관리자 페이지 테스트
    local admin_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
    if [[ ! "$admin_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        ISSUES_FOUND+=("admin_connectivity_issue")
        log_warning "⚠️ 관리자 페이지 연결 문제 (응답 코드: $admin_code)"
    else
        log_success "✅ 관리자 페이지 연결 정상 (응답 코드: $admin_code)"
    fi
}

# 문제 해결 함수들
fix_nginx_installation() {
    log_step "Nginx 설치 문제 해결 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        sudo apt update
        sudo apt install -y nginx
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        sudo dnf update -y
        sudo dnf install -y nginx
    fi
    
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    FIXES_APPLIED+=("nginx_installed")
    log_success "✅ Nginx 설치 및 활성화 완료"
}

fix_sendfile_duplicate() {
    log_step "sendfile 중복 설정 문제 해결 중..."
    
    # 문제가 있는 performance.conf 파일 제거
    sudo rm -f /etc/nginx/conf.d/performance.conf
    
    # conf.d 디렉토리에서 sendfile이 포함된 다른 파일들 확인 및 수정
    find /etc/nginx/conf.d/ -name "*.conf" -exec grep -l "sendfile" {} \; 2>/dev/null | while read file; do
        if [ "$file" != "/etc/nginx/conf.d/msp-checklist.conf" ]; then
            log_info "sendfile 설정이 포함된 파일 수정: $file"
            sudo sed -i '/sendfile/d' "$file"
        fi
    done
    
    FIXES_APPLIED+=("sendfile_duplicate_fixed")
    log_success "✅ sendfile 중복 설정 문제 해결 완료"
}

fix_port_conflict() {
    log_step "포트 충돌 문제 해결 중..."
    
    # Nginx 설정에서 직접 포트 바인딩 제거
    find /etc/nginx/conf.d/ -name "*.conf" -exec grep -l "listen 301[01]" {} \; 2>/dev/null | while read file; do
        log_info "포트 충돌 설정 제거: $file"
        sudo sed -i '/listen 3010/d; /listen 3011/d' "$file"
    done
    
    FIXES_APPLIED+=("port_conflict_fixed")
    log_success "✅ 포트 충돌 문제 해결 완료"
}

fix_nginx_config_error() {
    log_step "Nginx 설정 오류 해결 중..."
    
    # 백업 생성
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # 기존 MSP 설정 파일들 제거
    sudo rm -f /etc/nginx/conf.d/msp-*.conf
    sudo rm -f /etc/nginx/sites-available/msp-checklist 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/msp-checklist 2>/dev/null || true
    
    # OS별 올바른 설정 파일 생성
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        create_ubuntu_nginx_config
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        create_amazon_linux_nginx_config
    fi
    
    FIXES_APPLIED+=("nginx_config_fixed")
    log_success "✅ Nginx 설정 오류 해결 완료"
}

fix_os_specific_issues() {
    log_step "OS별 설정 구조 문제 해결 중..."
    
    if [[ "$OS_TYPE" == "ubuntu" ]]; then
        # sites-available/sites-enabled 디렉토리 생성
        sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
        
        # 기본 사이트 비활성화
        sudo rm -f /etc/nginx/sites-enabled/default
        
        FIXES_APPLIED+=("ubuntu_structure_fixed")
        
    elif [[ "$OS_TYPE" == "amazon-linux-2023" ]]; then
        # 기본 설정 비활성화
        sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled 2>/dev/null || true
        
        # Ubuntu 스타일 디렉토리 제거 (있는 경우)
        sudo rm -rf /etc/nginx/sites-available /etc/nginx/sites-enabled 2>/dev/null || true
        
        FIXES_APPLIED+=("amazon_structure_fixed")
    fi
    
    log_success "✅ OS별 설정 구조 문제 해결 완료"
}

# Ubuntu Nginx 설정 생성
create_ubuntu_nginx_config() {
    sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Ubuntu) - 문제 해결 버전
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    client_max_body_size 50M;
    
    # 관리자 시스템
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=10 nodelay;
    }
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=20 nodelay;
    }
    
    # API 라우트
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        limit_req zone=api burst=20 nodelay;
    }
    
    # 정적 파일
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # 헬스체크
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 보안: 숨겨진 파일 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF

    sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
}

# Amazon Linux Nginx 설정 생성
create_amazon_linux_nginx_config() {
    sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Amazon Linux 2023) - 문제 해결 버전
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    client_max_body_size 50M;
    
    # 관리자 시스템
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=10 nodelay;
    }
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        limit_req zone=general burst=20 nodelay;
    }
    
    # API 라우트
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        limit_req zone=api burst=20 nodelay;
    }
    
    # 정적 파일
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # 헬스체크
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 보안: 숨겨진 파일 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}
EOF
}

# 테스트 서버 생성 (Node.js 서버가 없을 때 테스트용)
create_test_server() {
    log_step "테스트 서버 생성 중..."
    
    cat > test-server.js << 'EOF'
const http = require('http');

// 메인 서버 (포트 3010)
const mainServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>MSP Checklist 메인 서버</h1>
        <p>포트 3010에서 실행 중</p>
        <p>요청 URL: ${req.url}</p>
        <p>시간: ${new Date().toLocaleString('ko-KR')}</p>
        <a href="/admin">관리자 페이지로 이동</a>
    `);
});

// 관리자 서버 (포트 3011)
const adminServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>MSP Checklist 관리자 시스템</h1>
        <p>포트 3011에서 실행 중</p>
        <p>요청 URL: ${req.url}</p>
        <p>시간: ${new Date().toLocaleString('ko-KR')}</p>
        <a href="/">메인 페이지로 이동</a>
    `);
});

mainServer.listen(3010, () => {
    console.log('메인 서버가 포트 3010에서 실행 중');
});

adminServer.listen(3011, () => {
    console.log('관리자 서버가 포트 3011에서 실행 중');
});

// 종료 처리
process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    mainServer.close();
    adminServer.close();
    process.exit(0);
});
EOF

    chmod +x test-server.js
    log_success "✅ 테스트 서버 생성 완료 (test-server.js)"
}

# 종합 테스트 실행
run_comprehensive_test() {
    log_step "종합 테스트 실행 중..."
    
    # Nginx 설정 테스트
    if sudo nginx -t; then
        log_success "✅ Nginx 설정 파일 문법 검사 통과"
    else
        log_error "❌ Nginx 설정 파일 문법 오류"
        return 1
    fi
    
    # Nginx 재시작
    sudo systemctl restart nginx
    sleep 2
    
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 재시작 성공"
    else
        log_error "❌ Nginx 서비스 재시작 실패"
        return 1
    fi
    
    # 연결 테스트
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [[ "$http_code" == "502" ]]; then
        log_warning "⚠️ HTTP 502 (Bad Gateway) - Node.js 서버 필요"
        echo "  테스트 서버 시작: node test-server.js &"
    elif [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        log_success "✅ HTTP 연결 테스트 통과 (응답 코드: $http_code)"
    else
        log_warning "⚠️ HTTP 응답 코드: $http_code"
    fi
    
    # 헬스체크 테스트
    local health_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
    if [[ "$health_code" == "200" ]]; then
        log_success "✅ 헬스체크 엔드포인트 정상"
    else
        log_info "ℹ️ 헬스체크 응답 코드: $health_code"
    fi
}

# 문제 해결 요약 출력
show_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                문제 해결 완료 요약                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ ${#ISSUES_FOUND[@]} -eq 0 ]; then
        log_success "🎉 문제가 발견되지 않았습니다! 시스템이 정상 상태입니다."
    else
        echo "🔍 발견된 문제들:"
        for issue in "${ISSUES_FOUND[@]}"; do
            echo "  - $issue"
        done
        echo ""
    fi
    
    if [ ${#FIXES_APPLIED[@]} -gt 0 ]; then
        echo "🔧 적용된 수정사항들:"
        for fix in "${FIXES_APPLIED[@]}"; do
            echo "  - $fix"
        done
        echo ""
    fi
    
    # 공용 IP 확인
    local public_ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo "🌐 접속 주소:"
    echo "  - 메인 서비스: http://$public_ip"
    echo "  - 관리자 시스템: http://$public_ip/admin"
    echo "  - 헬스체크: http://$public_ip/health"
    echo ""
    
    echo "🔧 유용한 명령어:"
    echo "  - Nginx 상태: sudo systemctl status nginx"
    echo "  - 설정 테스트: sudo nginx -t"
    echo "  - 테스트 서버 시작: node test-server.js &"
    echo "  - 로그 확인: sudo tail -f /var/log/nginx/error.log"
    echo ""
    
    echo "📝 다음 단계:"
    echo "1. Node.js 서버가 실행되지 않은 경우:"
    echo "   node test-server.js &"
    echo ""
    echo "2. 실제 MSP 애플리케이션 시작:"
    echo "   cd /opt/msp-checklist-system/msp-checklist && npm start"
    echo ""
    echo "3. PM2로 프로세스 관리:"
    echo "   pm2 start ecosystem.config.js"
    echo ""
}

# 메인 실행 함수
main() {
    show_banner
    
    # 사용자 확인
    read -p "Nginx + Node.js 문제 해결을 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "문제 해결이 취소되었습니다."
        exit 0
    fi
    
    # 진단 단계
    detect_os
    diagnose_nginx_installation
    diagnose_nginx_configuration
    diagnose_os_specific_issues
    diagnose_nodejs_servers
    diagnose_connectivity
    
    # 문제 해결 단계
    for issue in "${ISSUES_FOUND[@]}"; do
        case $issue in
            "nginx_not_installed"|"nginx_not_enabled"|"nginx_not_running")
                fix_nginx_installation
                ;;
            "sendfile_duplicate")
                fix_sendfile_duplicate
                ;;
            "port_conflict")
                fix_port_conflict
                ;;
            "nginx_config_error")
                fix_nginx_config_error
                ;;
            "ubuntu_sites_structure_missing"|"ubuntu_default_site_active"|"amazon_default_conf_active"|"amazon_ubuntu_structure_conflict")
                fix_os_specific_issues
                ;;
        esac
    done
    
    # 테스트 서버 생성
    create_test_server
    
    # 종합 테스트
    run_comprehensive_test
    
    # 요약 출력
    show_summary
    
    log_success "Nginx + Node.js 문제 해결이 완료되었습니다! 🚀"
}

# 스크립트 실행
main "$@"