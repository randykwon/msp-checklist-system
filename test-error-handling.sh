#!/bin/bash

# Test the error handling from the main script
set -o pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

# Error trap for debugging
error_handler() {
    local line_number=$1
    local error_code=$2
    local command="$3"
    log_error "❌ 스크립트 실행 오류 발생!"
    log_error "   라인: $line_number"
    log_error "   오류 코드: $error_code"
    log_error "   명령어: $command"
    log_error "   현재 디렉토리: $(pwd)"
    log_error "   사용자: $(whoami)"
    exit $error_code
}

trap 'error_handler ${LINENO} $? "$BASH_COMMAND"' ERR

# Test function
test_function() {
    log_step "Testing error handling..."
    
    # This should work
    echo "This command works"
    
    # This should fail and trigger the error handler
    log_step "About to run a failing command..."
    /bin/nonexistent_command
    
    # This should not be reached
    log_success "This should not be printed"
}

echo "Starting error handling test..."
test_function
echo "Test completed"