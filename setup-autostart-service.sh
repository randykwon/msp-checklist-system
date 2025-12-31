#!/bin/bash

# =============================================================================
# MSP Checklist System - Auto Start Service Setup Script
# 서버 재시작 시 자동으로 서비스가 시작되도록 설정
# Amazon Linux 2023 / Ubuntu 호환
# =============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 프로젝트 경로 (기본값)
PROJECT_DIR="${PROJECT_DIR:-/opt/msp-checklist-system}"
MAIN_PORT="${MAIN_PORT:-3010}"
ADMIN_PORT="${ADMIN_PORT:-3011}"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       MSP Checklist Auto Start Service Setup                  ║"
echo "║                                                               ║"
echo "║  🔧 systemd 서비스 등록 및 자동 시작 설정                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 이 스크립트는 root 권한으로 실행해야 합니다.${NC}"
    echo -e "${YELLOW}   sudo ./setup-autostart-service.sh${NC}"
    exit 1
fi

# 프로젝트 디렉토리 확인
if [ ! -d "$PROJECT_DIR/msp-checklist" ]; then
    echo -e "${RED}❌ 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR/msp-checklist${NC}"
    echo -e "${YELLOW}   PROJECT_DIR 환경변수를 설정하거나 기본 경로에 프로젝트를 설치하세요.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 프로젝트 디렉토리: $PROJECT_DIR${NC}"

# Node.js 경로 확인
NODE_PATH=$(which node 2>/dev/null)
NPM_PATH=$(which npm 2>/dev/null)

if [ -z "$NODE_PATH" ]; then
    # NVM 환경 확인
    if [ -f "/root/.nvm/nvm.sh" ]; then
        source /root/.nvm/nvm.sh
        NODE_PATH=$(which node)
        NPM_PATH=$(which npm)
    fi
fi

if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}❌ Node.js를 찾을 수 없습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 경로: $NODE_PATH${NC}"
echo -e "${GREEN}✅ npm 경로: $NPM_PATH${NC}"

# PM2 확인
PM2_PATH=$(which pm2 2>/dev/null || echo "")
USE_PM2=false
if [ -n "$PM2_PATH" ]; then
    echo -e "${GREEN}✅ PM2 발견: $PM2_PATH${NC}"
    read -p "PM2를 사용하시겠습니까? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        USE_PM2=true
    fi
fi

