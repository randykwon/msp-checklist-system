# MSP 체크리스트 시스템 Infrastructure as Code 배포 가이드

## 📋 목차
1. [IaC 개요](#iac-개요)
2. [CloudFormation 배포](#cloudformation-배포)
3. [Terraform 배포](#terraform-배포)
4. [비교 및 선택 가이드](#비교-및-선택-가이드)
5. [CI/CD 통합](#cicd-통합)
6. [모니터링 및 관리](#모니터링-및-관리)
7. [트러블슈팅](#트러블슈팅)

## 🚀 IaC 개요

Infrastructure as Code(IaC)를 사용하여 MSP 체크리스트 시스템을 배포할 수 있습니다.

### 지원하는 배포 방식
1. **EC2 기반 배포** - 전통적인 가상 머신 방식
2. **ECS 기반 배포** - 컨테이너 오케스트레이션
3. **EKS 기반 배포** - Kubernetes 클러스터

### IaC 도구 비교

| 특징 | CloudFormation | Terraform |
|------|----------------|-----------|
| **제공업체** | AWS 네이티브 | HashiCorp |
| **언어** | JSON/YAML | HCL |
| **상태 관리** | AWS 관리 | 별도 백엔드 |
| **멀티 클라우드** | AWS 전용 | 지원 |
| **학습 곡선** | 중간 | 중간 |
| **커뮤니티** | AWS 중심 | 광범위 |
| **비용** | 무료 | 무료/유료 |

## ☁️ CloudFormation 배포

### 장점
- AWS 네이티브 통합
- 상태 관리 자동화
- 롤백 기능 내장
- IAM 통합

### 단점
- AWS 전용
- JSON/YAML 복잡성
- 제한된 프로그래밍 기능

### 배포 방법

#### 1. EC2 배포
```bash
# 스택 생성
aws cloudformation create-stack \
  --stack-name msp-checklist-ec2 \
  --template-body file://deploy/cloudformation/ec2-stack.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=my-key \
               ParameterKey=InstanceType,ParameterValue=t3.medium \
  --capabilities CAPABILITY_IAM

# 스택 상태 확인
aws cloudformation describe-stacks --stack-name msp-checklist-ec2
```

#### 2. ECS 배포
```bash
# 스택 생성
aws cloudformation create-stack \
  --stack-name msp-checklist-ecs \
  --template-body file://deploy/cloudformation/ecs-stack.yaml \
  --parameters ParameterKey=VpcCIDR,ParameterValue=10.0.0.0/16 \
  --capabilities CAPABILITY_IAM

# 스택 업데이트
aws cloudformation update-stack \
  --stack-name msp-checklist-ecs \
  --template-body file://deploy/cloudformation/ecs-stack.yaml \
  --capabilities CAPABILITY_IAM
```

#### 3. EKS 배포
```bash
# 스택 생성
aws cloudformation create-stack \
  --stack-name msp-checklist-eks \
  --template-body file://deploy/cloudformation/eks-stack.yaml \
  --parameters ParameterKey=ClusterName,ParameterValue=msp-checklist \
  --capabilities CAPABILITY_NAMED_IAM

# 스택 삭제
aws cloudformation delete-stack --stack-name msp-checklist-eks
```

## 🏗️ Terraform 배포

### 장점
- 멀티 클라우드 지원
- 강력한 프로그래밍 기능
- 모듈화 지원
- 풍부한 프로바이더

### 단점
- 상태 파일 관리 필요
- 별도 학습 필요
- AWS 네이티브 기능 지연

### 배포 방법

#### 1. 초기 설정
```bash
# Terraform 초기화
cd deploy/terraform
terraform init

# 계획 확인
terraform plan -var-file="terraform.tfvars"

# 배포 실행
terraform apply -var-file="terraform.tfvars"

# 리소스 삭제
terraform destroy -var-file="terraform.tfvars"
```

#### 2. 환경별 배포
```bash
# 개발 환경
terraform workspace new dev
terraform apply -var-file="dev.tfvars"

# 프로덕션 환경
terraform workspace new prod
terraform apply -var-file="prod.tfvars"

# 워크스페이스 확인
terraform workspace list
```

#### 3. 모듈 사용
```bash
# 모듈 초기화
terraform get

# 모듈 업데이트
terraform get -update

# 특정 모듈만 적용
terraform apply -target=module.vpc
```

## 📊 배포 아키텍처

### EC2 기반 아키텍처
```
Internet Gateway
    ↓
Application Load Balancer
    ↓
Auto Scaling Group
    ├── EC2 Instance 1 (Main App)
    ├── EC2 Instance 2 (Admin App)
    └── EC2 Instance N
    ↓
RDS Database (Optional)
EFS File System
```

### ECS 기반 아키텍처
```
Internet Gateway
    ↓
Application Load Balancer
    ↓
ECS Service (Fargate)
    ├── Task 1 (Main App)
    ├── Task 2 (Admin App)
    └── Task N
    ↓
EFS File System
CloudWatch Logs
```

### EKS 기반 아키텍처
```
Internet Gateway
    ↓
ALB Ingress Controller
    ↓
Kubernetes Services
    ├── Main App Pods
    ├── Admin App Pods
    └── Supporting Services
    ↓
EFS CSI Driver
CloudWatch Container Insights
```

## 🔧 환경 변수 및 설정

### CloudFormation 파라미터
```yaml
Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]
  
  InstanceType:
    Type: String
    Default: t3.medium
    AllowedValues: [t3.small, t3.medium, t3.large]
  
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair for SSH access
  
  DomainName:
    Type: String
    Default: ""
    Description: Domain name for the application
```

### Terraform 변수
```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "EC2 Key Pair name"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}
```

## 🔒 보안 설정

### IAM 역할 및 정책
```yaml
# CloudFormation
EC2Role:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Service: ec2.amazonaws.com
          Action: sts:AssumeRole
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
      - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
```

```hcl
# Terraform
resource "aws_iam_role" "ec2_role" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}
```

### 보안 그룹 설정
```yaml
# CloudFormation
WebServerSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for web servers
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 80
        ToPort: 80
        CidrIp: 0.0.0.0/0
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0
```

```hcl
# Terraform
resource "aws_security_group" "web_server" {
  name_prefix = "${var.project_name}-web-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 📈 모니터링 및 로깅

### CloudWatch 설정
```yaml
# CloudFormation
LogGroup:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: !Sub '/aws/ec2/${AWS::StackName}'
    RetentionInDays: 7

CloudWatchDashboard:
  Type: AWS::CloudWatch::Dashboard
  Properties:
    DashboardName: !Sub '${AWS::StackName}-dashboard'
    DashboardBody: !Sub |
      {
        "widgets": [
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["AWS/EC2", "CPUUtilization", "InstanceId", "${WebServerInstance}"]
              ],
              "period": 300,
              "stat": "Average",
              "region": "${AWS::Region}",
              "title": "EC2 CPU Utilization"
            }
          }
        ]
      }
```

```hcl
# Terraform
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/ec2/${var.project_name}"
  retention_in_days = 7
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.web_server.id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EC2 CPU Utilization"
        }
      }
    ]
  })
}
```

## 🔄 CI/CD 통합

### GitHub Actions (CloudFormation)
```yaml
name: Deploy with CloudFormation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy CloudFormation stack
        run: |
          aws cloudformation deploy \
            --template-file deploy/cloudformation/ec2-stack.yaml \
            --stack-name msp-checklist-${{ github.sha }} \
            --parameter-overrides \
              KeyName=${{ secrets.EC2_KEY_NAME }} \
              Environment=production \
            --capabilities CAPABILITY_IAM
