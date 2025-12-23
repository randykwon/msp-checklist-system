#!/bin/bash

# MSP Checklist 디스크 공간 확인 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}MSP Checklist 디스크 공간 확인${NC}"
echo "=================================="

# 현재 디스크 사용량
DISK_AVAILABLE=$(df / | awk 'NR==2 {print $4}')
DISK_GB=$((DISK_AVAILABLE / 1024 / 1024))
DISK_USAGE=$(df / | awk 'NR==2 {print $5}')

echo "현재 디스크 상태:"
echo "- 사용 가능 공간: ${DISK_GB}GB"
echo "- 사용률: ${DISK_USAGE}"
echo ""

# 요구사항 확인
if [ $DISK_GB -ge 5 ]; then
    echo -e "${GREEN}✅ 일반 설치 가능 (5GB 이상)${NC}"
    echo "권장: ./amazon-linux-robust-install.sh"
elif [ $DISK_GB -ge 3 ]; then
    echo -e "${YELLOW}⚠️  최소 설치만 가능 (3-5GB)${NC}"
    echo "권장: MSP_MINIMAL_INSTALL=true ./amazon-linux-robust-install.sh"
else
    echo -e "${RED}❌ 디스크 공간 부족 (3GB 미만)${NC}"
    echo "해결: ./optimize-disk-space.sh 실행 후 재시도"
fi

echo ""
echo "상세 디스크 사용량:"
df -h /