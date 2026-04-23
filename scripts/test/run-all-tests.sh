#!/bin/bash

# ============================================================================
# MSP Checklist System - 전체 기능 테스트 스크립트
# 
# 사용법:
#   ./run-all-tests.sh                    # 전체 테스트
#   ./run-all-tests.sh --quick            # 빠른 테스트 (API 키 필요 테스트 제외)
#   ./run-all-tests.sh --verbose          # 상세 출력
#   ./run-all-tests.sh --report           # HTML 리포트 생성
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 옵션
QUICK_MODE=false
VERBOSE=false
GENERATE_REPORT=false

# 기본 설정
MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"
BASE_URL="http://localhost:$MAIN_PORT"
ADMIN_URL="http://localhost:$ADMIN_PORT"

# 테스트 사용자 정보
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
TEST_NAME="테스트사용자"

# 결과 저장
RESULTS=()
START_TIME=$(date +%s)

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓ PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[✗ FAIL]${NC} $1"; }
log_skip() { echo -e "${YELLOW}[- SKIP]${NC} $1"; }
log_section() { 
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 테스트 결과 기록
record_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local duration="$4"
    
    RESULTS+=("$test_name|$status|$message|$duration")
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    case $status in
        "PASS") PASSED_TESTS=$((PASSED_TESTS + 1)); log_success "$test_name" ;;
        "FAIL") FAILED_TESTS=$((FAILED_TESTS + 1)); log_fail "$test_name: $message" ;;
        "SKIP") SKIPPED_TESTS=$((SKIPPED_TESTS + 1)); log_skip "$test_name: $message" ;;
    esac
}

# HTTP 요청 테스트
test_http() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local cookie="$6"
    
    local start=$(date +%s%N)
    local response
    local status_code
    
    if [ "$VERBOSE" = true ]; then
        log_info "Testing: $name ($method $url)"
    fi
    
    if [ -n "$cookie" ]; then
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\n%{http_code}" -b "$cookie" "$url" 2>/dev/null || echo "000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -b "$cookie" -d "$data" "$url" 2>/dev/null || echo "000")
        fi
    else
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo "000")
        fi
    fi
    
    status_code=$(echo "$response" | tail -n1)
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 ))
    
    if [ "$status_code" = "$expected_status" ]; then
        record_result "$name" "PASS" "" "${duration}ms"
        echo "$response" | head -n -1
        return 0
    else
        record_result "$name" "FAIL" "Expected $expected_status, got $status_code" "${duration}ms"
        return 1
    fi
}

# 옵션 파싱
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --quick) QUICK_MODE=true ;;
        --verbose) VERBOSE=true ;;
        --report) GENERATE_REPORT=true ;;
        -h|--help)
            echo "사용법: $0 [옵션]"
            echo ""
            echo "옵션:"
            echo "  --quick     빠른 테스트 (LLM API 테스트 제외)"
            echo "  --verbose   상세 출력"
            echo "  --report    HTML 리포트 생성"
            echo "  -h, --help  도움말"
            exit 0
            ;;
        *) echo "알 수 없는 옵션: $1"; exit 1 ;;
    esac
    shift
done

# 배너
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        MSP Checklist System - 전체 기능 테스트                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "테스트 시작: $(date '+%Y-%m-%d %H:%M:%S')"
echo "메인 앱: $BASE_URL"
echo "Admin 앱: $ADMIN_URL"
[ "$QUICK_MODE" = true ] && echo "모드: 빠른 테스트"
echo ""

# ============================================================================
# 1. 서버 상태 테스트
# ============================================================================
log_section "1. 서버 상태 테스트"

# 메인 서버 헬스체크
test_http "메인 서버 응답" "GET" "$BASE_URL" "" "200" || true

# Admin 서버 헬스체크
test_http "Admin 서버 응답" "GET" "$ADMIN_URL" "" "200" || true

# ============================================================================
# 2. 인증 API 테스트
# ============================================================================
log_section "2. 인증 API 테스트"

