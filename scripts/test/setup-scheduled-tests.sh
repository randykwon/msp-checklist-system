#!/bin/bash

# ============================================================================
# MSP Checklist System - 주기적 테스트 설정 스크립트
# 
# 사용법:
#   ./setup-scheduled-tests.sh              # 기본 설정 (매일 오전 6시)
#   ./setup-scheduled-tests.sh --hourly     # 매시간 테스트
#   ./setup-scheduled-tests.sh --disable    # 스케줄 비활성화
# ============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# 프로젝트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 기본 설정
SCHEDULE="daily"  # daily, hourly, custom
CRON_EXPR="0 6 * * *"  # 매일 오전 6시

# 옵션 파싱
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --hourly) SCHEDULE="hourly"; CRON_EXPR="0 * * * *" ;;
        --daily) SCHEDULE="daily"; CRON_EXPR="0 6 * * *" ;;
        --disable) SCHEDULE="disable" ;;
        --cron)
            SCHEDULE="custom"
            CRON_EXPR="$2"
            shift
            ;;
        -h|--help)
            echo "사용법: $0 [옵션]"
            echo ""
            echo "옵션:"
            echo "  --hourly      매시간 테스트"
            echo "  --daily       매일 오전 6시 테스트 (기본값)"
            echo "  --cron EXPR   커스텀 cron 표현식"
            echo "  --disable     스케줄 비활성화"
            echo "  -h, --help    도움말"
            echo ""
            echo "예시:"
            echo "  $0 --daily"
            echo "  $0 --cron '0 */4 * * *'  # 4시간마다"
            exit 0
            ;;
        *) log_error "알 수 없는 옵션: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        MSP Checklist - 주기적 테스트 설정                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 테스트 결과 저장 디렉토리 생성
TEST_RESULTS_DIR="$PROJECT_DIR/test-results"
mkdir -p "$TEST_RESULTS_DIR"

# 테스트 실행 래퍼 스크립트 생성
WRAPPER_SCRIPT="$PROJECT_DIR/scripts/test/run-scheduled-test.sh"
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash

# 주기적 테스트 실행 래퍼 스크립트
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_DIR/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$TEST_RESULTS_DIR/test_$TIMESTAMP.log"

# NVM 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 테스트 실행
cd "$PROJECT_DIR"
echo "=== MSP Checklist 테스트 시작: $(date) ===" > "$LOG_FILE"

# Bash 테스트 실행
"$SCRIPT_DIR/run-all-tests.sh" --quick --report >> "$LOG_FILE" 2>&1
BASH_EXIT=$?

# Node.js 테스트 실행
node "$SCRIPT_DIR/api-tests.js" --quick >> "$LOG_FILE" 2>&1
NODE_EXIT=$?

echo "" >> "$LOG_FILE"
echo "=== 테스트 완료: $(date) ===" >> "$LOG_FILE"
echo "Bash 테스트 종료 코드: $BASH_EXIT" >> "$LOG_FILE"
echo "Node 테스트 종료 코드: $NODE_EXIT" >> "$LOG_FILE"

# 실패 시 알림 (선택적)
if [ $BASH_EXIT -ne 0 ] || [ $NODE_EXIT -ne 0 ]; then
    echo "[ALERT] 테스트 실패 감지됨" >> "$LOG_FILE"
    
    # 이메일 알림 (mailx가 설치된 경우)
    if command -v mail &> /dev/null && [ -n "$ALERT_EMAIL" ]; then
        echo "MSP Checklist 테스트 실패. 로그: $LOG_FILE" | mail -s "[ALERT] MSP Test Failed" "$ALERT_EMAIL"
    fi
fi

# 오래된 로그 정리 (30일 이상)
find "$TEST_RESULTS_DIR" -name "test_*.log" -mtime +30 -delete 2>/dev/null
find "$TEST_RESULTS_DIR" -name "test-report-*.html" -mtime +30 -delete 2>/dev/null

exit $((BASH_EXIT + NODE_EXIT))
EOF
chmod +x "$WRAPPER_SCRIPT"
log_success "테스트 래퍼 스크립트 생성됨"

# cron 작업 설정
CRON_COMMENT="# MSP Checklist 자동 테스트"
CRON_JOB="$CRON_EXPR $WRAPPER_SCRIPT"

if [ "$SCHEDULE" = "disable" ]; then
    # 기존 cron 작업 제거
    (crontab -l 2>/dev/null | grep -v "MSP Checklist 자동 테스트" | grep -v "run-scheduled-test.sh") | crontab -
    log_success "주기적 테스트 비활성화됨"
else
    # 기존 작업 제거 후 새 작업 추가
    (crontab -l 2>/dev/null | grep -v "MSP Checklist 자동 테스트" | grep -v "run-scheduled-test.sh"; echo "$CRON_COMMENT"; echo "$CRON_JOB") | crontab -
    log_success "주기적 테스트 설정됨"
    log_info "스케줄: $CRON_EXPR"
    
    case "$SCHEDULE" in
        hourly) log_info "매시간 정각에 테스트 실행" ;;
        daily) log_info "매일 오전 6시에 테스트 실행" ;;
        custom) log_info "커스텀 스케줄로 테스트 실행" ;;
    esac
fi

# 현재 cron 작업 표시
echo ""
log_info "현재 cron 작업:"
crontab -l 2>/dev/null | grep -A1 "MSP Checklist" || echo "  (없음)"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo "설정 완료!"
echo ""
echo "테스트 결과 저장 위치: $TEST_RESULTS_DIR"
echo ""
echo "수동 테스트 실행:"
echo "  $PROJECT_DIR/scripts/test/run-all-tests.sh"
echo "  node $PROJECT_DIR/scripts/test/api-tests.js"
echo ""
echo "테스트 결과 확인:"
echo "  ls -la $TEST_RESULTS_DIR"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
