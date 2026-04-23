#!/bin/bash
# ============================================
# MSP Checklist 서버 자동 시작 제거 스크립트
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}MSP Checklist 서비스 제거 중...${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}이 스크립트는 root 권한으로 실행해야 합니다.${NC}"
  exit 1
fi

# 서비스 중지 및 비활성화
systemctl stop msp-main.service 2>/dev/null || true
systemctl stop msp-admin.service 2>/dev/null || true
systemctl disable msp-main.service 2>/dev/null || true
systemctl disable msp-admin.service 2>/dev/null || true

# 서비스 파일 삭제
rm -f /etc/systemd/system/msp-main.service
rm -f /etc/systemd/system/msp-admin.service

# 데몬 리로드
systemctl daemon-reload

echo -e "${GREEN}서비스가 제거되었습니다.${NC}"
