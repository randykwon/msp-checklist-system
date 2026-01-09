#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 테스트 관리자 계정 생성 스크립트
# 
# 사용법:
#   ./scripts/install/create-admin.sh [이메일] [비밀번호] [이름]
#
# 예시:
#   ./scripts/install/create-admin.sh admin@example.com admin123 관리자
#   ./scripts/install/create-admin.sh  # 기본값 사용
#
# 기본값:
#   이메일: admin@example.com
#   비밀번호: admin123
#   이름: 시스템관리자
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MSP_DIR="$PROJECT_ROOT/msp-checklist"
DB_PATH="$MSP_DIR/msp-assessment.db"

# 기본값 설정
ADMIN_EMAIL="${1:-admin@example.com}"
ADMIN_PASSWORD="${2:-admin123}"
ADMIN_NAME="${3:-시스템관리자}"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       MSP 어드바이저 - 관리자 계정 생성                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# nvm 로드
load_nvm() {
    if [ -n "$SUDO_USER" ]; then
        REAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    else
        REAL_HOME="$HOME"
    fi
    
    if [ -s "$REAL_HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$REAL_HOME/.nvm"
        \. "$NVM_DIR/nvm.sh"
    elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        \. "$NVM_DIR/nvm.sh"
    elif [ -s "/home/ec2-user/.nvm/nvm.sh" ]; then
        export NVM_DIR="/home/ec2-user/.nvm"
        \. "$NVM_DIR/nvm.sh"
    fi
    
    if command -v nvm &> /dev/null; then
        nvm use 20 &> /dev/null || nvm use default &> /dev/null || true
    fi
}

load_nvm

# Node.js 확인
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되어 있지 않습니다."
    exit 1
fi

log_info "Node.js 버전: $(node -v)"

# 프로젝트 디렉토리 확인
if [ ! -d "$MSP_DIR" ]; then
    log_error "MSP 디렉토리를 찾을 수 없습니다: $MSP_DIR"
    exit 1
fi

# better-sqlite3 설치 확인 및 설치
log_info "better-sqlite3 확인 중..."

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# package.json 생성
cat > package.json << 'EOF'
{
  "name": "admin-creator",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "bcryptjs": "^2.4.3"
  }
}
EOF

log_info "의존성 설치 중..."
npm install --silent 2>/dev/null

# 관리자 생성 스크립트 생성
cat > create-admin.mjs << EOF
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = '${DB_PATH}';
const email = '${ADMIN_EMAIL}';
const password = '${ADMIN_PASSWORD}';
const name = '${ADMIN_NAME}';

console.log('[INFO] 데이터베이스 경로:', dbPath);

try {
    const db = new Database(dbPath);
    
    // 기존 사용자 확인
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (existingUser) {
        console.log('[WARN] 이미 존재하는 이메일입니다:', email);
        console.log('[INFO] 기존 계정을 superadmin으로 업데이트합니다...');
        
        // 역할과 상태 업데이트
        db.prepare("UPDATE users SET role = 'superadmin', status = 'active' WHERE email = ?").run(email);
        
        // 비밀번호도 업데이트
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hashedPassword, email);
        
        console.log('[✓] 계정 업데이트 완료');
    } else {
        // 새 관리자 생성
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const stmt = db.prepare(\`
            INSERT INTO users (email, password, name, role, status, organization)
            VALUES (?, ?, ?, 'superadmin', 'active', 'System')
        \`);
        
        stmt.run(email, hashedPassword, name);
        console.log('[✓] 관리자 계정 생성 완료');
    }
    
    // 생성된 계정 확인
    const user = db.prepare('SELECT id, email, name, role, status FROM users WHERE email = ?').get(email);
    console.log('[INFO] 계정 정보:', JSON.stringify(user, null, 2));
    
    db.close();
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  관리자 계정 정보:');
    console.log('    이메일: ' + email);
    console.log('    비밀번호: ' + password);
    console.log('    역할: superadmin');
    console.log('');
    console.log('  로그인 URL:');
    console.log('    메인 앱: http://YOUR_IP:3010/login');
    console.log('    Admin:  http://YOUR_IP:3011/login');
    console.log('═══════════════════════════════════════════════════════════════');
    
} catch (error) {
    console.error('[ERROR] 관리자 생성 실패:', error.message);
    process.exit(1);
}
EOF

# 스크립트 실행
log_info "관리자 계정 생성 중..."
echo ""
node create-admin.mjs

# 임시 디렉토리 정리
cd /
rm -rf "$TEMP_DIR"

echo ""
log_success "완료!"
