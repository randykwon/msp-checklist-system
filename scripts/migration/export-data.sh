#!/bin/bash
# ============================================
# MSP 체크리스트 데이터 내보내기 스크립트
# 다른 서버로 마이그레이션을 위한 백업 생성
# ============================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 기본 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
APP_DIR="$PROJECT_ROOT/msp-checklist"
DB_PATH="$APP_DIR/msp-assessment.db"
BACKUP_DIR="$PROJECT_ROOT/migration_backup_$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}📦 MSP 데이터 내보내기${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# DB 파일 확인
if [ ! -f "$DB_PATH" ]; then
  echo -e "${RED}❌ 데이터베이스 파일을 찾을 수 없습니다: $DB_PATH${NC}"
  exit 1
fi

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"
echo -e "${BLUE}📁 백업 디렉토리: $BACKUP_DIR${NC}"
echo ""

# 1. 데이터베이스 복사
echo -e "${YELLOW}[1/7] 데이터베이스 복사 중...${NC}"
cp "$DB_PATH" "$BACKUP_DIR/msp-assessment.db"
echo -e "  ✅ msp-assessment.db"

# 캐시 DB 복사 (있으면)
[ -f "$APP_DIR/advice-cache.db" ] && cp "$APP_DIR/advice-cache.db" "$BACKUP_DIR/" && echo -e "  ✅ advice-cache.db"
[ -f "$APP_DIR/virtual-evidence-cache.db" ] && cp "$APP_DIR/virtual-evidence-cache.db" "$BACKUP_DIR/" && echo -e "  ✅ virtual-evidence-cache.db"

# 2. SQL 전체 덤프
echo -e "${YELLOW}[2/7] SQL 전체 덤프 생성 중...${NC}"
sqlite3 "$DB_PATH" .dump > "$BACKUP_DIR/full_dump.sql"
echo -e "  ✅ full_dump.sql ($(du -h "$BACKUP_DIR/full_dump.sql" | cut -f1))"

# 3. 테이블별 덤프
echo -e "${YELLOW}[3/7] 테이블별 덤프 생성 중...${NC}"
mkdir -p "$BACKUP_DIR/tables"

TABLES="users assessment_data checklist_versions system_settings announcements qa_questions evidence_evaluations user_activity_logs"
for table in $TABLES; do
  sqlite3 "$DB_PATH" ".dump $table" > "$BACKUP_DIR/tables/${table}.sql" 2>/dev/null || true
  if [ -s "$BACKUP_DIR/tables/${table}.sql" ]; then
    echo -e "  ✅ ${table}.sql"
  fi
done

# 4. 증빙 파일 복사
echo -e "${YELLOW}[4/7] 증빙 파일 복사 중...${NC}"
if [ -d "$APP_DIR/evidence-files" ]; then
  cp -r "$APP_DIR/evidence-files" "$BACKUP_DIR/"
  FILE_COUNT=$(find "$BACKUP_DIR/evidence-files" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  ✅ evidence-files/ ($FILE_COUNT 파일)"
else
  echo -e "  ⚠️  evidence-files 디렉토리 없음"
fi

# 5. 캐시 파일 복사
echo -e "${YELLOW}[5/7] 캐시 파일 복사 중...${NC}"
if [ -d "$APP_DIR/cache" ]; then
  cp -r "$APP_DIR/cache" "$BACKUP_DIR/"
  CACHE_SIZE=$(du -sh "$BACKUP_DIR/cache" 2>/dev/null | cut -f1)
  echo -e "  ✅ cache/ ($CACHE_SIZE)"
else
  echo -e "  ⚠️  cache 디렉토리 없음"
fi

# 6. 메타데이터 생성
echo -e "${YELLOW}[6/7] 메타데이터 생성 중...${NC}"
cat > "$BACKUP_DIR/metadata.json" << EOF
{
  "export_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_host": "$(hostname)",
  "db_version": "$(sqlite3 "$DB_PATH" "SELECT setting_value FROM system_settings WHERE setting_key='db_version'" 2>/dev/null || echo 'unknown')",
  "statistics": {
    "users": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users"),
    "assessment_data": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM assessment_data"),
    "checklist_versions": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM checklist_versions"),
    "advice_cache": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM advice_cache" 2>/dev/null || echo 0),
    "virtual_evidence_cache": $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM virtual_evidence_cache" 2>/dev/null || echo 0)
  }
}
EOF
echo -e "  ✅ metadata.json"

# 환경 설정 템플릿
cat > "$BACKUP_DIR/env.template" << 'EOF'
# ============================================
# MSP 체크리스트 환경 설정 템플릿
# 타겟 서버에서 .env.local로 복사 후 수정
# ============================================

# AWS Bedrock 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# LLM 설정
LLM_PROVIDER=bedrock
LLM_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# 앱 URL (프로덕션)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 관리자 앱 URL
NEXT_PUBLIC_ADMIN_URL=https://admin.your-domain.com
EOF
echo -e "  ✅ env.template"

# 7. 압축
echo -e "${YELLOW}[7/7] 압축 중...${NC}"
cd "$PROJECT_ROOT"
ARCHIVE_NAME="migration_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czvf "$ARCHIVE_NAME" "$(basename "$BACKUP_DIR")" > /dev/null 2>&1
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
echo -e "  ✅ $ARCHIVE_NAME ($ARCHIVE_SIZE)"

# 결과 출력
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 내보내기 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📁 백업 파일: $PROJECT_ROOT/$ARCHIVE_NAME${NC}"
echo ""
echo -e "${YELLOW}📊 백업 통계:${NC}"
sqlite3 "$DB_PATH" "SELECT '  👤 사용자: ' || COUNT(*) FROM users;"
sqlite3 "$DB_PATH" "SELECT '  📋 평가 데이터: ' || COUNT(*) FROM assessment_data;"
sqlite3 "$DB_PATH" "SELECT '  📁 체크리스트 버전: ' || COUNT(*) FROM checklist_versions;"
sqlite3 "$DB_PATH" "SELECT '  💡 조언 캐시: ' || COUNT(*) FROM advice_cache;" 2>/dev/null || echo "  💡 조언 캐시: 0"
echo ""
echo -e "${YELLOW}📤 타겟 서버로 전송:${NC}"
echo "  scp $PROJECT_ROOT/$ARCHIVE_NAME user@target-server:/path/to/"
echo ""
echo -e "${YELLOW}📥 타겟 서버에서 가져오기:${NC}"
echo "  ./scripts/migration/import-data.sh $ARCHIVE_NAME"
