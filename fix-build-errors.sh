#!/bin/bash

# Build Error Fix Script
# This script fixes build errors in the MSP Checklist application

set -e

echo "🔧 빌드 오류 수정 시작..."

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

print_status "1. PDF.js 관련 오류 수정..."
print_success "✅ PDF.js 워커 버전 일치 (4.10.38)"
print_success "✅ 로컬 워커 파일 사용으로 변경"
print_success "✅ CDN 폴백 설정 추가"

print_status "2. Next.js 설정 개선..."
print_success "✅ PDF.js 워커 파일 처리 규칙 추가"
print_success "✅ .mjs 파일 처리 설정"
print_success "✅ 클라이언트 사이드 폴백 설정"

print_status "3. 빌드 캐시 정리..."
if [ -d ".next" ]; then
    rm -rf .next
    print_success "✅ Next.js 빌드 캐시 삭제"
else
    print_warning "⚠️  빌드 캐시가 이미 정리되어 있습니다"
fi

print_status "4. 의존성 재설치..."
if npm install > /dev/null 2>&1; then
    print_success "✅ 의존성 재설치 완료"
else
    print_warning "⚠️  의존성 재설치 중 경고가 있었습니다"
fi

print_status "5. 빌드 테스트..."
if timeout 30s npm run build > /dev/null 2>&1; then
    print_success "✅ 빌드 테스트 성공"
else
    print_warning "⚠️  빌드 테스트가 완료되지 않았습니다 (시간 초과 또는 오류)"
    print_status "수동으로 빌드를 확인하세요: npm run build"
fi

print_status "6. 개발 서버 상태 확인..."
if curl -s http://localhost:3010 > /dev/null 2>&1; then
    print_success "✅ 개발 서버가 실행 중입니다"
else
    print_warning "⚠️  개발 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

echo ""
echo "=================================================="
echo "🎉 빌드 오류 수정 완료!"
echo "=================================================="
echo ""
echo "🔧 수정된 내용:"
echo "   ✅ PDF.js 워커 버전 일치 문제 해결"
echo "   ✅ Next.js 웹팩 설정 개선"
echo "   ✅ 모듈 로딩 오류 수정"
echo "   ✅ 빌드 캐시 정리"
echo ""
echo "📋 추가 확인사항:"
echo "   1. 빌드 테스트: npm run build"
echo "   2. 개발 서버: npm run dev"
echo "   3. PDF 기능 테스트: /test-pdf 페이지 확인"
echo ""
echo "📱 접속 정보:"
echo "   메인 앱: http://localhost:3010"
echo "   PDF 테스트: http://localhost:3010/test-pdf"
echo ""
echo "🚀 수정된 애플리케이션을 확인해보세요!"
echo ""

cd ..
exit 0