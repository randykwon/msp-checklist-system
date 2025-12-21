#!/bin/bash

echo "AWS MSP 자체 평가 헬퍼 시스템 - Electron 앱 시작"

# Next.js 개발 서버 시작 (백그라운드)
echo "Next.js 서버 시작 중..."
npm run dev &
SERVER_PID=$!

# 서버가 시작될 때까지 대기
echo "서버 시작 대기 중..."
sleep 5

# Electron 앱 시작
echo "Electron 앱 시작 중..."
npm run electron

# 종료 시 서버 프로세스 정리
kill $SERVER_PID 2>/dev/null