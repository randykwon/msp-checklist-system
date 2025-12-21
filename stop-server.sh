#!/bin/bash

# AWS MSP 체크리스트 서버 중지 스크립트
# 사용법: ./stop-server.sh

echo "🛑 AWS MSP 체크리스트 서버 중지 중..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 포트 3010에서 실행 중인 프로세스 찾기 및 종료
echo -e "${YELLOW}🔍 포트 3010에서 실행 중인 프로세스 확인...${NC}"
PIDS=$(lsof -ti:3010 2>/dev/null)

if [ ! -z "$PIDS" ]; then
    echo -e "${RED}🛑 포트 3010에서 실행 중인 프로세스 발견: $PIDS${NC}"
    echo -e "${YELLOW}   프로세스 종료 중...${NC}"
    kill -9 $PIDS 2>/dev/null
    sleep 2
    echo -e "${GREEN}✅ 웹 서버 프로세스 종료 완료${NC}"
else
    echo -e "${GREEN}✅ 포트 3010에 실행 중인 프로세스가 없습니다${NC}"
fi

# 파일 감시 프로세스 찾기 및 종료
echo -e "${YELLOW}🔍 파일 감시 프로세스 확인...${NC}"
FILE_WATCHER_PIDS=$(ps aux | grep "file-watcher.js" | grep -v grep | awk '{print $2}')

if [ ! -z "$FILE_WATCHER_PIDS" ]; then
    echo -e "${RED}🛑 파일 감시 프로세스 발견: $FILE_WATCHER_PIDS${NC}"
    echo -e "${YELLOW}   프로세스 종료 중...${NC}"
    kill -9 $FILE_WATCHER_PIDS 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ 파일 감시 프로세스 종료 완료${NC}"
else
    echo -e "${GREEN}✅ 실행 중인 파일 감시 프로세스가 없습니다${NC}"
fi

# npm run dev 프로세스도 확인
echo -e "${YELLOW}🔍 npm 프로세스 확인...${NC}"
NPM_PIDS=$(ps aux | grep "npm run dev" | grep -v grep | awk '{print $2}')

if [ ! -z "$NPM_PIDS" ]; then
    echo -e "${RED}🛑 npm 프로세스 발견: $NPM_PIDS${NC}"
    echo -e "${YELLOW}   프로세스 종료 중...${NC}"
    kill -9 $NPM_PIDS 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ npm 프로세스 종료 완료${NC}"
fi

# npm run watch 프로세스도 확인
NPM_WATCH_PIDS=$(ps aux | grep "npm run watch" | grep -v grep | awk '{print $2}')

if [ ! -z "$NPM_WATCH_PIDS" ]; then
    echo -e "${RED}🛑 npm watch 프로세스 발견: $NPM_WATCH_PIDS${NC}"
    echo -e "${YELLOW}   프로세스 종료 중...${NC}"
    kill -9 $NPM_WATCH_PIDS 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ npm watch 프로세스 종료 완료${NC}"
fi

# Next.js 프로세스 확인
NEXT_PIDS=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2}')

if [ ! -z "$NEXT_PIDS" ]; then
    echo -e "${RED}🛑 Next.js 서버 프로세스 발견: $NEXT_PIDS${NC}"
    echo -e "${YELLOW}   프로세스 종료 중...${NC}"
    kill -9 $NEXT_PIDS 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ Next.js 서버 프로세스 종료 완료${NC}"
fi

# 로그 파일 정리 (선택사항)
echo -e "${YELLOW}🧹 로그 파일 정리...${NC}"
if [ -f "server.log" ]; then
    echo -e "${BLUE}   server.log 파일 크기: $(du -h server.log | cut -f1)${NC}"
fi

if [ -f "file-watcher.log" ]; then
    echo -e "${BLUE}   file-watcher.log 파일 크기: $(du -h file-watcher.log | cut -f1)${NC}"
fi

# 최종 확인
echo -e "${YELLOW}🔍 최종 프로세스 확인...${NC}"
REMAINING_PIDS=$(lsof -ti:3010 2>/dev/null)

if [ -z "$REMAINING_PIDS" ]; then
    echo -e "${GREEN}✅ 모든 서버 프로세스가 성공적으로 종료되었습니다${NC}"
else
    echo -e "${RED}⚠️  일부 프로세스가 여전히 실행 중입니다: $REMAINING_PIDS${NC}"
    echo -e "${YELLOW}   수동으로 종료하려면: kill -9 $REMAINING_PIDS${NC}"
fi

echo ""
echo -e "${GREEN}🎉 서버 중지 완료!${NC}"
echo ""
echo -e "${BLUE}📋 유용한 명령어:${NC}"
echo -e "${BLUE}   • 서버 재시작: ./restart-server.sh${NC}"
echo -e "${BLUE}   • 프로세스 확인: ps aux | grep node${NC}"
echo -e "${BLUE}   • 포트 확인: lsof -i:3010${NC}"
echo ""