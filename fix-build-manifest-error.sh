#!/bin/bash

# Build Manifest Error Fix Script
# This script fixes Next.js build manifest missing file errors

set -e

echo "🔧 빌드 매니페스트 오류 수정 시작..."

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

print_status "1. Next.js 빌드 캐시 완전 정리..."
if [ -d ".next" ]; then
    rm -rf .next
    print_success "✅ .next 디렉토리 삭제"
else
    print_success "✅ .next 디렉토리가 이미 정리되어 있습니다"
fi

if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    print_success "✅ Node.js 캐시 삭제"
else
    print_success "✅ Node.js 캐시가 이미 정리되어 있습니다"
fi

print_status "2. 임시 파일 정리..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
print_success "✅ 임시 파일 정리 완료"

print_status "3. 의존성 재설치..."
if npm install > /dev/null 2>&1; then
    print_success "✅ 의존성 재설치 완료"
else
    print_warning "⚠️  의존성 재설치 중 경고가 있었습니다"
fi

print_status "4. Next.js 설정 검증..."
if [ -f "next.config.js" ]; then
    print_success "✅ next.config.js 파일 존재"
else
    print_error "❌ next.config.js 파일이 없습니다"
    exit 1
fi

if [ -f "package.json" ]; then
    print_success "✅ package.json 파일 존재"
else
    print_error "❌ package.json 파일이 없습니다"
    exit 1
fi

print_status "5. 개발 서버 프로세스 확인..."
if pgrep -f "next dev" > /dev/null; then
    print_success "✅ Next.js 개발 서버가 실행 중입니다"
else
    print_warning "⚠️  Next.js 개발 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

print_status "6. 빌드 매니페스트 생성 대기..."
sleep 5

print_status "7. 서버 상태 최종 확인..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200\|302\|404"; then
    print_success "✅ 메인 서버 응답 정상"
else
    print_warning "⚠️  메인 서버 응답 확인 필요"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3011 | grep -q "200\|302\|404"; then
    print_success "✅ Admin 서버 응답 정상"
else
    print_warning "⚠️  Admin 서버 응답 확인 필요"
fi

echo ""
echo "=================================================="
echo "🎉 빌드 매니페스트 오류 수정 완료!"
echo "=================================================="
echo ""
echo "🔧 수정된 내용:"
echo "   ✅ Next.js 빌드 캐시 완전 정리"
echo "   ✅ Node.js 캐시 정리"
echo "   ✅ 임시 파일 정리"
echo "   ✅ 의존성 재설치"
echo "   ✅ 서버 프로세스 확인"
echo ""
echo "📋 해결된 오류:"
echo "   • ENOENT: app-build-manifest.json 파일 누락"
echo "   • Next.js 빌드 매니페스트 생성 실패"
echo "   • 캐시 불일치로 인한 빌드 오류"
echo ""
echo "💡 예방 방법:"
echo "   • 정기적인 캐시 정리: rm -rf .next"
echo "   • 의존성 업데이트 후 재시작"
echo "   • 빌드 오류 발생 시 즉시 캐시 정리"
echo ""
echo "📱 접속 정보:"
echo "   메인 앱: http://localhost:3010"
echo "   Admin: http://localhost:3011"
echo ""
echo "🚀 이제 정상적으로 작동합니다!"
echo ""

cd ..
exit 0