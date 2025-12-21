#!/bin/bash

# MSP Checklist ECS 인프라 설정 스크립트

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
VPC_CIDR="10.0.0.0/16"
SUBNET1_CIDR="10.0.1.0/24"
SUBNET2_CIDR="10.0.2.0/24"
PROJECT_NAME="msp-checklist"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            MSP Checklist ECS 인프라 설정 스크립트         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log_info "인프라 설정:"
echo "- AWS Region: $AWS_REGION"
echo "- VPC CIDR: $VPC_CIDR"
echo "- Subnet 1 CIDR: $SUBNET1_CIDR"
echo "- Subnet 2 CIDR: $SUBNET2_CIDR"
echo ""

# VPC 생성
log_info "VPC 생성 중..."
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block $VPC_CIDR \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'Vpc.VpcId' \
    --output text \
    --region $AWS_REGION)

log_success "VPC 생성 완료: $VPC_ID"

# DNS 호스트명 활성화
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION

# 가용 영역 가져오기
AZ1=$(aws ec2 describe-availability-zones --region $AWS_REGION --query 'AvailabilityZones[0].ZoneName' --output text)
AZ2=$(aws ec2 describe-availability-zones --region $AWS_REGION --query 'AvailabilityZones[1].ZoneName' --output text)

log_info "사용할 가용 영역: $AZ1, $AZ2"

# 퍼블릭 서브넷 생성
log_info "퍼블릭 서브넷 생성 중..."

SUBNET1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $SUBNET1_CIDR \
    --availability-zone $AZ1 \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-subnet-1},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'Subnet.SubnetId' \
    --output text \
    --region $AWS_REGION)

SUBNET2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $SUBNET2_CIDR \
    --availability-zone $AZ2 \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-subnet-2},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'Subnet.SubnetId' \
    --output text \
    --region $AWS_REGION)

log_success "서브넷 생성 완료: $SUBNET1_ID, $SUBNET2_ID"

# 퍼블릭 IP 자동 할당 활성화
aws ec2 modify-subnet-attribute --subnet-id $SUBNET1_ID --map-public-ip-on-launch --region $AWS_REGION
aws ec2 modify-subnet-attribute --subnet-id $SUBNET2_ID --map-public-ip-on-launch --region $AWS_REGION

# 인터넷 게이트웨이 생성
log_info "인터넷 게이트웨이 생성 중..."
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'InternetGateway.InternetGatewayId' \
    --output text \
    --region $AWS_REGION)

# VPC에 인터넷 게이트웨이 연결
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $AWS_REGION
log_success "인터넷 게이트웨이 생성 및 연결 완료: $IGW_ID"

# 라우팅 테이블 생성
log_info "라우팅 테이블 생성 중..."
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-public-rt},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'RouteTable.RouteTableId' \
    --output text \
    --region $AWS_REGION)

# 인터넷 게이트웨이로의 라우트 추가
aws ec2 create-route \
    --route-table-id $ROUTE_TABLE_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID \
    --region $AWS_REGION

# 서브넷을 라우팅 테이블에 연결
aws ec2 associate-route-table --subnet-id $SUBNET1_ID --route-table-id $ROUTE_TABLE_ID --region $AWS_REGION
aws ec2 associate-route-table --subnet-id $SUBNET2_ID --route-table-id $ROUTE_TABLE_ID --region $AWS_REGION

log_success "라우팅 테이블 설정 완료: $ROUTE_TABLE_ID"

# 보안 그룹 생성
log_info "보안 그룹 생성 중..."

# ALB 보안 그룹
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name $PROJECT_NAME-alb-sg \
    --description "Security group for MSP Checklist ALB" \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-alb-sg},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION)

# ALB 보안 그룹 규칙 추가
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

log_success "ALB 보안 그룹 생성 완료: $ALB_SG_ID"

# ECS 태스크 보안 그룹
ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name $PROJECT_NAME-ecs-sg \
    --description "Security group for MSP Checklist ECS tasks" \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-ecs-sg},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION)

# ECS 보안 그룹 규칙 추가 (ALB에서만 접근 허용)
aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 3010 \
    --source-group $ALB_SG_ID \
    --region $AWS_REGION

aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 3011 \
    --source-group $ALB_SG_ID \
    --region $AWS_REGION

# HTTPS 아웃바운드 허용 (ECR, CloudWatch 등)
aws ec2 authorize-security-group-egress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

# HTTP 아웃바운드 허용
aws ec2 authorize-security-group-egress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

log_success "ECS 보안 그룹 생성 완료: $ECS_SG_ID"

# Application Load Balancer 생성
log_info "Application Load Balancer 생성 중..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $PROJECT_NAME-alb \
    --subnets $SUBNET1_ID $SUBNET2_ID \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Name,Value=$PROJECT_NAME-alb Key=Project,Value=$PROJECT_NAME \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text \
    --region $AWS_REGION)

# ALB DNS 이름 가져오기
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text \
    --region $AWS_REGION)

log_success "ALB 생성 완료: $ALB_DNS"

# 타겟 그룹 생성
log_info "타겟 그룹 생성 중..."

# 메인 앱 타겟 그룹
MAIN_TG_ARN=$(aws elbv2 create-target-group \
    --name $PROJECT_NAME-main-tg \
    --protocol HTTP \
    --port 3010 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-path /api/health \
    --health-check-protocol HTTP \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --tags Key=Name,Value=$PROJECT_NAME-main-tg Key=Project,Value=$PROJECT_NAME \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region $AWS_REGION)

# 관리자 앱 타겟 그룹
ADMIN_TG_ARN=$(aws elbv2 create-target-group \
    --name $PROJECT_NAME-admin-tg \
    --protocol HTTP \
    --port 3011 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-path /api/health \
    --health-check-protocol HTTP \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --tags Key=Name,Value=$PROJECT_NAME-admin-tg Key=Project,Value=$PROJECT_NAME \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region $AWS_REGION)

