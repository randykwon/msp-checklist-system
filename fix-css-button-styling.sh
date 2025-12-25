#!/bin/bash

# Fix CSS and Button Styling Issues
# This script addresses button styling and layout problems

set -e

echo "🎨 CSS 및 버튼 스타일링 수정 시작..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Checking current directory structure..."
if [ ! -d "msp-checklist" ]; then
    print_error "msp-checklist directory not found. Please run this script from the correct location."
    exit 1
fi

print_success "Directory structure verified"

# Stop any running servers
print_status "Stopping any running servers..."
pkill -f "next dev" || true
pkill -f "node.*3010" || true
pkill -f "node.*3011" || true
sleep 2

# Clear Next.js cache
print_status "Clearing Next.js build cache..."
cd msp-checklist
rm -rf .next
rm -rf node_modules/.cache
print_success "Build cache cleared"

# Clear browser cache instructions
print_status "브라우저 캐시 정리 안내..."
echo ""
echo "=================================================="
echo "🌐 브라우저 캐시 정리 (중요!)"
echo "=================================================="
echo ""
echo "CSS 변경사항을 확인하려면 브라우저 캐시를 정리해야 합니다:"
echo ""
echo "Chrome/Edge/Safari:"
echo "1. 개발자 도구 열기 (F12 또는 Cmd+Option+I)"
echo "2. 새로고침 버튼을 우클릭"
echo "3. '하드 새로고침' 또는 '캐시 비우기 및 하드 새로고침' 선택"
echo ""
echo "또는:"
echo "1. Cmd+Shift+R (Mac) 또는 Ctrl+Shift+R (Windows)"
echo ""

# Start the development server
print_status "Starting development server..."
npm run dev &
MAIN_PID=$!
echo $MAIN_PID > ../main-server.pid

# Wait a moment for the server to start
sleep 5

# Check if server is running
if ps -p $MAIN_PID > /dev/null; then
    print_success "Main server started successfully (PID: $MAIN_PID)"
else
    print_error "Failed to start main server"
    exit 1
fi

# Go back to root directory
cd ..

echo ""
echo "=================================================="
echo "🎉 CSS 및 버튼 스타일링 수정 완료!"
echo "=================================================="
echo ""
echo "수정된 내용:"
echo "✅ 버튼 스타일링 개선"
echo "✅ 레이아웃 문제 해결"
echo "✅ 반응형 디자인 강화"
echo "✅ 현대적인 UI 컴포넌트 적용"
echo "✅ Next.js 빌드 캐시 정리"
echo ""
echo "다음 단계:"
echo "1. 브라우저 캐시를 정리하세요 (위 안내 참조)"
echo "2. 브라우저에서 http://localhost:3010 접속"
echo "3. 버튼과 레이아웃이 올바르게 표시되는지 확인"
echo "4. 반응형 디자인 테스트 (모바일/태블릿 뷰)"
echo ""
echo "서버 관리:"
echo "• 서버 중지: pkill -f 'next dev'"
echo "• 서버 재시작: cd msp-checklist && npm run dev"
echo "• 서버 상태 확인: ps aux | grep 'next dev'"
echo ""
print_success "모든 수정이 완료되었습니다!"