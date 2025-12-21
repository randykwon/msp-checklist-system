#!/bin/bash

# MSP Checklist SSL 인증서 설정 스크립트

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

echo "🔒 MSP Checklist SSL 인증서 설정을 시작합니다..."

# 도메인 입력 받기
if [ -z "$1" ]; then
    read -p "도메인을 입력하세요 (예: example.com): " DOMAIN
else
    DOMAIN=$1
fi

if [ -z "$DOMAIN" ]; then
    log_error "도메인이 입력되지 않았습니다."
    exit 1
fi

# www 서브도메인 추가 여부
read -p "www.$DOMAIN도 함께 설정하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DOMAINS="$DOMAIN,www.$DOMAIN"
    log_info "설정할 도메인: $DOMAIN, www.$DOMAIN"
else
    DOMAINS="$DOMAIN"
    log_info "설정할 도메인: $DOMAIN"
fi

# 이메일 입력 받기
read -p "Let's Encrypt 알림용 이메일을 입력하세요: " EMAIL

if [ -z "$EMAIL" ]; then
    log_error "이메일이 입력되지 않았습니다."
    exit 1
fi

# Nginx 설정 파일 업데이트
log_info "Nginx 설정 파일 업데이트 중..."
NGINX_CONFIG="/etc/nginx/sites-available/msp-checklist"

if [ ! -f "$NGINX_CONFIG" ]; then
    log_error "Nginx 설정 파일이 존재하지 않습니다: $NGINX_CONFIG"
    log_info "먼저 deploy/nginx.conf를 복사하고 도메인을 설정하세요."
    exit 1
fi

# 도메인 설정 업데이트
sudo sed -i "s/your-domain\.com/$DOMAIN/g" $NGINX_CONFIG

# Nginx 설정 테스트
log_info "Nginx 설정 테스트 중..."
if sudo nginx -t; then
    log_success "Nginx 설정이 올바릅니다."
    sudo systemctl reload nginx
else
    log_error "Nginx 설정에 오류가 있습니다."
    exit 1
fi

# DNS 확인
log_info "DNS 설정 확인 중..."
if nslookup $DOMAIN | grep -q "Address:"; then
    log_success "$DOMAIN DNS 설정 확인됨"
else
    log_warning "$DOMAIN DNS 설정을 확인하세요."
    read -p "계속 진행하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Let's Encrypt 인증서 발급
log_info "Let's Encrypt SSL 인증서 발급 중..."

if certbot --nginx -d $DOMAINS --email $EMAIL --agree-tos --non-interactive --redirect; then
    log_success "SSL 인증서가 성공적으로 발급되었습니다!"
else
    log_error "SSL 인증서 발급에 실패했습니다."
    exit 1
fi

# 자동 갱신 설정
log_info "SSL 인증서 자동 갱신 설정 중..."

# crontab에 갱신 작업 추가
CRON_JOB="0 12 * * * /usr/bin/certbot renew --quiet"
(crontab -l 2>/dev/null | grep -v "/usr/bin/certbot renew"; echo "$CRON_JOB") | crontab -

log_success "SSL 인증서 자동 갱신이 설정되었습니다. (매일 12시)"

# 갱신 테스트
log_info "SSL 인증서 갱신 테스트 중..."
if sudo certbot renew --dry-run; then
    log_success "SSL 인증서 갱신 테스트 성공"
else
    log_warning "SSL 인증서 갱신 테스트 실패. 수동으로 확인이 필요합니다."
fi

# SSL 설정 확인
log_info "SSL 설정 확인 중..."
sleep 3

if curl -s https://$DOMAIN > /dev/null; then
    log_success "HTTPS 접속 성공: https://$DOMAIN"
else
    log_error "HTTPS 접속 실패"
fi

# 보안 등급 확인 (선택사항)
log_info "SSL 보안 등급 확인을 위해 다음 사이트를 방문하세요:"
echo "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"

# 인증서 정보 표시
log_info "SSL 인증서 정보:"
sudo certbot certificates

echo ""
log_success "SSL 설정이 완료되었습니다! 🔒"

echo ""
echo "설정된 서비스 URL:"
echo "- 메인 서비스: https://$DOMAIN"
echo "- 관리자 시스템: https://$DOMAIN/admin"
echo ""

echo "유용한 명령어:"
echo "- 인증서 상태 확인: sudo certbot certificates"
echo "- 수동 갱신: sudo certbot renew"
echo "- 갱신 테스트: sudo certbot renew --dry-run"
echo ""

log_success "SSL 설정 완료! 🎉"