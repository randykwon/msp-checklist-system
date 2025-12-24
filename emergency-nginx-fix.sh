#!/bin/bash

# 긴급 Nginx 설정 수정 스크립트 (Amazon Linux 2023)

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

echo -e "${RED}🚨 긴급 Nginx 설정 수정${NC}"
echo "======================="

# 1. 모든 문제가 있는 설정 파일 완전 제거
log_info "모든 문제 설정 파일 제거 중..."
sudo rm -f /etc/nginx/conf.d/performance.conf
sudo rm -f /etc/nginx/conf.d/msp-*.conf
sudo rm -f /etc/nginx/sites-available/msp-checklist 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/msp-checklist 2>/dev/null || true

# 2. nginx.conf 백업 및 기본 상태 확인
log_info "nginx.conf 백업 및 확인 중..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.emergency.backup

# 3. nginx.conf에서 sendfile 설정 확인
log_info "nginx.conf의 sendfile 설정 확인 중..."
echo "현재 nginx.conf의 sendfile 설정:"
grep -n "sendfile" /etc/nginx/nginx.conf || echo "sendfile 설정 없음"

# 4. 완전히 새로운 MSP 설정 파일 생성 (중복 없이)
log_info "완전히 새로운 MSP 설정 파일 생성 중..."

sudo tee /etc/nginx/conf.d/msp-emergency.conf > /dev/null << 'EOF'
# MSP Checklist 긴급 설정 (Amazon Linux 2023)
# 중복 설정 완전 제거 버전

# 레이트 리미팅만 (중복되지 않는 설정)
limit_req_zone $binary_remote_addr zone=emergency:10m rate=5r/s;

server {
    listen 80;
    server_name _;
    
    # 기본 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    
    # 메인 애플리케이션
    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 레이트 리미팅 적용
        limit_req zone=emergency burst=10 nodelay;
    }
    
    # 관리자 시스템
    location /admin {
        rewrite ^/admin(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:3011;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 레이트 리미팅 적용
        limit_req zone=emergency burst=5 nodelay;
    }
    
    # 헬스체크
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
    
    # 에러 로그
    error_log /var/log/nginx/msp-emergency-error.log;
    access_log /var/log/nginx/msp-emergency-access.log;
}
EOF

# 5. 기본 default.conf 비활성화
if [ -f /etc/nginx/conf.d/default.conf ]; then
    log_info "기본 default.conf 비활성화 중..."
    sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi

# 6. nginx.conf에서 worker_processes 최적화 (안전하게)
log_info "nginx.conf 최적화 중..."
if ! grep -q "worker_processes auto" /etc/nginx/nginx.conf; then
    sudo sed -i 's/worker_processes [0-9]*;/worker_processes auto;/' /etc/nginx/nginx.conf
fi

# 7. 설정 파일 문법 검사
log_info "Nginx 설정 파일 문법 검사 중..."
if sudo nginx -t; then
    log_success "✅ Nginx 설정 파일 문법 검사 통과"
    
    # 8. Nginx 완전 재시작
    log_info "Nginx 완전 재시작 중..."
    sudo systemctl stop nginx
    sleep 3
    sudo systemctl start nginx
    
    # 상태 확인
    sleep 2
    if sudo systemctl is-active --quiet nginx; then
        log_success "✅ Nginx 서비스 시작 완료"
    else
        log_error "❌ Nginx 서비스 시작 실패"
        sudo systemctl status nginx --no-pager -l
        exit 1
    fi
else
    log_error "❌ Nginx 설정 파일에 여전히 오류가 있습니다"
    echo ""
    echo "상세 오류 내용:"
    sudo nginx -t
    echo ""
    echo "nginx.conf 내용 확인:"
    echo "========================"
    grep -n "sendfile\|gzip" /etc/nginx/nginx.conf
    echo "========================"
    echo ""
    echo "conf.d 디렉토리 내용:"
    ls -la /etc/nginx/conf.d/
    exit 1
fi

# 9. 방화벽 설정
log_info "방화벽 설정 중..."
sudo systemctl enable firewalld 2>/dev/null || true
sudo systemctl start firewalld 2>/dev/null || true
sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
sudo firewall-cmd --permanent --add-service=ssh 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true

# 10. 연결 테스트
log_info "연결 테스트 중..."
sleep 3

# HTTP 응답 테스트
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" =~ ^[2-5][0-9][0-9]$ ]]; then
    log_success "✅ HTTP 응답 테스트 통과 (HTTP $HTTP_CODE)"
else
    log_warning "⚠️ HTTP 응답 테스트: HTTP $HTTP_CODE (Node.js 서버가 실행되지 않을 수 있음)"
fi

# 11. Node.js 서버 상태 안내
echo ""
echo "🔍 Node.js 서버 상태:"
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    log_success "✅ 메인 서버 (포트 3010) 실행 중"
else
    log_warning "⚠️ 메인 서버 (포트 3010) 실행되지 않음"
    echo "  Node.js 서버 시작 방법:"
    echo "  cd /opt/msp-checklist-system/msp-checklist && npm start"
fi

if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    log_success "✅ 관리자 서버 (포트 3011) 실행 중"
else
    log_warning "⚠️ 관리자 서버 (포트 3011) 실행되지 않음"
    echo "  관리자 서버 시작 방법:"
    echo "  cd /opt/msp-checklist-system/msp-checklist/admin && npm start"
fi

# 12. 완료 정보
echo ""
echo -e "${GREEN}🎉 긴급 Nginx 설정 수정 완료!${NC}"
echo ""

# 공용 IP 확인
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_SERVER_IP")

echo "🌐 접속 주소:"
echo "  - 메인 서비스: http://$PUBLIC_IP"
echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"
echo "  - 헬스체크: http://$PUBLIC_IP/health"
echo ""
echo "🔧 상태 확인 명령어:"
echo "  - Nginx 상태: sudo systemctl status nginx"
echo "  - 설정 테스트: sudo nginx -t"
echo "  - 로그 확인: sudo tail -f /var/log/nginx/msp-emergency-error.log"
echo ""
echo "📁 생성된 설정 파일:"
echo "  - /etc/nginx/conf.d/msp-emergency.conf"
echo "  - /etc/nginx/nginx.conf.emergency.backup (백업)"
echo ""
echo "📝 다음 단계:"
echo "1. Node.js 서버 시작 (위의 안내 참조)"
echo "2. AWS 보안 그룹에서 포트 80 인바운드 규칙 확인"
echo "3. 브라우저에서 접속 테스트"
echo ""

log_success "긴급 수정이 성공적으로 완료되었습니다! 🚀"