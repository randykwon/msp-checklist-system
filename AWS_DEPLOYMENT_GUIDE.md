# MSP 체크리스트 시스템 AWS EC2 배포 가이드

## 📋 목차
1. [사전 준비사항](#사전-준비사항)
2. [AWS 인프라 설정](#aws-인프라-설정)
3. [EC2 인스턴스 설정](#ec2-인스턴스-설정)
4. [애플리케이션 배포](#애플리케이션-배포)
5. [도메인 및 SSL 설정](#도메인-및-ssl-설정)
6. [모니터링 및 로그](#모니터링-및-로그)
7. [백업 및 복구](#백업-및-복구)

## 🚀 사전 준비사항

### 1. AWS 계정 및 권한
- AWS 계정 생성
- IAM 사용자 생성 (EC2, Route53, Certificate Manager 권한 필요)
- AWS CLI 설치 및 구성

### 2. 도메인 준비
- 도메인 구매 (예: example.com)
- Route53 호스팅 영역 설정

### 3. 로컬 환경
- Node.js 20.9.0+ 설치
- Git 설치
- SSH 키 페어 생성

## 🏗️ AWS 인프라 설정

### 1. VPC 및 네트워크 설정
```bash
# VPC 생성
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=msp-checklist-vpc}]'

# 서브넷 생성
aws ec2 create-subnet --vpc-id vpc-xxxxxxxxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=msp-checklist-subnet}]'

# 인터넷 게이트웨이 생성 및 연결
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=msp-checklist-igw}]'
aws ec2 attach-internet-gateway --vpc-id vpc-xxxxxxxxx --internet-gateway-id igw-xxxxxxxxx
```

### 2. 보안 그룹 설정
```bash
# 보안 그룹 생성
aws ec2 create-security-group --group-name msp-checklist-sg --description "MSP Checklist Security Group" --vpc-id vpc-xxxxxxxxx

# 인바운드 규칙 추가
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 22 --cidr 0.0.0.0/0    # SSH
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 80 --cidr 0.0.0.0/0    # HTTP
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 443 --cidr 0.0.0.0/0   # HTTPS
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 3010 --cidr 0.0.0.0/0  # Main App
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 3011 --cidr 0.0.0.0/0  # Admin App
```

## 🖥️ EC2 인스턴스 설정

### 1. 운영체제 선택 가이드

#### Ubuntu 22.04 LTS 권장 사항:
- **장점**: 
  - 풍부한 커뮤니티 지원 및 문서
  - 패키지 관리가 간편 (apt)
  - 개발자 친화적
  - Let's Encrypt 통합이 쉬움
- **단점**: 
  - AWS 네이티브 최적화가 Amazon Linux보다 적음
- **적합한 경우**: 
  - 개발팀이 Ubuntu에 익숙한 경우
  - 다양한 오픈소스 패키지 사용이 필요한 경우

#### Amazon Linux 2023 권장 사항:
- **장점**: 
  - AWS에 최적화됨
  - 보안 업데이트가 빠름
  - AWS 서비스와의 통합이 우수
  - 성능 최적화
- **단점**: 
  - Ubuntu 대비 커뮤니티 지원이 적음
  - 일부 패키지 설치가 복잡할 수 있음
- **적합한 경우**: 
  - AWS 환경에서만 운영하는 경우
  - 최대 성능과 보안이 중요한 경우

### 2. 인스턴스 사양 권장사항
- **인스턴스 타입**: t3.medium (2 vCPU, 4GB RAM) 이상
- **스토리지**: 20GB gp3 SSD 이상
- **OS**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023

### 3. 인스턴스 생성

#### 주요 리전별 AMI ID

| 리전 | Ubuntu 22.04 LTS | Amazon Linux 2023 |
|------|------------------|-------------------|
| us-east-1 | ami-0c02fb55956c7d316 | ami-0d70546e43a941d70 |
| us-west-2 | ami-008fe2fc65df48dac | ami-0c2d3e23d311bf21c |
| ap-northeast-1 | ami-01dd271720c1ba44f | ami-0d52744d6551d851e |
| ap-northeast-2 | ami-0c9c942bd7bf113a2 | ami-0f3a440bbcff3d043 |
| eu-west-1 | ami-01dd271720c1ba44f | ami-0c1bc246476a5572b |

> **참고**: AMI ID는 정기적으로 업데이트됩니다. 최신 AMI ID는 AWS 콘솔에서 확인하세요.

#### 인스턴스 생성 명령어
```bash
# 키 페어 생성
aws ec2 create-key-pair --key-name msp-checklist-key --query 'KeyMaterial' --output text > msp-checklist-key.pem
chmod 400 msp-checklist-key.pem

# Ubuntu 22.04 LTS 인스턴스 생성
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.medium \
  --key-name msp-checklist-key \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=msp-checklist-server-ubuntu},{Key=OS,Value=Ubuntu}]'

# 또는 Amazon Linux 2023 인스턴스 생성
aws ec2 run-instances \
  --image-id ami-0d70546e43a941d70 \
  --count 1 \
  --instance-type t3.medium \
  --key-name msp-checklist-key \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=msp-checklist-server-amzn},{Key=OS,Value=AmazonLinux}]'
```

## 📦 애플리케이션 배포

### 0. Node.js 버전 요구사항

이 애플리케이션은 **Node.js 20.9.0 이상**을 필요로 합니다. 다음 명령어로 버전을 확인하세요:

```bash
node --version  # v20.9.0 이상이어야 함
npm --version   # 10.x.x 이상 권장
```

만약 이전 버전이 설치되어 있다면, 다음 방법 중 하나를 사용하여 업그레이드하세요:

#### 방법 1: NodeSource 저장소 사용 (권장)
```bash
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Amazon Linux
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

#### 방법 2: NVM 사용 (개발 환경)
```bash
# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Node.js 20.9.0 설치 및 사용
nvm install 20.9.0
nvm use 20.9.0
nvm alias default 20.9.0
```

### 1. 서버 초기 설정

#### Ubuntu 22.04 LTS 설정
```bash
# EC2 인스턴스 접속
ssh -i msp-checklist-key.pem ubuntu@your-ec2-public-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx sqlite3 htop unzip

# Node.js 20 설치 (NodeSource 저장소 사용)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 또는 최신 LTS 버전 설치 (권장)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치 (프로세스 관리자)
sudo npm install -g pm2

# Node.js 버전 확인 (20.9.0 이상이어야 함)
node --version
npm --version

# 방화벽 설정
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 대안: NVM을 사용한 Node.js 설치 (버전 관리가 필요한 경우)
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# source ~/.bashrc
# nvm install 20.9.0
# nvm use 20.9.0
# nvm alias default 20.9.0
```

#### Amazon Linux 2023 설정
```bash
# EC2 인스턴스 접속
ssh -i msp-checklist-key.pem ec2-user@your-ec2-public-ip

# 시스템 업데이트
sudo dnf update -y

# 필수 패키sudo dnf install -y curl wget git nginx sqlite htop unzip지 설치
sudo dnf install -y curl wget git nginx sqlite htop unzip

# Node.js 20 설치 (NodeSource 저장소 사용)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 또는 최신 LTS 버전 설치 (권장)
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo dnf install -y nodejs

# PM2 설치 (프로세스 관리자)
sudo npm install -g pm2

# Node.js 버전 확인 (20.9.0 이상이어야 함)
node --version
npm --version

# Nginx 시작 및 활성화
sudo systemctl start nginx
sudo systemctl enable nginx

# 방화벽 설정 (firewalld)
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3010/tcp
sudo firewall-cmd --permanent --add-port=3011/tcp
sudo firewall-cmd --reload

# Certbot 설치 (Amazon Linux 2023)
sudo dnf install -y python3-pip
sudo pip3 install certbot certbot-nginx

# 대안: NVM을 사용한 Node.js 설치 (버전 관리가 필요한 경우)
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# source ~/.bashrc
# nvm install 20.9.0
# nvm use 20.9.0
# nvm alias default 20.9.0
```

### 2. 애플리케이션 배포

# 패키지 목록 업데이트
sudo dnf update -y

# Git 설치
sudo dnf install git -y

# 설치 확인
git --version

#### 공통 설정 (Ubuntu & Amazon Linux)
```bash
# 애플리케이션 디렉토리 생성 및 클론
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/randykwon/msp-checklist-system.git msp-checklist

# 소유권 변경 (Ubuntu: ubuntu, Amazon Linux: ec2-user)
# Ubuntu의 경우:
sudo chown -R ubuntu:ubuntu msp-checklist

# Amazon Linux의 경우:
sudo chown -R ec2-user:ec2-user msp-checklist

cd msp-checklist

# 의존성 설치
npm install
cd msp-checklist/admin && npm install && cd ../..d msp-checklist && npm install && cd ..


# 환경 변수 설정
cp .env.example .env
cp msp-checklist/.env.local.example msp-checklist/.env.local
cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local

# 환경 변수 편집 (필요한 값들 설정)
nano .env
nano msp-checklist/.env.local
nano msp-checklist/admin/.env.local

# 빌드
cd msp-checklist && npm run build && cd ..
cd msp-checklist/admin && npm run build && cd ../..

# 데이터베이스 초기화 및 관리자 계정 생성
node create-admin.cjs
```

## 🔧 Nginx 설정

### 1. Nginx 설정 파일 생성

#### Ubuntu의 경우:
```bash
sudo nano /etc/nginx/sites-available/msp-checklist
```

#### Amazon Linux의 경우:
```bash
sudo nano /etc/nginx/conf.d/msp-checklist.conf
```

### 2. 설정 내용
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 메인 애플리케이션
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 관리자 애플리케이션
    location /admin {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Nginx 활성화

#### Ubuntu의 경우:
```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택사항)
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

#### Amazon Linux의 경우:
```bash
# 설정 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 SSL 인증서 설정

### 1. Let's Encrypt SSL 인증서 발급

#### Ubuntu의 경우:
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### Amazon Linux의 경우:
```bash
# Certbot이 설치되어 있는지 확인
which certbot

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 2. 자동 갱신 설정

#### Ubuntu의 경우:
```bash
sudo crontab -e
# 다음 라인 추가
0 12 * * * /usr/bin/certbot renew --quiet
```

#### Amazon Linux의 경우:
```bash
sudo crontab -e
# 다음 라인 추가 (certbot 경로 확인 후)
0 12 * * * /usr/local/bin/certbot renew --quiet

# 또는 systemd 타이머 사용 (권장)
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

## 🚀 PM2로 애플리케이션 실행

### 1. PM2 설정 파일 생성
```bash
nano /opt/msp-checklist/ecosystem.config.js
```

### 2. PM2 설정 내용
```javascript
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: '/opt/msp-checklist/msp-checklist',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'msp-admin',
      cwd: '/opt/msp-checklist/msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
```

### 3. PM2 실행
```bash
cd /opt/msp-checklist
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📊 모니터링 설정

### 1. PM2 모니터링
```bash
# 프로세스 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 리소스 모니터링
pm2 monit
```

### 2. 시스템 모니터링
```bash
# 시스템 리소스 확인
htop

# 디스크 사용량 확인
df -h

# 메모리 사용량 확인
free -h
```

## 💾 백업 설정

### 1. 데이터베이스 백업 스크립트
```bash
nano /opt/msp-checklist/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/msp-checklist/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 데이터베이스 백업
cp /opt/msp-checklist/msp-checklist/msp-assessment.db $BACKUP_DIR/msp-assessment_$DATE.db
cp /opt/msp-checklist/msp-checklist/admin/msp-assessment.db $BACKUP_DIR/admin-msp-assessment_$DATE.db

# 7일 이상 된 백업 파일 삭제
find $BACKUP_DIR -name "*.db" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### 2. 자동 백업 설정
```bash
chmod +x /opt/msp-checklist/backup-db.sh
crontab -e
# 매일 새벽 2시에 백업
0 2 * * * /opt/msp-checklist/backup-db.sh
```

## 🔄 배포 자동화

### 1. 배포 스크립트
```bash
nano /opt/msp-checklist/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Node.js 버전 확인
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Error: Node.js 20.9.0 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node --version)"

# 백업
./backup-db.sh

# 코드 업데이트
git pull origin main

# 의존성 업데이트
npm install
cd msp-checklist && npm install && cd ..
cd msp-checklist/admin && npm install && cd ../..

# 빌드
cd msp-checklist && npm run build && cd ..
cd msp-checklist/admin && npm run build && cd ../..

# PM2 재시작
pm2 restart all

echo "✅ Deployment completed!"
```

## 🛠️ 트러블슈팅

### 1. OS별 일반적인 문제들

#### Ubuntu 관련:
- **포트 충돌**: `sudo netstat -tlnp | grep :3010`
- **방화벽 문제**: `sudo ufw status`, `sudo ufw allow 3010`
- **서비스 상태**: `sudo systemctl status nginx`

#### Amazon Linux 관련:
- **포트 충돌**: `sudo ss -tlnp | grep :3010`
- **방화벽 문제**: `sudo firewall-cmd --list-all`
- **SELinux 문제**: `sudo setsebool -P httpd_can_network_connect 1`
- **서비스 상태**: `sudo systemctl status nginx`

#### 공통 문제:
- **메모리 부족**: `free -h`, PM2 재시작
- **디스크 공간 부족**: `df -h`, 로그 파일 정리
- **Node.js 버전 문제**: `node --version` (20.9.0 이상 필요), `npm --version`
- **권한 문제**: `sudo chown -R $USER:$USER ~/.npm`
- **빌드 실패**: Node.js 버전 확인 후 `npm cache clean --force`

### 2. 로그 확인

#### Ubuntu의 경우:
```bash
# PM2 로그
pm2 logs

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 시스템 로그
sudo journalctl -u nginx -f
sudo journalctl -xe
```

#### Amazon Linux의 경우:
```bash
# PM2 로그
pm2 logs

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 시스템 로그
sudo journalctl -u nginx -f
sudo journalctl -xe

# SELinux 로그 (문제 발생 시)
sudo ausearch -m avc -ts recent
```

## 📝 보안 체크리스트

- [ ] SSH 키 기반 인증 사용
- [ ] 불필요한 포트 차단
- [ ] 정기적인 시스템 업데이트
- [ ] SSL 인증서 설정
- [ ] 데이터베이스 백업 설정
- [ ] 방화벽 설정
- [ ] 로그 모니터링 설정

## 🔗 유용한 명령어

### Ubuntu 명령어
```bash
# 서비스 상태 확인
sudo systemctl status nginx
pm2 status

# 패키지 관리
sudo apt update && sudo apt upgrade -y
sudo apt install package-name

# 방화벽 관리
sudo ufw status
sudo ufw allow port-number

# 로그 실시간 확인
pm2 logs --lines 100
sudo tail -f /var/log/nginx/error.log

# 시스템 리소스 확인
htop
free -h
df -h
```

### Amazon Linux 명령어
```bash
# 서비스 상태 확인
sudo systemctl status nginx
pm2 status

# 패키지 관리
sudo dnf update -y
sudo dnf install package-name

# 방화벽 관리
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=port-number/tcp
sudo firewall-cmd --reload

# SELinux 관리
sudo setsebool -P httpd_can_network_connect 1
sudo ausearch -m avc -ts recent

# 로그 실시간 확인
pm2 logs --lines 100
sudo tail -f /var/log/nginx/error.log

# 시스템 리소스 확인
htop
free -h
df -h
```

### 공통 PM2 명령어
```bash
# 프로세스 관리
pm2 start ecosystem.config.js
pm2 restart all
pm2 stop all
pm2 delete all

# 모니터링
pm2 monit
pm2 logs
pm2 status

# 자동 시작 설정
pm2 startup
pm2 save
```

## 📋 배포 체크리스트

### 배포 전 확인사항
- [ ] AWS 계정 및 권한 설정 완료
- [ ] 도메인 구매 및 Route53 설정 완료
- [ ] SSH 키 페어 생성 완료
- [ ] 보안 그룹 설정 완료

### 배포 중 확인사항
- [ ] EC2 인스턴스 생성 및 접속 확인
- [ ] 필수 패키지 설치 완료
- [ ] Node.js 20.9.0+ 및 PM2 설치 완료
- [ ] Node.js 버전 확인 (`node --version` >= v20.9.0)
- [ ] 애플리케이션 클론 및 빌드 완료
- [ ] 환경 변수 설정 완료
- [ ] Nginx 설정 및 테스트 완료

### 배포 후 확인사항
- [ ] 애플리케이션 정상 동작 확인
- [ ] SSL 인증서 설정 완료
- [ ] PM2 자동 시작 설정 완료
- [ ] 백업 스크립트 설정 완료
- [ ] 모니터링 설정 완료
- [ ] 도메인 접속 테스트 완료

이 가이드를 따라하면 Ubuntu 22.04 LTS 또는 Amazon Linux 2023에서 MSP 체크리스트 시스템을 안전하고 효율적으로 배포할 수 있습니다.