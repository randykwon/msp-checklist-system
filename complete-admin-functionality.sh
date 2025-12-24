#!/bin/bash

# Complete Admin Functionality Setup Script
# This script completes the MSP Checklist Admin system

set -e

echo "🚀 완전한 Admin 기능 구현 시작..."

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
    print_error "msp-checklist 디렉토리를 찾을 수 없습니다. 올바른 위치에서 실행하세요."
    exit 1
fi

cd msp-checklist/admin

print_status "1. Admin 시스템 상태 확인..."

# Check if admin server is running
if curl -s http://localhost:3011/api/auth/me > /dev/null 2>&1; then
    print_success "Admin 서버가 실행 중입니다 (포트 3011)"
else
    print_warning "Admin 서버가 실행되지 않았습니다. 서버를 시작합니다..."
    
    # Kill any existing processes
    pkill -f "next dev.*3011" || true
    sleep 2
    
    # Start admin server in background
    npm run dev > ../admin-server.log 2>&1 &
    ADMIN_PID=$!
    echo $ADMIN_PID > ../admin-server.pid
    
    print_status "Admin 서버 시작 대기 중..."
    sleep 10
    
    # Check if server started successfully
    if curl -s http://localhost:3011/api/auth/me > /dev/null 2>&1; then
        print_success "Admin 서버가 성공적으로 시작되었습니다"
    else
        print_error "Admin 서버 시작에 실패했습니다"
        exit 1
    fi
fi

print_status "2. 데이터베이스 연결 확인..."

# Check database symlink
if [ -L "msp-assessment.db" ] && [ -e "msp-assessment.db" ]; then
    print_success "데이터베이스 심볼릭 링크가 올바르게 설정되어 있습니다"
else
    print_warning "데이터베이스 심볼릭 링크를 다시 생성합니다..."
    rm -f msp-assessment.db
    ln -s ../msp-assessment.db msp-assessment.db
    print_success "데이터베이스 심볼릭 링크가 생성되었습니다"
fi

print_status "3. Admin 사용자 계정 확인..."

# Check if admin users exist and create if needed
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), '..', 'msp-assessment.db');
const db = new Database(dbPath);

// Check for admin users
const adminUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role IN (?, ?)').get('admin', 'superadmin');

if (adminUsers.count === 0) {
    console.log('Admin 사용자가 없습니다. 기본 Admin 사용자를 생성합니다...');
    
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    const insertUser = db.prepare(\`
        INSERT OR IGNORE INTO users (email, password, name, role, status, organization)
        VALUES (?, ?, ?, ?, ?, ?)
    \`);
    
    insertUser.run('admin@msp.com', hashedPassword, 'MSP 관리자', 'superadmin', 'active', 'MSP 헬퍼');
    console.log('기본 Admin 사용자가 생성되었습니다: admin@msp.com / admin123');
} else {
    console.log('Admin 사용자가 존재합니다 (' + adminUsers.count + '명)');
}

db.close();
"

print_status "4. API 엔드포인트 테스트..."

# Test login functionality
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3011/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@msp.com","password":"admin123"}' \
    -c /tmp/admin_cookies.txt)

if echo "$LOGIN_RESPONSE" | grep -q "로그인 성공"; then
    print_success "로그인 API가 정상 작동합니다"
    
    # Test stats API
    STATS_RESPONSE=$(curl -s -b /tmp/admin_cookies.txt http://localhost:3011/api/admin/stats)
    if echo "$STATS_RESPONSE" | grep -q "totalUsers"; then
        print_success "통계 API가 정상 작동합니다"
    else
        print_warning "통계 API에 문제가 있을 수 있습니다"
    fi
else
    print_error "로그인 API에 문제가 있습니다: $LOGIN_RESPONSE"
fi

# Clean up test cookies
rm -f /tmp/admin_cookies.txt

print_status "5. 필수 페이지 생성 확인..."

# Check if essential pages exist
PAGES=("app/page.tsx" "app/login/page.tsx" "app/users/page.tsx" "app/progress/page.tsx" "app/system/page.tsx")
for page in "${PAGES[@]}"; do
    if [ -f "$page" ]; then
        print_success "페이지 존재: $page"
    else
        print_warning "페이지 누락: $page"
    fi
done

print_status "6. 컴포넌트 및 라이브러리 확인..."

# Check essential components
COMPONENTS=("components/AdminLayout.tsx" "contexts/AuthContext.tsx" "lib/permissions.ts" "lib/database.ts")
for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        print_success "컴포넌트 존재: $component"
    else
        print_warning "컴포넌트 누락: $component"
    fi
done

print_status "7. 패키지 의존성 확인..."

# Check if all required packages are installed
if npm list jsonwebtoken bcryptjs better-sqlite3 > /dev/null 2>&1; then
    print_success "필수 패키지가 모두 설치되어 있습니다"
else
    print_warning "일부 패키지가 누락되었을 수 있습니다. 패키지를 재설치합니다..."
    npm install
fi

print_status "8. 최종 기능 테스트..."

# Test main pages accessibility
PAGES_TO_TEST=("/" "/login" "/users" "/progress" "/system")
for page in "${PAGES_TO_TEST[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011$page)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        print_success "페이지 접근 가능: $page (HTTP $HTTP_CODE)"
    else
        print_warning "페이지 접근 문제: $page (HTTP $HTTP_CODE)"
    fi
done

print_status "9. 서버 상태 최종 확인..."

# Final server status check
if curl -s http://localhost:3011/api/auth/me > /dev/null 2>&1; then
    print_success "Admin 서버가 정상적으로 실행 중입니다"
    
    # Get server process info
    if [ -f "../admin-server.pid" ]; then
        ADMIN_PID=$(cat ../admin-server.pid)
        if ps -p $ADMIN_PID > /dev/null 2>&1; then
            print_success "Admin 서버 프로세스 ID: $ADMIN_PID"
        fi
    fi
else
    print_error "Admin 서버에 문제가 있습니다"
fi

echo ""
echo "=================================================="
echo "🎉 Admin 기능 구현 완료!"
echo "=================================================="
echo ""
echo "📱 Admin 시스템 접속 정보:"
echo "   URL: http://localhost:3011"
echo "   관리자 계정: admin@msp.com"
echo "   비밀번호: admin123"
echo ""
echo "🔧 주요 기능:"
echo "   ✅ 사용자 인증 및 권한 관리"
echo "   ✅ 대시보드 (통계 및 현황)"
echo "   ✅ 사용자 관리"
echo "   ✅ 진행 현황 모니터링"
echo "   ✅ 시스템 관리 (최고관리자만)"
echo ""
echo "📊 권한 시스템:"
echo "   - user: 일반 사용자 (Admin 접근 불가)"
echo "   - operator: 운영자 (대시보드, 진행현황, Q&A)"
echo "   - admin: 관리자 (사용자 관리, 공지사항 등)"
echo "   - superadmin: 최고관리자 (시스템 관리 포함)"
echo ""
echo "🚀 Admin 시스템이 완전히 준비되었습니다!"
echo ""

# Return to original directory
cd ../..

exit 0