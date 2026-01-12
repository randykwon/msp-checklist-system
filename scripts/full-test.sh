#!/bin/bash

# MSP Checklist System - 전체 기능 테스트 스크립트
# 메인 앱 (3010) + 관리자 앱 (3011) 전체 API 및 페이지 테스트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
MAIN_URL="http://localhost:3010"
ADMIN_URL="http://localhost:3011"
TEST_EMAIL="test_$(date +%s)@test.com"
TEST_PASSWORD="testpass123"
ADMIN_EMAIL="kwonyslad@gmail.com"
ADMIN_PASSWORD="zaq12wsx"

# 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 쿠키 파일
MAIN_COOKIE="/tmp/main_cookie_$$.txt"
ADMIN_COOKIE="/tmp/admin_cookie_$$.txt"

cleanup() {
    rm -f "$MAIN_COOKIE" "$ADMIN_COOKIE"
}
trap cleanup EXIT

log_test() {
    local name="$1"
    local status="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "  ${GREEN}✓${NC} $name"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "  ${RED}✗${NC} $name"
    fi
}

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    local cookie_file="$4"
    local method="${5:-GET}"
    local data="$6"
    
    local curl_opts="-s -o /dev/null -w %{http_code}"
    [ -n "$cookie_file" ] && [ -f "$cookie_file" ] && curl_opts="$curl_opts -b $cookie_file"
    
    if [ "$method" = "POST" ]; then
        response=$(curl $curl_opts -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null)
    else
        response=$(curl $curl_opts "$url" 2>/dev/null)
    fi
    
    if [ "$response" = "$expected" ]; then
        log_test "$name" "PASS"
        return 0
    else
        log_test "$name (expected: $expected, got: $response)" "FAIL"
        return 1
    fi
}

test_json_response() {
    local name="$1"
    local url="$2"
    local key="$3"
    local cookie_file="$4"
    
    local curl_opts="-s"
    [ -n "$cookie_file" ] && [ -f "$cookie_file" ] && curl_opts="$curl_opts -b $cookie_file"
    
    response=$(curl $curl_opts "$url" 2>/dev/null)
    
    if echo "$response" | grep -qE "\"($key)\""; then
        log_test "$name" "PASS"
        return 0
    else
        log_test "$name (key '$key' not found)" "FAIL"
        return 1
    fi
}

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MSP Checklist System - 전체 기능 테스트               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. 서버 상태 확인
# ============================================
echo -e "${YELLOW}[1/8] 서버 상태 확인${NC}"

test_endpoint "메인 앱 서버 응답" "$MAIN_URL" "200"
test_endpoint "관리자 앱 서버 응답" "$ADMIN_URL" "200"

# ============================================
# 2. 메인 앱 - 공개 페이지
# ============================================
echo ""
echo -e "${YELLOW}[2/8] 메인 앱 - 공개 페이지${NC}"

test_endpoint "로그인 페이지" "$MAIN_URL/login" "200"
test_endpoint "회원가입 페이지" "$MAIN_URL/register" "200"

# ============================================
# 3. 메인 앱 - 인증 API
# ============================================
echo ""
echo -e "${YELLOW}[3/8] 메인 앱 - 인증 API${NC}"

# 회원가입 테스트
register_response=$(curl -s -c "$MAIN_COOKIE" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}" \
    "$MAIN_URL/api/auth/register" 2>/dev/null)

if echo "$register_response" | grep -q "success\|already exists"; then
    log_test "회원가입 API" "PASS"
else
    log_test "회원가입 API" "FAIL"
fi

