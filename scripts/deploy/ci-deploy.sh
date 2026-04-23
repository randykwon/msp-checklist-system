#!/bin/bash
# =============================================================================
# MSP Checklist - CI/CD 자동 배포 스크립트
# GitHub Actions (SSH/SSM) 에서 호출되는 배포 스크립트
#
# 사용법: ./ci-deploy.sh [옵션]
#   --main-only    메인 앱만 빌드/배포
#   --admin-only   Admin 앱만 빌드/배포
#   --skip-build   빌드 건너뛰기 (서비스 재시작만)
#   --s3-backup    S3에 DB 백업 (버킷 설정 필요)
# =============================================================================

set -e

# 설정 - EC2 환경에 맞게 수정
PROJECT_DIR="${MSP_PROJECT_DIR:-/opt/msp-checklist-system}"
MSP_DIR="$PROJECT_DIR/msp-checklist"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d_%H%M%S).log"
MAX_BACKUPS=5
S3_BUCKET="${MSP_S3_BACKUP_BUCKET:-}"

# 옵션
MAIN_ONLY=false
ADMIN_ONLY=false
SKIP_BUILD=false
S3_BACKUP=false

for arg in "$@"; do
  case $arg in
    --main-only)  MAIN_ONLY=true ;;
    --admin-only) ADMIN_ONLY=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --s3-backup)  S3_BACKUP=true ;;
  esac
done

# 색상 (CI 환경 호환)
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; CYAN=''; NC=''
fi

log() { echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE" 2>/dev/null || echo -e "[$(date '+%H:%M:%S')] $1"; }

# NVM 로드
load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  
  if command -v nvm &>/dev/null; then
    nvm use 20 2>/dev/null || nvm use default 2>/dev/null || true
  fi
  
  if ! command -v node &>/dev/null; then
    log "${RED}✗${NC} Node.js를 찾을 수 없습니다"
    exit 1
  fi
  
  log "${GREEN}✓${NC} Node $(node -v), npm $(npm -v)"
}

# DB 백업 (로컬)
backup_db() {
  log "📦 DB 백업 중..."
  mkdir -p "$BACKUP_DIR"
  
  local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  local BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
  mkdir -p "$BACKUP_PATH"

  local BACKED=0
  for db in msp-assessment.db advice-cache.db virtual-evidence-cache.db; do
    if [ -f "$MSP_DIR/$db" ]; then
      cp "$MSP_DIR/$db" "$BACKUP_PATH/"
      BACKED=$((BACKED+1))
    fi
  done

  # 오래된 백업 정리
  ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null | tail -n +$((MAX_BACKUPS+1)) | xargs rm -rf 2>/dev/null || true
  
  log "${GREEN}✓${NC} 로컬 백업 완료 (${BACKED}개 DB → $BACKUP_PATH)"
  
  # S3 백업 (선택)
  if [ "$S3_BACKUP" = true ] && [ -n "$S3_BUCKET" ]; then
    log "☁️  S3 백업 중... (s3://$S3_BUCKET)"
    aws s3 cp "$BACKUP_PATH/" "s3://$S3_BUCKET/db-backups/$TIMESTAMP/" \
      --recursive --quiet 2>/dev/null && \
      log "${GREEN}✓${NC} S3 백업 완료" || \
      log "${YELLOW}!${NC} S3 백업 건너뜀 (설정 확인 필요)"
  fi
  
  echo "$BACKUP_PATH"
}

# 코드 업데이트
pull_code() {
  log "📥 코드 업데이트 중..."
  cd "$PROJECT_DIR"
  
  local BEFORE=$(git rev-parse --short HEAD)
  local BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  
  # 로컬 변경사항 stash
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git stash push -m "ci-deploy-$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
  fi
  
  git fetch origin --quiet
  git reset --hard "origin/$BRANCH"
  
  local AFTER=$(git rev-parse --short HEAD)
  local MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null)
  
  # 스크립트 실행 권한 복원
  find scripts -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
  
  log "${GREEN}✓${NC} $BEFORE → $AFTER ($MSG)"
}

# 빌드
build_apps() {
  if [ "$SKIP_BUILD" = true ]; then
    log "${YELLOW}!${NC} 빌드 건너뛰기 (--skip-build)"
    return 0
  fi
  
  log "🔨 빌드 시작..."
  export NODE_OPTIONS="--max-old-space-size=2048"
  export NEXT_TELEMETRY_DISABLED=1

  # 1. Shared 패키지 (항상 빌드)
  log "  [1/3] Shared 패키지..."
  cd "$MSP_DIR/packages/shared"
  npm install --prefer-offline --no-audit --no-fund 2>/dev/null || npm install
  npm run build
  log "${GREEN}  ✓${NC} Shared 빌드 완료"

  # 2. 메인 앱
  if [ "$ADMIN_ONLY" != true ]; then
    log "  [2/3] 메인 앱..."
    cd "$MSP_DIR"
    npm install --prefer-offline --no-audit --no-fund 2>/dev/null || npm install
    npm run build
    log "${GREEN}  ✓${NC} 메인 앱 빌드 완료"
  else
    log "${YELLOW}  [2/3] 메인 앱 건너뛰기${NC}"
  fi

  # 3. Admin 앱
  if [ "$MAIN_ONLY" != true ]; then
    log "  [3/3] Admin 앱..."
    cd "$MSP_DIR/admin"
    npm install --prefer-offline --no-audit --no-fund 2>/dev/null || npm install
    npm run build
    log "${GREEN}  ✓${NC} Admin 앱 빌드 완료"
  else
    log "${YELLOW}  [3/3] Admin 앱 건너뛰기${NC}"
  fi

  log "${GREEN}✓${NC} 전체 빌드 완료"
}

