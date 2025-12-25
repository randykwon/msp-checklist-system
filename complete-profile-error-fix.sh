#!/bin/bash

# Complete Profile Load Error Fix
# This script addresses all remaining profile load error issues

set -e

echo "🔧 완전한 프로파일 로드 오류 수정 시작..."
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

# Install dependencies to ensure everything is up to date
print_status "Installing/updating dependencies..."
npm install
print_success "Dependencies updated"

# Build the application to check for any build errors
print_status "Building application to verify fixes..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed. Please check the error messages above."
    exit 1
fi

# Clear browser cache instructions
print_status "Clearing browser cache..."
echo ""
echo "=================================================="
echo "🌐 브라우저 캐시 정리 안내"
echo "=================================================="
echo ""
echo "다음 단계를 따라 브라우저 캐시를 정리하세요:"
echo ""
echo "Chrome/Edge:"
echo "1. Cmd+Shift+Delete (Mac) 또는 Ctrl+Shift+Delete (Windows)"
echo "2. '쿠키 및 기타 사이트 데이터' 체크"
echo "3. '캐시된 이미지 및 파일' 체크"
echo "4. '데이터 삭제' 클릭"
echo ""
echo "Safari:"
echo "1. Cmd+Option+E (개발자 메뉴에서 '캐시 비우기')"
echo "2. 또는 Safari > 기본 설정 > 개인정보 보호 > 웹사이트 데이터 관리"
echo ""
echo "Firefox:"
echo "1. Cmd+Shift+Delete (Mac) 또는 Ctrl+Shift+Delete (Windows)"
echo "2. '캐시' 체크"
echo "3. '지금 지우기' 클릭"
echo ""

# Start the development server
print_status "Starting development server..."
echo ""
echo "=================================================="
echo "🚀 서버 시작"
echo "=================================================="
echo ""

# Start the main server
print_status "Starting main server on port 3010..."
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
echo "🎉 프로파일 로드 오류 수정 완료!"
echo "=================================================="
echo ""
echo "수정된 내용:"
echo "✅ VersionSwitcher 컴포넌트 인증 처리 개선"
echo "✅ Header 컴포넌트 API 호출 오류 처리 강화"
echo "✅ 인증되지 않은 사용자에 대한 오류 메시지 제거"
echo "✅ Next.js 빌드 캐시 정리"
echo "✅ 의존성 업데이트"
echo ""
echo "다음 단계:"
echo "1. 브라우저 캐시를 정리하세요 (위 안내 참조)"
echo "2. 브라우저에서 http://localhost:3010 접속"
echo "3. 로그인하지 않은 상태에서 오류 메시지가 표시되지 않는지 확인"
echo "4. 로그인 후 프로파일 기능이 정상 작동하는지 확인"
echo ""
echo "서버 관리:"
echo "• 서버 중지: ./stop-servers.sh"
echo "• 서버 재시작: ./restart-servers.sh"
echo "• 서버 상태 확인: ./server-status.sh"
echo ""
print_success "모든 수정이 완료되었습니다!"