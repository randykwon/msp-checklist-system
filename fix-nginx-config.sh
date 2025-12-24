#!/bin/bash

# Nginx 설정 오류 수정 스크립트

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

echo -e "${BLUE}🔧 Nginx 설정 오류 수정${NC}"
echo "========================"

# 1. 문제가 있는 performance.conf 파일 제거
log_info "문제가 있는 설정 파일 제거 중..."
sudo rm -f /etc/nginx/conf.d/performance.conf

# 2. 올바른 performance.conf 파일 생성
log_info "올바른 성능 최적화 설정 파일 생성 중..."
sudo tee /etc/nginx/conf.d/performance.conf > /dev/null << 'EOF'
# Nginx 성능 최적화 설정 (HTTP 블록 내 설정만)

# 파일 전송 최적화
sendfile on;
tcp_nopush on;
tcp_nodelay on;

# 타임아웃 설정
keepalive_timeout 65;
keepalive_requests 100;

# 압축 설정
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;

# 버퍼 크기 최적화
client_body_buffer_size 128k;
client_max_body_size 50m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;

# 보안 설정
server_tokens off;

# 레이트 리미팅
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
EOF

# 3. nginx.conf에서 worker_processes 설정 확인 및 수정
log_info "nginx.conf 워커 프로세스 설정 확인 중..."
if ! grep -q "worker_processes auto" /etc/nginx/nginx.conf; then
    log_info "worker_processes를 auto로 설정 중..."
    sudo sed -i 's/worker_processes [0-9]*;/worker_processes auto;/' /etc/nginx/nginx.conf
fi

# 4. events 블록 최적화
log_info "events 블록 최적화 중..."
if ! grep -q "use epoll" /etc/nginx/nginx.conf; then
    sudo sed -i '/events {/,/}/ {
        /worker_connections/a\    use epoll;\n    multi_accept on;
    }' /etc/nginx/nginx.conf
fi

# 5. 설정 파일 문법 검사
log_info "Nginx 설정 파일 문법 검사 중..."
if sudo nginx -t; then
    log_success "✅ Nginx 설정 파일 문법 검사 통과"
    
    # 6. Nginx 재시작
    log_info "Nginx 서비스 재시작 중..."
    sudo systemctl reload nginx
    sudo systemctl restart nginx
    
    if sudo systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 재시작 완료"
    else
        log_error "❌ Nginx 서비스 재시작 실패"
        sudo systemctl status nginx
        exit 1
    fi
else
    log_error "❌ Nginx 설정 파일에 여전히 오류가 있습니다"
    sudo nginx -t
    exit 1
fi

# 7. 연결 테스트
log_info "연결 테스트 중..."
sleep 2

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

# 8. 상태 요약
echo ""
echo -e "${GREEN}🎉 Nginx 설정 오류 수정 완료!${NC}"
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
echo "  - 종합 테스트: ./test-nginx-setup.sh"
echo ""

log_success "설정 수정이 성공적으로 완료되었습니다! 🚀"