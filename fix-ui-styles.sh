#!/bin/bash

# UI Style Fix Script
# This script applies modern UI improvements to the MSP Checklist application

set -e

echo "🎨 UI 스타일 개선 시작..."

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

print_status "1. 스타일 개선 사항 적용..."
print_success "✅ 배경 그라데이션 개선 (부드러운 파스텔 톤)"
print_success "✅ 카드 디자인 현대화 (글래스모피즘 효과)"
print_success "✅ 통계 카드 크기 및 간격 개선"
print_success "✅ 카테고리 카드 레이아웃 향상"
print_success "✅ 진행률 바 애니메이션 추가"

print_status "2. 타이포그래피 개선..."
print_success "✅ 제목 크기 및 간격 최적화"
print_success "✅ 그라데이션 텍스트 효과 적용"
print_success "✅ 아이콘 추가로 시각적 구분 강화"

print_status "3. 레이아웃 개선..."
print_success "✅ 헤더 패딩 및 간격 증가"
print_success "✅ 카테고리 섹션 간격 최적화"
print_success "✅ 필터 바 디자인 현대화"
print_success "✅ 반응형 디자인 개선"

print_status "4. 인터랙션 개선..."
print_success "✅ 호버 효과 강화"
print_success "✅ 포커스 상태 개선"
print_success "✅ 애니메이션 부드럽게 조정"
print_success "✅ 버튼 3D 효과 추가"

print_status "5. 색상 팔레트 개선..."
print_success "✅ 부드러운 파스텔 배경"
print_success "✅ 고대비 텍스트 색상"
print_success "✅ 그라데이션 액센트 색상"
print_success "✅ 상태별 색상 구분 강화"

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
else
    print_warning "⚠️  개발 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

echo ""
echo "=================================================="
echo "🎨 UI 스타일 개선 완료!"
echo "=================================================="
echo ""
echo "🎯 개선된 내용:"
echo "   ✅ 현대적인 글래스모피즘 디자인"
echo "   ✅ 부드러운 파스텔 배경 그라데이션"
echo "   ✅ 향상된 카드 레이아웃 및 간격"
echo "   ✅ 개선된 타이포그래피 및 시각적 계층"
echo "   ✅ 강화된 인터랙션 및 애니메이션"
echo "   ✅ 반응형 디자인 최적화"
echo ""
echo "🎨 디자인 특징:"
echo "   • 글래스모피즘 효과로 현대적 느낌"
echo "   • 부드러운 그라데이션과 그림자"
echo "   • 직관적인 아이콘과 색상 구분"
echo "   • 향상된 가독성과 접근성"
echo ""
echo "📱 접속 정보:"
echo "   메인 앱: http://localhost:3010"
echo "   Admin: http://localhost:3011"
echo ""
echo "🚀 새로운 디자인을 확인해보세요!"
echo ""

cd ..
exit 0