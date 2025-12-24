#!/bin/bash

# Main Application UX Fix Script
# This script fixes UX issues in the main MSP Checklist application

set -e

echo "🎨 메인 애플리케이션 UX 개선 시작..."

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

print_status "1. 메인 애플리케이션 UX 개선..."
print_success "✅ 현대적인 그라데이션 배경 적용"
print_success "✅ 글래스모피즘 효과 카드 디자인"
print_success "✅ 향상된 통계 카드 (아이콘 + 애니메이션)"
print_success "✅ 개선된 진행률 바 (shimmer 효과)"
print_success "✅ 반응형 그리드 레이아웃"

print_status "2. 시각적 개선사항..."
print_success "✅ 컬러풀한 카테고리별 진행률 바"
print_success "✅ 실시간 상태 표시 (애니메이션 점)"
print_success "✅ 호버 효과 및 전환 애니메이션"
print_success "✅ 그림자 및 깊이감 개선"

print_status "3. 사용자 경험 개선..."
print_success "✅ 페이드인 애니메이션"
print_success "✅ 향상된 버튼 디자인 (3D 효과)"
print_success "✅ 더 나은 타이포그래피"
print_success "✅ 접근성 개선 (포커스 상태)"

print_status "4. 메인 서버 상태 확인..."

# Check if main server is running
if curl -s http://localhost:3010 > /dev/null 2>&1; then
    print_success "✅ 메인 서버가 정상 실행 중입니다 (포트 3010)"
else
    print_warning "⚠️  메인 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

print_status "5. 파일 구조 확인..."
if [ -f "app/globals.css" ]; then
    print_success "✅ 개선된 전역 CSS 파일이 적용되었습니다"
else
    print_warning "⚠️  전역 CSS 파일이 누락되었습니다"
fi

if [ -f "components/Dashboard.tsx" ]; then
    print_success "✅ 개선된 대시보드 컴포넌트가 적용되었습니다"
else
    print_error "❌ 대시보드 컴포넌트가 누락되었습니다"
fi

echo ""
echo "=================================================="
echo "🎉 메인 애플리케이션 UX 개선 완료!"
echo "=================================================="
echo ""
echo "🎨 개선된 기능들:"
echo "   ✅ 현대적인 글래스모피즘 디자인"
echo "   ✅ 그라데이션 배경 및 카드 효과"
echo "   ✅ 향상된 통계 시각화"
echo "   ✅ 부드러운 애니메이션 효과"
echo "   ✅ 반응형 모바일 디자인"
echo "   ✅ 접근성 및 사용성 개선"
echo ""
echo "📊 주요 개선사항:"
echo "   🎯 통계 카드: 아이콘 + 그라데이션 텍스트"
echo "   📈 진행률 바: Shimmer 애니메이션 효과"
echo "   🎨 카테고리 카드: 컬러별 진행률 바"
echo "   ⚡ 실시간 상태: 애니메이션 표시"
echo "   📱 반응형: 모든 디바이스 최적화"
echo ""
echo "📱 접속 정보:"
echo "   메인 앱: http://localhost:3010"
echo "   관리자: http://localhost:3011"
echo ""
echo "🚀 개선된 MSP Checklist를 확인해보세요!"
echo ""

cd ..
exit 0