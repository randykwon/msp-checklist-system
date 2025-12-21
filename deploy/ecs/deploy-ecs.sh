#!/bin/bash

# MSP Checklist ECS 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 설정 변수
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_NAME="msp-checklist-cluster"
SERVICE_NAME_MAIN="msp-checklist-main-service"
SERVICE_NAME_ADMIN="msp-checklist-admin-service"
ECR_REPO_MAIN="msp-checklist-main"
ECR_REPO_ADMIN="msp-checklist-admin"
IMAGE_TAG=${IMAGE_TAG:-latest}

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              MSP Checklist ECS 배포 스크립트              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log_info "배포 설정:"
echo "- AWS Region: $AWS_REGION"
echo "- AWS Account ID: $AWS_ACCOUNT_ID"
echo "- Cluster Name: $CLUSTER_NAME"
echo "- Image Tag: $IMAGE_TAG"
echo ""

# 사전 요구사항 확인
log_info "사전 요구사항 확인 중..."

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI가 설치되지 않았습니다."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "Docker가 설치되지 않았습니다."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS 자격 증명이 설정되지 않았습니다."
    exit 1
fi

log_success "사전 요구사항 확인 완료"

# ECR 리포지토리 생성
log_info "ECR 리포지토리 확인/생성 중..."

for repo in $ECR_REPO_MAIN $ECR_REPO_ADMIN; do
    if ! aws ecr describe-repositories --repository-names $repo --region $AWS_REGION &> /dev/null; then
        log_info "ECR 리포지토리 생성 중: $repo"
        aws ecr create-repository --repository-name $repo --region $AWS_REGION
        log_success "ECR 리포지토리 생성 완료: $repo"
    else
        log_info "ECR 리포지토리 이미 존재: $repo"
    fi
done

# ECR 로그인
log_info "ECR 로그인 중..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
log_success "ECR 로그인 완료"

# Docker 이미지 빌드
log_info "Docker 이미지 빌드 중..."

# 메인 애플리케이션
log_info "메인 애플리케이션 이미지 빌드 중..."
docker build -f deploy/ecs/Dockerfile.main -t $ECR_REPO_MAIN:$IMAGE_TAG .
docker tag $ECR_REPO_MAIN:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_MAIN:$IMAGE_TAG
log_success "메인 애플리케이션 이미지 빌드 완료"

# 관리자 애플리케이션
log_info "관리자 애플리케이션 이미지 빌드 중..."
docker build -f deploy/ecs/Dockerfile.admin -t $ECR_REPO_ADMIN:$IMAGE_TAG .
docker tag $ECR_REPO_ADMIN:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_ADMIN:$IMAGE_TAG
log_success "관리자 애플리케이션 이미지 빌드 완료"

# Docker 이미지 푸시
log_info "Docker 이미지 푸시 중..."

log_info "메인 애플리케이션 이미지 푸시 중..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_MAIN:$IMAGE_TAG
log_success "메인 애플리케이션 이미지 푸시 완료"

log_info "관리자 애플리케이션 이미지 푸시 중..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_ADMIN:$IMAGE_TAG
log_success "관리자 애플리케이션 이미지 푸시 완료"

# ECS 클러스터 확인/생성
log_info "ECS 클러스터 확인/생성 중..."
if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION &> /dev/null; then
    log_info "ECS 클러스터 생성 중: $CLUSTER_NAME"
    aws ecs create-cluster \
        --cluster-name $CLUSTER_NAME \
        --capacity-providers FARGATE \
        --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
        --region $AWS_REGION
    log_success "ECS 클러스터 생성 완료: $CLUSTER_NAME"
else
    log_info "ECS 클러스터 이미 존재: $CLUSTER_NAME"
fi

# CloudWatch 로그 그룹 생성
log_info "CloudWatch 로그 그룹 생성 중..."
for log_group in "/ecs/msp-checklist-main" "/ecs/msp-checklist-admin"; do
    if ! aws logs describe-log-groups --log-group-name-prefix $log_group --region $AWS_REGION | grep -q $log_group; then
        aws logs create-log-group --log-group-name $log_group --region $AWS_REGION
        log_success "로그 그룹 생성 완료: $log_group"
    else
        log_info "로그 그룹 이미 존재: $log_group"
    fi
done

# 태스크 정의 등록
log_info "태스크 정의 등록 중..."

# 메인 애플리케이션 태스크 정의
cat > /tmp/main-task-definition.json << EOF
{
  "family": "msp-checklist-main-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "msp-checklist-main",
      "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_MAIN:$IMAGE_TAG",
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
          "awslogs-region": "$AWS_REGION",
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
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "wget --no-verbose --tries=1 --spider http://localhost:3010/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 관리자 애플리케이션 태스크 정의
cat > /tmp/admin-task-definition.json << EOF
{
  "family": "msp-checklist-admin-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "msp-checklist-admin",
      "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_ADMIN:$IMAGE_TAG",
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
          "awslogs-region": "$AWS_REGION",
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
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "wget --no-verbose --tries=1 --spider http://localhost:3011/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 태스크 정의 등록
aws ecs register-task-definition --cli-input-json file:///tmp/main-task-definition.json --region $AWS_REGION
aws ecs register-task-definition --cli-input-json file:///tmp/admin-task-definition.json --region $AWS_REGION

log_success "태스크 정의 등록 완료"

# 정리
rm -f /tmp/main-task-definition.json /tmp/admin-task-definition.json

log_success "ECS 배포가 완료되었습니다! 🎉"

echo ""
echo "다음 단계:"
echo "1. VPC, 서브넷, 보안 그룹 설정"
echo "2. Application Load Balancer 생성"
echo "3. ECS 서비스 생성"
echo "4. 도메인 및 SSL 설정"
echo ""

echo "유용한 명령어:"
echo "- 클러스터 상태: aws ecs describe-clusters --clusters $CLUSTER_NAME"
echo "- 태스크 정의 확인: aws ecs list-task-definitions"
echo "- 로그 확인: aws logs tail /ecs/msp-checklist-main --follow"
echo ""

log_success "배포 스크립트 실행 완료! 🚀"