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
- Node.js 18+ 설치
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

### 1. 인스턴스 사양 권장사항
- **인스턴스 타입**: t3.medium (2 vCPU, 4GB RAM) 이상
- **스토리지**: 20GB gp3 SSD 이상
- **OS**: Ubuntu 22.04 LTS

### 2. 인스턴스 생성
```bash
# 키 페어 생성
aws ec2 create-key-pair --key-name msp-checklist-key --query 'KeyMaterial' --output text > msp-checklist-key.pem
chmod 400 msp-checklist-key.pem

# EC2 인스턴스 생성
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.medium \
  --key-name msp-checklist-key \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=msp-checklist-server}]'
```

## 📦 애플리케이션 배포

### 1. 서버 초기 설정
```bash
# EC2 인스턴스 접속
ssh -i msp-checklist-key.pem ubuntu@your-ec2-public-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx sqlite3 htop

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치 (프로세스 관리자)
sudo npm install -g pm2

# 방화벽 설정
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 2. 애플리케이션 배포
```bash
# 애플리케이션 클론
cd /opt
sudo git clone https://github.com/your-username/msp-checklist.git
sudo chown -R ubuntu:ubuntu msp-checklist
cd msp-checklist

# 의존성 설치
npm install
cd msp-checklist && npm install && cd ..
cd msp-checklist/admin && npm install && cd ../..

# 환경 변수 설정
sudo cp .env.example .env
sudo cp msp-checklist/.env.local.example msp-checklist/.env.local
sudo cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local

# 빌드
cd msp-checklist && npm run build && cd ..
cd msp-checklist/admin && npm run build && cd ../..

# 데이터베이스 초기화
node create-admin.cjs
```

## 🔧 Nginx 설정

### 1. Nginx 설정 파일 생성
```bash
sudo nano /etc/nginx/sites-available/msp-checklist
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
```bash
sudo ln -s /etc/nginx/sites-available/msp-checklist /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 SSL 인증서 설정

### 1. Let's Encrypt SSL 인증서 발급
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 2. 자동 갱신 설정
```bash
sudo crontab -e
# 다음 라인 추가
0 12 * * * /usr/bin/certbot renew --quiet
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

### 1. 일반적인 문제들
- **포트 충돌**: `sudo netstat -tlnp | grep :3010`
- **메모리 부족**: `free -h`, PM2 재시작
- **디스크 공간 부족**: `df -h`, 로그 파일 정리

### 2. 로그 확인
```bash
# PM2 로그
pm2 logs

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 시스템 로그
sudo journalctl -u nginx -f
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

```bash
# 서비스 상태 확인
sudo systemctl status nginx
pm2 status

# 로그 실시간 확인
pm2 logs --lines 100

# 메모리 사용량 확인
pm2 monit

# 프로세스 재시작
pm2 restart all

# 시스템 리소스 확인
htop
```

이 가이드를 따라하면 AWS EC2에서 MSP 체크리스트 시스템을 안전하고 효율적으로 배포할 수 있습니다.