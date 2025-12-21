#!/bin/bash

# MSP 체크리스트 빠른 재시작 스크립트 (로그 포함)

LOG_FILE="server.log"

echo "⚡ MSP 체크리스트 빠른 재시작..."

# 로그 파일에 재시작 기록
echo "$(date '+%Y-%m-%d %H:%M:%S') - 서버 재시작 시작" >> $LOG_FILE

# 기존 프로세스 종료
pkill -f "next dev" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null
lsof -ti:3010,3011 | xargs kill -9 2>/dev/null

sleep 2

# 백그라운드에서 서버 시작 (로그 포함)
echo "🚀 서버 시작 중..."

# 메인 서버 시작
cd msp-checklist
nohup npm run dev > ../$LOG_FILE 2>&1 &
MAIN_PID=$!

# 관리자 서버 시작  
cd admin
nohup npm run dev >> ../../$LOG_FILE 2>&1 &
ADMIN_PID=$!

cd ../..

# PID 저장
echo $MAIN_PID > .main_server.pid
echo $ADMIN_PID > .admin_server.pid

echo "$(date '+%Y-%m-%d %H:%M:%S') - 메인 서버 PID: $MAIN_PID" >> $LOG_FILE
echo "$(date '+%Y-%m-%d %H:%M:%S') - 관리자 서버 PID: $ADMIN_PID" >> $LOG_FILE

echo "⏳ 서버 시작 대기 중..."
sleep 5

# 상태 확인
if curl -s http://localhost:3010 > /dev/null && curl -s http://localhost:3011 > /dev/null; then
    echo "✅ 서버 재시작 완료!"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 서버 재시작 완료" >> $LOG_FILE
else
    echo "⚠️  서버 시작 중 문제 발생. 로그를 확인하세요."
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 서버 시작 실패" >> $LOG_FILE
fi

echo ""
echo "📱 접속: http://localhost:3010 (메인) | http://localhost:3011 (관리자)"
echo "📝 로그: tail -f $LOG_FILE"