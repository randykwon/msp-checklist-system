#!/bin/bash

# MSP Checklist 캐시 사전 로딩 스크립트
# 조언 캐시 및 가상증빙예제 캐시를 미리 로딩합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# 기본 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MSP_CHECKLIST_DIR="${SCRIPT_DIR}/msp-checklist"
MSP_DATA_DIR="${SCRIPT_DIR}/msp_data/7.x"

# 기본 캐시 파일명
DEFAULT_ADVICE_CACHE="advice_cache_20251218_232330.json"
DEFAULT_EVIDENCE_CACHE="virtual_evidence_cache_2025-12-19T02-58-55.json"

show_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║       MSP Checklist 캐시 사전 로딩 스크립트               ║"
    echo "║                                                            ║"
    echo "║  📦 조언 캐시 + 가상증빙예제 캐시 로딩                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 캐시 파일 찾기
find_cache_file() {
    local filename="$1"
    local search_paths=(
        "${MSP_DATA_DIR}"
        "${SCRIPT_DIR}/msp_data/7.x"
        "${MSP_CHECKLIST_DIR}/cache"
        "${SCRIPT_DIR}/cache"
        "${SCRIPT_DIR}"
    )
    
    for search_path in "${search_paths[@]}"; do
        local full_path="${search_path}/${filename}"
        if [ -f "$full_path" ]; then
            echo "$full_path"
            return 0
        fi
    done
    
    return 1
}

# 캐시 디렉토리 확인 및 생성
ensure_cache_directory() {
    local cache_dir="${MSP_CHECKLIST_DIR}/cache"
    
    if [ ! -d "$cache_dir" ]; then
        log_info "캐시 디렉토리 생성 중: $cache_dir"
        mkdir -p "$cache_dir"
    fi
}

# Node.js 스크립트로 캐시 로딩
load_cache_with_node() {
    local advice_file="$1"
    local evidence_file="$2"
    
    log_step "Node.js 스크립트로 캐시 로딩 중..."
    
    cd "$MSP_CHECKLIST_DIR"
    
    # 스크립트 파일 확인
    if [ ! -f "scripts/preload-cache.js" ]; then
        log_error "preload-cache.js 스크립트를 찾을 수 없습니다."
        return 1
    fi
    
    # 캐시 로딩 실행
    local args=""
    
    if [ -n "$advice_file" ] && [ -f "$advice_file" ]; then
        args="$args --advice-file=$advice_file"
    fi
    
    if [ -n "$evidence_file" ] && [ -f "$evidence_file" ]; then
        args="$args --evidence-file=$evidence_file"
    fi
    
    if node scripts/preload-cache.js $args; then
        return 0
    else
        return 1
    fi
}

# 직접 캐시 파일 복사 (Node.js 스크립트 실패 시 대안)
copy_cache_files() {
    local advice_file="$1"
    local evidence_file="$2"
    local cache_dir="${MSP_CHECKLIST_DIR}/cache"
    
    log_step "캐시 파일 직접 복사 중..."
    
    ensure_cache_directory
    
    local success=true
    
    if [ -n "$advice_file" ] && [ -f "$advice_file" ]; then
        cp "$advice_file" "$cache_dir/"
        log_success "조언 캐시 파일 복사 완료: $(basename $advice_file)"
    else
        log_warning "조언 캐시 파일을 찾을 수 없습니다."
        success=false
    fi
    
    if [ -n "$evidence_file" ] && [ -f "$evidence_file" ]; then
        cp "$evidence_file" "$cache_dir/"
        log_success "가상증빙예제 캐시 파일 복사 완료: $(basename $evidence_file)"
    else
        log_warning "가상증빙예제 캐시 파일을 찾을 수 없습니다."
        success=false
    fi
    
    if [ "$success" = true ]; then
        return 0
    else
        return 1
    fi
}

# 메인 함수
main() {
    show_banner
    
    # 캐시 파일 찾기
    log_step "캐시 파일 검색 중..."
    
    ADVICE_FILE=$(find_cache_file "$DEFAULT_ADVICE_CACHE" || echo "")
    EVIDENCE_FILE=$(find_cache_file "$DEFAULT_EVIDENCE_CACHE" || echo "")
    
    if [ -n "$ADVICE_FILE" ]; then
        log_info "조언 캐시 파일 발견: $ADVICE_FILE"
    else
        log_warning "조언 캐시 파일을 찾을 수 없습니다: $DEFAULT_ADVICE_CACHE"
    fi
    
    if [ -n "$EVIDENCE_FILE" ]; then
        log_info "가상증빙예제 캐시 파일 발견: $EVIDENCE_FILE"
    else
        log_warning "가상증빙예제 캐시 파일을 찾을 수 없습니다: $DEFAULT_EVIDENCE_CACHE"
    fi
    
    echo ""
    
    # 캐시 파일이 하나도 없으면 종료
    if [ -z "$ADVICE_FILE" ] && [ -z "$EVIDENCE_FILE" ]; then
        log_error "로딩할 캐시 파일이 없습니다."
        exit 1
    fi
    
    # Node.js 스크립트로 캐시 로딩 시도
    if [ -f "${MSP_CHECKLIST_DIR}/scripts/preload-cache.js" ]; then
        if load_cache_with_node "$ADVICE_FILE" "$EVIDENCE_FILE"; then
            log_success "캐시 로딩 완료!"
            exit 0
        else
            log_warning "Node.js 스크립트 실행 실패, 직접 복사 시도..."
        fi
    fi
    
    # 직접 복사 시도
    if copy_cache_files "$ADVICE_FILE" "$EVIDENCE_FILE"; then
        log_success "캐시 파일 복사 완료!"
        exit 0
    else
        log_error "캐시 로딩 실패"
        exit 1
    fi
}

# 스크립트 실행
main "$@"