# 서비스 재시작
restart_services() {
  log "🚀 서비스 재시작..."
  
  if command -v pm2 &>/dev/null; then
    # PM2 reload (graceful restart, 무중단)
    if [ "$MAIN_ONLY" = true ]; then
      pm2 reload msp-main --update-env 2>/dev/null || pm2 restart msp-main 2>/dev/null || true
    elif [ "$ADMIN_ONLY" = true ]; then
      pm2 reload msp-admin --update-env 2>/dev/null || pm2 restart msp-admin 2>/dev/null || true
    else
      pm2 reload all --update-env 2>/dev/null || pm2 restart all 2>/dev/null || true
    fi
    pm2 save --force 2>/dev/null || true
    log "${GREEN}✓${NC} PM2 reload 완료"
  else
    # PM2 없으면 스크립트로 재시작
    cd "$PROJECT_DIR"
    if [ -f "scripts/server-all.sh" ]; then
      bash scripts/server-all.sh restart
    else
      log "${RED}✗${NC} PM2도 서버 스크립트도 없습니다"
      return 1
    fi
    log "${GREEN}✓${NC} 서비스 재시작 완료"
  fi
}

# 헬스 체크
health_check() {
  log "🏥 헬스 체크..."
  local MAX_RETRY=15
  local RETRY=0
  local CHECK_MAIN=true
  local CHECK_ADMIN=true
  
  [ "$ADMIN_ONLY" = true ] && CHECK_MAIN=false
  [ "$MAIN_ONLY" = true ] && CHECK_ADMIN=false

  while [ $RETRY -lt $MAX_RETRY ]; do
    local MAIN_OK=true
    local ADMIN_OK=true
    
    if [ "$CHECK_MAIN" = true ]; then
      local MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3010 2>/dev/null || echo "000")
      [[ "$MAIN_STATUS" =~ ^(200|302|304)$ ]] || MAIN_OK=false
    fi
    
    if [ "$CHECK_ADMIN" = true ]; then
      local ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3011 2>/dev/null || echo "000")
      [[ "$ADMIN_STATUS" =~ ^(200|302|304)$ ]] || ADMIN_OK=false
    fi

    if [ "$MAIN_OK" = true ] && [ "$ADMIN_OK" = true ]; then
      local MSG=""
      [ "$CHECK_MAIN" = true ] && MSG="메인($MAIN_STATUS)"
      [ "$CHECK_ADMIN" = true ] && MSG="$MSG Admin($ADMIN_STATUS)"
      log "${GREEN}✓${NC} 헬스 체크 통과: $MSG"
      return 0
    fi

    RETRY=$((RETRY+1))
    local STATUS_MSG=""
    [ "$CHECK_MAIN" = true ] && STATUS_MSG="메인=$MAIN_STATUS"
    [ "$CHECK_ADMIN" = true ] && STATUS_MSG="$STATUS_MSG Admin=$ADMIN_STATUS"
    log "${YELLOW}⏳${NC} 대기 중... ($RETRY/$MAX_RETRY) $STATUS_MSG"
    sleep 4
  done

  log "${RED}✗${NC} 헬스 체크 실패 (${MAX_RETRY}회 시도)"
  return 1
}

# 롤백
rollback() {
  log "${RED}⚠️  롤백 시작...${NC}"
  
  # DB 복원
  local LATEST_BACKUP=$(ls -dt "$BACKUP_DIR"/backup_* 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ] && [ -d "$LATEST_BACKUP" ]; then
    for db in msp-assessment.db advice-cache.db virtual-evidence-cache.db; do
      [ -f "$LATEST_BACKUP/$db" ] && cp "$LATEST_BACKUP/$db" "$MSP_DIR/"
    done
    log "  DB 복원: $LATEST_BACKUP"
  fi
  
  # 코드 롤백 (이전 커밋)
  cd "$PROJECT_DIR"
  git reset --hard HEAD~1 2>/dev/null || true
  
  # 서비스 재시작
  restart_services
  
  log "${YELLOW}롤백 완료${NC}"
}

# 배포 정보 출력
print_deploy_info() {
  cd "$PROJECT_DIR"
  local COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  local MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
  local BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
  
  log "───────────────────────────────────"
  log "  브랜치: $BRANCH"
  log "  커밋:   $COMMIT - $MSG"
  log "  시간:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
  log "  옵션:   main_only=$MAIN_ONLY admin_only=$ADMIN_ONLY skip_build=$SKIP_BUILD"
  log "───────────────────────────────────"
}

# 메인 실행
main() {
  mkdir -p "$LOG_DIR" 2>/dev/null || true
  
  log "═══════════════════════════════════════"
  log "🚀 MSP Checklist 자동 배포 시작"
  log "═══════════════════════════════════════"

  load_nvm
  
  local BACKUP_PATH=$(backup_db)
  
  pull_code
  print_deploy_info
  build_apps
  restart_services

  if health_check; then
    log "═══════════════════════════════════════"
    log "${GREEN}✅ 배포 성공!${NC}"
    log "═══════════════════════════════════════"
    exit 0
  else
    log "${RED}❌ 헬스 체크 실패 → 롤백 진행${NC}"
    rollback
    log "═══════════════════════════════════════"
    log "${RED}❌ 배포 실패 (롤백 완료)${NC}"
    log "═══════════════════════════════════════"
    exit 1
  fi
}

main "$@"
