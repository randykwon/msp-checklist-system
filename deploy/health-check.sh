#!/bin/bash

# MSP Checklist 시스템 헬스 체크 스크립트
# 시스템 상태를 확인하고 문제가 있으면 자동으로 복구를 시도합니다.

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

# 헬스 체크 결과
HEALTH_STATUS=0

echo "=== MSP Checklist 헬스 체크 ==="
echo "시간: $(date)"
echo ""

# 1. 포트 확인
log_info "1. 포트 상태 확인 중..."

if netstat -tlnp | grep -q ":3010"; then
    log_success "포트 3010 (메인 앱) 활성화"
else
    log_error "포트 3010 (메인 앱) 비활성화"
    HEALTH_STATUS=1
fi

if netstat -tlnp | grep -q ":3011"; then
    log_success "포트 3011 (관리자 앱) 활성화"
else
    log_error "포트 3011 (관리자 앱) 비활성화"
    HEALTH_STATUS=1
fi

# 2. HTTP 응답 확인
log_info "2. HTTP 응답 확인 중..."

# 메인 앱 확인
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200\|301\|302"; then
    log_success "메인 앱 HTTP 응답 정상"
else
    log_error "메인 앱 HTTP 응답 실패"
    HEALTH_STATUS=1
fi

# 관리자 앱 확인
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 | grep -q "200\|301\|302"; then
    log_success "관리자 앱 HTTP 응답 정상"
else
    log_error "관리자 앱 HTTP 응답 실패"
    HEALTH_STATUS=1
fi

# 3. PM2 프로세스 확인
log_info "3. PM2 프로세스 확인 중..."

if command -v pm2 &> /dev/null; then
    if pm2 status | grep -q "online"; then
        ONLINE_COUNT=$(pm2 status | grep -c "online")
        log_success "PM2 프로세스 $ONLINE_COUNT개 실행 중"
    else
        log_error "PM2 프로세스가 실행되지 않음"
        HEALTH_STATUS=1
    fi
else
    log_warning "PM2가 설치되지 않음"
fi

# 4. 시스템 리소스 확인
log_info "4. 시스템 리소스 확인 중..."

# 메모리 사용률 확인
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    log_error "메모리 사용률 높음: ${MEMORY_USAGE}%"
    HEALTH_STATUS=1
elif [ "$MEMORY_USAGE" -gt 80 ]; then
    log_warning "메모리 사용률 주의: ${MEMORY_USAGE}%"
else
    log_success "메모리 사용률 정상: ${MEMORY_USAGE}%"
fi

# 디스크 사용률 확인
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log_error "디스크 사용률 높음: ${DISK_USAGE}%"
    HEALTH_STATUS=1
elif [ "$DISK_USAGE" -gt 80 ]; then
    log_warning "디스크 사용률 주의: ${DISK_USAGE}%"
else
    log_success "디스크 사용률 정상: ${DISK_USAGE}%"
fi

# 5. 데이터베이스 파일 확인
log_info "5. 데이터베이스 파일 확인 중..."

DB_FILES=(
    "/opt/msp-checklist/msp-checklist/msp-assessment.db"
    "/opt/msp-checklist/msp-checklist/advice-cache.db"
    "/opt/msp-checklist/msp-checklist/virtual-evidence-cache.db"
    "/opt/msp-checklist/msp-checklist/admin/msp-assessment.db"
)

for db_file in "${DB_FILES[@]}"; do
    if [ -f "$db_file" ]; then
        if [ -r "$db_file" ] && [ -w "$db_file" ]; then
            log_success "데이터베이스 파일 정상: $(basename $db_file)"
        else
            log_error "데이터베이스 파일 권한 문제: $(basename $db_file)"
            HEALTH_STATUS=1
        fi
    else
        log_warning "데이터베이스 파일 없음: $(basename $db_file)"
    fi
done

# 6. Nginx 상태 확인 (설치된 경우)
if command -v nginx &> /dev/null; then
    log_info "6. Nginx 상태 확인 중..."
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx 서비스 실행 중"
        
        # Nginx 설정 테스트
        if nginx -t &> /dev/null; then
            log_success "Nginx 설정 정상"
        else
            log_error "Nginx 설정 오류"
            HEALTH_STATUS=1
        fi
    else
        log_error "Nginx 서비스 중지됨"
        HEALTH_STATUS=1
    fi
fi

# 7. 자동 복구 시도 (옵션)
if [ "$HEALTH_STATUS" -eq 1 ] && [ "$1" = "--auto-fix" ]; then
    log_info "자동 복구 시도 중..."
    
    # PM2 프로세스 재시작
    if command -v pm2 &> /dev/null; then
        log_info "PM2 프로세스 재시작 중..."
        pm2 restart all
        sleep 5
    fi
    
    # Nginx 재시작 (필요한 경우)
    if command -v nginx &> /dev/null && ! systemctl is-active --quiet nginx; then
        log_info "Nginx 재시작 중..."
        sudo systemctl restart nginx
    fi
    
    log_info "복구 시도 완료. 5초 후 재확인..."
    sleep 5
    
    # 재확인
    if netstat -tlnp | grep -q ":3010" && netstat -tlnp | grep -q ":3011"; then
        log_success "자동 복구 성공!"
        HEALTH_STATUS=0
    else
        log_error "자동 복구 실패"
    fi
fi

# 결과 출력
echo ""
echo "=== 헬스 체크 결과 ==="
if [ "$HEALTH_STATUS" -eq 0 ]; then
    log_success "시스템 상태 정상 ✅"
    exit 0
else
    log_error "시스템 상태 이상 ❌"
    echo ""
    echo "문제 해결 방법:"
    echo "1. 자동 복구 시도: $0 --auto-fix"
    echo "2. 수동 재시작: pm2 restart all"
    echo "3. 로그 확인: pm2 logs"
    echo "4. 시스템 재부팅: sudo reboot"
    exit 1
fi