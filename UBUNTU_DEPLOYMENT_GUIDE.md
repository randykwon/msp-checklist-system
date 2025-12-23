# Ubuntu 22.04 LTS 배포 가이드

Ubuntu 22.04 LTS에서 MSP Checklist 시스템을 설치하고 배포하는 완전한 가이드입니다.

## 🚀 빠른 설치 (자동화 스크립트)

```bash
# 자동 설치 스크립트 다운로드 및 실행
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/ubuntu-install.sh | bash

# 또는 저장소를 먼저 클론한 경우
git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system
chmod +x ubuntu-install.sh
./ubuntu-install.sh
```

## 📋 시스템 요구사항

- **OS**: Ubuntu 22.04 LTS (권장)
- **RAM**: 최소 2GB, 권장 4GB
- **CPU**: 최소 1 vCPU, 권장 2 vCPU
- **디스크**: 최소 10GB 여유 공간
- **네트워크**: 포트 3010, 3011 접근 허용

## 🔧 수동 설치 단계

### 1단계: 시스템 업데이트

```bash
# 시스템 패키지 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git build-essential
```

### 2단계: Node.js 20.9.0 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.9.0 이상
npm --version   # 10.x 이상
```

### 3단계: 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw allow ssh
sudo ufw allow 3010/tcp
sudo ufw allow 3011/tcp
sudo ufw --force enable

# 상태 확인
sudo ufw status
```

### 4단계: 프로젝트 설정

```bash
# 작업 디렉토리 생성
sudo mkdir -p /opt/msp-checklist
sudo chown -R $USER:$USER /opt/msp-checklist

# 프로젝트 클론
cd /opt/msp-checklist
git clone https://github.com/randykwon/msp-checklist-system.git .

# 실행 권한 부여
chmod +x *.sh
chmod +x msp-checklist/*.sh
```

### 5단계: 의존성 설치

```bash
# 프로젝트 루트 의존성 설치
npm install

# MSP 체크리스트 의존성 설치
cd msp-checklist
./install-server.sh

# 관리자 시스템 의존성 설치
cd ../admin
npm install
```

### 6단계: 환경 변수 설정

```bash
# MSP 체크리스트 환경 변수
cd /opt/msp-checklist/msp-checklist
cp .env.local.example .env.local
nano .env.local

# 관리자 시스템 환경 변수
cd ../admin
cp .env.local.example .env.local
nano .env.local
```

환경 변수 예시:
```bash
# LLM 제공업체 선택
LLM_PROVIDER=openai

# API 키 설정
OPENAI_API_KEY=your_api_key_here

# 기타 설정
NODE_ENV=production
```

### 7단계: 빌드 및 시작

```bash
# 프로젝트 루트로 이동
cd /opt/msp-checklist

# 애플리케이션 빌드
cd msp-checklist && npm run build
cd ../admin && npm run build
cd ..

# 서버 시작
./restart-server.sh

# 상태 확인
./server-status.sh
```

## 🔄 서비스 관리

### 기본 명령어

```bash
# 서버 시작
./restart-server.sh

# 서버 중지
./stop-server.sh

# 서버 상태 확인
./server-status.sh

# 로그 확인
tail -f server.log
tail -f admin-server.log
```

### systemd 서비스 설정 (자동 시작)

```bash
# 서비스 파일 생성
sudo tee /etc/systemd/system/msp-checklist.service > /dev/null <<EOF
[Unit]
Description=MSP Checklist Application
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=/opt/msp-checklist
ExecStart=/opt/msp-checklist/restart-server.sh
ExecStop=/opt/msp-checklist/stop-server.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 서비스 활성화
sudo systemctl daemon-reload
sudo systemctl enable msp-checklist
sudo systemctl start msp-checklist

# 서비스 상태 확인
sudo systemctl status msp-checklist
```

## 🌐 Nginx 리버스 프록시 설정 (선택사항)

### Nginx 설치

```bash
sudo apt install -y nginx
```

### 설정 파일 생성

```bash
sudo tee /etc/nginx/sites-available/msp-checklist > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # 도메인 또는 IP 주소로 변경

    # 메인 애플리케이션
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 관리자 시스템
    location /admin {
        proxy_pass http://localhost:3011;
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
EOF

# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 설정 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo crontab -e
# 다음 줄 추가:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 모니터링 설정

### PM2 프로세스 매니저 설치

```bash
# PM2 전역 설치
sudo npm install -g pm2

# PM2로 애플리케이션 관리
cd /opt/msp-checklist
pm2 start msp-checklist/server.js --name "msp-main"
pm2 start admin/server.js --name "msp-admin"

# PM2 자동 시작 설정
pm2 startup
pm2 save

# PM2 모니터링
pm2 monit
```

### 로그 로테이션 설정

```bash
# logrotate 설정
sudo tee /etc/logrotate.d/msp-checklist > /dev/null <<EOF
/opt/msp-checklist/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        /opt/msp-checklist/restart-server.sh > /dev/null 2>&1 || true
    endscript
}
EOF
```

## 🔧 문제 해결

### 포트 충돌

```bash
# 포트 사용 프로세스 확인
sudo netstat -tlnp | grep :3010
sudo netstat -tlnp | grep :3011

# 프로세스 종료
sudo kill -9 <PID>
```

### 권한 문제

```bash
# 디렉토리 권한 설정
sudo chown -R $USER:$USER /opt/msp-checklist
chmod +x /opt/msp-checklist/*.sh
```

### 메모리 부족

```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=2048"
```

### npm 설치 실패

```bash
# npm 캐시 정리
npm cache clean --force

# 권한 문제 해결
sudo chown -R $USER:$USER ~/.npm
```

## 📈 성능 최적화

### 시스템 튜닝

```bash
# 파일 디스크립터 제한 증가
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 커널 매개변수 최적화
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
EOF

sudo sysctl -p
```

### Node.js 클러스터 모드

```bash
# PM2 클러스터 모드로 실행
pm2 start msp-checklist/server.js --name "msp-main" -i max
pm2 start admin/server.js --name "msp-admin" -i 2
```

## 🔒 보안 설정

### 기본 보안 강화

```bash
# 불필요한 서비스 비활성화
sudo systemctl disable apache2 2>/dev/null || true

# SSH 보안 강화 (선택사항)
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# fail2ban 설치 (선택사항)
sudo apt install -y fail2ban
```

## 📋 배포 후 체크리스트

- [ ] Node.js 버전 확인 (v20.9.0+)
- [ ] 포트 3010, 3011 접근 가능
- [ ] 방화벽 설정 완료
- [ ] 환경 변수 설정 완료
- [ ] 애플리케이션 빌드 성공
- [ ] 서버 정상 시작
- [ ] 웹 브라우저 접속 확인
- [ ] SSL 인증서 설정 (도메인 사용 시)
- [ ] 자동 시작 서비스 등록
- [ ] 로그 로테이션 설정
- [ ] 백업 계획 수립

## 🆘 지원 및 문의

문제가 발생하면 다음을 확인하세요:

1. **로그 파일**: `/opt/msp-checklist/server.log`, `/opt/msp-checklist/admin-server.log`
2. **시스템 로그**: `sudo journalctl -u msp-checklist -f`
3. **포트 상태**: `sudo netstat -tlnp | grep :301`
4. **프로세스 상태**: `ps aux | grep node`

추가 지원이 필요하면 GitHub Issues를 통해 문의하세요.