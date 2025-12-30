#!/bin/bash

# Amazon Linux 2023 Nginx 설정 오류 수정 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}🔧 Amazon Linux 2023 Nginx 설정 수정${NC}"
echo "====================================="

# 1. 현재 상태 확인
log_info "현재 Nginx 설정 상태 확인 중..."
echo "nginx.conf의 sendfile 설정:"
grep -n "sendfile" /etc/nginx/nginx.conf || echo "sendfile 설정 없음"

echo ""
echo "performance.conf 내용:"
cat /etc/nginx/conf.d/performance.conf || echo "performance.conf 없음"

# 2. 문제가 있는 performance.conf 파일 제거
log_info "문제가 있는 performance.conf 파일 제거 중..."
sudo rm -f /etc/nginx/conf.d/performance.conf

# 3. nginx.conf 백업
log_info "nginx.conf 백업 생성 중..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 4. Amazon Linux 2023용 MSP Checklist 설정 파일 생성
log_info "Amazon Linux 2023용 MSP Checklist 설정 파일 생성 중..."

sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null << 'EOF'
# MSP Checklist Nginx 설정 (Amazon Linux 2023)
# 메인 서버: 포트 3010
# 관리자 서버: 포트 3011

# 업스트림 서버 정의
upstream msp_main {
    server 127.0.0.1:3010 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream msp_admin {
    server 127.0.0.1:3011 fail_timeout=5s max_fails=3;
    keepalive 32;
}

# 레이트 리미팅 (중복되지 않는 설정)
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;

# 메인 서버 설정
server {
    listen 80;
    server_name _;
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # 클라이언트 최대 업로드 크기
    client_max_body_size 50M;
    
    # 타임아웃 설정
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 관리자 시스템 라우팅
    location /admin {
        # /admin 경로를 /로 리다이렉트하여 관리자 서버로 전달
        rewrite ^/admin(/.*)$ $1 break;
        
        proxy_pass http://msp_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        
        # 레이트 리미팅 적용
        limit_req zone=general burst=10 nodelay;
    }
    
    # 관리자 정적 파일
    location /admin/_next/ {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://msp_admin;
        proxy_set_header Host $host;
        
        # 캐싱 설정
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 메인 애플리케이션 (기본)
    location / {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 지원
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        
        # 레이트 리미팅 적용
        limit_req zone=general burst=20 nodelay;
    }
    
    # Next.js 정적 파일 최적화
    location /_next/static/ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        
        # 장기 캐싱
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 이미지 및 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://msp_main;
        proxy_set_header Host $host;
        
        # 캐싱 설정
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # API 라우트 최적화
    location /api/ {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API 응답 캐싱 비활성화
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        
        # API 레이트 리미팅
        limit_req zone=api burst=20 nodelay;
    }
    
    # 로그인 API 특별 제한
    location ~ ^/api/(auth|login) {
        proxy_pass http://msp_main;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 로그인 레이트 리미팅
        limit_req zone=login burst=5 nodelay;
    }
    
    # 헬스체크 엔드포인트
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # 로봇 차단 (선택사항)
    location /robots.txt {
        return 200 "User-agent: *\nDisallow: /admin/\n";
        add_header Content-Type text/plain;
    }
    
    # 보안: 숨겨진 파일 접근 차단
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 로그 설정
    access_log /var/log/nginx/msp-checklist-access.log;
    error_log /var/log/nginx/msp-checklist-error.log;
}

# 직접 포트 접근 리다이렉트 (선택사항)
server {
    listen 3010;
    server_name _;
    return 301 http://$host$request_uri;
}

server {
    listen 3011;
    server_name _;
    return 301 http://$host/admin$request_uri;
}
EOF

# 5. 기본 default.conf 비활성화 (있는 경우)
if [ -f /etc/nginx/conf.d/default.conf ]; then
    log_info "기본 default.conf 비활성화 중..."
    sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi

# 6. nginx.conf에서 worker_processes 최적화
log_info "nginx.conf 워커 프로세스 최적화 중..."
if ! grep -q "worker_processes auto" /etc/nginx/nginx.conf; then
    sudo sed -i 's/worker_processes [0-9]*;/worker_processes auto;/' /etc/nginx/nginx.conf
    log_info "worker_processes를 auto로 설정했습니다."
fi

# 7. 설정 파일 문법 검사
log_info "Nginx 설정 파일 문법 검사 중..."
if sudo nginx -t; then
    log_success "✅ Nginx 설정 파일 문법 검사 통과"
    
    # 8. Nginx 서비스 재시작
    log_info "Nginx 서비스 재시작 중..."
    sudo systemctl stop nginx
    sleep 2
    sudo systemctl start nginx
    
    # 상태 확인
    sleep 3
    if sudo systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 재시작 완료"
    else
        log_error "❌ Nginx 서비스 시작 실패"
        sudo systemctl status nginx --no-pager -l
        exit 1
    fi
else
    log_error "❌ Nginx 설정 파일에 여전히 오류가 있습니다"
    sudo nginx -t
    exit 1
fi

# 9. 방화벽 설정 (firewalld)
log_info "방화벽 설정 중..."
sudo systemctl enable firewalld
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 10. 연결 테스트
log_info "연결 테스트 중..."
sleep 3

# HTTP 응답 테스트
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ HTTP 응답 테스트 통과 (HTTP $HTTP_CODE)"
else
    log_warning "⚠️ HTTP 응답 테스트 실패 (HTTP $HTTP_CODE)"
fi

# 관리자 페이지 테스트
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
if [[ "$ADMIN_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    log_success "✅ 관리자 페이지 응답 테스트 통과 (HTTP $ADMIN_CODE)"
else
    log_warning "⚠️ 관리자 페이지 응답 테스트 실패 (HTTP $ADMIN_CODE)"
fi

# Node.js 서버 상태 확인
echo ""
echo "🔍 Node.js 서버 상태:"
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    log_success "✅ 메인 서버 (포트 3010) 실행 중"
else
    log_warning "⚠️ 메인 서버 (포트 3010) 실행되지 않음"
fi

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 관리자 서버 (포트 3011) 실행 중"
else
    log_warning "⚠️ 관리자 서버 (포트 3011) 실행되지 않음"
fi

# 11. 완료 정보
echo ""
echo -e "${GREEN}🎉 Amazon Linux 2023 Nginx 설정 완료!${NC}"
echo ""

# 공용 IP 확인
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")

echo "🌐 접속 주소:"
echo "  - 메인 서비스: http://$PUBLIC_IP"
echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
echo ""
echo "🔧 상태 확인 명령어:"
echo "  - Nginx 상태: sudo systemctl status nginx"
echo "  - 설정 테스트: sudo nginx -t"
echo "  - 방화벽 상태: sudo firewall-cmd --list-all"
echo ""
echo "📁 설정 파일 위치:"
echo "  - MSP 설정: /etc/nginx/conf.d/msp-checklist.conf"
echo "  - 메인 설정: /etc/nginx/nginx.conf"
echo "  - 로그: /var/log/nginx/msp-checklist-*.log"
echo ""
echo "📝 다음 단계:"
echo "1. AWS 보안 그룹에서 포트 80, 443 인바운드 규칙 확인"
echo "2. Node.js 서버가 실행 중인지 확인"
echo "3. 도메인 DNS 설정 (도메인 사용 시)"
echo ""

log_success "Amazon Linux 2023 Nginx 설정이 성공적으로 완료되었습니다! 🚀"