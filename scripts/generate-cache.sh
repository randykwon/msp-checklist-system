#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 캐시 및 요약 일괄 생성 스크립트
# 
# 사용법:
#   ./scripts/generate-cache.sh [옵션]
#
# 옵션:
#   --all              모든 캐시 및 요약 생성 (기본값)
#   --advice           조언 캐시만 생성
#   --evidence         가상증빙 캐시만 생성
#   --advice-summary   조언 요약만 생성
#   --evidence-summary 가상증빙 요약만 생성
#   --lang ko          한국어만 (기본값: ko,en 둘 다)
#   --lang en          영어만
#   --model            LLM 모델 선택 메뉴 표시
#   --force            기존 캐시 무시하고 강제 재생성
#   --host URL         Admin 서버 URL (기본값: http://localhost:3011)
#   --main-host URL    메인 서버 URL (기본값: http://localhost:3010)
#
# 예시:
#   ./scripts/generate-cache.sh --all --model
#   ./scripts/generate-cache.sh --advice --force
#   ./scripts/generate-cache.sh --evidence --model
#===============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# 기본 설정
ADMIN_HOST="${ADMIN_HOST:-http://localhost:3011}"
MAIN_HOST="${MAIN_HOST:-http://localhost:3010}"
LANGUAGES="ko,en"
GENERATE_ADVICE=false
GENERATE_EVIDENCE=false
GENERATE_ADVICE_SUMMARY=false
GENERATE_EVIDENCE_SUMMARY=false
GENERATE_ALL=true
SELECT_MODEL=false
FORCE_REGENERATE=false

# LLM 설정 (선택된 모델)
LLM_PROVIDER=""
LLM_MODEL=""

# 로그 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }
log_progress() { echo -e "${MAGENTA}[진행]${NC} $1"; }

# LLM 모델 목록
declare -a BEDROCK_MODELS=(
    "anthropic.claude-3-5-sonnet-20241022-v2:0|Claude 3.5 Sonnet v2 (추천)"
    "anthropic.claude-3-5-haiku-20241022-v1:0|Claude 3.5 Haiku (빠름)"
    "anthropic.claude-3-haiku-20240307-v1:0|Claude 3 Haiku (저렴)"
    "anthropic.claude-3-sonnet-20240229-v1:0|Claude 3 Sonnet"
    "anthropic.claude-3-opus-20240229-v1:0|Claude 3 Opus (고품질)"
    "anthropic.claude-opus-4-5-20251101-v1:0|Claude Opus 4.5 (⚠️ Inference Profile 필요)"
    "anthropic.claude-sonnet-4-5-20250929-v1:0|Claude Sonnet 4.5 (⚠️ Inference Profile 필요)"
)

declare -a OPENAI_MODELS=(
    "gpt-4o|GPT-4o (추천)"
    "gpt-4o-mini|GPT-4o Mini (빠름)"
    "gpt-4-turbo|GPT-4 Turbo"
    "gpt-4|GPT-4"
)

declare -a GEMINI_MODELS=(
    "gemini-1.5-pro|Gemini 1.5 Pro (추천)"
    "gemini-1.5-flash|Gemini 1.5 Flash (빠름)"
    "gemini-pro|Gemini Pro"
)