```

### GitHub Actions (Terraform)
```yaml
name: Deploy with Terraform

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.6.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init
        working-directory: deploy/terraform

      - name: Terraform Plan
        run: terraform plan -var-file="prod.tfvars"
        working-directory: deploy/terraform

      - name: Terraform Apply
        run: terraform apply -auto-approve -var-file="prod.tfvars"
        working-directory: deploy/terraform
```

## 💰 비용 최적화

### 리소스 태깅
```yaml
# CloudFormation
Tags:
  - Key: Environment
    Value: !Ref Environment
  - Key: Project
    Value: MSP-Checklist
  - Key: CostCenter
    Value: IT
  - Key: Owner
    Value: DevOps-Team
```

```hcl
# Terraform
locals {
  common_tags = {
    Environment = var.environment
    Project     = "MSP-Checklist"
    CostCenter  = "IT"
    Owner       = "DevOps-Team"
    ManagedBy   = "Terraform"
  }
}

resource "aws_instance" "web_server" {
  # ... other configuration
  tags = local.common_tags
}
```

### 스팟 인스턴스 사용
```hcl
# Terraform
resource "aws_spot_instance_request" "web_server" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  spot_price          = "0.05"
  wait_for_fulfillment = true
  
  tags = local.common_tags
}
```

## 🛠️ 트러블슈팅

### 일반적인 문제

#### 1. CloudFormation 스택 생성 실패
```bash
# 스택 이벤트 확인
aws cloudformation describe-stack-events --stack-name msp-checklist-ec2

# 스택 리소스 확인
aws cloudformation describe-stack-resources --stack-name msp-checklist-ec2

# 스택 롤백 방지 (디버깅용)
aws cloudformation create-stack \
  --stack-name msp-checklist-ec2 \
  --template-body file://ec2-stack.yaml \
  --disable-rollback
```

#### 2. Terraform 상태 파일 문제
```bash
# 상태 파일 확인
terraform show

# 상태 파일 새로고침
terraform refresh

# 특정 리소스 상태 제거
terraform state rm aws_instance.web_server

# 리소스 가져오기
terraform import aws_instance.web_server i-1234567890abcdef0
```

#### 3. 권한 문제
```bash
# IAM 정책 시뮬레이터 사용
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/username \
  --action-names ec2:RunInstances \
  --resource-arns "*"

# CloudTrail 로그 확인
aws logs filter-log-events \
  --log-group-name CloudTrail/MSPChecklistLogs \
  --filter-pattern "ERROR"
```

## 📚 모범 사례

### 1. 코드 구조화
```
deploy/
├── cloudformation/
│   ├── templates/
│   │   ├── vpc.yaml
│   │   ├── security-groups.yaml
│   │   └── ec2.yaml
│   ├── parameters/
│   │   ├── dev.json
│   │   └── prod.json
│   └── scripts/
└── terraform/
    ├── modules/
    │   ├── vpc/
    │   ├── security-groups/
    │   └── ec2/
    ├── environments/
    │   ├── dev/
    │   └── prod/
    └── scripts/
```

### 2. 버전 관리
```bash
# Git 태그 사용
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# 스택 이름에 버전 포함
aws cloudformation create-stack \
  --stack-name msp-checklist-v1-0-0 \
  --template-body file://ec2-stack.yaml
```

### 3. 보안 검증
```bash
# CloudFormation 보안 검증
cfn-lint deploy/cloudformation/ec2-stack.yaml

# Terraform 보안 검증
tfsec deploy/terraform/
```

이 가이드를 통해 CloudFormation과 Terraform을 사용하여 MSP 체크리스트 시스템을 안전하고 효율적으로 배포할 수 있습니다.