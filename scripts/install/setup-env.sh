#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 환경 변수 설정 스크립트
# 
# 생성되는 파일:
#   - msp-checklist/.env.local (메인 앱)
#   - msp-checklist/admin/.env.local (Admin 앱)
#
# 사용법:
#   ./scripts/install/setup-env.sh [옵션]
#
# 옵션:
#   --force     기존 파일 덮어쓰기
#   --interactive  대화형 모드로 설정
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MSP_DIR="$PROJECT_ROOT/msp-checklist"
ADMIN_DIR="$MSP_DIR/admin"

# 옵션 파싱
FORCE_OVERWRITE=false
INTERACTIVE=false

for arg in "$@"; do
    case $arg in
        --force)
            FORCE_OVERWRITE=true
            ;;
        --interactive)
            INTERACTIVE=true
            ;;
    esac
done

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 헤더 출력
print_header() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║          MSP 어드바이저 - 환경 변수 설정                       ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 랜덤 문자열 생성
generate_secret() {
    openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
}

# 메인 앱 환경 변수 설정
setup_main_env() {
    local ENV_FILE="$MSP_DIR/.env.local"
    
    if [ -f "$ENV_FILE" ] && [ "$FORCE_OVERWRITE" = false ]; then
        log_warn "메인 앱 .env.local 파일이 이미 존재합니다."
        log_info "덮어쓰려면 --force 옵션을 사용하세요."
        return
    fi
    
    log_info "메인 앱 환경 변수 파일 생성 중..."
    
    if [ "$INTERACTIVE" = true ]; then
        echo ""
        echo "=== 메인 앱 환경 변수 설정 ==="
        echo ""
        
        read -p "기본 LLM Provider (openai/gemini/claude/bedrock) [bedrock]: " LLM_PROVIDER
        LLM_PROVIDER=${LLM_PROVIDER:-bedrock}
        
        read -p "AWS Region [ap-northeast-2]: " AWS_REGION
        AWS_REGION=${AWS_REGION:-ap-northeast-2}
        
        read -p "AWS Access Key ID: " AWS_ACCESS_KEY
        read -s -p "AWS Secret Access Key: " AWS_SECRET_KEY
        echo ""
        
        read -p "OpenAI API Key (선택): " OPENAI_KEY
        read -p "Gemini API Key (선택): " GEMINI_KEY
        read -p "Anthropic API Key (선택): " ANTHROPIC_KEY
    else
        LLM_PROVIDER="bedrock"
        AWS_REGION="ap-northeast-2"
        AWS_ACCESS_KEY="your-aws-access-key"
        AWS_SECRET_KEY="your-aws-secret-key"
        OPENAI_KEY="your-openai-api-key"
        GEMINI_KEY="your-gemini-api-key"
        ANTHROPIC_KEY="your-anthropic-api-key"
    fi
    
    cat > "$ENV_FILE" << EOF
#===============================================================================
# MSP 어드바이저 - 메인 앱 환경 변수
# 생성일: $(date '+%Y-%m-%d %H:%M:%S')
#===============================================================================

# 기본 LLM Provider (openai, gemini, claude, bedrock)
DEFAULT_LLM_PROVIDER=${LLM_PROVIDER}

#-------------------------------------------------------------------------------
# AWS Bedrock 설정
#-------------------------------------------------------------------------------
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_KEY}
BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0

#-------------------------------------------------------------------------------
# OpenAI 설정
#-------------------------------------------------------------------------------
OPENAI_API_KEY=${OPENAI_KEY}
OPENAI_MODEL=gpt-4o

#-------------------------------------------------------------------------------
# Google Gemini 설정
#-------------------------------------------------------------------------------
GEMINI_API_KEY=${GEMINI_KEY}
GEMINI_MODEL=gemini-1.5-pro

#-------------------------------------------------------------------------------
# Anthropic Claude 설정 (Direct API)
#-------------------------------------------------------------------------------
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
CLAUDE_MODEL=claude-3-5-sonnet-20241022

#-------------------------------------------------------------------------------
# 앱 설정
#-------------------------------------------------------------------------------
# 서버 포트
PORT=3010

# 로그 레벨 (debug, info, warn, error)
LOG_LEVEL=info
EOF
    
    log_success "메인 앱 환경 변수 파일 생성 완료: $ENV_FILE"
}

# Admin 앱 환경 변수 설정
setup_admin_env() {
    local ENV_FILE="$ADMIN_DIR/.env.local"
    
    if [ -f "$ENV_FILE" ] && [ "$FORCE_OVERWRITE" = false ]; then
        log_warn "Admin 앱 .env.local 파일이 이미 존재합니다."
        log_info "덮어쓰려면 --force 옵션을 사용하세요."
        return
    fi
    
    log_info "Admin 앱 환경 변수 파일 생성 중..."
    
    local JWT_SECRET=$(generate_secret)
    
    if [ "$INTERACTIVE" = true ]; then
        echo ""
        echo "=== Admin 앱 환경 변수 설정 ==="
        echo ""
        
        read -p "메인 앱 URL [http://localhost:3010]: " MAIN_APP_URL
        MAIN_APP_URL=${MAIN_APP_URL:-http://localhost:3010}
        
        read -p "Admin 기본 비밀번호 [admin123]: " ADMIN_PASSWORD
        ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
    else
        MAIN_APP_URL="http://localhost:3010"
        ADMIN_PASSWORD="admin123"
    fi
    
    cat > "$ENV_FILE" << EOF
#===============================================================================
# MSP 어드바이저 - Admin 앱 환경 변수
# 생성일: $(date '+%Y-%m-%d %H:%M:%S')
#===============================================================================

#-------------------------------------------------------------------------------
# 메인 앱 연결
#-------------------------------------------------------------------------------
MAIN_APP_URL=${MAIN_APP_URL}
NEXT_PUBLIC_MAIN_APP_URL=${MAIN_APP_URL}

#-------------------------------------------------------------------------------
# 인증 설정
#-------------------------------------------------------------------------------
# JWT Secret (자동 생성됨 - 변경하지 마세요)
JWT_SECRET=${JWT_SECRET}

# Admin 초기 비밀번호
ADMIN_DEFAULT_PASSWORD=${ADMIN_PASSWORD}

#-------------------------------------------------------------------------------
# 앱 설정
#-------------------------------------------------------------------------------
# 서버 포트
PORT=3011

# 로그 레벨 (debug, info, warn, error)
LOG_LEVEL=info
EOF
    
    log_success "Admin 앱 환경 변수 파일 생성 완료: $ENV_FILE"
}

# 완료 메시지
print_completion() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo -e "║  ${GREEN}환경 변수 설정 완료!${NC}                                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  생성된 파일:"
    echo "    • $MSP_DIR/.env.local"
    echo "    • $ADMIN_DIR/.env.local"
    echo ""
    echo "  중요: API 키를 실제 값으로 변경해주세요!"
    echo ""
    echo "  메인 앱 설정 편집:"
    echo "    nano $MSP_DIR/.env.local"
    echo ""
    echo "  Admin 앱 설정 편집:"
    echo "    nano $ADMIN_DIR/.env.local"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# 메인 실행
main() {
    print_header
    setup_main_env
    setup_admin_env
    print_completion
}

# 스크립트 실행
main "$@"