# LLM 모델 선택 메뉴
select_llm_model() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    LLM 모델 선택                              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Provider를 선택하세요:"
    echo ""
    echo "    1) AWS Bedrock (Claude)"
    echo "    2) OpenAI (GPT)"
    echo "    3) Google (Gemini)"
    echo "    4) 기본값 사용 (.env.local 설정)"
    echo ""
    read -p "  선택 [1-4]: " provider_choice
    
    case $provider_choice in
        1)
            LLM_PROVIDER="bedrock"
            echo ""
            echo "  Bedrock 모델을 선택하세요:"
            echo ""
            local i=1
            for model_info in "${BEDROCK_MODELS[@]}"; do
                local model_id="${model_info%%|*}"
                local model_name="${model_info##*|}"
                echo "    $i) $model_name"
                ((i++))
            done
            echo ""
            read -p "  선택 [1-${#BEDROCK_MODELS[@]}]: " model_choice
            
            if [[ $model_choice -ge 1 && $model_choice -le ${#BEDROCK_MODELS[@]} ]]; then
                local selected="${BEDROCK_MODELS[$((model_choice-1))]}"
                LLM_MODEL="${selected%%|*}"
                log_success "선택된 모델: Bedrock - ${selected##*|}"
            else
                log_warn "잘못된 선택. 기본값 사용."
            fi
            ;;
        2)
            LLM_PROVIDER="openai"
            echo ""
            echo "  OpenAI 모델을 선택하세요:"
            echo ""
            local i=1
            for model_info in "${OPENAI_MODELS[@]}"; do
                local model_id="${model_info%%|*}"
                local model_name="${model_info##*|}"
                echo "    $i) $model_name"
                ((i++))
            done
            echo ""
            read -p "  선택 [1-${#OPENAI_MODELS[@]}]: " model_choice
            
            if [[ $model_choice -ge 1 && $model_choice -le ${#OPENAI_MODELS[@]} ]]; then
                local selected="${OPENAI_MODELS[$((model_choice-1))]}"
                LLM_MODEL="${selected%%|*}"
                log_success "선택된 모델: OpenAI - ${selected##*|}"
            else
                log_warn "잘못된 선택. 기본값 사용."
            fi
            ;;
        3)
            LLM_PROVIDER="gemini"
            echo ""
            echo "  Gemini 모델을 선택하세요:"
            echo ""
            local i=1
            for model_info in "${GEMINI_MODELS[@]}"; do
                local model_id="${model_info%%|*}"
                local model_name="${model_info##*|}"
                echo "    $i) $model_name"
                ((i++))
            done
            echo ""
            read -p "  선택 [1-${#GEMINI_MODELS[@]}]: " model_choice
            
            if [[ $model_choice -ge 1 && $model_choice -le ${#GEMINI_MODELS[@]} ]]; then
                local selected="${GEMINI_MODELS[$((model_choice-1))]}"
                LLM_MODEL="${selected%%|*}"
                log_success "선택된 모델: Gemini - ${selected##*|}"
            else
                log_warn "잘못된 선택. 기본값 사용."
            fi
            ;;
        4|*)
            log_info "기본값 사용 (.env.local 설정)"
            ;;
    esac
    echo ""
}

# 옵션 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            GENERATE_ALL=true
            shift
            ;;
        --advice)
            GENERATE_ADVICE=true
            GENERATE_ALL=false
            shift
            ;;
        --evidence)
            GENERATE_EVIDENCE=true
            GENERATE_ALL=false
            shift
            ;;
        --advice-summary)
            GENERATE_ADVICE_SUMMARY=true
            GENERATE_ALL=false
            shift
            ;;
        --evidence-summary)
            GENERATE_EVIDENCE_SUMMARY=true
            GENERATE_ALL=false
            shift
            ;;
        --lang)
            LANGUAGES="$2"
            shift 2
            ;;
        --model)
            SELECT_MODEL=true
            shift
            ;;
        --force)
            FORCE_REGENERATE=true
            shift
            ;;
        --host)
            ADMIN_HOST="$2"
            shift 2
            ;;
        --main-host)
            MAIN_HOST="$2"
            shift 2
            ;;
        -h|--help)
            head -28 "$0" | tail -26
            exit 0
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            echo "도움말: $0 --help"
            exit 1
            ;;
    esac
done

# --all이면 모두 활성화
if [ "$GENERATE_ALL" = true ]; then
    GENERATE_ADVICE=true
    GENERATE_EVIDENCE=true
    GENERATE_ADVICE_SUMMARY=true
    GENERATE_EVIDENCE_SUMMARY=true
fi

# 시작 시간 기록
START_TIME=$(date +%s)

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       MSP 어드바이저 - 캐시 및 요약 일괄 생성                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# 모델 선택 메뉴 표시
if [ "$SELECT_MODEL" = true ]; then
    select_llm_model