# 회원가입 테스트
REGISTER_RESPONSE=$(test_http "회원가입 API" "POST" "$BASE_URL/api/auth/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\",\"organization\":\"테스트조직\"}" \
    "200" || echo "{}")

# 로그인 테스트 (쿠키 저장)
LOGIN_RESPONSE=$(curl -s -c /tmp/test_cookies.txt -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$BASE_URL/api/auth/login" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
    record_result "로그인 API" "PASS" "" ""
    AUTH_COOKIE=$(cat /tmp/test_cookies.txt 2>/dev/null | grep msp_auth_token | awk '{print $NF}')
else
    record_result "로그인 API" "FAIL" "로그인 실패" ""
fi

# 현재 사용자 정보 조회
if [ -n "$AUTH_COOKIE" ]; then
    test_http "사용자 정보 조회 API" "GET" "$BASE_URL/api/auth/me" "" "200" "msp_auth_token=$AUTH_COOKIE" || true
else
    record_result "사용자 정보 조회 API" "SKIP" "인증 토큰 없음" ""
fi

# ============================================================================
# 3. 평가 데이터 API 테스트
# ============================================================================
log_section "3. 평가 데이터 API 테스트"

if [ -n "$AUTH_COOKIE" ]; then
    # Prerequisites 데이터 조회
    test_http "Prerequisites 데이터 조회" "GET" "$BASE_URL/api/assessment?type=prerequisites" "" "200" "msp_auth_token=$AUTH_COOKIE" || true
    
    # Technical 데이터 조회
    test_http "Technical 데이터 조회" "GET" "$BASE_URL/api/assessment?type=technical" "" "200" "msp_auth_token=$AUTH_COOKIE" || true
    
    # 평가 항목 저장
    test_http "평가 항목 저장" "POST" "$BASE_URL/api/assessment" \
        "{\"assessmentType\":\"prerequisites\",\"item\":{\"id\":\"BUS-001\",\"met\":true,\"partnerResponse\":\"테스트 응답\"}}" \
        "200" "msp_auth_token=$AUTH_COOKIE" || true
else
    record_result "Prerequisites 데이터 조회" "SKIP" "인증 필요" ""
    record_result "Technical 데이터 조회" "SKIP" "인증 필요" ""
    record_result "평가 항목 저장" "SKIP" "인증 필요" ""
fi

# ============================================================================
# 4. 조언 캐시 API 테스트
# ============================================================================
log_section "4. 조언 캐시 API 테스트"

# 조언 캐시 통계
test_http "조언 캐시 통계 조회" "GET" "$BASE_URL/api/advice-cache/stats" "" "200" || true

# 조언 캐시 버전 목록
test_http "조언 캐시 버전 목록" "GET" "$BASE_URL/api/cache-version" "" "200" || true

# ============================================================================
# 5. 가상증빙 API 테스트
# ============================================================================
log_section "5. 가상증빙 API 테스트"

# 가상증빙 캐시 통계
test_http "가상증빙 캐시 통계" "GET" "$BASE_URL/api/virtual-evidence-cache/stats" "" "200" || true

if [ "$QUICK_MODE" = false ]; then
    # 가상증빙 생성 테스트 (LLM 필요)
    test_http "가상증빙 생성 API" "POST" "$BASE_URL/api/virtual-evidence" \
        "{\"itemId\":\"BUS-001\",\"title\":\"테스트\",\"description\":\"테스트 설명\",\"evidenceRequired\":\"문서\",\"language\":\"ko\"}" \
        "200" || true
else
    record_result "가상증빙 생성 API" "SKIP" "빠른 모드" ""
fi

# ============================================================================
# 6. 공지사항 API 테스트
# ============================================================================
log_section "6. 공지사항 API 테스트"

# 활성 공지사항 조회
test_http "활성 공지사항 조회" "GET" "$BASE_URL/api/announcements" "" "200" || true

# ============================================================================
# 7. Q&A API 테스트
# ============================================================================
log_section "7. Q&A API 테스트"

if [ -n "$AUTH_COOKIE" ]; then
    # Q&A 목록 조회
    test_http "Q&A 목록 조회" "GET" "$BASE_URL/api/qa?itemId=BUS-001&assessmentType=prerequisites" "" "200" "msp_auth_token=$AUTH_COOKIE" || true
else
    record_result "Q&A 목록 조회" "SKIP" "인증 필요" ""
fi

# ============================================================================
# 8. Admin API 테스트
# ============================================================================
log_section "8. Admin API 테스트"

# Admin 로그인 (기존 admin 계정 사용)
ADMIN_LOGIN=$(curl -s -c /tmp/admin_cookies.txt -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}' \
    "$ADMIN_URL/api/auth/login" 2>/dev/null)

if echo "$ADMIN_LOGIN" | grep -q "success\|token"; then
    record_result "Admin 로그인" "PASS" "" ""
    ADMIN_COOKIE=$(cat /tmp/admin_cookies.txt 2>/dev/null | grep admin_auth_token | awk '{print $NF}')
    
    if [ -n "$ADMIN_COOKIE" ]; then
        # Admin 통계 조회
        test_http "Admin 통계 조회" "GET" "$ADMIN_URL/api/admin/stats" "" "200" "admin_auth_token=$ADMIN_COOKIE" || true
        
        # 사용자 목록 조회
        test_http "사용자 목록 조회" "GET" "$ADMIN_URL/api/users" "" "200" "admin_auth_token=$ADMIN_COOKIE" || true
        
        # 시스템 설정 조회
        test_http "시스템 설정 조회" "GET" "$ADMIN_URL/api/system/settings" "" "200" "admin_auth_token=$ADMIN_COOKIE" || true
    fi
else
    record_result "Admin 로그인" "SKIP" "Admin 계정 없음 또는 비밀번호 불일치" ""
    record_result "Admin 통계 조회" "SKIP" "Admin 인증 필요" ""
    record_result "사용자 목록 조회" "SKIP" "Admin 인증 필요" ""
    record_result "시스템 설정 조회" "SKIP" "Admin 인증 필요" ""
fi

# ============================================================================
# 9. 데이터베이스 연결 테스트
# ============================================================================
log_section "9. 데이터베이스 테스트"

# 프로젝트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 메인 DB 파일 확인
if [ -f "$PROJECT_DIR/msp-checklist/msp-assessment.db" ]; then
    record_result "메인 DB 파일 존재" "PASS" "" ""
else
    record_result "메인 DB 파일 존재" "FAIL" "파일 없음" ""
fi

# 조언 캐시 DB 파일 확인
if [ -f "$PROJECT_DIR/msp-checklist/advice-cache.db" ]; then
    record_result "조언 캐시 DB 파일 존재" "PASS" "" ""
else
    record_result "조언 캐시 DB 파일 존재" "SKIP" "캐시 미생성" ""
fi

# 가상증빙 캐시 DB 파일 확인
if [ -f "$PROJECT_DIR/msp-checklist/virtual-evidence-cache.db" ]; then
    record_result "가상증빙 캐시 DB 파일 존재" "PASS" "" ""
else
    record_result "가상증빙 캐시 DB 파일 존재" "SKIP" "캐시 미생성" ""
fi

# ============================================================================
# 10. 정적 파일 테스트
# ============================================================================
log_section "10. 정적 파일 테스트"

# 메인 페이지 로드
test_http "메인 페이지 로드" "GET" "$BASE_URL/" "" "200" || true

# 로그인 페이지 로드
test_http "로그인 페이지 로드" "GET" "$BASE_URL/login" "" "200" || true

# Admin 로그인 페이지 로드
test_http "Admin 로그인 페이지 로드" "GET" "$ADMIN_URL/login" "" "200" || true

# ============================================================================
# 테스트 정리
# ============================================================================
log_section "테스트 정리"

# 테스트 사용자 삭제 (Admin 권한 필요)
if [ -n "$ADMIN_COOKIE" ]; then
    # 테스트 사용자 ID 찾기
    USERS_LIST=$(curl -s -b "admin_auth_token=$ADMIN_COOKIE" "$ADMIN_URL/api/users" 2>/dev/null)
    TEST_USER_ID=$(echo "$USERS_LIST" | grep -o "\"id\":[0-9]*" | grep -A1 "$TEST_EMAIL" | head -1 | grep -o "[0-9]*" || echo "")
    
    if [ -n "$TEST_USER_ID" ]; then
        curl -s -X DELETE -b "admin_auth_token=$ADMIN_COOKIE" "$ADMIN_URL/api/users/$TEST_USER_ID" >/dev/null 2>&1
        log_info "테스트 사용자 삭제됨"
    fi
fi

# 임시 파일 정리
rm -f /tmp/test_cookies.txt /tmp/admin_cookies.txt 2>/dev/null

# ============================================================================
# 결과 요약
# ============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                      테스트 결과 요약                          ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "총 테스트: $TOTAL_TESTS"
echo -e "  ${GREEN}통과: $PASSED_TESTS${NC}"
echo -e "  ${RED}실패: $FAILED_TESTS${NC}"
echo -e "  ${YELLOW}건너뜀: $SKIPPED_TESTS${NC}"
echo ""
echo "소요 시간: ${DURATION}초"
echo "완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# 성공률 계산
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    echo "성공률: ${SUCCESS_RATE}%"
fi

# HTML 리포트 생성
if [ "$GENERATE_REPORT" = true ]; then
    REPORT_FILE="$PROJECT_DIR/test-report-$(date +%Y%m%d_%H%M%S).html"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>MSP Checklist 테스트 리포트</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #1877F2; padding-bottom: 10px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { flex: 1; padding: 20px; border-radius: 8px; text-align: center; }
        .stat.total { background: #E3F2FD; }
        .stat.pass { background: #E8F5E9; }
        .stat.fail { background: #FFEBEE; }
        .stat.skip { background: #FFF3E0; }
        .stat h3 { margin: 0; font-size: 32px; }
        .stat p { margin: 5px 0 0; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        .pass { color: #2E7D32; }
        .fail { color: #C62828; }
        .skip { color: #F57C00; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 MSP Checklist 테스트 리포트</h1>
        <p>생성 시간: $(date '+%Y-%m-%d %H:%M:%S')</p>
        
        <div class="summary">
            <div class="stat total"><h3>$TOTAL_TESTS</h3><p>총 테스트</p></div>
            <div class="stat pass"><h3>$PASSED_TESTS</h3><p>통과</p></div>
            <div class="stat fail"><h3>$FAILED_TESTS</h3><p>실패</p></div>
            <div class="stat skip"><h3>$SKIPPED_TESTS</h3><p>건너뜀</p></div>
        </div>
        
        <h2>📋 상세 결과</h2>
        <table>
            <tr><th>테스트명</th><th>상태</th><th>메시지</th><th>소요시간</th></tr>
EOF

    for result in "${RESULTS[@]}"; do
        IFS='|' read -r name status message duration <<< "$result"
        status_class=$(echo "$status" | tr '[:upper:]' '[:lower:]')
        echo "            <tr><td>$name</td><td class=\"$status_class\">$status</td><td>$message</td><td>$duration</td></tr>" >> "$REPORT_FILE"
    done

    cat >> "$REPORT_FILE" << EOF
        </table>
        
        <div class="footer">
            <p>MSP Checklist System v0.1.0 | 소요 시간: ${DURATION}초</p>
        </div>
    </div>
</body>
</html>
EOF

    log_info "HTML 리포트 생성됨: $REPORT_FILE"
fi

# 종료 코드
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
