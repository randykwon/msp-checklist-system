#!/bin/bash
# ============================================================================
# Ubuntu 22.04/24.04 LTS MSP Checklist 원클릭 자동 설치 스크립트
# EC2 User Data로 사용하거나 새 인스턴스에서 직접 실행
# ============================================================================
# 
# 사용법 1: EC2 User Data (인스턴스 생성 시)
#   - EC2 콘솔에서 인스턴스 생성 시 "Advanced details" > "User data"에 붙여넣기
#
# 사용법 2: 새 인스턴스에서 직접 실행
#   curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ec2-userdata-ubuntu.sh | sudo bash
#
# 또는:
#   wget -qO- https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ec2-userdata-ubuntu.sh | sudo bash
#
# ============================================================================

set -e

# 설정
INSTALL_DIR="/opt/msp-checklist-system"
REPO_URL="https://github.com/randykwon/msp-checklist-system.git"
LOG_FILE="/var/log/msp-install.log"
INSTALL_USER="ubuntu"

# 로깅 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "MSP Checklist 자동 설치 시작 (Ubuntu)"
log "=========================================="

# 1. 스왑 메모리 설정 (t2.micro 등 저메모리 인스턴스용)
log "스왑 메모리 설정 중..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
    log "2GB 스왑 메모리 생성 완료"
else
    swapon /swapfile 2>/dev/null || true
    log "기존 스왑 메모리 활성화"
fi

# 2. 시스템 패키지 업데이트 및 설치
log "시스템 패키지 설치 중..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential ca-certificates gnupg