fi

echo ""
echo "  메인 서버:  $MAIN_HOST"
echo "  Admin 서버: $ADMIN_HOST"
echo "  언어: $LANGUAGES"
[ -n "$LLM_PROVIDER" ] && echo "  LLM Provider: $LLM_PROVIDER"
[ -n "$LLM_MODEL" ] && echo "  LLM Model: $LLM_MODEL"
[ "$FORCE_REGENERATE" = true ] && echo "  강제 재생성: 예"
echo "  생성 항목:"
[ "$GENERATE_ADVICE" = true ] && echo "    - 조언 캐시"
[ "$GENERATE_EVIDENCE" = true ] && echo "    - 가상증빙 캐시"
[ "$GENERATE_ADVICE_SUMMARY" = true ] && echo "    - 조언 요약"
[ "$GENERATE_EVIDENCE_SUMMARY" = true ] && echo "    - 가상증빙 요약"
echo ""

# 서버 연결 확인
log_step "서버 연결 확인 중..."

# 메인 서버 확인
MAIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$MAIN_HOST" 2>/dev/null || echo "000")
if [ "$MAIN_STATUS" = "000" ]; then
    log_error "메인 서버에 연결할 수 없습니다: $MAIN_HOST"
    log_info "서버가 실행 중인지 확인하세요: pm2 status"
    exit 1
fi
log_success "메인 서버 연결 확인 (HTTP $MAIN_STATUS)"

# Admin 서버 확인 (요약 생성 시에만 필요)
if [ "$GENERATE_ADVICE_SUMMARY" = true ] || [ "$GENERATE_EVIDENCE_SUMMARY" = true ]; then
    ADMIN_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN_HOST" 2>/dev/null || echo "000")
    if [ "$ADMIN_STATUS" = "000" ]; then
        log_error "Admin 서버에 연결할 수 없습니다: $ADMIN_HOST"
        log_info "서버가 실행 중인지 확인하세요: pm2 status"
        exit 1
    fi
    log_success "Admin 서버 연결 확인 (HTTP $ADMIN_STATUS)"
fi

# 경과 시간 계산 함수
elapsed_time() {
    local start=$1
    local end=$(date +%s)
    local diff=$((end - start))
    local min=$((diff / 60))
    local sec=$((diff % 60))
    if [ $min -gt 0 ]; then
        echo "${min}분 ${sec}초"
    else
        echo "${sec}초"
    fi
}

# LLM 설정 JSON 생성
build_llm_config() {
    if [ -n "$LLM_PROVIDER" ] && [ -n "$LLM_MODEL" ]; then
        # Claude 4.5 모델은 autoCreateInferenceProfile 옵션 추가
        if [[ "$LLM_MODEL" == *"claude-opus-4-5"* ]] || [[ "$LLM_MODEL" == *"claude-sonnet-4-5"* ]] || [[ "$LLM_MODEL" == *"claude-haiku-4-5"* ]]; then
            echo "\"llmConfig\": {\"provider\": \"$LLM_PROVIDER\", \"model\": \"$LLM_MODEL\", \"autoCreateInferenceProfile\": true}"
        else
            echo "\"llmConfig\": {\"provider\": \"$LLM_PROVIDER\", \"model\": \"$LLM_MODEL\"}"
        fi
    else
        echo ""
    fi
}

