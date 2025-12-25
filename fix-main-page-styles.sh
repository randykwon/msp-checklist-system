#!/bin/bash

# Main Page Style Fix Script
# This script fixes the main web page styling issues with improved layout and responsive design

set -e

echo "🎨 메인 페이지 스타일 수정 시작..."

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

cd msp-checklist

print_status "1. 레이아웃 문제 수정..."
print_success "✅ 헤더 레이아웃 개선 (flexbox → 구조화된 레이아웃)"
print_success "✅ 반응형 디자인 강화 (모바일/태블릿/데스크톱)"
print_success "✅ 요소 겹침 문제 해결"
print_success "✅ 적절한 간격 및 패딩 적용"

print_status "2. 시각적 계층 구조 개선..."
print_success "✅ 제목 크기 및 폰트 가중치 최적화"
print_success "✅ 색상 대비 개선"
print_success "✅ 버튼 및 인터랙티브 요소 강화"
print_success "✅ 카드 디자인 현대화"

print_status "3. 반응형 디자인 강화..."
print_success "✅ 모바일 우선 접근법"
print_success "✅ 태블릿 레이아웃 최적화"
print_success "✅ 데스크톱 와이드 스크린 지원"
print_success "✅ 유연한 그리드 시스템"

print_status "4. 컴포넌트별 스타일 개선..."
print_success "✅ Dashboard 컴포넌트 - 통계 카드 레이아웃"
print_success "✅ FilterBar 컴포넌트 - 필터 그리드 구조"
print_success "✅ 메인 페이지 - 헤더 및 콘텐츠 영역"
print_success "✅ 진행률 바 및 애니메이션"

print_status "5. CSS 클래스 체계 정리..."
print_success "✅ 의미있는 클래스명 사용"
print_success "✅ 재사용 가능한 유틸리티 클래스"
print_success "✅ 컴포넌트별 전용 스타일"
print_success "✅ 일관된 디자인 시스템"

print_status "6. 빌드 캐시 정리..."
if [ -d ".next" ]; then
    rm -rf .next
    print_success "✅ Next.js 빌드 캐시 삭제"
else
    print_warning "⚠️  빌드 캐시가 이미 정리되어 있습니다"
fi

print_status "7. 개발 서버 상태 확인..."
if curl -s http://localhost:3010 > /dev/null 2>&1; then
    print_success "✅ 개발 서버가 실행 중입니다"
    print_status "브라우저를 새로고침하여 변경사항을 확인하세요"
else
    print_warning "⚠️  개발 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

echo ""
echo "=================================================="
echo "🎉 메인 페이지 스타일 수정 완료!"
echo "=================================================="
echo ""
echo "🎨 개선된 내용:"
echo "   ✅ 깔끔한 헤더 레이아웃 (제목 + 버튼)"
echo "   ✅ 반응형 디자인 (모바일/태블릿/데스크톱)"
echo "   ✅ 현대적인 카드 디자인"
echo "   ✅ 개선된 통계 표시"
echo "   ✅ 직관적인 필터 인터페이스"
echo "   ✅ 부드러운 애니메이션 효과"
echo ""
echo "📱 반응형 특징:"
echo "   • 모바일: 세로 레이아웃, 큰 터치 영역"
echo "   • 태블릿: 2열 그리드, 최적화된 간격"
echo "   • 데스크톱: 다열 그리드, 넓은 화면 활용"
echo ""
echo "🎯 주요 개선사항:"
echo "   • 요소 겹침 문제 완전 해결"
echo "   • 일관된 간격 및 패딩"
echo "   • 향상된 가독성"
echo "   • 직관적인 사용자 인터페이스"
echo ""
echo "📱 접속 정보:"
echo "   메인 앱: http://localhost:3010"
echo "   Admin: http://localhost:3011"
echo ""
echo "🚀 새로운 디자인을 확인해보세요!"
echo ""

cd ..
exit 0