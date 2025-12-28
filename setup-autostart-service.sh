#!/bin/bash

# =============================================================================
# MSP Checklist System - Auto Start Service Setup Script
# EC2 Ubuntu 서버 재시작 시 자동으로 서비스가 시작되도록 설정
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 경로 (기본값)
PROJECT_DIR="${PROJECT_DIR:-/opt/msp-checklist-system}"
MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MSP Checklist Auto Start Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 이 스크립트는 root 권한으로 실행해야 합니다.${NC}"
    echo -e "${YELLOW}   sudo ./setup-autostart-service.sh${NC}"
    exit 1
fi

# 프로젝트 디렉토리 확인
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR${NC}"
    echo -e "${YELLOW}   PROJECT_DIR 환경변수를 설정하거나 기본 경로에 프로젝트를 설치하세요.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 프로젝트 디렉토리: $PROJECT_DIR${NC}"

# Node.js 경로 확인
NODE_PATH=$(which node)
NPM_PATH=$(which npm)

if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}❌ Node.js를 찾을 수 없습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 경로: $NODE_PATH${NC}"

# =============================================================================
# 1. 메인 서버 서비스 파일 생성
# =============================================================================
echo -e "\n${BLUE}📝 메인 서버 서비스 파일 생성 중...${NC}"

cat > /etc/systemd/system/msp-main.service << EOF
[Unit]
Description=MSP Checklist Main Server
Documentation=https://github.com/your-repo/msp-checklist
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/msp-checklist
Environment=NODE_ENV=production
Environment=PORT=${MAIN_PORT}
ExecStart=${NODE_PATH} ${PROJECT_DIR}/msp-checklist/node_modules/.bin/next start -p ${MAIN_PORT}
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=msp-main

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ /etc/systemd/system/msp-main.service 생성 완료${NC}"

# =============================================================================
# 2. 관리자 서버 서비스 파일 생성
# =============================================================================
echo -e "\n${BLUE}📝 관리자 서버 서비스 파일 생성 중...${NC}"

cat > /etc/systemd/system/msp-admin.service << EOF
[Unit]
Description=MSP Checklist Admin Server
Documentation=https://github.com/your-repo/msp-checklist
After=network.target msp-main.service

[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/msp-checklist/admin
Environment=NODE_ENV=production
Environment=PORT=${ADMIN_PORT}
ExecStart=${NODE_PATH} ${PROJECT_DIR}/msp-checklist/admin/node_modules/.bin/next start -p ${ADMIN_PORT}
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=msp-admin

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ /etc/systemd/system/msp-admin.service 생성 완료${NC}"

# =============================================================================
# 3. 서비스 시작 스크립트 생성 (대안)
# =============================================================================
echo -e "\n${BLUE}📝 서비스 시작 스크립트 생성 중...${NC}"

cat > ${PROJECT_DIR}/start-services.sh << 'SCRIPT'
#!/bin/bash

# MSP Checklist 서비스 시작 스크립트
PROJECT_DIR="/opt/msp-checklist-system"
LOG_DIR="${PROJECT_DIR}"

echo "$(date): Starting MSP Checklist services..." >> ${LOG_DIR}/autostart.log

# 메인 서버 시작
cd ${PROJECT_DIR}/msp-checklist
nohup npm run start > ${LOG_DIR}/main-server.log 2>&1 &
echo $! > ${PROJECT_DIR}/main-server.pid
echo "$(date): Main server started with PID $(cat ${PROJECT_DIR}/main-server.pid)" >> ${LOG_DIR}/autostart.log

# 잠시 대기
sleep 5

# 관리자 서버 시작
cd ${PROJECT_DIR}/msp-checklist/admin
nohup npm run start > ${LOG_DIR}/admin-server.log 2>&1 &
echo $! > ${PROJECT_DIR}/admin-server.pid
echo "$(date): Admin server started with PID $(cat ${PROJECT_DIR}/admin-server.pid)" >> ${LOG_DIR}/autostart.log

echo "$(date): All services started successfully" >> ${LOG_DIR}/autostart.log
SCRIPT

chmod +x ${PROJECT_DIR}/start-services.sh
echo -e "${GREEN}✅ ${PROJECT_DIR}/start-services.sh 생성 완료${NC}"

# =============================================================================
# 4. systemd 데몬 리로드 및 서비스 활성화
# =============================================================================
echo -e "\n${BLUE}🔄 systemd 데몬 리로드 중...${NC}"
systemctl daemon-reload

echo -e "\n${BLUE}🔧 서비스 활성화 중...${NC}"
systemctl enable msp-main.service
systemctl enable msp-admin.service

echo -e "${GREEN}✅ 서비스가 부팅 시 자동 시작되도록 설정되었습니다.${NC}"

# =============================================================================
# 5. 서비스 시작
# =============================================================================
echo -e "\n${BLUE}🚀 서비스 시작 중...${NC}"

# 기존 프로세스 종료
echo -e "${YELLOW}기존 프로세스 종료 중...${NC}"
pkill -f "next start -p ${MAIN_PORT}" 2>/dev/null || true
pkill -f "next start -p ${ADMIN_PORT}" 2>/dev/null || true
sleep 2

# 서비스 시작
systemctl start msp-main.service
echo -e "${GREEN}✅ 메인 서버 시작됨${NC}"

sleep 3

systemctl start msp-admin.service
echo -e "${GREEN}✅ 관리자 서버 시작됨${NC}"

# =============================================================================
# 6. 상태 확인
# =============================================================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  서비스 상태 확인${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\n${YELLOW}📊 메인 서버 상태:${NC}"
systemctl status msp-main.service --no-pager -l | head -15

echo -e "\n${YELLOW}📊 관리자 서버 상태:${NC}"
systemctl status msp-admin.service --no-pager -l | head -15

# =============================================================================
# 7. 사용법 안내
# =============================================================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  사용법 안내${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "
${GREEN}서비스 관리 명령어:${NC}

  ${YELLOW}# 서비스 상태 확인${NC}
  sudo systemctl status msp-main
  sudo systemctl status msp-admin

  ${YELLOW}# 서비스 시작${NC}
  sudo systemctl start msp-main
  sudo systemctl start msp-admin

  ${YELLOW}# 서비스 중지${NC}
  sudo systemctl stop msp-main
  sudo systemctl stop msp-admin

  ${YELLOW}# 서비스 재시작${NC}
  sudo systemctl restart msp-main
  sudo systemctl restart msp-admin

  ${YELLOW}# 로그 확인${NC}
  sudo journalctl -u msp-main -f
  sudo journalctl -u msp-admin -f

  ${YELLOW}# 부팅 시 자동 시작 비활성화${NC}
  sudo systemctl disable msp-main
  sudo systemctl disable msp-admin

${GREEN}접속 URL:${NC}
  메인 서버: http://localhost:${MAIN_PORT}
  관리자 서버: http://localhost:${ADMIN_PORT}
"

echo -e "${GREEN}✅ 자동 시작 설정이 완료되었습니다!${NC}"
echo -e "${GREEN}   서버가 재시작되면 자동으로 서비스가 시작됩니다.${NC}"
