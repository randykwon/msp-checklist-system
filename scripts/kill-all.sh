#!/bin/bash
#===============================================================================
# MSP 어드바이저 - 서버 강제 종료 스크립트
# 
# 사용법:
#   ./scripts/kill-all.sh
#===============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          MSP 어드바이저 - 서버 강제 종료                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# PM2 프로세스 종료
echo "[INFO] PM2 프로세스 종료 중..."
pm2 kill 2>/dev/null || true

# 포트 3010 사용 프로세스 종료
echo "[INFO] 포트 3010 프로세스 종료 중..."
PIDS_3010=$(lsof -ti:3010 2>/dev/null)
if [ -n "$PIDS_3010" ]; then
    echo "  종료할 PID: $PIDS_3010"
    kill -9 $PIDS_3010 2>/dev/null || true
fi

# 포트 3011 사용 프로세스 종료
echo "[INFO] 포트 3011 프로세스 종료 중..."
PIDS_3011=$(lsof -ti:3011 2>/dev/null)
if [ -n "$PIDS_3011" ]; then
    echo "  종료할 PID: $PIDS_3011"
    kill -9 $PIDS_3011 2>/dev/null || true
fi

# Next.js 관련 프로세스 종료
echo "[INFO] Next.js 프로세스 종료 중..."
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true

# PID 파일 삭제
echo "[INFO] PID 파일 정리 중..."
rm -f /opt/msp-checklist-system/main-server.pid 2>/dev/null
rm -f /opt/msp-checklist-system/admin-server.pid 2>/dev/null

# 잠시 대기
sleep 2

# 상태 확인
echo ""
echo "[INFO] 포트 상태 확인:"
if lsof -i:3010 &>/dev/null; then
    echo "  ⚠️  포트 3010: 아직 사용 중"
else
    echo "  ✓ 포트 3010: 사용 가능"
fi

if lsof -i:3011 &>/dev/null; then
    echo "  ⚠️  포트 3011: 아직 사용 중"
else
    echo "  ✓ 포트 3011: 사용 가능"
fi

echo ""
echo "[✓] 완료!"
echo ""
echo "서버 재시작:"
echo "  pm2 start /opt/msp-checklist-system/ecosystem.config.cjs"
echo "  또는"
echo "  ./scripts/server-all.sh start"
echo ""
