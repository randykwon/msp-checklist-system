#!/bin/bash

# MSP Checklist 시스템 백업 스크립트 (Amazon Linux 2023)
# 데이터베이스, 설정 파일, 로그를 백업합니다.

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

# 설정
APP_DIR="/opt/msp-checklist"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="msp_backup_$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# S3 백업 설정 (선택사항)
S3_BUCKET=""
S3_PREFIX="msp-checklist-backups"

echo "=== MSP Checklist 시스템 백업 ==="
echo "시간: $(date)"
echo "백업 경로: $BACKUP_PATH"
echo ""

# 백업 디렉토리 생성
log_info "백업 디렉토리 생성 중..."
mkdir -p "$BACKUP_PATH"

# 1. 데이터베이스 백업
log_info "1. 데이터베이스 백업 중..."
mkdir -p "$BACKUP_PATH/databases"

# 메인 앱 데이터베이스
if [ -f "$APP_DIR/msp-checklist/msp-assessment.db" ]; then
    cp "$APP_DIR/msp-checklist/msp-assessment.db" "$BACKUP_PATH/databases/"
    log_success "메인 앱 데이터베이스 백업 완료"
fi

if [ -f "$APP_DIR/msp-checklist/advice-cache.db" ]; then
    cp "$APP_DIR/msp-checklist/advice-cache.db" "$BACKUP_PATH/databases/"
    log_success "조언 캐시 데이터베이스 백업 완료"
fi

if [ -f "$APP_DIR/msp-checklist/virtual-evidence-cache.db" ]; then
    cp "$APP_DIR/msp-checklist/virtual-evidence-cache.db" "$BACKUP_PATH/databases/"
    log_success "가상 증빙 캐시 데이터베이스 백업 완료"
fi

# 관리자 앱 데이터베이스
if [ -f "$APP_DIR/msp-checklist/admin/msp-assessment.db" ]; then
    cp "$APP_DIR/msp-checklist/admin/msp-assessment.db" "$BACKUP_PATH/databases/admin_msp-assessment.db"
    log_success "관리자 앱 데이터베이스 백업 완료"
fi

# 2. 설정 파일 백업
log_info "2. 설정 파일 백업 중..."
mkdir -p "$BACKUP_PATH/config"

# 환경 변수 파일
if [ -f "$APP_DIR/msp-checklist/.env.local" ]; then
    cp "$APP_DIR/msp-checklist/.env.local" "$BACKUP_PATH/config/"
    log_success "메인 앱 환경 변수 백업 완료"
fi

if [ -f "$APP_DIR/msp-checklist/admin/.env.local" ]; then
    cp "$APP_DIR/msp-checklist/admin/.env.local" "$BACKUP_PATH/config/admin_.env.local"
    log_success "관리자 앱 환경 변수 백업 완료"
fi

# PM2 설정
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    cp "$APP_DIR/ecosystem.config.js" "$BACKUP_PATH/config/"
    log_success "PM2 설정 백업 완료"
fi

# Nginx 설정
if [ -f "/etc/nginx/conf.d/msp-checklist.conf" ]; then
    sudo cp "/etc/nginx/conf.d/msp-checklist.conf" "$BACKUP_PATH/config/"
    sudo chown $USER:$USER "$BACKUP_PATH/config/msp-checklist.conf"
    log_success "Nginx 설정 백업 완료"
fi

# 3. 로그 백업
log_info "3. 로그 백업 중..."
mkdir -p "$BACKUP_PATH/logs"

