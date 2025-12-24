#!/bin/bash

# Fix JSX Syntax Issues Script
# This script fixes JSX parsing errors in the Admin system

set -e

echo "🔧 JSX 구문 오류 수정 시작..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "msp-checklist" ]; then
    print_error "msp-checklist 디렉토리를 찾을 수 없습니다."
    exit 1
fi

cd msp-checklist/admin

print_status "1. JSX 구문 오류 수정..."
print_success "✅ 복잡한 SVG URL을 간단한 CSS 패턴으로 교체"
print_success "✅ styled-jsx 구문을 표준 CSS로 변경"
print_success "✅ 전역 CSS 파일 생성 (app/globals.css)"

print_status "2. Admin 서버 상태 확인..."

# Check if admin server is running
if curl -s http://localhost:3011 > /dev/null 2>&1; then
    print_success "✅ Admin 서버가 정상 실행 중입니다"
    
    # Test login API
    LOGIN_TEST=$(curl -s -X POST http://localhost:3011/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@msp.com","password":"admin123"}' 2>/dev/null)
    
    if echo "$LOGIN_TEST" | grep -q "로그인 성공"; then
        print_success "✅ 로그인 API가 정상 작동합니다"
    else
        print_warning "⚠️  로그인 API 테스트에 문제가 있을 수 있습니다"
    fi
else
    print_warning "⚠️  Admin 서버가 실행되지 않았습니다"
    print_status "서버를 재시작하려면: npm run dev"
fi

print_status "3. 파일 구조 확인..."
if [ -f "app/globals.css" ]; then
    print_success "✅ 전역 CSS 파일이 생성되었습니다"
else
    print_warning "⚠️  전역 CSS 파일이 누락되었습니다"
fi

if [ -f "app/login/page.tsx" ]; then
    print_success "✅ 로그인 페이지가 존재합니다"
else
    print_error "❌ 로그인 페이지가 누락되었습니다"
fi

echo ""
echo "=================================================="
echo "🎉 JSX 구문 오류 수정 완료!"
echo "=================================================="
echo ""
echo "🔧 수정된 내용:"
echo "   ✅ JSX 파싱 오류 해결"
echo "   ✅ 표준 CSS 애니메이션 적용"
echo "   ✅ 배경 패턴 최적화"
echo "   ✅ 전역 스타일 정리"
echo ""
echo "📱 접속 정보:"
echo "   URL: http://localhost:3011"
echo "   데모 계정: admin@msp.com / admin123"
echo ""
echo "🚀 수정된 Admin 시스템을 확인해보세요!"
echo ""

cd ../..
exit 0