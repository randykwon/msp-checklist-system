#!/bin/bash

# Nginx + Node.js 연동 테스트 스크립트
# 설정이 올바르게 작동하는지 확인

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

echo -e "${BLUE}🔍 MSP Checklist Nginx 연동 테스트${NC}"
echo "===================================="
echo ""

# 테스트 결과 저장
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNING=0

# 테스트 함수
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -n "🧪 $test_name: "
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✅ 통과${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ 실패 (예상과 다름)${NC}"
            ((TESTS_FAILED++))
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✅ 통과 (예상된 실패)${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ 실패${NC}"
            ((TESTS_FAILED++))
        fi
    fi
}

run_warning_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "⚠️  $test_name: "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 정상${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️ 주의 필요${NC}"
        ((TESTS_WARNING++))
    fi
}

# 1. 기본 서비스 상태 확인
echo "📊 기본 서비스 상태 확인"
echo "------------------------"

run_test "Nginx 서비스 실행 상태" "systemctl is-active --quiet nginx" "pass"
run_test "Nginx 설정 파일 문법" "nginx -t" "pass"

# 2. 포트 확인
echo ""
echo "🔌 포트 상태 확인"
echo "----------------"

run_test "포트 80 (HTTP) 리스닝" "netstat -tuln | grep -q ':80 ' || ss -tuln | grep -q ':80 '" "pass"
run_warning_test "포트 3010 (메인 서버) 실행" "netstat -tuln | grep -q ':3010 ' || ss -tuln | grep -q ':3010 '" 
run_warning_test "포트 3011 (관리자 서버) 실행" "netstat -tuln | grep -q ':3011 ' || ss -tuln | grep -q ':3011 '"

# 3. HTTP 응답 테스트
echo ""
echo "🌐 HTTP 응답 테스트"
echo "------------------"

# Nginx 기본 응답 테스트
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
echo -n "🧪 Nginx HTTP 응답 (포트 80): "
if [[ "$HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    echo -e "${GREEN}✅ 통과 (HTTP $HTTP_CODE)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ 실패 (HTTP $HTTP_CODE)${NC}"
    ((TESTS_FAILED++))
fi

# 메인 서버 직접 테스트 (포트 3010)
if netstat -tuln 2>/dev/null | grep -q ":3010 " || ss -tuln 2>/dev/null | grep -q ":3010 "; then
    MAIN_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 2>/dev/null || echo "000")
    echo -n "🧪 메인 서버 직접 응답 (포트 3010): "
    if [[ "$MAIN_HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        echo -e "${GREEN}✅ 통과 (HTTP $MAIN_HTTP_CODE)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️ 주의 (HTTP $MAIN_HTTP_CODE)${NC}"
        ((TESTS_WARNING++))
    fi
else
    echo -e "${YELLOW}⚠️ 메인 서버 (포트 3010): 실행되지 않음${NC}"
    ((TESTS_WARNING++))
fi

# 관리자 서버 직접 테스트 (포트 3011)
if netstat -tuln 2>/dev/null | grep -q ":3011 " || ss -tuln 2>/dev/null | grep -q ":3011 "; then
    ADMIN_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 2>/dev/null || echo "000")
    echo -n "🧪 관리자 서버 직접 응답 (포트 3011): "
    if [[ "$ADMIN_HTTP_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
        echo -e "${GREEN}✅ 통과 (HTTP $ADMIN_HTTP_CODE)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️ 주의 (HTTP $ADMIN_HTTP_CODE)${NC}"
        ((TESTS_WARNING++))
    fi
else
    echo -e "${YELLOW}⚠️ 관리자 서버 (포트 3011): 실행되지 않음${NC}"
    ((TESTS_WARNING++))
fi

# 4. 프록시 테스트
echo ""
echo "🔄 프록시 연동 테스트"
echo "-------------------"

# 관리자 경로 프록시 테스트
ADMIN_PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin 2>/dev/null || echo "000")
echo -n "🧪 관리자 경로 프록시 (/admin): "
if [[ "$ADMIN_PROXY_CODE" =~ ^[2-3][0-9][0-9]$ ]]; then
    echo -e "${GREEN}✅ 통과 (HTTP $ADMIN_PROXY_CODE)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️ 주의 (HTTP $ADMIN_PROXY_CODE) - 관리자 서버가 실행되지 않았을 수 있음${NC}"
    ((TESTS_WARNING++))
fi

# 5. 설정 파일 확인
echo ""
echo "📄 설정 파일 확인"
echo "----------------"

run_test "MSP Checklist Nginx 설정 파일 존재" "test -f /etc/nginx/sites-available/msp-checklist || test -f /etc/nginx/conf.d/msp-checklist.conf" "pass"

# Ubuntu의 경우 sites-enabled 확인
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]]; then
        run_test "Ubuntu sites-enabled 링크" "test -L /etc/nginx/sites-enabled/msp-checklist" "pass"
    fi
fi

# 6. 방화벽 상태 확인
echo ""
echo "🛡️ 방화벽 상태 확인"
echo "------------------"

if command -v ufw > /dev/null 2>&1; then
    run_test "UFW 방화벽 활성화" "ufw status | grep -q 'Status: active'" "pass"
    run_test "HTTP 포트 허용 (UFW)" "ufw status | grep -q '80/tcp'" "pass"
elif command -v firewall-cmd > /dev/null 2>&1; then
    run_test "firewalld 서비스 실행" "systemctl is-active --quiet firewalld" "pass"
    run_test "HTTP 서비스 허용 (firewalld)" "firewall-cmd --list-services | grep -q http" "pass"
fi

# 7. 로그 파일 확인
echo ""
echo "📝 로그 파일 확인"
echo "----------------"

run_test "Nginx 액세스 로그" "test -f /var/log/nginx/access.log" "pass"
run_test "Nginx 에러 로그" "test -f /var/log/nginx/error.log" "pass"

# MSP Checklist 전용 로그가 있는지 확인
if [ -f /var/log/nginx/msp-checklist-access.log ]; then
    echo -e "🧪 MSP Checklist 액세스 로그: ${GREEN}✅ 존재${NC}"
    ((TESTS_PASSED++))
else
    echo -e "🧪 MSP Checklist 액세스 로그: ${YELLOW}⚠️ 없음 (기본 로그 사용)${NC}"
    ((TESTS_WARNING++))
fi

# 8. 성능 및 보안 설정 확인
echo ""
echo "⚡ 성능 및 보안 설정 확인"
echo "----------------------"

# Gzip 압축 확인
if nginx -T 2>/dev/null | grep -q "gzip on"; then
    echo -e "🧪 Gzip 압축: ${GREEN}✅ 활성화${NC}"
    ((TESTS_PASSED++))
else
    echo -e "🧪 Gzip 압축: ${YELLOW}⚠️ 비활성화${NC}"
    ((TESTS_WARNING++))
fi

# 보안 헤더 확인
SECURITY_HEADERS=$(curl -s -I http://localhost 2>/dev/null | grep -i "x-frame-options\|x-xss-protection\|x-content-type-options" | wc -l)
echo -n "🧪 보안 헤더: "
if [ "$SECURITY_HEADERS" -gt 0 ]; then
    echo -e "${GREEN}✅ 설정됨 ($SECURITY_HEADERS개)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️ 설정되지 않음${NC}"
    ((TESTS_WARNING++))
fi

# 9. 외부 접근성 테스트
echo ""
echo "🌍 외부 접근성 정보"
echo "------------------"

# 공용 IP 확인
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s http://ipinfo.io/ip 2>/dev/null || echo "확인 불가")
echo "🌐 공용 IP: $PUBLIC_IP"

# AWS 보안 그룹 확인 안내
echo ""
echo "📋 AWS 보안 그룹 확인 사항:"
echo "  - 포트 80 (HTTP) 인바운드 규칙: 0.0.0.0/0"
echo "  - 포트 443 (HTTPS) 인바운드 규칙: 0.0.0.0/0 (SSL 사용 시)"
echo "  - 포트 22 (SSH) 인바운드 규칙: 관리자 IP만"

# 10. 테스트 결과 요약
echo ""
echo "📊 테스트 결과 요약"
echo "=================="
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_WARNING))

echo -e "총 테스트: $TOTAL_TESTS"
echo -e "${GREEN}✅ 통과: $TESTS_PASSED${NC}"
echo -e "${RED}❌ 실패: $TESTS_FAILED${NC}"
echo -e "${YELLOW}⚠️ 주의: $TESTS_WARNING${NC}"

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    if [ $TESTS_WARNING -eq 0 ]; then
        echo -e "${GREEN}🎉 모든 테스트가 통과했습니다! Nginx + Node.js 연동이 완벽하게 설정되었습니다.${NC}"
    else
        echo -e "${YELLOW}⚠️ 기본 설정은 완료되었지만 일부 개선이 필요합니다.${NC}"
        echo ""
        echo "개선 권장사항:"
        echo "1. Node.js 서버가 실행되지 않은 경우 서버를 시작하세요"
        echo "2. 성능 최적화를 위해 ./setup-nginx-node.sh를 실행하세요"
        echo "3. SSL 인증서 설정을 고려하세요"
    fi
else
    echo -e "${RED}❌ 일부 테스트가 실패했습니다. 설정을 확인하세요.${NC}"
    echo ""
    echo "문제 해결 방법:"
    echo "1. Nginx 상태 확인: sudo systemctl status nginx"
    echo "2. Nginx 설정 테스트: sudo nginx -t"
    echo "3. 로그 확인: sudo tail -f /var/log/nginx/error.log"
    echo "4. 재설정: ./setup-nginx-node.sh"
fi

echo ""
echo "🔧 유용한 명령어:"
echo "  - 상태 확인: sudo systemctl status nginx"
echo "  - 설정 테스트: sudo nginx -t"
echo "  - 재시작: sudo systemctl restart nginx"
echo "  - 로그 확인: sudo tail -f /var/log/nginx/access.log"
echo "  - 에러 로그: sudo tail -f /var/log/nginx/error.log"

echo ""
echo "🌐 접속 주소:"
echo "  - 메인 서비스: http://$PUBLIC_IP"
echo "  - 관리자 시스템: http://$PUBLIC_IP/admin"

echo ""
echo "테스트 완료!"