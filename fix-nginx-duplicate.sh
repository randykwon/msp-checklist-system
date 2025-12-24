#!/bin/bash

# Nginx 중복 설정 오류 수정 스크립트

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

echo -e "${BLUE}🔧 Nginx 중복 설정 오류 수정${NC}"
echo "=============================="

# 1. 현재 상태 확인
log_info "현재 Nginx 설정 상태 확인 중..."
sudo nginx -t || true

# 2. 모든 문제가 있는 설정 파일 제거
log_info "문제가 있는 설정 파일들 제거 중..."
sudo rm -f /etc/nginx/conf.d/performance.conf
sudo rm -f /etc/nginx/sites-available/msp-checklist
sudo rm -f /etc/nginx/sites-enabled/msp-checklist

# 3. 기본 nginx.conf 백업 및 정리
log_info "nginx.conf 백업 및 정리 중..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 4. 기본 nginx.conf 확인 및 최적화
log_info "nginx.conf 기본 설정 확인 중..."

# worker_processes 설정
if ! grep -q "worker_processes auto" /etc/nginx/nginx.conf; then
    sudo sed -i 's/worker_processes [0-9]*;/worker_processes auto;/' /etc/nginx/nginx.conf
    log_info "worker_processes를 auto로 설정했습니다."
fi

# 5. MSP Checklist 전용 설정 파일 생성 (중복 없이)
log_info "MSP Checklist 전용 설정 파일 생성 중..."

sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null << 'EOF'
# MSP Checklist Nginx 설정
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
EOF

# 6. sites-enabled 링크 생성
log_info "sites-enabled 링크 생성 중..."
sudo ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/

# 기본 사이트 비활성화
sudo rm -f /etc/nginx/sites-enabled/default

# 7. 성능 최적화 설정 (중복 없이)
log_info "성능 최적화 설정 생성 중..."

# 기존 nginx.conf에서 중복될 수 있는 설정들 확인
EXISTING_GZIP=$(grep -c "gzip on" /etc/nginx/nginx.conf || echo "0")
EXISTING_SENDFILE=$(grep -c "sendfile on" /etc/nginx/nginx.conf || echo "0")

# 중복되지 않는 설정들만 추가
sudo tee /etc/nginx/conf.d/msp-performance.conf > /dev/null << EOF
# MSP Checklist 성능 최적화 설정 (중복 방지)

# 레이트 리미팅 (중복되지 않는 설정)
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=5r/s;

# 추가 보안 설정
more_set_headers "Server: MSP-Checklist";

# 로그 포맷 최적화
log_format msp_combined '\$remote_addr - \$remote_user [\$time_local] '
                        '"\$request" \$status \$body_bytes_sent '
                        '"\$http_referer" "\$http_user_agent" '
                        '"\$http_x_forwarded_for" rt=\$request_time';
EOF

# 8. 설정 파일 문법 검사
log_info "Nginx 설정 파일 문법 검사 중..."
if sudo nginx -t; then
    log_success "✅ Nginx 설정 파일 문법 검사 통과"
    
    # 9. Nginx 서비스 재시작
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

# 11. 방화벽 설정
log_info "방화벽 설정 중..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# 12. 완료 정보
echo ""
echo -e "${GREEN}🎉 Nginx 중복 설정 오류 수정 완료!${NC}"
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
echo "📁 설정 파일 위치:"
echo "  - 메인 설정: /etc/nginx/sites-available/msp-checklist"
echo "  - 성능 설정: /etc/nginx/conf.d/msp-performance.conf"
echo "  - 로그: /var/log/nginx/msp-checklist-*.log"
echo ""

log_success "설정 수정이 성공적으로 완료되었습니다! 🚀"