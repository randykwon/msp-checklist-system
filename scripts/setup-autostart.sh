#!/bin/bash

# MSP Checklist 서버 자동 시작 설정 스크립트
# macOS LaunchAgent를 사용하여 로그인 시 자동 시작

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 경로 (스크립트 위치 기준)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)