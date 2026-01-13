a#!/bin/bash
# ============================================
# MSP Checklist 서버 자동 시작 설정 스크립트
# Amazon Linux 2 / Amazon Linux 2023 용
# ============================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MSP Checklist 서버 자동 시작 설정${NC}"
echo -e "${GREEN}========================================${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}이 스크립트는 root 권한으로 실행해야 합니다.${NC}"
  echo "sudo $0"
  exit 1
fi

# 변수 설정 (필요시 수정)
APP_USER="${APP_USER:-ec2-user}"
APP_DIR="${APP_DIR:-/home/ec2-user/msp-qna/msp-checklist}"
ADMIN_DIR="${ADMIN_DIR:-/home/ec2-user/msp-qna/msp-checklist/admin}"
NODE_PATH="${NODE_PATH:-/home/ec2-user/.nvm/versions/node/v20.18.1/bin}"
MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${YELLOW}설정 정보:${NC}"
echo "  사용자: $APP_USER"
echo "  메인 앱 경로: $APP_DIR"
echo "  관리자 앱 경로: $ADMIN_DIR"
echo "  Node 경로: $NODE_PATH"
echo "  메인 포트: $MAIN_PORT"
echo "  관리자 포트: $ADMIN_PORT"
echo ""

# 1. 메인 서버 서비스 파일 생성
echo -e "${GREEN}[1/4] 메인 서버 서비스 파일 생성...${NC}"
cat > /etc/systemd/system/msp-main.service << EOF
[Unit]
Description=MSP Checklist Main Server
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$MAIN_PORT
Environment=PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin
ExecStart=$NODE_PATH/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=msp-main

# 프로세스 제한
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 2. 관리자 서버 서비스 파일 생성
echo -e "${GREEN}[2/4] 관리자 서버 서비스 파일 생성...${NC}"
cat > /etc/systemd/system/msp-admin.service << EOF
[Unit]
Description=MSP Checklist Admin Server
After=network.target msp-main.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$ADMIN_DIR
Environment=NODE_ENV=production
Environment=PORT=$ADMIN_PORT
Environment=PATH=$NODE_PATH:/usr/local/bin:/usr/bin:/bin
ExecStart=$NODE_PATH/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=msp-admin

# 프로세스 제한
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 3. systemd 데몬 리로드
echo -e "${GREEN}[3/4] systemd 데몬 리로드...${NC}"
systemctl daemon-reload

# 4. 서비스 활성화 및 시작
echo -e "${GREEN}[4/4] 서비스 활성화 및 시작...${NC}"
systemctl enable msp-main.service
systemctl enable msp-admin.service

# 기존 프로세스 종료 (있다면)
pkill -f "node.*server.js" 2>/dev/null || true
sleep 2

# 서비스 시작
systemctl start msp-main.service
sleep 3
systemctl start msp-admin.service

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}설정 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}서비스 상태 확인:${NC}"
echo "  sudo systemctl status msp-main"
echo "  sudo systemctl status msp-admin"
echo ""
echo -e "${YELLOW}로그 확인:${NC}"
echo "  sudo journalctl -u msp-main -f"
echo "  sudo journalctl -u msp-admin -f"
echo ""
echo -e "${YELLOW}서비스 관리:${NC}"
echo "  sudo systemctl start msp-main    # 시작"
echo "  sudo systemctl stop msp-main     # 중지"
echo "  sudo systemctl restart msp-main  # 재시작"
echo ""

# 상태 출력
echo -e "${YELLOW}현재 서비스 상태:${NC}"
systemctl status msp-main --no-pager || true
echo ""
systemctl status msp-admin --no-pager || true
