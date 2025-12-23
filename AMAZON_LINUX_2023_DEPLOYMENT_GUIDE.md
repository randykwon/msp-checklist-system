# Amazon Linux 2023 배포 가이드

Amazon Linux 2023에서 MSP Checklist 시스템을 설치하고 배포하는 완전한 가이드입니다.

## 🚀 빠른 설치 (자동화 스크립트)

```bash
# 자동 설치 스크립트 다운로드 및 실행
curl -fsSL https://raw.githubusercontent.com/randykwon/msp-checklist-system/main/amazon-linux-install.sh | bash

# 또는 저장소를 먼저 클론한 경우
git clone https://github.com/randykwon/msp-checklist-system.git
cd msp-checklist-system
chmod +x amazon-linux-install.sh
./amazon-linux-install.sh
```

## 📋 시스템 요구사항

- **OS**: Amazon Linux 2023 (권장)
- **인스턴스 타입**: 최소 t3.small, 권장 t3.medium
- **RAM**: 최소 2GB, 권장 4GB
- **CPU**: 최소 1 vCPU, 권장 2 vCPU
- **디스크**: 최소 10GB 여유 공간
- **네트워크**: 포트 3010, 3011 접근 허용 (보안 그룹 설정)

## 🔧 수동 설치 단계

### 1단계: 시스템 업데이트

```bash
# 시스템 패키지 업데이트
sudo dnf update -y

# 필수 패키지 설치
sudo dnf install -y curl wget git gcc gcc-c++ make
sudo dnf groupinstall -y "Development Tools"
```

### 2단계: Node.js 20.9.0 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Node.js 설치
sudo dnf install -y nodejs

# 버전 확인
node --version  # v20.9.0 이상
npm --version   # 10.x 이상

# npm 설정 최적화
npm config set registry https://registry.npmjs.org/
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
```

### 3단계: 방화벽 설정

```bash
# firewalld 방화벽 설정
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 필요한 포트 열기
sudo firewall-cmd --permanent --add-port=22/tcp    # SSH
sudo firewall-cmd --permanent --add-port=3010/tcp  # 메인 서비스
sudo firewall-cmd --permanent --add-port=3011/tcp  # 관리자 시스템
sudo firewall-cmd --permanent --add-port=80/tcp    # HTTP (Nginx 사용 시)
sudo firewall-cmd --permanent --add-port=443/tcp   # HTTPS (SSL 사용 시)

# 방화벽 규칙 적용
sudo firewall-cmd --reload

# 상태 확인
sudo firewall-cmd --list-ports
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
chmod +x msp-checklist/*.sh 2>/dev/null || true
```

### 5단계: 의존성 설치

```bash
# 프로젝트 루트 의존성 설치
npm install

# MSP 체크리스트 의존성 설치
cd msp-checklist
if [ -f "install-server.sh" ]; then
    chmod +x install-server.sh
    ./install-server.sh
else
    # 수동 설치
    rm -rf node_modules package-lock.json
    npm install --no-optional --legacy-peer-deps
fi

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
Environment=NODE_ENV=production

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
sudo dnf install -y nginx
```

### 설정 파일 생성

```bash
sudo tee /etc/nginx/conf.d/msp-checklist.conf > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # 도메인 또는 IP 주소로 변경

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

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
        proxy_read_timeout 86400;
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
        proxy_read_timeout 86400;
    }
}
EOF

# Nginx 설정 테스트 및 시작
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### SSL 인증서 설정 (Let's Encrypt)

```bash
# EPEL 저장소 활성화
sudo dnf install -y epel-release

# Certbot 설치
sudo dnf install -y certbot python3-certbot-nginx

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

### CloudWatch 로그 설정 (선택사항)

```bash
# CloudWatch 에이전트 설치
sudo dnf install -y amazon-cloudwatch-agent

# 설정 파일 생성
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<EOF
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/opt/msp-checklist/server.log",
                        "log_group_name": "msp-checklist-main",
                        "log_stream_name": "{instance_id}"
                    },
                    {
                        "file_path": "/opt/msp-checklist/admin-server.log",
                        "log_group_name": "msp-checklist-admin",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    }
}
EOF

# CloudWatch 에이전트 시작
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
```

## 🔧 문제 해결

### 포트 충돌

```bash
# 포트 사용 프로세스 확인
sudo ss -tlnp | grep :3010
sudo ss -tlnp | grep :3011

# 프로세스 종료
sudo kill -9 <PID>
```

### 권한 문제

```bash
# 디렉토리 권한 설정
sudo chown -R $USER:$USER /opt/msp-checklist
chmod +x /opt/msp-checklist/*.sh

# SELinux 문제 (필요한 경우)
sudo setsebool -P httpd_can_network_connect 1
```

### 메모리 부족

```bash
# 스왑 파일 생성 (2GB)
sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 설정
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=2048"
```

### npm 설치 실패

```bash
# npm 캐시 정리
npm cache clean --force

# 권한 문제 해결
sudo chown -R $USER:$USER ~/.npm

# 네트워크 타임아웃 설정
npm config set fetch-timeout 600000
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000
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
vm.swappiness = 10
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
sudo systemctl disable httpd 2>/dev/null || true

# SSH 보안 강화 (선택사항)
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# fail2ban 설치 (EPEL 필요)
sudo dnf install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### AWS 보안 그룹 설정

```bash
# AWS CLI로 보안 그룹 규칙 추가 (선택사항)
# 보안 그룹 ID를 확인한 후 실행
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 3010 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 3011 \
    --cidr 0.0.0.0/0
```

## 📋 배포 후 체크리스트

- [ ] Node.js 버전 확인 (v20.9.0+)
- [ ] 포트 3010, 3011 접근 가능
- [ ] 방화벽 설정 완료 (firewalld)
- [ ] AWS 보안 그룹 설정 완료
- [ ] 환경 변수 설정 완료
- [ ] 애플리케이션 빌드 성공
- [ ] 서버 정상 시작
- [ ] 웹 브라우저 접속 확인
- [ ] SSL 인증서 설정 (도메인 사용 시)
- [ ] 자동 시작 서비스 등록
- [ ] CloudWatch 로그 설정 (선택사항)
- [ ] 백업 계획 수립

## 🆘 지원 및 문의

문제가 발생하면 다음을 확인하세요:

1. **로그 파일**: `/opt/msp-checklist/server.log`, `/opt/msp-checklist/admin-server.log`
2. **시스템 로그**: `sudo journalctl -u msp-checklist -f`
3. **포트 상태**: `sudo ss -tlnp | grep :301`
4. **프로세스 상태**: `ps aux | grep node`
5. **방화벽 상태**: `sudo firewall-cmd --list-ports`

추가 지원이 필요하면 GitHub Issues를 통해 문의하세요.