log_success "타겟 그룹 생성 완료"

# ALB 리스너 생성
log_info "ALB 리스너 생성 중..."

# HTTP 리스너 (메인 앱으로 기본 라우팅)
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$MAIN_TG_ARN \
    --tags Key=Name,Value=$PROJECT_NAME-http-listener Key=Project,Value=$PROJECT_NAME \
    --query 'Listeners[0].ListenerArn' \
    --output text \
    --region $AWS_REGION)

log_success "HTTP 리스너 생성 완료"

# 관리자 앱용 리스너 규칙 생성
aws elbv2 create-rule \
    --listener-arn $HTTP_LISTENER_ARN \
    --priority 100 \
    --conditions Field=path-pattern,Values="/admin*" \
    --actions Type=forward,TargetGroupArn=$ADMIN_TG_ARN \
    --region $AWS_REGION

log_success "관리자 앱 라우팅 규칙 생성 완료"

# EFS 파일 시스템 생성 (데이터 지속성을 위해)
log_info "EFS 파일 시스템 생성 중..."
EFS_ID=$(aws efs create-file-system \
    --creation-token $PROJECT_NAME-efs-$(date +%s) \
    --performance-mode generalPurpose \
    --throughput-mode provisioned \
    --provisioned-throughput-in-mibps 10 \
    --encrypted \
    --tags Key=Name,Value=$PROJECT_NAME-efs Key=Project,Value=$PROJECT_NAME \
    --query 'FileSystemId' \
    --output text \
    --region $AWS_REGION)

log_success "EFS 파일 시스템 생성 완료: $EFS_ID"

# EFS 마운트 타겟 생성
log_info "EFS 마운트 타겟 생성 중..."

# EFS 보안 그룹 생성
EFS_SG_ID=$(aws ec2 create-security-group \
    --group-name $PROJECT_NAME-efs-sg \
    --description "Security group for MSP Checklist EFS" \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-efs-sg},{Key=Project,Value=$PROJECT_NAME}]" \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION)

# EFS 보안 그룹 규칙 (ECS에서 NFS 접근 허용)
aws ec2 authorize-security-group-ingress \
    --group-id $EFS_SG_ID \
    --protocol tcp \
    --port 2049 \
    --source-group $ECS_SG_ID \
    --region $AWS_REGION

# 각 서브넷에 마운트 타겟 생성
aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $SUBNET1_ID \
    --security-groups $EFS_SG_ID \
    --region $AWS_REGION

aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $SUBNET2_ID \
    --security-groups $EFS_SG_ID \
    --region $AWS_REGION

log_success "EFS 마운트 타겟 생성 완료"

# IAM 역할 생성 (ECS 태스크 실행 역할)
log_info "IAM 역할 확인/생성 중..."

# ECS 태스크 실행 역할 확인
if ! aws iam get-role --role-name ecsTaskExecutionRole &> /dev/null; then
    log_info "ECS 태스크 실행 역할 생성 중..."
    
    # 신뢰 정책 생성
    cat > /tmp/ecs-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # 역할 생성
    aws iam create-role \
        --role-name ecsTaskExecutionRole \
        --assume-role-policy-document file:///tmp/ecs-trust-policy.json

    # 정책 연결
    aws iam attach-role-policy \
        --role-name ecsTaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

    rm -f /tmp/ecs-trust-policy.json
    log_success "ECS 태스크 실행 역할 생성 완료"
else
    log_info "ECS 태스크 실행 역할 이미 존재"
fi

# 설정 정보 저장
log_info "설정 정보 저장 중..."
cat > deploy/ecs/infrastructure-config.sh << EOF
#!/bin/bash
# MSP Checklist ECS 인프라 설정 정보

export AWS_REGION="$AWS_REGION"
export VPC_ID="$VPC_ID"
export SUBNET1_ID="$SUBNET1_ID"
export SUBNET2_ID="$SUBNET2_ID"
export ALB_SG_ID="$ALB_SG_ID"
export ECS_SG_ID="$ECS_SG_ID"
export EFS_SG_ID="$EFS_SG_ID"
export ALB_ARN="$ALB_ARN"
export ALB_DNS="$ALB_DNS"
export MAIN_TG_ARN="$MAIN_TG_ARN"
export ADMIN_TG_ARN="$ADMIN_TG_ARN"
export EFS_ID="$EFS_ID"
export PROJECT_NAME="$PROJECT_NAME"

echo "MSP Checklist ECS 인프라 설정 정보:"
echo "- VPC ID: \$VPC_ID"
echo "- Subnet IDs: \$SUBNET1_ID, \$SUBNET2_ID"
echo "- ALB DNS: \$ALB_DNS"
echo "- EFS ID: \$EFS_ID"
EOF

chmod +x deploy/ecs/infrastructure-config.sh

log_success "인프라 설정이 완료되었습니다! 🎉"

echo ""
echo "생성된 리소스:"
echo "- VPC: $VPC_ID"
echo "- 서브넷: $SUBNET1_ID, $SUBNET2_ID"
echo "- ALB: $ALB_DNS"
echo "- EFS: $EFS_ID"
echo ""

echo "다음 단계:"
echo "1. ./deploy/ecs/deploy-ecs.sh 실행하여 애플리케이션 배포"
echo "2. 도메인 설정 (Route53)"
echo "3. SSL 인증서 설정 (ACM)"
echo ""

echo "접속 주소:"
echo "- 메인 서비스: http://$ALB_DNS"
echo "- 관리자 시스템: http://$ALB_DNS/admin"
echo ""

log_success "인프라 설정 완료! 🚀"