# 3. Node.js 20.x 설치
log "Node.js 20.x 설치 중..."
if ! command -v node > /dev/null 2>&1 || [ "$(node --version | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
    # NodeSource 저장소 추가
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update -y
    apt-get install -y nodejs
fi
log "Node.js $(node --version) 설치 완료"

# npm 설정
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retries 5

# 4. 프로젝트 클론
log "프로젝트 클론 중..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
    git pull origin main 2>/dev/null || git pull origin master
else
    rm -rf "$INSTALL_DIR"/*
    git clone "$REPO_URL" .
fi

chown -R $INSTALL_USER:$INSTALL_USER "$INSTALL_DIR"
chmod +x *.sh 2>/dev/null || true

# 5. 의존성 설치
log "의존성 설치 중... (약 5-10분 소요)"
export NODE_OPTIONS="--max-old-space-size=2048"

# 루트 의존성
cd "$INSTALL_DIR"
sudo -u $INSTALL_USER npm install --legacy-peer-deps

# MSP 체크리스트 의존성
cd "$INSTALL_DIR/msp-checklist"
rm -rf node_modules package-lock.json 2>/dev/null || true
sudo -u $INSTALL_USER npm install --legacy-peer-deps

# Admin 의존성
cd "$INSTALL_DIR/msp-checklist/admin"
rm -rf node_modules package-lock.json 2>/dev/null || true
sudo -u $INSTALL_USER npm install --legacy-peer-deps

# 6. 환경 변수 설정
log "환경 변수 설정 중..."
cd "$INSTALL_DIR"

if [ ! -f "msp-checklist/.env.local" ]; then
    cat > msp-checklist/.env.local << 'ENVEOF'
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
LLM_PROVIDER=bedrock
ENVEOF
    chown $INSTALL_USER:$INSTALL_USER msp-checklist/.env.local
fi

if [ ! -f "msp-checklist/admin/.env.local" ]; then
    cat > msp-checklist/admin/.env.local << 'ENVEOF'
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
MAIN_APP_URL=http://localhost:3010
ENVEOF
    chown $INSTALL_USER:$INSTALL_USER msp-checklist/admin/.env.local
fi

# 7. 애플리케이션 빌드
log "애플리케이션 빌드 중... (약 5-10분 소요)"
export NEXT_TELEMETRY_DISABLED=1

cd "$INSTALL_DIR/msp-checklist"
rm -rf .next 2>/dev/null || true
sudo -u $INSTALL_USER npm run build

cd "$INSTALL_DIR/msp-checklist/admin"
rm -rf .next 2>/dev/null || true
sudo -u $INSTALL_USER npm run build

# 8. NGINX 설치 및 설정
log "NGINX 설정 중..."
apt-get install -y nginx

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

cat > /etc/nginx/sites-available/msp-checklist << NGINXEOF
# MSP Checklist System - NGINX Configuration
server {
    listen 80;
    server_name $PUBLIC_IP _;
    
    client_max_body_size 50M;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    location /admin {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

# 심볼릭 링크 생성 및 기본 설정 제거
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/

nginx -t && systemctl enable nginx && systemctl restart nginx

# 9. Systemd 서비스 설정
log "Systemd 서비스 설정 중..."

cat > /etc/systemd/system/msp-main.service << SVCEOF
[Unit]
Description=MSP Checklist Main Service
After=network.target

[Service]
Type=simple
User=$INSTALL_USER
WorkingDirectory=$INSTALL_DIR/msp-checklist
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/main-server.log
StandardError=append:$INSTALL_DIR/main-server.log
Environment=NODE_ENV=production
Environment=PORT=3010

[Install]
WantedBy=multi-user.target
SVCEOF

cat > /etc/systemd/system/msp-admin.service << SVCEOF
[Unit]
Description=MSP Checklist Admin Service
After=network.target msp-main.service

[Service]
Type=simple
User=$INSTALL_USER
WorkingDirectory=$INSTALL_DIR/msp-checklist/admin
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/admin-server.log
StandardError=append:$INSTALL_DIR/admin-server.log
Environment=NODE_ENV=production
Environment=PORT=3011

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable msp-main.service
systemctl enable msp-admin.service

# 10. UFW 방화벽 설정
log "방화벽 설정 중..."
if command -v ufw > /dev/null 2>&1; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3010/tcp
    ufw allow 3011/tcp
    ufw --force enable
fi

# 11. 서비스 시작
log "서비스 시작 중..."
systemctl start msp-main.service
sleep 10
systemctl start msp-admin.service
sleep 10

# 12. 상태 확인
log "서비스 상태 확인 중..."
MAIN_STATUS="FAIL"
ADMIN_STATUS="FAIL"

if curl -s http://localhost:3010 > /dev/null 2>&1; then
    MAIN_STATUS="OK"
fi

if curl -s http://localhost:3011 > /dev/null 2>&1; then
    ADMIN_STATUS="OK"
fi

# 13. 설치 완료 정보 저장
cat > /home/$INSTALL_USER/msp-install-info.txt << INFOEOF
========================================
MSP Checklist 설치 완료! (Ubuntu)
========================================

설치 시간: $(date)
설치 디렉토리: $INSTALL_DIR

서비스 상태:
- 메인 서버 (3010): $MAIN_STATUS
- Admin 서버 (3011): $ADMIN_STATUS

접속 주소:
- 메인: http://$PUBLIC_IP
- Admin: http://$PUBLIC_IP/admin
- 직접 접속: http://$PUBLIC_IP:3010, http://$PUBLIC_IP:3011

유용한 명령어:
- 상태 확인: systemctl status msp-main msp-admin
- 재시작: sudo systemctl restart msp-main msp-admin
- 로그 확인: journalctl -u msp-main -f
- 관리자 생성: cd $INSTALL_DIR && node create-admin.cjs

AWS 보안 그룹 설정:
- 인바운드 규칙에서 포트 80, 3010, 3011 허용 필요

로그 파일: $LOG_FILE
========================================
INFOEOF

chown $INSTALL_USER:$INSTALL_USER /home/$INSTALL_USER/msp-install-info.txt

log "=========================================="
log "설치 완료!"
log "메인 서버: http://$PUBLIC_IP (상태: $MAIN_STATUS)"
log "Admin 서버: http://$PUBLIC_IP/admin (상태: $ADMIN_STATUS)"
log "상세 정보: /home/$INSTALL_USER/msp-install-info.txt"
log "=========================================="
