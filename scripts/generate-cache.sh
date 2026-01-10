#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 캐시 및 요약 일괄 생성 스크립트
# 
# 사용법:
#   ./scripts/generate-cache.sh [옵션]
#
# 옵션:
#   --all           모든 캐시 및 요약 생성 (기본값)
#   --advice        조언 캐시만 생성
#   --evidence      가상증빙 캐시만 생성
#   --summary       요약만 생성
#   --lang ko       한국어만 (기본값: ko,en 둘 다)
#   --lang en       영어만
#   --host URL      Admin 서버 URL (기본값: http://localhost:3011)
#   --main-host URL 메인 서버 URL (기본값: http://localhost:3010)
#
# 예시:
#   ./scripts/generate-cache.sh --all
#   ./scripts/generate-cache.sh --advice --lang ko
#   ./scripts/generate-cache.sh --host http://your-server:3011
#
# 참고:
#   - 캐시 생성은 메인 앱(3010)으로 직접 요청
#   - 요약 생성은 Admin 앱(3011)으로 요청
#   - 캐시 생성 후 요약 생성 순서로 진행
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 기본 설정
ADMIN_HOST="${ADMIN_HOST:-http://localhost:3011}"
MAIN_HOST="${MAIN_HOST:-http://localhost:3010}"
LANGUAGES="ko,en"
GENERATE_ADVICE=false
GENERATE_EVIDENCE=false
GENERATE_SUMMARY=false
GENERATE_ALL=true

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 옵션 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            GENERATE_ALL=true
            shift
            ;;
        --advice)
            GENERATE_ADVICE=true
            GENERATE_ALL=false
            shift
            ;;
        --evidence)
            GENERATE_EVIDENCE=true
            GENERATE_ALL=false
            shift
            ;;
        --summary)
            GENERATE_SUMMARY=true
            GENERATE_ALL=false
            shift
            ;;
        --lang)
            LANGUAGES="$2"
            shift 2
            ;;
        --host)
            ADMIN_HOST="$2"
            shift 2
            ;;
        --main-host)
            MAIN_HOST="$2"
            shift 2
            ;;
        -h|--help)
            head -30 "$0" | tail -28
            exit 0
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            echo "도움말: $0 --help"
            exit 1
            ;;
    esac
done

# --all이면 모두 활성화
if [ "$GENERATE_ALL" = true ]; then
    GENERATE_ADVICE=true
    GENERATE_EVIDENCE=true
    GENERATE_SUMMARY=true
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       MSP 어드바이저 - 캐시 및 요약 일괄 생성                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  메인 서버:  $MAIN_HOST"
echo "  Admin 서버: $ADMIN_HOST"
echo "  언어: $LANGUAGES"
echo "  생성 항목:"
[ "$GENERATE_ADVICE" = true ] && echo "    - 조언 캐시"
[ "$GENERATE_EVIDENCE" = true ] && echo "    - 가상증빙 캐시"
[ "$GENERATE_SUMMARY" = true ] && echo "    - 요약 (조언 + 가상증빙)"
echo ""

# 서버 연결 확인
log_step "서버 연결 확인 중..."

# 메인 서버 확인
MAIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$MAIN_HOST" 2>/dev/null || echo "000")
if [ "$MAIN_STATUS" = "000" ]; then
    log_error "메인 서버에 연결할 수 없습니다: $MAIN_HOST"
    log_info "서버가 실행 중인지 확인하세요: pm2 status"
    exit 1
fi
log_success "메인 서버 연결 확인 (HTTP $MAIN_STATUS)"

# Admin 서버 확인 (요약 생성 시에만 필요)
if [ "$GENERATE_SUMMARY" = true ]; then
    ADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN_HOST" 2>/dev/null || echo "000")
    if [ "$ADMIN_STATUS" = "000" ]; then
        log_error "Admin 서버에 연결할 수 없습니다: $ADMIN_HOST"
        log_info "서버가 실행 중인지 확인하세요: pm2 status"
        exit 1
    fi
    log_success "Admin 서버 연결 확인 (HTTP $ADMIN_STATUS)"
fi

