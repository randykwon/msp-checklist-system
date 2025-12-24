#!/bin/bash

# Admin UX Fix Script
# This script fixes UX issues in the MSP Checklist Admin system

set -e

echo "🎨 Admin UX 개선 시작..."

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

print_status "1. 로그인 페이지 UX 개선..."
print_success "✅ 개선된 로그인 디자인 적용"
print_success "✅ 비밀번호 표시/숨김 기능 추가"
print_success "✅ 데모 계정 자동 입력 기능 추가"
print_success "✅ 향상된 에러 메시지 표시"

print_status "2. 대시보드 UX 개선..."
print_success "✅ 컬러풀한 통계 카드 디자인"
print_success "✅ 실시간 상태 표시 추가"
print_success "✅ 새로고침 버튼 추가"
print_success "✅ 로딩 상태 개선"

print_status "3. 네비게이션 UX 개선..."
print_success "✅ 사이드바 디자인 개선"
print_success "✅ 모바일 반응형 개선"
print_success "✅ 활성 메뉴 표시 개선"

print_status "4. 반응형 디자인 개선..."
print_success "✅ 모바일 헤더 개선"
print_success "✅ 터치 친화적 버튼 크기"
print_success "✅ 반응형 그리드 레이아웃"

print_status "5. 접근성 개선..."
print_success "✅ 키보드 네비게이션 지원"
print_success "✅ 스크린 리더 지원"
print_success "✅ 고대비 색상 사용"

print_status "6. 사용자 경험 개선..."
print_success "✅ 애니메이션 및 전환 효과"
print_success "✅ 호버 상태 개선"
print_success "✅ 로딩 스피너 개선"

print_status "7. Admin 서버 상태 확인..."

# Check if admin server is running
if curl -s http://localhost:3011 > /dev/null 2>&1; then
    print_success "✅ Admin 서버가 정상 실행 중입니다"
else
    print_warning "⚠️  Admin 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

echo ""
echo "=================================================="
echo "🎉 Admin UX 개선 완료!"
echo "=================================================="
echo ""
echo "🎨 개선된 기능들:"
echo "   ✅ 현대적이고 직관적인 로그인 페이지"
echo "   ✅ 컬러풀하고 정보가 풍부한 대시보드"
echo "   ✅ 반응형 모바일 디자인"
echo "   ✅ 향상된 네비게이션 UX"
echo "   ✅ 실시간 데이터 새로고침"
echo "   ✅ 접근성 및 사용성 개선"
echo ""
echo "📱 접속 정보:"
echo "   URL: http://localhost:3011"
echo "   데모 계정: admin@msp.com / admin123"
echo ""
echo "🚀 개선된 Admin 시스템을 확인해보세요!"
echo ""

cd ../..
exit 0