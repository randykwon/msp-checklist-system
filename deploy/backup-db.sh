#!/bin/bash

# MSP Checklist 데이터베이스 백업 스크립트

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

APP_DIR="/opt/msp-checklist"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

echo "💾 MSP Checklist 데이터베이스 백업을 시작합니다..."

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# 애플리케이션 디렉토리 확인
if [ ! -d "$APP_DIR" ]; then
    log_error "애플리케이션 디렉토리가 존재하지 않습니다: $APP_DIR"
    exit 1
fi

cd $APP_DIR

# 메인 데이터베이스 백업
if [ -f "msp-checklist/msp-assessment.db" ]; then
    log_info "메인 데이터베이스 백업 중..."
    cp msp-checklist/msp-assessment.db $BACKUP_DIR/msp-assessment_$DATE.db
    
    # 압축
    gzip $BACKUP_DIR/msp-assessment_$DATE.db
    log_success "메인 DB 백업 완료: msp-assessment_$DATE.db.gz"
else
    log_warning "메인 데이터베이스 파일을 찾을 수 없습니다."
fi

# 관리자 데이터베이스 백업
if [ -f "msp-checklist/admin/msp-assessment.db" ]; then
    log_info "관리자 데이터베이스 백업 중..."
    cp msp-checklist/admin/msp-assessment.db $BACKUP_DIR/admin-msp-assessment_$DATE.db
    
    # 압축
    gzip $BACKUP_DIR/admin-msp-assessment_$DATE.db
    log_success "관리자 DB 백업 완료: admin-msp-assessment_$DATE.db.gz"
else
    log_warning "관리자 데이터베이스 파일을 찾을 수 없습니다."
fi

# 캐시 데이터베이스 백업
if [ -f "msp-checklist/advice-cache.db" ]; then
    log_info "조언 캐시 데이터베이스 백업 중..."
    cp msp-checklist/advice-cache.db $BACKUP_DIR/advice-cache_$DATE.db
    gzip $BACKUP_DIR/advice-cache_$DATE.db
    log_success "조언 캐시 DB 백업 완료: advice-cache_$DATE.db.gz"
fi

if [ -f "msp-checklist/virtual-evidence-cache.db" ]; then
    log_info "가상 증빙 캐시 데이터베이스 백업 중..."
    cp msp-checklist/virtual-evidence-cache.db $BACKUP_DIR/virtual-evidence-cache_$DATE.db
    gzip $BACKUP_DIR/virtual-evidence-cache_$DATE.db
    log_success "가상 증빙 캐시 DB 백업 완료: virtual-evidence-cache_$DATE.db.gz"
fi

# 설정 파일 백업
log_info "설정 파일 백업 중..."
CONFIG_BACKUP_DIR="$BACKUP_DIR/config_$DATE"
mkdir -p $CONFIG_BACKUP_DIR

if [ -f "msp-checklist/.env.local" ]; then
    cp msp-checklist/.env.local $CONFIG_BACKUP_DIR/main.env.local
fi

if [ -f "msp-checklist/admin/.env.local" ]; then
    cp msp-checklist/admin/.env.local $CONFIG_BACKUP_DIR/admin.env.local
fi

if [ -f "ecosystem.config.js" ]; then
    cp ecosystem.config.js $CONFIG_BACKUP_DIR/ecosystem.config.js
fi

# 설정 백업 압축
if [ -d "$CONFIG_BACKUP_DIR" ]; then
    tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C $BACKUP_DIR config_$DATE
    rm -rf $CONFIG_BACKUP_DIR
    log_success "설정 파일 백업 완료: config_$DATE.tar.gz"
fi

# 오래된 백업 파일 정리
log_info "오래된 백업 파일 정리 중... (${RETENTION_DAYS}일 이상)"
find $BACKUP_DIR -name "*.db.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 백업 파일 목록 표시
log_info "현재 백업 파일 목록:"
ls -lah $BACKUP_DIR | grep $DATE

# 백업 크기 확인
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log_info "전체 백업 크기: $BACKUP_SIZE"

# S3 업로드 (선택사항)
if command -v aws &> /dev/null && [ ! -z "$AWS_S3_BACKUP_BUCKET" ]; then
    log_info "S3에 백업 업로드 중..."
    aws s3 sync $BACKUP_DIR s3://$AWS_S3_BACKUP_BUCKET/msp-checklist-backups/ --exclude "*" --include "*$DATE*"
    log_success "S3 백업 업로드 완료"
fi

log_success "백업이 완료되었습니다! 💾"

# 백업 검증
log_info "백업 파일 검증 중..."
for file in $BACKUP_DIR/*$DATE*.gz; do
    if [ -f "$file" ]; then
        if gzip -t "$file"; then
            log_success "$(basename $file) - 검증 성공"
        else
            log_error "$(basename $file) - 검증 실패"
        fi
    fi
done

echo ""
echo "백업 정보:"
echo "- 백업 시간: $DATE"
echo "- 백업 위치: $BACKUP_DIR"
echo "- 보관 기간: ${RETENTION_DAYS}일"
echo ""

log_success "백업 작업 완료! 🎉"