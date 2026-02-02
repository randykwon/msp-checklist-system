 ㅇ#!/bin/bash
# ============================================
# MSP 체크리스트 데이터 가져오기 스크립트
# 다른 서버에서 마이그레이션된 데이터 복원
# ============================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 사용법 확인
if [ -z "$1" ]; then
  echo -e "${RED}사용법: $0 <백업파일.tar.gz>${NC}"
  echo ""
  echo "예시:"
  echo "  $0 migration_backup_20260202_120000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

# 파일 존재 확인
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ 백업 파일을 찾을 수 없습니다: $BACKUP_FILE${NC}"
  exit 1
fi

# 기본 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
APP_DIR="$PROJECT_ROOT/msp-checklist"
DB_PATH="$APP_DIR/msp-assessment.db"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}📦 MSP 데이터 가져오기${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📁 백업 파일: $BACKUP_FILE${NC}"
echo -e "${BLUE}📁 대상 경로: $APP_DIR${NC}"
echo ""

# 확인 프롬프트
echo -e "${YELLOW}⚠️  주의: 기존 데이터가 백업 후 덮어씌워집니다.${NC}"
read -p "계속하시겠습니까? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "취소되었습니다."
  exit 0
fi
echo ""

# 1. 압축 해제
echo -e "${YELLOW}[1/7] 압축 해제 중...${NC}"
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR")
echo -e "  ✅ 압축 해제 완료"

# 메타데이터 확인
if [ -f "$TEMP_DIR/$BACKUP_DIR/metadata.json" ]; then
  echo -e "${BLUE}📊 백업 정보:${NC}"
  cat "$TEMP_DIR/$BACKUP_DIR/metadata.json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"  📅 내보내기 날짜: {data.get('export_date', 'N/A')}\")
print(f\"  🖥️  소스 호스트: {data.get('source_host', 'N/A')}\")
stats = data.get('statistics', {})
print(f\"  👤 사용자: {stats.get('users', 0)}\")
print(f\"  📋 평가 데이터: {stats.get('assessment_data', 0)}\")
print(f\"  📁 버전: {stats.get('checklist_versions', 0)}\")
" 2>/dev/null || echo "  (메타데이터 파싱 실패)"
  echo ""
fi

# 2. 기존 DB 백업
echo -e "${YELLOW}[2/7] 기존 데이터 백업 중...${NC}"
if [ -f "$DB_PATH" ]; then
  OLD_BACKUP="$DB_PATH.old_$(date +%Y%m%d_%H%M%S)"
  cp "$DB_PATH" "$OLD_BACKUP"
  echo -e "  ✅ 기존 DB 백업: $(basename "$OLD_BACKUP")"
else
  echo -e "  ⚠️  기존 DB 없음 (새로 생성됨)"
fi

# 3. 새 DB 복사
echo -e "${YELLOW}[3/7] 새 데이터베이스 복사 중...${NC}"
cp "$TEMP_DIR/$BACKUP_DIR/msp-assessment.db" "$DB_PATH"
echo -e "  ✅ msp-assessment.db"

# 캐시 DB 복사
[ -f "$TEMP_DIR/$BACKUP_DIR/advice-cache.db" ] && cp "$TEMP_DIR/$BACKUP_DIR/advice-cache.db" "$APP_DIR/" && echo -e "  ✅ advice-cache.db"
[ -f "$TEMP_DIR/$BACKUP_DIR/virtual-evidence-cache.db" ] && cp "$TEMP_DIR/$BACKUP_DIR/virtual-evidence-cache.db" "$APP_DIR/" && echo -e "  ✅ virtual-evidence-cache.db"

# 4. 증빙 파일 복사
echo -e "${YELLOW}[4/7] 증빙 파일 복사 중...${NC}"
if [ -d "$TEMP_DIR/$BACKUP_DIR/evidence-files" ]; then
  mkdir -p "$APP_DIR/evidence-files"
  cp -r "$TEMP_DIR/$BACKUP_DIR/evidence-files/"* "$APP_DIR/evidence-files/" 2>/dev/null || true
  FILE_COUNT=$(find "$APP_DIR/evidence-files" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  ✅ evidence-files/ ($FILE_COUNT 파일)"
else
  echo -e "  ⚠️  증빙 파일 없음"
fi

# 5. 캐시 파일 복사
echo -e "${YELLOW}[5/7] 캐시 파일 복사 중...${NC}"
if [ -d "$TEMP_DIR/$BACKUP_DIR/cache" ]; then
  mkdir -p "$APP_DIR/cache"
  cp -r "$TEMP_DIR/$BACKUP_DIR/cache/"* "$APP_DIR/cache/" 2>/dev/null || true
  echo -e "  ✅ cache/"
else
  echo -e "  ⚠️  캐시 파일 없음"
fi

# 6. standalone 심볼릭 링크 설정
echo -e "${YELLOW}[6/7] standalone 심볼릭 링크 설정 중...${NC}"
STANDALONE_DB="$APP_DIR/.next/standalone/msp-assessment.db"
if [ -d "$APP_DIR/.next/standalone" ]; then
  rm -f "$STANDALONE_DB"
  ln -s "$DB_PATH" "$STANDALONE_DB"
  echo -e "  ✅ 심볼릭 링크 생성"
else
  echo -e "  ⚠️  standalone 디렉토리 없음 (빌드 후 다시 실행 필요)"
fi

# 7. 정리
echo -e "${YELLOW}[7/7] 임시 파일 정리 중...${NC}"
rm -rf "$TEMP_DIR"
echo -e "  ✅ 정리 완료"

# 결과 출력
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 가져오기 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📊 가져온 데이터 통계:${NC}"
sqlite3 "$DB_PATH" "SELECT '  👤 사용자: ' || COUNT(*) FROM users;"
sqlite3 "$DB_PATH" "SELECT '  📋 평가 데이터: ' || COUNT(*) FROM assessment_data;"
sqlite3 "$DB_PATH" "SELECT '  📁 체크리스트 버전: ' || COUNT(*) FROM checklist_versions;"
echo ""
echo -e "${YELLOW}⚠️  다음 단계:${NC}"
echo "  1. .env.local 파일 설정 (AWS 키, LLM 설정 등)"
echo "     템플릿: $TEMP_DIR/$BACKUP_DIR/env.template"
echo ""
echo "  2. 앱 빌드 및 서버 시작:"
echo "     cd $APP_DIR"
echo "     npm run build"
echo "     node server.js"
echo ""
echo "  3. 관리자 앱도 동일하게 빌드:"
echo "     cd $APP_DIR/admin"
echo "     npm run build"
echo ""
echo "  4. standalone 심볼릭 링크 재설정 (빌드 후):"
echo "     rm -f $APP_DIR/.next/standalone/msp-assessment.db"
echo "     ln -s $DB_PATH $APP_DIR/.next/standalone/msp-assessment.db"