# 조언 캐시 생성 (메인 앱으로 직접 요청)
generate_advice_cache() {
    local task_start=$(date +%s)
    log_step "조언 캐시 생성 중..."
    log_progress "LLM을 사용하여 61개 항목의 조언을 생성합니다. (약 10-30분 소요)"
    echo ""
    
    # JSON 요청 본문 생성
    local llm_config=$(build_llm_config)
    local force_opt=""
    [ "$FORCE_REGENERATE" = true ] && force_opt=", \"forceRegenerate\": true"
    
    local request_body
    if [ -n "$llm_config" ]; then
        request_body="{\"action\": \"generate\", \"options\": {\"languages\": [\"ko\", \"en\"]$force_opt}, $llm_config}"
    else
        request_body="{\"action\": \"generate\", \"options\": {\"languages\": [\"ko\", \"en\"]$force_opt}}"
    fi
    
    # 백그라운드에서 API 호출
    response_file=$(mktemp)
    curl -s -X POST "$MAIN_HOST/api/advice-cache" \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        --max-time 3600 > "$response_file" 2>&1 &
    
    local curl_pid=$!
    
    # 진행 상황 표시 (예상 진행률)
    local elapsed=0
    local estimated_total=600  # 예상 10분
    while kill -0 $curl_pid 2>/dev/null; do
        elapsed=$(($(date +%s) - task_start))
        local progress=$((elapsed * 100 / estimated_total))
        [ $progress -gt 99 ] && progress=99
        
        local filled=$((progress * 40 / 100))
        local empty=$((40 - filled))
        printf "\r  ${CYAN}[생성 중]${NC} ["
        printf "%${filled}s" | tr ' ' '█'
        printf "%${empty}s" | tr ' ' '░'
        printf "] %3d%% (경과: %s)" $progress "$(elapsed_time $task_start)"
        
        sleep 2
    done
    
    wait $curl_pid
    local response=$(cat "$response_file")
    rm -f "$response_file"
    
    echo ""
    
    if echo "$response" | grep -q '"success":true'; then
        local version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        local total=$(echo "$response" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
        local ko_count=$(echo "$response" | grep -o '"koAdvice":[0-9]*' | cut -d':' -f2)
        local en_count=$(echo "$response" | grep -o '"enAdvice":[0-9]*' | cut -d':' -f2)
        
        log_success "조언 캐시 생성 완료! (소요시간: $(elapsed_time $task_start))"
        echo "    버전: $version"
        echo "    총 항목: ${total}개 (한국어: ${ko_count:-0}개, 영어: ${en_count:-0}개)"
        
        # 생성된 항목이 0개면 경고
        if [ "${ko_count:-0}" = "0" ] && [ "${en_count:-0}" = "0" ]; then
            log_warn "생성된 항목이 없습니다. LLM 설정을 확인하세요."
            log_info "Claude 4.5 모델은 Inference Profile이 필요합니다."
        fi
    elif echo "$response" | grep -q '"error"'; then
        local error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        log_error "조언 캐시 생성 실패 (소요시간: $(elapsed_time $task_start))"
        log_warn "오류: $error_msg"
        return 1
    else
        log_error "조언 캐시 생성 실패 (소요시간: $(elapsed_time $task_start))"
        log_warn "응답: $response"
        return 1
    fi
}

# 가상증빙 캐시 생성 (메인 앱으로 직접 요청)
generate_evidence_cache() {
    local task_start=$(date +%s)
    log_step "가상증빙 캐시 생성 중..."
    log_progress "LLM을 사용하여 61개 항목의 가상증빙을 생성합니다. (약 10-30분 소요)"
    echo ""
    
    # JSON 요청 본문 생성
    local llm_config=$(build_llm_config)
    local force_opt=""
    [ "$FORCE_REGENERATE" = true ] && force_opt=", \"forceRegenerate\": true"
    
    local request_body
    if [ -n "$llm_config" ]; then
        request_body="{\"action\": \"generate\", \"options\": {\"languages\": [\"ko\", \"en\"]$force_opt}, $llm_config}"
    else
        request_body="{\"action\": \"generate\", \"options\": {\"languages\": [\"ko\", \"en\"]$force_opt}}"
    fi
    
    # 백그라운드에서 API 호출
    response_file=$(mktemp)
    curl -s -X POST "$MAIN_HOST/api/virtual-evidence-cache" \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        --max-time 3600 > "$response_file" 2>&1 &
    
    local curl_pid=$!
    
    # 진행 상황 표시
    local elapsed=0
    local estimated_total=600
    while kill -0 $curl_pid 2>/dev/null; do
        elapsed=$(($(date +%s) - task_start))
        local progress=$((elapsed * 100 / estimated_total))
        [ $progress -gt 99 ] && progress=99
        
        local filled=$((progress * 40 / 100))
        local empty=$((40 - filled))
        printf "\r  ${CYAN}[생성 중]${NC} ["
        printf "%${filled}s" | tr ' ' '█'
        printf "%${empty}s" | tr ' ' '░'
        printf "] %3d%% (경과: %s)" $progress "$(elapsed_time $task_start)"
        
        sleep 2
    done
    
    wait $curl_pid
    local response=$(cat "$response_file")
    rm -f "$response_file"
    
    echo ""
    
    if echo "$response" | grep -q '"success":true'; then
        local version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        local total=$(echo "$response" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
        local ko_count=$(echo "$response" | grep -o '"koEvidence":[0-9]*' | cut -d':' -f2)
        local en_count=$(echo "$response" | grep -o '"enEvidence":[0-9]*' | cut -d':' -f2)
        
        log_success "가상증빙 캐시 생성 완료! (소요시간: $(elapsed_time $task_start))"
        echo "    버전: $version"
        echo "    총 항목: ${total}개 (한국어: ${ko_count:-0}개, 영어: ${en_count:-0}개)"
        
        # 생성된 항목이 0개면 경고
        if [ "${ko_count:-0}" = "0" ] && [ "${en_count:-0}" = "0" ]; then
            log_warn "생성된 항목이 없습니다. LLM 설정을 확인하세요."
            log_info "Claude 4.5 모델은 Inference Profile이 필요합니다."
        fi
    elif echo "$response" | grep -q '"error"'; then
        local error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        log_error "가상증빙 캐시 생성 실패 (소요시간: $(elapsed_time $task_start))"
        log_warn "오류: $error_msg"
        return 1
    else
        log_error "가상증빙 캐시 생성 실패 (소요시간: $(elapsed_time $task_start))"
        log_warn "응답: $response"
        return 1
    fi
}

# 조언 요약 생성 (Admin 앱으로 요청)
generate_advice_summary() {
    local lang=$1
    local task_start=$(date +%s)
    log_info "  조언 요약 생성 중 (${lang})..."
    
    # JSON 요청 본문 생성
    local llm_config=$(build_llm_config)
    local request_body
    if [ -n "$llm_config" ]; then
        request_body="{\"language\": \"$lang\", $llm_config}"
    else
        request_body="{\"language\": \"$lang\"}"
    fi
    
    # 백그라운드에서 API 호출
    response_file=$(mktemp)
    curl -s -X POST "$ADMIN_HOST/api/advice-summary" \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        --max-time 1800 > "$response_file" 2>&1 &
    
    local curl_pid=$!
    
    # 진행 상황 표시
    local estimated_total=300  # 예상 5분
    while kill -0 $curl_pid 2>/dev/null; do
        local elapsed=$(($(date +%s) - task_start))
        local progress=$((elapsed * 100 / estimated_total))
        [ $progress -gt 99 ] && progress=99
        
        printf "\r    ${MAGENTA}⏳${NC} 요약 생성 중... %3d%% (경과: %s)" $progress "$(elapsed_time $task_start)"
        sleep 1
    done
    
    wait $curl_pid
    local response=$(cat "$response_file")
    rm -f "$response_file"
    
    printf "\r%60s\r" " "  # 줄 지우기
    
    if echo "$response" | grep -q '"success":true'; then
        local version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        local success_count=$(echo "$response" | grep -o '"successCount":[0-9]*' | cut -d':' -f2)
        local total_items=$(echo "$response" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
        local error_count=$(echo "$response" | grep -o '"errorCount":[0-9]*' | cut -d':' -f2)
        
        log_success "  조언 요약 완료 (${lang}): ${success_count}/${total_items}개 성공 ($(elapsed_time $task_start))"
        [ "$error_count" != "0" ] && [ -n "$error_count" ] && log_warn "    실패: ${error_count}개"
    else
        log_error "  조언 요약 생성 실패 (${lang})"
        log_warn "    응답: $response"
        return 1
    fi
}

# 가상증빙 요약 생성 (Admin 앱으로 요청)
generate_evidence_summary() {
    local lang=$1
    local task_start=$(date +%s)
    log_info "  가상증빙 요약 생성 중 (${lang})..."
    
    # JSON 요청 본문 생성
    local llm_config=$(build_llm_config)
    local request_body
    if [ -n "$llm_config" ]; then
        request_body="{\"language\": \"$lang\", $llm_config}"
    else
        request_body="{\"language\": \"$lang\"}"
    fi
    
    # 백그라운드에서 API 호출
    response_file=$(mktemp)
    curl -s -X POST "$ADMIN_HOST/api/virtual-evidence-summary" \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        --max-time 1800 > "$response_file" 2>&1 &
    
    local curl_pid=$!
    
    # 진행 상황 표시
    local estimated_total=300
    while kill -0 $curl_pid 2>/dev/null; do
        local elapsed=$(($(date +%s) - task_start))
        local progress=$((elapsed * 100 / estimated_total))
        [ $progress -gt 99 ] && progress=99
        
        printf "\r    ${MAGENTA}⏳${NC} 요약 생성 중... %3d%% (경과: %s)" $progress "$(elapsed_time $task_start)"
        sleep 1
    done
    
    wait $curl_pid
    local response=$(cat "$response_file")
    rm -f "$response_file"
    
    printf "\r%60s\r" " "  # 줄 지우기
    
    if echo "$response" | grep -q '"success":true'; then
        local version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        local success_count=$(echo "$response" | grep -o '"successCount":[0-9]*' | cut -d':' -f2)
        local total_items=$(echo "$response" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
        local error_count=$(echo "$response" | grep -o '"errorCount":[0-9]*' | cut -d':' -f2)
        
        log_success "  가상증빙 요약 완료 (${lang}): ${success_count}/${total_items}개 성공 ($(elapsed_time $task_start))"
        [ "$error_count" != "0" ] && [ -n "$error_count" ] && log_warn "    실패: ${error_count}개"
    else
        log_error "  가상증빙 요약 생성 실패 (${lang})"
        log_warn "    응답: $response"
        return 1
    fi
}

# 캐시 생성 (언어 무관하게 한 번만 실행)
if [ "$GENERATE_ADVICE" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${BOLD}1. 조언 캐시 생성${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    generate_advice_cache || true
fi

if [ "$GENERATE_EVIDENCE" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${BOLD}2. 가상증빙 캐시 생성${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    generate_evidence_cache || true
fi

# 요약 생성 (언어별로 실행)
if [ "$GENERATE_ADVICE_SUMMARY" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${BOLD}3. 조언 요약 생성${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    IFS=',' read -ra LANG_ARRAY <<< "$LANGUAGES"
    for lang in "${LANG_ARRAY[@]}"; do
        lang=$(echo "$lang" | xargs)  # trim whitespace
        generate_advice_summary "$lang" || true
    done
fi

if [ "$GENERATE_EVIDENCE_SUMMARY" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${BOLD}4. 가상증빙 요약 생성${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    IFS=',' read -ra LANG_ARRAY <<< "$LANGUAGES"
    for lang in "${LANG_ARRAY[@]}"; do
        lang=$(echo "$lang" | xargs)  # trim whitespace
        generate_evidence_summary "$lang" || true
    done
fi

# 총 소요 시간 계산
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
TOTAL_MIN=$((TOTAL_TIME / 60))
TOTAL_SEC=$((TOTAL_TIME % 60))

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}캐시 및 요약 생성 완료!${NC}                                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ⏱️  총 소요 시간: ${TOTAL_MIN}분 ${TOTAL_SEC}초"
echo ""
echo "  📊 캐시 상태 확인:"
echo "    Admin 캐시 페이지: $ADMIN_HOST/cache"
echo "    Admin 가상증빙 페이지: $ADMIN_HOST/virtual-evidence"
echo ""
echo "  ⚠️  캐시 버전 활성화:"
echo "    Admin 페이지에서 생성된 버전을 '활성화'해야 사용자에게 적용됩니다."
echo ""
