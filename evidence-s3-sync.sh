#!/bin/bash
# ============================================================================
# 증빙 자료 S3 동기화 스크립트
# EC2 로컬 폴더의 증빙 파일을 S3로 주기적으로 업로드
# ============================================================================

# 설정
EVIDENCE_BASE_DIR="${EVIDENCE_STORAGE_PATH:-/opt/msp-checklist-system/evidence-files}"
PENDING_DIR="$EVIDENCE_BASE_DIR/pending"
UPLOADED_DIR="$EVIDENCE_BASE_DIR/uploaded"
S3_BUCKET="${EVIDENCE_S3_BUCKET:-}"
S3_PREFIX="${EVIDENCE_S3_PREFIX:-evidence-files}"
LOG_FILE="/var/log/evidence-s3-sync.log"
LOCK_FILE="/tmp/evidence-s3-sync.lock"

# 로깅 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 락 파일 확인 (중복 실행 방지)
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        log "Another sync process is running (PID: $PID). Exiting."
        exit 0
    else
        log "Stale lock file found. Removing."
        rm -f "$LOCK_FILE"
    fi
fi

# 락 파일 생성
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# S3 버킷 확인
if [ -z "$S3_BUCKET" ]; then
    log "ERROR: EVIDENCE_S3_BUCKET environment variable is not set"
    exit 1
fi

# AWS CLI 확인
if ! command -v aws &> /dev/null; then
    log "ERROR: AWS CLI is not installed"
    exit 1
fi

# 디렉토리 확인
if [ ! -d "$PENDING_DIR" ]; then
    log "Pending directory does not exist: $PENDING_DIR"
    exit 0
fi

# 업로드 디렉토리 생성
mkdir -p "$UPLOADED_DIR"

log "Starting S3 sync..."
log "Source: $PENDING_DIR"
log "Destination: s3://$S3_BUCKET/$S3_PREFIX/"

# 업로드 카운터
UPLOADED_COUNT=0
FAILED_COUNT=0
TOTAL_SIZE=0

# pending 디렉토리의 모든 파일 처리
find "$PENDING_DIR" -type f ! -name "*.meta.json" | while read -r FILE; do
    if [ -f "$FILE" ]; then
        # 상대 경로 계산
        REL_PATH="${FILE#$PENDING_DIR/}"
        S3_KEY="$S3_PREFIX/$REL_PATH"
        
        # 파일 크기
        FILE_SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
        
        log "Uploading: $REL_PATH ($FILE_SIZE bytes)"
        
        # S3 업로드
        if aws s3 cp "$FILE" "s3://$S3_BUCKET/$S3_KEY" --quiet; then
            log "SUCCESS: $REL_PATH -> s3://$S3_BUCKET/$S3_KEY"
            
            # uploaded 폴더로 이동
            DEST_DIR="$UPLOADED_DIR/$(dirname "$REL_PATH")"
            mkdir -p "$DEST_DIR"
            mv "$FILE" "$DEST_DIR/"
            
            # 메타데이터 파일 업데이트 및 이동
            META_FILE="$FILE.meta.json"
            if [ -f "$META_FILE" ]; then
                # 메타데이터에 S3 정보 추가
                TMP_META=$(mktemp)
                jq --arg s3key "$S3_KEY" --arg s3bucket "$S3_BUCKET" \
                   '. + {s3Uploaded: true, s3Key: $s3key, s3Bucket: $s3bucket, s3UploadedAt: (now | todate)}' \
                   "$META_FILE" > "$TMP_META" 2>/dev/null
                
                if [ $? -eq 0 ]; then
                    mv "$TMP_META" "$DEST_DIR/$(basename "$META_FILE")"
                    rm -f "$META_FILE"
                else
                    # jq가 없으면 단순 이동
                    mv "$META_FILE" "$DEST_DIR/"
                fi
            fi
            
            UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
            TOTAL_SIZE=$((TOTAL_SIZE + FILE_SIZE))
        else
            log "FAILED: $REL_PATH"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
done

# 빈 디렉토리 정리
find "$PENDING_DIR" -type d -empty -delete 2>/dev/null

log "Sync completed. Uploaded: $UPLOADED_COUNT, Failed: $FAILED_COUNT, Total size: $TOTAL_SIZE bytes"
