#!/bin/bash

# AWS MSP 체크리스트 서버 재시작 스크립트
# 사용법: ./restart-server.sh

echo "🔄 AWS MSP 체크리스트 서버 재시작 중..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 현재 실행 중인 프로세스 확인 및 종료
echo -e "${YELLOW}📋 현재 실행 중인 프로세스 확인...${NC}"

# 포트 3010에서 실행 중인 프로세스 찾기
PIDS=$(lsof -ti:3010 2>/dev/null)

if [ ! -z "$PIDS" ]; then
    echo -e "${RED}🛑 포트 3010에서 실행 중인 프로세스 발견: $PIDS${NC}"
    echo -e "${YELLOW}   프로세스 종료 중...${NC}"
    kill -9 $PIDS 2>/dev/null
    sleep 2
    echo -e "${GREEN}✅ 기존 프로세스 종료 완료${NC}"
else
    echo -e "${GREEN}✅ 포트 3010이 비어있습니다${NC}"
fi

# 파일 감시 프로세스도 확인 (file-watcher.js)
FILE_WATCHER_PIDS=$(ps aux | grep "file-watcher.js" | grep -v grep | awk '{print $2}')
if [ ! -z "$FILE_WATCHER_PIDS" ]; then
    echo -e "${RED}🛑 파일 감시 프로세스 발견: $FILE_WATCHER_PIDS${NC}"
    echo -e "${YELLOW}   파일 감시 프로세스 종료 중...${NC}"
    kill -9 $FILE_WATCHER_PIDS 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ 파일 감시 프로세스 종료 완료${NC}"
fi

# Node.js 버전 확인 및 설정
echo -e "${BLUE}🔧 Node.js 환경 설정...${NC}"

# nvm이 있는지 확인
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo -e "${YELLOW}   NVM 로드 중...${NC}"
    source "$HOME/.nvm/nvm.sh"
    
    # .nvmrc 파일이 있으면 해당 버전 사용
    if [ -f "msp-checklist/.nvmrc" ]; then
        cd msp-checklist
        echo -e "${YELLOW}   .nvmrc 파일 발견, Node.js 버전 설정 중...${NC}"
        nvm use
        cd ..
    else
        echo -e "${YELLOW}   Node.js 20.9.0 버전 사용...${NC}"
        nvm use 20.9.0
    fi
else
    echo -e "${YELLOW}   NVM이 설치되지 않음, 시스템 Node.js 사용${NC}"
fi

# 현재 Node.js 버전 확인
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js 버전: $NODE_VERSION${NC}"

# 웹 애플리케이션 서버 시작
echo -e "${BLUE}🚀 웹 애플리케이션 서버 시작...${NC}"
cd msp-checklist

# 백그라운드에서 개발 서버 시작
nohup npm run dev > ../server.log 2>&1 &
WEB_PID=$!

echo -e "${GREEN}✅ 웹 서버 시작됨 (PID: $WEB_PID)${NC}"
echo -e "${BLUE}   로그 파일: server.log${NC}"

# 서버 시작 대기
echo -e "${YELLOW}⏳ 서버 시작 대기 중...${NC}"
sleep 3

# 서버 상태 확인
for i in {1..10}; do
    if curl -s http://localhost:3010 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 웹 서버가 성공적으로 시작되었습니다!${NC}"
        echo -e "${BLUE}   URL: http://localhost:3010${NC}"
        break
    else
        echo -e "${YELLOW}   서버 시작 확인 중... ($i/10)${NC}"
        sleep 2
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ 서버 시작 확인 실패. 로그를 확인해주세요.${NC}"
        echo -e "${BLUE}   로그 확인: tail -f server.log${NC}"
    fi
done

cd ..

# 파일 감시 시스템 시작
echo -e "${BLUE}📁 파일 감시 시스템 시작...${NC}"

# 백그라운드에서 파일 감시 시작
nohup npm run watch > file-watcher.log 2>&1 &
WATCHER_PID=$!

echo -e "${GREEN}✅ 파일 감시 시스템 시작됨 (PID: $WATCHER_PID)${NC}"
echo -e "${BLUE}   로그 파일: file-watcher.log${NC}"

# 최종 상태 출력
echo ""
echo -e "${GREEN}🎉 서버 재시작 완료!${NC}"
echo ""
echo -e "${BLUE}📊 실행 중인 서비스:${NC}"
echo -e "${BLUE}   • 웹 애플리케이션: http://localhost:3010 (PID: $WEB_PID)${NC}"
echo -e "${BLUE}   • 파일 감시 시스템: 실행 중 (PID: $WATCHER_PID)${NC}"
echo ""
echo -e "${BLUE}📋 유용한 명령어:${NC}"
echo -e "${BLUE}   • 웹 서버 로그: tail -f server.log${NC}"
echo -e "${BLUE}   • 파일 감시 로그: tail -f file-watcher.log${NC}"
echo -e "${BLUE}   • 서버 중지: ./stop-server.sh${NC}"
echo -e "${BLUE}   • 프로세스 확인: ps aux | grep node${NC}"
echo ""
echo -e "${GREEN}✨ 준비 완료! 브라우저에서 http://localhost:3010 을 열어보세요.${NC}"