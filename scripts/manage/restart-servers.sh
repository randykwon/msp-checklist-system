#!/bin/bash

# ============================================================================
# MSP Checklist System - 서버 재시작 스크립트
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/stop-servers.sh"
sleep 2
"$SCRIPT_DIR/start-servers.sh"
