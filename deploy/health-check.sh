#!/bin/bash

# MSP Checklist 헬스 체크 스크립트

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

MAIN_URL="http://localhost:3010"
ADMIN_URL="http://localhost:3011"
TIMEOUT=10
FAILED_CHECKS=0

echo "🏥 MSP Checklist 헬스 체크를 시작합니다..."

# 메인 애플리케이션 체크
log_info "메인 애플리케이션 체크 중..."
if curl -s --max-time $TIMEOUT $MAIN_URL > /dev/null; then
    log_success "메인 애플리케이션 정상"
    
    # API 엔드포인트 체크
    if curl -s --max-time $TIMEOUT $MAIN_URL/api/health > /dev/null 2>&1; then
        log_success "메인 API 정상"
    else
        log_warning "메인 API 응답 없음 (정상일 수 있음)"
    fi
else
    log_error "메인 애플리케이션 접속 실패"
    ((FAILED_CHECKS++))
fi

# 관리자 애플리케이션 체크
log_info "관리자 애플리케이션 체크 중..."
if curl -s --max-time $TIMEOUT $ADMIN_URL > /dev/null; then
    log_success "관리자 애플리케이션 정상"
    
    # 관리자 API 체크
    if curl -s --max-time $TIMEOUT $ADMIN_URL/api/dashboard/stats > /dev/null 2>&1; then
        log_success "관리자 API 정상"
    else
        log_warning "관리자 API 응답 없음"
    fi
else
    log_error "관리자 애플리케이션 접속 실패"
    ((FAILED_CHECKS++))
fi

# PM2 프로세스 체크
log_info "PM2 프로세스 체크 중..."
if command -v pm2 &> /dev/null; then
    MAIN_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="msp-main") | .pm2_env.status' 2>/dev/null || echo "unknown")
    ADMIN_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="msp-admin") | .pm2_env.status' 2>/dev/null || echo "unknown")
    
    if [ "$MAIN_STATUS" = "online" ]; then
        log_success "메인 프로세스 온라인"
    else
        log_error "메인 프로세스 상태: $MAIN_STATUS"
        ((FAILED_CHECKS++))
    fi
    
    if [ "$ADMIN_STATUS" = "online" ]; then
        log_success "관리자 프로세스 온라인"
    else
        log_error "관리자 프로세스 상태: $ADMIN_STATUS"
        ((FAILED_CHECKS++))
    fi
else
    log_error "PM2가 설치되지 않았습니다"
    ((FAILED_CHECKS++))
fi

# Nginx 체크
log_info "Nginx 상태 체크 중..."
if systemctl is-active --quiet nginx; then
    log_success "Nginx 정상 실행 중"
else
    log_error "Nginx가 실행되지 않고 있습니다"
    ((FAILED_CHECKS++))
fi

# 데이터베이스 파일 체크
log_info "데이터베이스 파일 체크 중..."
if [ -f "/opt/msp-checklist/msp-checklist/msp-assessment.db" ]; then
    log_success "메인 데이터베이스 파일 존재"
else
    log_error "메인 데이터베이스 파일 없음"
    ((FAILED_CHECKS++))
fi

if [ -f "/opt/msp-checklist/msp-checklist/admin/msp-assessment.db" ]; then
    log_success "관리자 데이터베이스 파일 존재"
else
    log_warning "관리자 데이터베이스 파일 없음"
fi

# 디스크 공간 체크
log_info "디스크 공간 체크 중..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    log_success "디스크 사용률: ${DISK_USAGE}%"
elif [ $DISK_USAGE -lt 90 ]; then
    log_warning "디스크 사용률 높음: ${DISK_USAGE}%"
else
    log_error "디스크 공간 부족: ${DISK_USAGE}%"
    ((FAILED_CHECKS++))
fi

# 메모리 사용률 체크
log_info "메모리 사용률 체크 중..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -lt 80 ]; then
    log_success "메모리 사용률: ${MEMORY_USAGE}%"
elif [ $MEMORY_USAGE -lt 90 ]; then
    log_warning "메모리 사용률 높음: ${MEMORY_USAGE}%"
else
    log_error "메모리 사용률 위험: ${MEMORY_USAGE}%"
    ((FAILED_CHECKS++))
fi

# 포트 체크
log_info "포트 상태 체크 중..."
if netstat -tlnp | grep -q ":3010"; then
    log_success "포트 3010 열림"
else
    log_error "포트 3010 닫힘"
    ((FAILED_CHECKS++))
fi

if netstat -tlnp | grep -q ":3011"; then
    log_success "포트 3011 열림"
else
    log_error "포트 3011 닫힘"
    ((FAILED_CHECKS++))
fi

# SSL 인증서 만료일 체크 (도메인이 설정된 경우)
if command -v certbot &> /dev/null; then
    log_info "SSL 인증서 만료일 체크 중..."
    CERT_INFO=$(sudo certbot certificates 2>/dev/null | grep "Expiry Date" | head -1)
    if [ ! -z "$CERT_INFO" ]; then
        EXPIRY_DATE=$(echo $CERT_INFO | awk '{print $3}')
        DAYS_LEFT=$(( ($(date -d "$EXPIRY_DATE" +%s) - $(date +%s)) / 86400 ))
        
        if [ $DAYS_LEFT -gt 30 ]; then
            log_success "SSL 인증서 만료까지 ${DAYS_LEFT}일"
        elif [ $DAYS_LEFT -gt 7 ]; then
            log_warning "SSL 인증서 만료까지 ${DAYS_LEFT}일"
        else
            log_error "SSL 인증서 곧 만료: ${DAYS_LEFT}일"
            ((FAILED_CHECKS++))
        fi
    else
        log_info "SSL 인증서 정보 없음"
    fi
fi

# 로그 파일 크기 체크
log_info "로그 파일 크기 체크 중..."
LOG_DIR="/opt/msp-checklist/logs"
if [ -d "$LOG_DIR" ]; then
    for log_file in "$LOG_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            LOG_SIZE=$(du -m "$log_file" | cut -f1)
            if [ $LOG_SIZE -gt 100 ]; then
                log_warning "$(basename $log_file) 크기가 큼: ${LOG_SIZE}MB"
            fi
        fi
    done
fi

# 결과 요약
echo ""
echo "=================================="
echo "헬스 체크 결과 요약"
echo "=================================="

if [ $FAILED_CHECKS -eq 0 ]; then
    log_success "모든 체크 통과! 시스템이 정상입니다. ✅"
    exit 0
elif [ $FAILED_CHECKS -le 2 ]; then
    log_warning "경미한 문제 발견: ${FAILED_CHECKS}개 항목 실패 ⚠️"
    exit 1
else
    log_error "심각한 문제 발견: ${FAILED_CHECKS}개 항목 실패 ❌"
    exit 2
fi