# =============================================================================
# PM2 모드
# =============================================================================
if [ "$USE_PM2" = true ]; then
    echo -e "\n${BLUE}📝 PM2 모드로 설정합니다...${NC}"
    
    # PM2 ecosystem 파일 생성
    cat > ${PROJECT_DIR}/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '${PROJECT_DIR}/msp-checklist',
      script: 'node_modules/.bin/next',
      args: 'start -p ${MAIN_PORT}',
      env: {
        NODE_ENV: 'production',
        PORT: '${MAIN_PORT}'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '${PROJECT_DIR}/logs/main-error.log',
      out_file: '${PROJECT_DIR}/logs/main-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'msp-admin',
      cwd: '${PROJECT_DIR}/msp-checklist/admin',
      script: 'node_modules/.bin/next',
      args: 'start -p ${ADMIN_PORT}',
      env: {
        NODE_ENV: 'production',
        PORT: '${ADMIN_PORT}'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '${PROJECT_DIR}/logs/admin-error.log',
      out_file: '${PROJECT_DIR}/logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

    # 로그 디렉토리 생성
    mkdir -p ${PROJECT_DIR}/logs
    
    # PM2 startup 설정
    pm2 startup systemd -u root --hp /root
    
    # 기존 프로세스 중지
    pm2 delete all 2>/dev/null || true
    
    # PM2로 시작
    cd ${PROJECT_DIR}
    pm2 start ecosystem.config.js
    pm2 save
    
    echo -e "${GREEN}✅ PM2 설정 완료${NC}"
    echo -e "\n${YELLOW}PM2 관리 명령어:${NC}"
    echo "  pm2 list              # 프로세스 목록"
    echo "  pm2 logs              # 로그 확인"
    echo "  pm2 restart all       # 전체 재시작"
    echo "  pm2 stop all          # 전체 중지"
    
    exit 0
fi

# =============================================================================
# systemd 모드
# =============================================================================
echo -e "\n${BLUE}📝 systemd 서비스 모드로 설정합니다...${NC}"

# NVM 환경을 위한 wrapper 스크립트 생성
cat > ${PROJECT_DIR}/start-main.sh << EOF
#!/bin/bash
export HOME=/root
export NVM_DIR="/root/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
export PATH="\$NVM_DIR/versions/node/\$(ls \$NVM_DIR/versions/node | tail -1)/bin:\$PATH"

cd ${PROJECT_DIR}/msp-checklist
exec node node_modules/.bin/next start -p ${MAIN_PORT}
EOF
chmod +x ${PROJECT_DIR}/start-main.sh

cat > ${PROJECT_DIR}/start-admin.sh << EOF
#!/bin/bash
export HOME=/root
export NVM_DIR="/root/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
export PATH="\$NVM_DIR/versions/node/\$(ls \$NVM_DIR/versions/node | tail -1)/bin:\$PATH"

cd ${PROJECT_DIR}/msp-checklist/admin
exec node node_modules/.bin/next start -p ${ADMIN_PORT}
EOF
chmod +x ${PROJECT_DIR}/start-admin.sh

# =============================================================================
# 1. 메인 서버 서비스 파일 생성
# =============================================================================
echo -e "\n${BLUE}📝 메인 서버 서비스 파일 생성 중...${NC}"

cat > /etc/systemd/system/msp-main.service << EOF
[Unit]
Description=MSP Checklist Main Server (Port ${MAIN_PORT})
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/msp-checklist
Environment=NODE_ENV=production
Environment=PORT=${MAIN_PORT}
ExecStart=${PROJECT_DIR}/start-main.sh
Restart=always
RestartSec=10
StandardOutput=append:${PROJECT_DIR}/main-server.log
StandardError=append:${PROJECT_DIR}/main-server.log

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
Description=MSP Checklist Admin Server (Port ${ADMIN_PORT})
After=network.target msp-main.service

[Service]
Type=simple
User=root
WorkingDirectory=${PROJECT_DIR}/msp-checklist/admin
Environment=NODE_ENV=production
Environment=PORT=${ADMIN_PORT}
ExecStart=${PROJECT_DIR}/start-admin.sh
Restart=always
RestartSec=10
StandardOutput=append:${PROJECT_DIR}/admin-server.log
StandardError=append:${PROJECT_DIR}/admin-server.log

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ /etc/systemd/system/msp-admin.service 생성 완료${NC}"

# =============================================================================
# 3. systemd 데몬 리로드 및 서비스 활성화
# =============================================================================
echo -e "\n${BLUE}🔄 systemd 데몬 리로드 중...${NC}"
systemctl daemon-reload

echo -e "\n${BLUE}🔧 서비스 활성화 중...${NC}"
systemctl enable msp-main.service
systemctl enable msp-admin.service

echo -e "${GREEN}✅ 서비스가 부팅 시 자동 시작되도록 설정되었습니다.${NC}"

# =============================================================================
# 4. 기존 프로세스 종료 및 서비스 시작
# =============================================================================
echo -e "\n${BLUE}🚀 서비스 시작 중...${NC}"

# 기존 프로세스 종료
echo -e "${YELLOW}기존 프로세스 종료 중...${NC}"
systemctl stop msp-main.service 2>/dev/null || true
systemctl stop msp-admin.service 2>/dev/null || true
pkill -f "next.*${MAIN_PORT}" 2>/dev/null || true
pkill -f "next.*${ADMIN_PORT}" 2>/dev/null || true
sleep 2

# 서비스 시작
systemctl start msp-main.service
echo -e "${GREEN}✅ 메인 서버 시작됨 (포트 ${MAIN_PORT})${NC}"

sleep 3

systemctl start msp-admin.service
echo -e "${GREEN}✅ 관리자 서버 시작됨 (포트 ${ADMIN_PORT})${NC}"

# =============================================================================
# 5. 상태 확인
# =============================================================================
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  서비스 상태 확인${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

sleep 2

echo -e "\n${YELLOW}📊 메인 서버 상태:${NC}"
systemctl status msp-main.service --no-pager -l 2>&1 | head -10

echo -e "\n${YELLOW}📊 관리자 서버 상태:${NC}"
systemctl status msp-admin.service --no-pager -l 2>&1 | head -10

# 포트 확인
echo -e "\n${YELLOW}📊 포트 상태:${NC}"
sleep 3
if command -v ss &> /dev/null; then
    ss -tuln | grep -E ":${MAIN_PORT}|:${ADMIN_PORT}" || echo "  포트 바인딩 대기 중..."
elif command -v netstat &> /dev/null; then
    netstat -tuln | grep -E ":${MAIN_PORT}|:${ADMIN_PORT}" || echo "  포트 바인딩 대기 중..."
fi

# =============================================================================
# 6. 사용법 안내
# =============================================================================
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  사용법 안내${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

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
  tail -f ${PROJECT_DIR}/main-server.log
  tail -f ${PROJECT_DIR}/admin-server.log

  ${YELLOW}# 부팅 시 자동 시작 비활성화${NC}
  sudo systemctl disable msp-main
  sudo systemctl disable msp-admin

${GREEN}접속 URL:${NC}
  메인 서버: http://localhost:${MAIN_PORT}
  관리자 서버: http://localhost:${ADMIN_PORT}
"

echo -e "${GREEN}✅ 자동 시작 설정이 완료되었습니다!${NC}"
echo -e "${GREEN}   서버가 재시작되면 자동으로 서비스가 시작됩니다.${NC}"