# 조언 캐시 생성 (메인 앱으로 직접 요청)
generate_advice_cache() {
    log_step "조언 캐시 생성 중... (시간이 오래 걸릴 수 있습니다)"
    
    response=$(curl -s -X POST "$MAIN_HOST/api/advice-cache" \
        -H "Content-Type: application/json" \
        -d '{"action": "generate", "options": {"languages": ["ko", "en"]}}' \
        --max-time 1800)
    
    if echo "$response" | grep -q '"success":true'; then
        version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        total=$(echo "$response" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
        log_success "조언 캐시 생성 완료 (버전: $version, 항목: $total개)"
    else
        log_error "조언 캐시 생성 실패"
        log_warn "응답: $response"
        return 1
    fi
}

# 가상증빙 캐시 생성 (메인 앱으로 직접 요청)
generate_evidence_cache() {
    log_step "가상증빙 캐시 생성 중... (시간이 오래 걸릴 수 있습니다)"
    
    response=$(curl -s -X POST "$MAIN_HOST/api/virtual-evidence-cache" \
        -H "Content-Type: application/json" \
        -d '{"action": "generate", "options": {"languages": ["ko", "en"]}}' \
        --max-time 1800)
    
    if echo "$response" | grep -q '"success":true'; then
        version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        total=$(echo "$response" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
        log_success "가상증빙 캐시 생성 완료 (버전: $version, 항목: $total개)"
    else
        log_error "가상증빙 캐시 생성 실패"
        log_warn "응답: $response"
        return 1
    fi
}

# 조언 요약 생성 (Admin 앱으로 요청)
generate_advice_summary() {
    local lang=$1
    log_info "  조언 요약 생성 중 (${lang})..."
    
    response=$(curl -s -X POST "$ADMIN_HOST/api/advice-summary" \
        -H "Content-Type: application/json" \
        -d "{\"language\": \"$lang\"}" \
        --max-time 600)
    
    if echo "$response" | grep -q '"success":true'; then
        version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        success_count=$(echo "$response" | grep -o '"successCount":[0-9]*' | cut -d':' -f2)
        log_success "  조언 요약 생성 완료 (버전: $version, 성공: ${success_count}개)"
    else
        log_warn "  조언 요약 생성 오류: $response"
        return 1
    fi
}

# 가상증빙 요약 생성 (Admin 앱으로 요청)
generate_evidence_summary() {
    local lang=$1
    log_info "  가상증빙 요약 생성 중 (${lang})..."
    
    response=$(curl -s -X POST "$ADMIN_HOST/api/virtual-evidence-summary" \
        -H "Content-Type: application/json" \
        -d "{\"language\": \"$lang\"}" \
        --max-time 600)
    
    if echo "$response" | grep -q '"success":true'; then
        version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        success_count=$(echo "$response" | grep -o '"successCount":[0-9]*' | cut -d':' -f2)
        log_success "  가상증빙 요약 생성 완료 (버전: $version, 성공: ${success_count}개)"
    else
        log_warn "  가상증빙 요약 생성 오류: $response"
        return 1
    fi
}

# 캐시 생성 (언어 무관하게 한 번만 실행)
if [ "$GENERATE_ADVICE" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  1. 조언 캐시 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    generate_advice_cache || true
fi

if [ "$GENERATE_EVIDENCE" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  2. 가상증빙 캐시 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    generate_evidence_cache || true
fi

# 요약 생성 (언어별로 실행)
if [ "$GENERATE_SUMMARY" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  3. 요약 생성"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    IFS=',' read -ra LANG_ARRAY <<< "$LANGUAGES"
    for lang in "${LANG_ARRAY[@]}"; do
        lang=$(echo "$lang" | xargs)  # trim whitespace
        
        log_step "요약 생성 중 (${lang})..."
        generate_advice_summary "$lang" || true
        generate_evidence_summary "$lang" || true
    done
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}캐시 및 요약 생성 완료!${NC}                                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  캐시 상태 확인:"
echo "    Admin 캐시 페이지: $ADMIN_HOST/cache"
echo "    Admin 가상증빙 페이지: $ADMIN_HOST/virtual-evidence"
echo ""
echo "  캐시 버전 활성화:"
echo "    Admin 페이지에서 생성된 버전을 '활성화'해야 사용자에게 적용됩니다."
echo ""
