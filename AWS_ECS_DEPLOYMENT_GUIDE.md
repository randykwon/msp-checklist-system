# MSP 체크리스트 시스템 AWS ECS 배포 가이드

## 📋 목차
1. [ECS 개요](#ecs-개요)
2. [사전 준비사항](#사전-준비사항)
3. [Docker 이미지 빌드](#docker-이미지-빌드)
4. [ECR 설정](#ecr-설정)
5. [ECS 클러스터 생성](#ecs-클러스터-생성)
6. [태스크 정의](#태스크-정의)
7. [서비스 배포](#서비스-배포)
8. [로드 밸런서 설정](#로드-밸런서-설정)
9. [도메인 및 SSL](#도메인-및-ssl)
10. [모니터링 및 로깅](#모니터링-및-로깅)
11. [CI/CD 파이프라인](#cicd-파이프라인)

## 🚀 ECS 개요

Amazon ECS(Elastic Container Service)는 완전 관리형 컨테이너 오케스트레이션 서비스입니다.

### 장점
- 서버리스 컨테이너 실행 (Fargate)
- 자동 스케일링
- AWS 서비스와의 완벽한 통합
- 관리 오버헤드 최소화

### 아키텍처
```
Internet → ALB → ECS Service (Fargate)
                 ├── Main App Container
                 └── Admin App Container
                      ↓
                 EFS (Database Storage)
```

## 🛠️ 사전 준비사항

### 1. AWS CLI 및 도구 설치
```bash
# AWS CLI 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# ECS CLI 설치
sudo curl -Lo /usr/local/bin/ecs-cli https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest
sudo chmod +x /usr/local/bin/ecs-cli

# Docker 설치

#### Ubuntu 22.04 LTS
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Amazon Linux 2023
```bash
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```
```

### 2. AWS 자격 증명 설정
```bash
aws configure
# Access Key ID, Secret Access Key, Region 설정
```

### 3. 필요한 IAM 권한
- ECS 전체 권한
- ECR 전체 권한
- VPC, EC2 권한
- CloudWatch Logs 권한
- Application Load Balancer 권한

## 🐳 Docker 이미지 빌드

### 1. 메인 애플리케이션 Dockerfile
```dockerfile
# deploy/ecs/Dockerfile.main
FROM node:18-alpine

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./
COPY msp-checklist/package*.json ./msp-checklist/

# 의존성 설치
RUN npm ci --only=production
RUN cd msp-checklist && npm ci --only=production

# 애플리케이션 코드 복사
COPY . .

# 빌드
RUN cd msp-checklist && npm run build

# 포트 노출
EXPOSE 3010

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3010/api/health || exit 1

# 애플리케이션 실행
CMD ["npm", "start", "--prefix", "msp-checklist"]
```

### 2. 관리자 애플리케이션 Dockerfile
```dockerfile
# deploy/ecs/Dockerfile.admin
FROM node:18-alpine

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./
COPY msp-checklist/admin/package*.json ./msp-checklist/admin/

# 의존성 설치
RUN npm ci --only=production
RUN cd msp-checklist/admin && npm ci --only=production

# 애플리케이션 코드 복사
COPY . .

# 빌드
RUN cd msp-checklist/admin && npm run build

# 포트 노출
EXPOSE 3011

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3011/api/health || exit 1

# 애플리케이션 실행
CMD ["npm", "start", "--prefix", "msp-checklist/admin"]
```

## 📦 ECR 설정

### 1. ECR 리포지토리 생성
```bash
# 메인 앱 리포지토리
aws ecr create-repository --repository-name msp-checklist-main --region us-east-1

# 관리자 앱 리포지토리
aws ecr create-repository --repository-name msp-checklist-admin --region us-east-1
```

### 2. Docker 이미지 빌드 및 푸시
```bash
# ECR 로그인
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# 이미지 빌드
docker build -f deploy/ecs/Dockerfile.main -t msp-checklist-main .
docker build -f deploy/ecs/Dockerfile.admin -t msp-checklist-admin .

# 태그 지정
docker tag msp-checklist-main:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:latest
docker tag msp-checklist-admin:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:latest

# 푸시
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:latest
```

## 🏗️ ECS 클러스터 생성

### 1. VPC 및 네트워크 설정
```bash
# VPC 생성
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=msp-checklist-vpc}]'

# 서브넷 생성 (2개 AZ)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# 인터넷 게이트웨이
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx
```

### 2. ECS 클러스터 생성
```bash
aws ecs create-cluster --cluster-name msp-checklist-cluster --capacity-providers FARGATE --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

## 📋 태스크 정의

### 1. 메인 애플리케이션 태스크 정의
```json
{
  "family": "msp-checklist-main-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account-id:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account-id:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "msp-checklist-main",
      "image": "account-id.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:latest",
      "portMappings": [
        {
          "containerPort": 3010,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/msp-checklist-main",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3010"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "efs-storage",
          "containerPath": "/app/data",
          "readOnly": false
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3010/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "volumes": [
    {
      "name": "efs-storage",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxx",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

### 2. 관리자 애플리케이션 태스크 정의
```json
{
  "family": "msp-checklist-admin-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account-id:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account-id:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "msp-checklist-admin",
      "image": "account-id.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:latest",
      "portMappings": [
        {
          "containerPort": 3011,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/msp-checklist-admin",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3011"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "efs-storage",
          "containerPath": "/app/data",
          "readOnly": false
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3011/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "volumes": [
    {
      "name": "efs-storage",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxx",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

## 🚀 서비스 배포

### 1. ECS 서비스 생성
```bash
# 메인 애플리케이션 서비스
aws ecs create-service \
  --cluster msp-checklist-cluster \
  --service-name msp-checklist-main-service \
  --task-definition msp-checklist-main-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account-id:targetgroup/msp-main-tg/xxx,containerName=msp-checklist-main,containerPort=3010

# 관리자 애플리케이션 서비스
aws ecs create-service \
  --cluster msp-checklist-cluster \
  --service-name msp-checklist-admin-service \
  --task-definition msp-checklist-admin-task:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account-id:targetgroup/msp-admin-tg/xxx,containerName=msp-checklist-admin,containerPort=3011
```

## ⚖️ 로드 밸런서 설정

### 1. Application Load Balancer 생성
```bash
# ALB 생성
aws elbv2 create-load-balancer \
  --name msp-checklist-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# 타겟 그룹 생성
aws elbv2 create-target-group \
  --name msp-main-tg \
  --protocol HTTP \
  --port 3010 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /api/health

aws elbv2 create-target-group \
  --name msp-admin-tg \
  --protocol HTTP \
  --port 3011 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /api/health

# 리스너 생성
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:account-id:loadbalancer/app/msp-checklist-alb/xxx \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account-id:targetgroup/msp-main-tg/xxx
```

## 🔒 도메인 및 SSL

### 1. Route53 설정
```bash
# 호스팅 영역에 ALB 레코드 추가
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "msp.example.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "msp-checklist-alb-xxx.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z35SXDOTRQ7X7K"
        }
      }
    }]
  }'
```

### 2. SSL 인증서 (ACM)
```bash
# SSL 인증서 요청
aws acm request-certificate \
  --domain-name msp.example.com \
  --subject-alternative-names www.msp.example.com \
  --validation-method DNS

# HTTPS 리스너 추가
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:account-id:loadbalancer/app/msp-checklist-alb/xxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:account-id:certificate/xxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:account-id:targetgroup/msp-main-tg/xxx
```

## 📊 모니터링 및 로깅

### 1. CloudWatch 로그 그룹 생성
```bash
aws logs create-log-group --log-group-name /ecs/msp-checklist-main
aws logs create-log-group --log-group-name /ecs/msp-checklist-admin
```

### 2. CloudWatch 대시보드
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "msp-checklist-main-service", "ClusterName", "msp-checklist-cluster"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Service Metrics"
      }
    }
  ]
}
```

## 🔄 CI/CD 파이프라인

### 1. GitHub Actions 워크플로우
```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          # Build and push main app
          docker build -f deploy/ecs/Dockerfile.main -t $ECR_REGISTRY/msp-checklist-main:$GITHUB_SHA .
          docker push $ECR_REGISTRY/msp-checklist-main:$GITHUB_SHA
          
          # Build and push admin app
          docker build -f deploy/ecs/Dockerfile.admin -t $ECR_REGISTRY/msp-checklist-admin:$GITHUB_SHA .
          docker push $ECR_REGISTRY/msp-checklist-admin:$GITHUB_SHA

      - name: Update ECS services
        run: |
          aws ecs update-service --cluster msp-checklist-cluster --service msp-checklist-main-service --force-new-deployment
          aws ecs update-service --cluster msp-checklist-cluster --service msp-checklist-admin-service --force-new-deployment
```

## 🎯 자동 스케일링

### 1. Application Auto Scaling 설정
```bash
# 스케일링 타겟 등록
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/msp-checklist-cluster/msp-checklist-main-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# 스케일링 정책 생성
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/msp-checklist-cluster/msp-checklist-main-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name msp-main-scale-up \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

## 💰 비용 최적화

### 1. Spot 인스턴스 사용
```json
{
  "capacityProviders": ["FARGATE", "FARGATE_SPOT"],
  "defaultCapacityProviderStrategy": [
    {
      "capacityProvider": "FARGATE_SPOT",
      "weight": 4
    },
    {
      "capacityProvider": "FARGATE",
      "weight": 1
    }
  ]
}
```

### 2. 리소스 최적화
- CPU/메모리 사용량 모니터링
- 불필요한 컨테이너 제거
- 이미지 크기 최적화

## 🛠️ 트러블슈팅

### 1. 일반적인 문제들
- **태스크 시작 실패**: 로그 확인, 리소스 부족
- **헬스체크 실패**: 엔드포인트 확인, 타임아웃 설정
- **네트워크 연결 문제**: 보안 그룹, 서브넷 설정

### 2. 디버깅 명령어
```bash
# 서비스 상태 확인
aws ecs describe-services --cluster msp-checklist-cluster --services msp-checklist-main-service

# 태스크 로그 확인
aws logs get-log-events --log-group-name /ecs/msp-checklist-main --log-stream-name ecs/msp-checklist-main/task-id

# 태스크 상세 정보
aws ecs describe-tasks --cluster msp-checklist-cluster --tasks task-arn
```

이 가이드를 따라하면 AWS ECS에서 MSP 체크리스트 시스템을 컨테이너 기반으로 안전하고 확장 가능하게 배포할 수 있습니다.