# PM2 로그
if [ -d "$APP_DIR/logs" ]; then
    cp -r "$APP_DIR/logs"/* "$BACKUP_PATH/logs/" 2>/dev/null || true
    log_success "PM2 로그 백업 완료"
fi

# 시스템 로그 (최근 1000줄)
if [ -f "/var/log/nginx/access.log" ]; then
    sudo tail -n 1000 /var/log/nginx/access.log > "$BACKUP_PATH/logs/nginx_access.log" 2>/dev/null || true
fi

if [ -f "/var/log/nginx/error.log" ]; then
    sudo tail -n 1000 /var/log/nginx/error.log > "$BACKUP_PATH/logs/nginx_error.log" 2>/dev/null || true
fi

# 4. 업로드된 파일 백업 (있는 경우)
log_info "4. 업로드된 파일 백업 중..."
if [ -d "$APP_DIR/msp-checklist/uploads" ]; then
    cp -r "$APP_DIR/msp-checklist/uploads" "$BACKUP_PATH/"
    log_success "업로드된 파일 백업 완료"
fi

# 5. 시스템 정보 백업
log_info "5. 시스템 정보 백업 중..."
mkdir -p "$BACKUP_PATH/system"

# 시스템 정보
{
    echo "=== 시스템 정보 ==="
    uname -a
    echo ""
    echo "=== OS 정보 ==="
    cat /etc/os-release
    echo ""
    echo "=== Node.js 버전 ==="
    node --version
    npm --version
    echo ""
    echo "=== PM2 상태 ==="
    pm2 status 2>/dev/null || echo "PM2 없음"
    echo ""
    echo "=== 메모리 사용량 ==="
    free -h
    echo ""
    echo "=== 디스크 사용량 ==="
    df -h
    echo ""
    echo "=== 네트워크 연결 ==="
    netstat -tlnp | grep :301 || echo "포트 3010, 3011 연결 없음"
} > "$BACKUP_PATH/system/system_info.txt"

# 패키지 정보
{
    echo "=== 설치된 패키지 (dnf) ==="
    dnf list installed 2>/dev/null || echo "dnf 정보 없음"
    echo ""
    echo "=== npm 전역 패키지 ==="
    npm list -g --depth=0 2>/dev/null || echo "npm 전역 패키지 없음"
} > "$BACKUP_PATH/system/packages.txt"

log_success "시스템 정보 백업 완료"

# 6. 백업 압축
log_info "6. 백업 압축 중..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log_success "백업 압축 완료: ${BACKUP_NAME}.tar.gz ($BACKUP_SIZE)"

# 7. S3 업로드 (선택사항)
if [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    log_info "7. S3 업로드 중..."
    
    if aws s3 cp "${BACKUP_NAME}.tar.gz" "s3://$S3_BUCKET/$S3_PREFIX/${BACKUP_NAME}.tar.gz"; then
        log_success "S3 업로드 완료: s3://$S3_BUCKET/$S3_PREFIX/${BACKUP_NAME}.tar.gz"
    else
        log_error "S3 업로드 실패"
    fi
fi

# 8. 오래된 백업 정리
log_info "8. 오래된 백업 정리 중..."

# 로컬 백업 정리 (30일 이상)
find "$BACKUP_DIR" -name "msp_backup_*.tar.gz" -type f -mtime +30 -delete 2>/dev/null || true

# S3 백업 정리 (90일 이상, 설정된 경우)
if [ ! -z "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    CUTOFF_DATE=$(date -d '90 days ago' +%Y%m%d)
    aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | while read -r line; do
        BACKUP_DATE=$(echo "$line" | grep -o 'msp_backup_[0-9]\{8\}_[0-9]\{6\}' | cut -d'_' -f3)
        if [ ! -z "$BACKUP_DATE" ] && [ "$BACKUP_DATE" -lt "$CUTOFF_DATE" ]; then
            BACKUP_FILE=$(echo "$line" | awk '{print $4}')
            aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE"
            log_info "오래된 S3 백업 삭제: $BACKUP_FILE"
        fi
    done 2>/dev/null || true
fi

log_success "오래된 백업 정리 완료"

# 9. 백업 검증
log_info "9. 백업 검증 중..."
if tar -tzf "${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
    log_success "백업 파일 무결성 확인 완료"
else
    log_error "백업 파일 손상됨"
    exit 1
fi

# 백업 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    백업 완료! 💾                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "MSP Checklist 시스템 백업이 완료되었습니다!"

echo ""
echo "백업 정보:"
echo "- 파일명: ${BACKUP_NAME}.tar.gz"
echo "- 크기: $BACKUP_SIZE"
echo "- 경로: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
if [ ! -z "$S3_BUCKET" ]; then
    echo "- S3: s3://$S3_BUCKET/$S3_PREFIX/${BACKUP_NAME}.tar.gz"
fi

echo ""
echo "백업 내용:"
echo "- 데이터베이스 파일"
echo "- 환경 변수 및 설정 파일"
echo "- PM2 및 Nginx 설정"
echo "- 애플리케이션 로그"
echo "- 업로드된 파일 (있는 경우)"
echo "- 시스템 정보"

echo ""
echo "복구 방법:"
echo "1. 백업 파일 압축 해제: tar -xzf ${BACKUP_NAME}.tar.gz"
echo "2. 데이터베이스 복구: cp databases/* /opt/msp-checklist/msp-checklist/"
echo "3. 설정 파일 복구: cp config/.env.local /opt/msp-checklist/msp-checklist/"
echo "4. 서비스 재시작: pm2 restart all"

echo ""
log_success "백업 작업이 성공적으로 완료되었습니다! 🎉"