#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 관리자 계정 생성 스크립트
#
# 사용법:
#   ./create-admin.sh [이메일] [비밀번호] [이름]
#   ./create-admin.sh admin@example.com admin123 "시스템관리자"
#
# 기본값:
#   이메일: admin@msp.local
#   비밀번호: Admin123!
#   이름: 시스템관리자
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 설정
INSTALL_DIR="/opt/msp-checklist-system"
DB_PATH="${INSTALL_DIR}/msp-checklist/msp-assessment.db"

# 기본값
DEFAULT_EMAIL="admin@msp.local"
DEFAULT_PASSWORD="Admin123!"
DEFAULT_NAME="시스템관리자"

# 파라미터 처리
EMAIL="${1:-$DEFAULT_EMAIL}"
PASSWORD="${2:-$DEFAULT_PASSWORD}"
NAME="${3:-$DEFAULT_NAME}"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          MSP 어드바이저 - 관리자 계정 생성                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Node.js 확인 및 nvm 로드
load_nvm() {
    # 여러 가능한 nvm 경로 시도
    local NVM_PATHS=(
        "$HOME/.nvm"
        "/home/ec2-user/.nvm"
        "/home/ubuntu/.nvm"
        "/root/.nvm"
    )
    
    for NVM_PATH in "${NVM_PATHS[@]}"; do
        if [ -s "$NVM_PATH/nvm.sh" ]; then
            export NVM_DIR="$NVM_PATH"
            \. "$NVM_PATH/nvm.sh"
            return 0
        fi
    done
    return 1
}

if ! command -v node &> /dev/null; then
    load_nvm
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되어 있지 않습니다."
        log_info "nvm을 찾을 수 없습니다. sudo 없이 실행하거나 ec2-user로 실행해주세요:"
        log_info "  sudo -u ec2-user $0 $@"
        exit 1
    fi
fi

log_info "Node.js: $(node -v)"

log_info "관리자 계정 생성 중..."
log_info "  이메일: ${EMAIL}"
log_info "  이름: ${NAME}"

# Node.js 스크립트로 관리자 생성 (msp-checklist 디렉토리에서 실행)
cd "${INSTALL_DIR}/msp-checklist"

node << NODEJS_SCRIPT
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = '${DB_PATH}';
const email = '${EMAIL}';
const password = '${PASSWORD}';
const name = '${NAME}';

// DB 디렉토리 확인
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// DB 연결
const db = new Database(dbPath);

// users 테이블 생성 (없으면)
db.exec(\`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
\`);

// 기존 관리자 확인
const existing = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);

if (existing) {
    console.log(\`[INFO] 기존 계정 발견: \${existing.email} (role: \${existing.role})\`);
    
    // 비밀번호 업데이트
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
      .run(hashedPassword, 'superadmin', 'active', email);
    
    console.log('[✓] 관리자 계정 업데이트 완료');
} else {
    // 새 관리자 생성
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.prepare(\`
        INSERT INTO users (email, password, name, role, status)
        VALUES (?, ?, ?, 'superadmin', 'active')
    \`).run(email, hashedPassword, name);
    
    console.log('[✓] 관리자 계정 생성 완료');
}

// 생성된 계정 확인
const admin = db.prepare('SELECT id, email, name, role, status FROM users WHERE email = ?').get(email);
console.log(\`[INFO] 계정 정보: ID=\${admin.id}, Email=\${admin.email}, Role=\${admin.role}\`);

db.close();
NODEJS_SCRIPT

if [ $? -eq 0 ]; then
    log_success "관리자 계정 생성/업데이트 완료!"
    echo ""
    echo "  로그인 정보:"
    echo "    이메일:   ${EMAIL}"
    echo "    비밀번호: ${PASSWORD}"
    echo "    역할:     superadmin (최고 관리자)"
    echo ""
    echo "  Admin 접속: http://localhost:3011"
    echo ""
else
    log_error "관리자 계정 생성 실패"
    exit 1
fi
