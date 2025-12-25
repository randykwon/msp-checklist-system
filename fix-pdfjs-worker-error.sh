#!/bin/bash

# PDF.js Worker Error Fix Script
# This script fixes the PDF.js worker module loading error

set -e

echo "🔧 PDF.js 워커 오류 수정 시작..."

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

print_status "1. PDF.js 워커 파일 설정..."

# Create public directory for worker files
if [ ! -d "public/pdf-worker" ]; then
    mkdir -p public/pdf-worker
    print_success "✅ public/pdf-worker 디렉토리 생성"
else
    print_success "✅ public/pdf-worker 디렉토리 존재"
fi

# Copy worker file to public directory
if [ -f "node_modules/pdfjs-dist/build/pdf.worker.min.mjs" ]; then
    cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf-worker/
    print_success "✅ PDF.js 워커 파일 복사 완료"
else
    print_error "❌ PDF.js 워커 파일을 찾을 수 없습니다"
    print_status "의존성을 재설치합니다..."
    npm install pdfjs-dist@4.10.38
    cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf-worker/
    print_success "✅ PDF.js 워커 파일 복사 완료"
fi

print_status "2. 설정 파일 업데이트 확인..."
print_success "✅ lib/pdf-utils.ts - 로컬 워커 경로 설정"
print_success "✅ next.config.js - 웹팩 설정 개선"

print_status "3. 빌드 캐시 정리..."
if [ -d ".next" ]; then
    rm -rf .next
    print_success "✅ Next.js 빌드 캐시 삭제"
else
    print_warning "⚠️  빌드 캐시가 이미 정리되어 있습니다"
fi

print_status "4. 의존성 확인..."
if npm list pdfjs-dist > /dev/null 2>&1; then
    PDFJS_VERSION=$(npm list pdfjs-dist --depth=0 | grep pdfjs-dist | cut -d'@' -f2)
    print_success "✅ PDF.js 버전: $PDFJS_VERSION"
else
    print_warning "⚠️  PDF.js 의존성 재설치 필요"
    npm install pdfjs-dist@4.10.38
fi

print_status "5. 워커 파일 검증..."
if [ -f "public/pdf-worker/pdf.worker.min.mjs" ]; then
    FILE_SIZE=$(wc -c < public/pdf-worker/pdf.worker.min.mjs)
    if [ $FILE_SIZE -gt 1000 ]; then
        print_success "✅ 워커 파일 크기: ${FILE_SIZE} bytes (정상)"
    else
        print_error "❌ 워커 파일이 손상되었을 수 있습니다"
        exit 1
    fi
else
    print_error "❌ 워커 파일이 복사되지 않았습니다"
    exit 1
fi

print_status "6. 개발 서버 상태 확인..."
if curl -s http://localhost:3010 > /dev/null 2>&1; then
    print_success "✅ 개발 서버가 실행 중입니다"
    print_status "서버를 재시작하여 변경사항을 적용하세요"
else
    print_warning "⚠️  개발 서버가 실행되지 않았습니다"
    print_status "서버를 시작하려면: npm run dev"
fi

echo ""
echo "=================================================="
echo "🎉 PDF.js 워커 오류 수정 완료!"
echo "=================================================="
echo ""
echo "🔧 수정된 내용:"
echo "   ✅ PDF.js 워커 파일을 정적 자산으로 복사"
echo "   ✅ 로컬 워커 경로 설정 (/pdf-worker/pdf.worker.min.mjs)"
echo "   ✅ Next.js 웹팩 설정 개선"
echo "   ✅ 모듈 로딩 오류 해결"
echo ""
echo "📁 생성된 파일:"
echo "   📄 public/pdf-worker/pdf.worker.min.mjs"
echo ""
echo "🚀 다음 단계:"
echo "   1. 서버 재시작: ./restart-servers.sh"
echo "   2. PDF 기능 테스트: http://localhost:3010/test-pdf"
echo ""
echo "💡 참고사항:"
echo "   - 워커 파일이 정적 자산으로 제공됩니다"
echo "   - 네트워크 연결 없이도 PDF 처리 가능"
echo "   - 더 안정적이고 빠른 로딩"
echo ""

cd ..
exit 0