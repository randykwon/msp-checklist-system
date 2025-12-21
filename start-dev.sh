#!/bin/bash

# MSP 체크리스트 개발 환경 시작 스크립트

echo "🚀 MSP 체크리스트 개발 환경 시작"
echo "================================"

# 의존성 설치 확인
echo "📦 의존성 확인 중..."

if [ ! -d "msp-checklist/node_modules" ]; then
    echo "📥 메인 프로젝트 의존성 설치 중..."
    cd msp-checklist
    npm install
    cd ..
fi

if [ ! -d "msp-checklist/admin/node_modules" ]; then
    echo "📥 관리자 프로젝트 의존성 설치 중..."
    cd msp-checklist/admin
    npm install
    cd ../..
fi

# 데이터베이스 초기화 확인
echo ""
echo "💾 데이터베이스 확인 중..."

if [ ! -f "msp-checklist/msp-assessment.db" ]; then
    echo "🔧 데이터베이스 초기화 필요"
    echo "다음 명령어를 실행하세요:"
    echo "  node create-admin.cjs"
    echo "  node create-operator.cjs"
fi

# 환경 변수 확인
echo ""
echo "🔐 환경 설정 확인 중..."

if [ ! -f "msp-checklist/.env.local" ]; then
    echo "⚠️  .env.local 파일이 없습니다."
    echo "msp-checklist/.env.local.example을 참고하여 설정하세요."
fi

if [ ! -f "msp-checklist/admin/.env.local" ]; then
    echo "⚠️  admin/.env.local 파일이 없습니다."
    echo "msp-checklist/admin/.env.local.example을 참고하여 설정하세요."
fi

# 서버 시작
echo ""
echo "🌟 서버 시작 중..."

# 기존 프로세스 정리
pkill -f "next dev" 2>/dev/null
lsof -ti:3010,3011 | xargs kill -9 2>/dev/null

sleep 2

# 터미널 분할하여 서버 시작 (tmux 사용 권장)
if command -v tmux &> /dev/null; then
    echo "📺 tmux 세션으로 서버 시작..."
    
    # 새 tmux 세션 생성
    tmux new-session -d -s msp-servers
    
    # 메인 서버 창
    tmux send-keys -t msp-servers "cd msp-checklist && npm run dev" Enter
    
    # 관리자 서버 창 추가
    tmux new-window -t msp-servers
    tmux send-keys -t msp-servers "cd msp-checklist/admin && npm run dev" Enter
    
    # 첫 번째 창으로 돌아가기
    tmux select-window -t msp-servers:0
    
    echo "✅ tmux 세션 'msp-servers'에서 서버 실행 중"
    echo ""
    echo "🔍 tmux 세션 확인: tmux attach -t msp-servers"
    echo "🛑 tmux 세션 종료: tmux kill-session -t msp-servers"
    
else
    echo "📋 백그라운드에서 서버 시작..."
    
    # 백그라운드에서 서버 시작
    cd msp-checklist
    npm run dev > ../server.log 2>&1 &
    MAIN_PID=$!
    
    cd admin
    npm run dev >> ../../server.log 2>&1 &
    ADMIN_PID=$!
    
    cd ../..
    
    echo "메인 서버 PID: $MAIN_PID"
    echo "관리자 서버 PID: $ADMIN_PID"
    echo ""
    echo "📝 로그 확인: tail -f server.log"
fi

echo ""
echo "⏳ 서버 시작 대기 중..."
sleep 8

# 상태 확인
echo ""
echo "📊 서버 상태 확인..."
./server-status.sh

echo ""
echo "🎉 개발 환경 시작 완료!"
echo ""
echo "📱 접속 주소:"
echo "   메인 서비스: http://localhost:3010"
echo "   관리자 시스템: http://localhost:3011"
echo ""
echo "🛠️  유용한 명령어:"
echo "   ./server-status.sh    - 서버 상태 확인"
echo "   ./restart-servers.sh  - 서버 재시작"
echo "   ./stop-servers.sh     - 서버 중지"