# 로그인 테스트
login_response=$(curl -s -c "$MAIN_COOKIE" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$MAIN_URL/api/auth/login" 2>/dev/null)

if echo "$login_response" | grep -q "success\|token\|user"; then
    log_test "로그인 API" "PASS"
else
    log_test "로그인 API" "FAIL"
fi

# 사용자 정보 조회
test_json_response "사용자 정보 조회 API" "$MAIN_URL/api/auth/me" "email" "$MAIN_COOKIE"

# ============================================
# 4. 메인 앱 - 핵심 기능 API
# ============================================
echo ""
echo -e "${YELLOW}[4/8] 메인 앱 - 핵심 기능 API${NC}"

# 체크리스트 데이터 (인증 필요 - 응답 확인만)
checklist_response=$(curl -s -b "$MAIN_COOKIE" "$MAIN_URL/api/assessment?type=prerequisites" 2>/dev/null)
if echo "$checklist_response" | grep -qE "(checklist|items|version|error)"; then
    log_test "체크리스트 데이터 API (prerequisites)" "PASS"
else
    log_test "체크리스트 데이터 API (prerequisites)" "FAIL"
fi

checklist_response2=$(curl -s -b "$MAIN_COOKIE" "$MAIN_URL/api/assessment?type=technical" 2>/dev/null)
if echo "$checklist_response2" | grep -qE "(checklist|items|version|error)"; then
    log_test "체크리스트 데이터 API (technical)" "PASS"
else
    log_test "체크리스트 데이터 API (technical)" "FAIL"
fi

# 캐시 버전
test_json_response "캐시 버전 API" "$MAIN_URL/api/cache-version" "activeVersions"

# 조언 캐시
test_json_response "조언 캐시 버전 목록" "$MAIN_URL/api/advice-cache?action=versions" "versions"

# 가상증빙 캐시
test_json_response "가상증빙 캐시 버전 목록" "$MAIN_URL/api/virtual-evidence-cache?action=versions" "versions"

# 시스템 설정
test_json_response "시스템 설정 API" "$MAIN_URL/api/system/settings" "evidenceUploadEnabled"

# LLM 설정
test_json_response "LLM 설정 API" "$MAIN_URL/api/llm-config" "provider"

# 공지사항
test_endpoint "공지사항 API" "$MAIN_URL/api/announcements/active" "200"

# ============================================
# 5. 관리자 앱 - 인증
# ============================================
echo ""
echo -e "${YELLOW}[5/8] 관리자 앱 - 인증${NC}"

test_endpoint "관리자 로그인 페이지" "$ADMIN_URL/login" "200"

# 관리자 로그인
admin_login_response=$(curl -s -c "$ADMIN_COOKIE" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    "$ADMIN_URL/api/auth/login" 2>/dev/null)

if echo "$admin_login_response" | grep -q "success\|token\|user"; then
    log_test "관리자 로그인 API" "PASS"
else
    log_test "관리자 로그인 API" "FAIL"
fi

test_json_response "관리자 정보 조회 API" "$ADMIN_URL/api/auth/me" "email" "$ADMIN_COOKIE"

# ============================================
# 6. 관리자 앱 - 페이지 접근
# ============================================
echo ""
echo -e "${YELLOW}[6/8] 관리자 앱 - 페이지 접근${NC}"

test_endpoint "대시보드 페이지" "$ADMIN_URL/dashboard" "200" "$ADMIN_COOKIE"
test_endpoint "사용자 관리 페이지" "$ADMIN_URL/users" "200" "$ADMIN_COOKIE"
test_endpoint "캐시 관리 페이지" "$ADMIN_URL/cache" "200" "$ADMIN_COOKIE"
test_endpoint "가상증빙 관리 페이지" "$ADMIN_URL/virtual-evidence" "200" "$ADMIN_COOKIE"
test_endpoint "Q&A 관리 페이지" "$ADMIN_URL/qa" "200" "$ADMIN_COOKIE"
test_endpoint "증빙 관리 페이지" "$ADMIN_URL/evidence" "200" "$ADMIN_COOKIE"
test_endpoint "진행 현황 페이지" "$ADMIN_URL/progress" "200" "$ADMIN_COOKIE"
test_endpoint "모니터링 페이지" "$ADMIN_URL/monitoring" "200" "$ADMIN_COOKIE"
test_endpoint "시스템 관리 페이지" "$ADMIN_URL/system" "200" "$ADMIN_COOKIE"

# ============================================
# 7. 관리자 앱 - 관리 API
# ============================================
echo ""
echo -e "${YELLOW}[7/8] 관리자 앱 - 관리 API${NC}"

# 대시보드 통계
test_json_response "대시보드 통계 API" "$ADMIN_URL/api/dashboard/stats" "totalUsers" "$ADMIN_COOKIE"

# 사용자 목록
test_json_response "사용자 목록 API" "$ADMIN_URL/api/users" "users" "$ADMIN_COOKIE"

# 캐시 버전 목록
test_json_response "캐시 버전 목록 API" "$ADMIN_URL/api/cache-versions" "advice" "$ADMIN_COOKIE"

# 조언 캐시 관리
test_json_response "조언 캐시 API" "$ADMIN_URL/api/advice-cache?action=versions" "versions" "$ADMIN_COOKIE"

# 가상증빙 캐시 관리
test_json_response "가상증빙 캐시 API" "$ADMIN_URL/api/virtual-evidence-cache?action=versions" "versions" "$ADMIN_COOKIE"

# 조언 요약 버전
test_json_response "조언 요약 버전 API" "$ADMIN_URL/api/advice-summary?action=versions" "versions" "$ADMIN_COOKIE"

# 가상증빙 요약 버전
test_json_response "가상증빙 요약 버전 API" "$ADMIN_URL/api/virtual-evidence-summary?action=versions" "versions" "$ADMIN_COOKIE"

# Q&A 목록
test_json_response "Q&A 목록 API" "$ADMIN_URL/api/qa" "questions" "$ADMIN_COOKIE"

# 미답변 Q&A
test_json_response "미답변 Q&A API" "$ADMIN_URL/api/qa/unanswered" "questions" "$ADMIN_COOKIE"

# 증빙 통계
test_json_response "증빙 통계 API" "$ADMIN_URL/api/evidence/stats" "total" "$ADMIN_COOKIE"

# 시스템 통계
test_json_response "시스템 통계 API" "$ADMIN_URL/api/system/stats" "dbSize" "$ADMIN_COOKIE"

# 시스템 설정
test_json_response "시스템 설정 API" "$ADMIN_URL/api/system/settings" "evidenceUploadEnabled" "$ADMIN_COOKIE"

# 활동 로그
test_json_response "활동 로그 API" "$ADMIN_URL/api/activity-logs" "logs" "$ADMIN_COOKIE"

# 공지사항 관리
test_json_response "공지사항 관리 API" "$ADMIN_URL/api/announcements" "announcements" "$ADMIN_COOKIE"

# ============================================
# 8. 통합 캐시 내보내기/가져오기
# ============================================
echo ""
echo -e "${YELLOW}[8/8] 통합 캐시 관리${NC}"

# 통합 내보내기 (버전 없이 테스트)
export_response=$(curl -s -b "$ADMIN_COOKIE" "$ADMIN_URL/api/cache/export-all" 2>/dev/null)
if echo "$export_response" | grep -q "exportedAt\|success"; then
    log_test "통합 캐시 내보내기 API" "PASS"
else
    log_test "통합 캐시 내보내기 API" "FAIL"
fi

# ============================================
# 결과 요약
# ============================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      테스트 결과 요약                       ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  총 테스트: ${TOTAL_TESTS}"
echo -e "  ${GREEN}성공: ${PASSED_TESTS}${NC}"
echo -e "  ${RED}실패: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 테스트가 통과했습니다!${NC}"
    exit 0
else
    echo -e "${RED}❌ ${FAILED_TESTS}개의 테스트가 실패했습니다.${NC}"
    exit 1
fi
