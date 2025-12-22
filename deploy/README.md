# MSP 체크리스트 시스템 배포 가이드

이 디렉토리는 MSP 체크리스트 시스템을 AWS 클라우드에 배포하기 위한 Infrastructure as Code (IaC) 템플릿과 스크립트를 포함합니다.

## 📋 목차

1. [배포 옵션](#배포-옵션)
2. [사전 요구사항](#사전-요구사항)
3. [CloudFormation 배포](#cloudformation-배포)
4. [Terraform 배포](#terraform-배포)
5. [CI/CD 설정](#cicd-설정)
6. [모니터링 및 관리](#모니터링-및-관리)
7. [트러블슈팅](#트러블슈팅)

## 🚀 배포 옵션

### 지원하는 배포 방식

| 배포 방식 | 설명 | 적합한 용도 |
|-----------|------|-------------|
| **EC2** | 전통적인 가상 머신 기반 배포 | 간단한 설정, 직접적인 서버 관리 |
| **ECS** | 컨테이너 오케스트레이션 (Fargate) | 서버리스 컨테이너, 자동 스케일링 |
| **EKS** | Kubernetes 클러스터 | 복잡한 마이크로서비스, 고급 오케스트레이션 |

### IaC 도구 비교

| 특징 | CloudFormation | Terraform |
|------|----------------|-----------|
| **제공업체** | AWS 네이티브 | HashiCorp |
| **상태 관리** | AWS 관리 | 별도 백엔드 필요 |
| **멀티 클라우드** | AWS 전용 | 지원 |
| **학습 곡선** | 중간 | 중간 |
| **비용** | 무료 | 무료/유료 |

## 📋 사전 요구사항

### 필수 도구

1. **AWS CLI** (v2.0+)
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. **Terraform** (1.0+) - Terraform 사용 시
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **Docker** - ECS/EKS 배포 시
   ```bash
   # macOS
   brew install docker
   
   # Ubuntu 22.04 LTS
   sudo apt-get update
   sudo apt-get install -y docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Amazon Linux 2023
   sudo dnf update -y
   sudo dnf install -y docker
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

### AWS 설정

1. **AWS 자격 증명 구성**
   ```bash
   aws configure
   ```

2. **필요한 권한**
   - EC2 관리 권한
   - VPC 관리 권한
   - IAM 역할 생성 권한
   - CloudFormation 또는 Terraform 실행 권한
   - S3 버킷 관리 권한
   - ECS/EKS 관리 권한 (해당 배포 방식 사용 시)

3. **EC2 키 페어 생성**
   ```bash
   aws ec2 create-key-pair --key-name msp-checklist-key --query 'KeyMaterial' --output text > msp-checklist-key.pem
   chmod 400 msp-checklist-key.pem
   ```

## ☁️ CloudFormation 배포

### 빠른 시작

1. **EC2 배포**
   ```bash
   cd deploy/cloudformation
   ./deploy.sh ec2 production
   ```

2. **ECS 배포**
   ```bash
   cd deploy/cloudformation
   export MAIN_APP_IMAGE="your-account.dkr.ecr.region.amazonaws.com/msp-checklist-main:latest"
   export ADMIN_APP_IMAGE="your-account.dkr.ecr.region.amazonaws.com/msp-checklist-admin:latest"
   ./deploy.sh ecs production
   ```

3. **EKS 배포**
   ```bash
   cd deploy/cloudformation
   ./deploy.sh eks production
   ```

### 환경 변수 설정

```bash
# 공통 설정
export AWS_REGION="us-east-1"
export EC2_KEY_NAME="your-key-pair-name"
export DOMAIN_NAME="your-domain.com"  # 선택사항

# EC2 전용
export INSTANCE_TYPE="t3.medium"

# ECS 전용
export MAIN_APP_IMAGE="123456789012.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:latest"
export ADMIN_APP_IMAGE="123456789012.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:latest"

# EKS 전용
export CLUSTER_NAME="msp-checklist"
export NODE_INSTANCE_TYPE="t3.medium"
export NODE_DESIRED_SIZE="2"
```

### 수동 배포

```bash
# 스택 생성
aws cloudformation create-stack \
  --stack-name msp-checklist-ec2-prod \
  --template-body file://ec2-stack.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=your-key \
               ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_IAM

# 스택 상태 확인
aws cloudformation describe-stacks --stack-name msp-checklist-ec2-prod

# 스택 업데이트
aws cloudformation update-stack \
  --stack-name msp-checklist-ec2-prod \
  --template-body file://ec2-stack.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=your-key \
  --capabilities CAPABILITY_IAM

# 스택 삭제
aws cloudformation delete-stack --stack-name msp-checklist-ec2-prod
```

## 🏗️ Terraform 배포

### 빠른 시작

1. **설정 파일 준비**
   ```bash
   cd deploy/terraform
   cp terraform.tfvars.example terraform.tfvars
   # terraform.tfvars 파일을 편집하여 설정 값 입력
   ```

2. **EC2 배포**
   ```bash
   ./deploy.sh ec2 production apply
   ```

3. **ECS 배포**
   ```bash
   ./deploy.sh ecs production apply
   ```

4. **EKS 배포**
   ```bash
   ./deploy.sh eks production apply
   ```

### 환경별 배포

```bash
# 개발 환경
./deploy.sh ec2 development apply

# 스테이징 환경
./deploy.sh ec2 staging apply

# 프로덕션 환경
./deploy.sh ec2 production apply
```

### 수동 배포

```bash
cd deploy/terraform

# 초기화
terraform init

# 워크스페이스 생성/선택
terraform workspace new production-ec2
terraform workspace select production-ec2

# 계획 확인
terraform plan -var-file="prod.tfvars"

# 배포 실행
terraform apply -var-file="prod.tfvars"

# 리소스 확인
terraform show

# 출력 값 확인
terraform output

# 리소스 삭제
terraform destroy -var-file="prod.tfvars"
```

## 🔄 CI/CD 설정

### GitHub Actions

1. **워크플로우 파일 복사**
   ```bash
   # CloudFormation 워크플로우
   cp deploy/github-actions/cloudformation-deploy.yml .github/workflows/

   # Terraform 워크플로우
   cp deploy/github-actions/terraform-deploy.yml .github/workflows/
   ```

2. **GitHub Secrets 설정**
   
   Repository Settings > Secrets and variables > Actions에서 다음 시크릿 추가:

   ```
   # AWS 자격 증명
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY

   # EC2 설정
   EC2_KEY_NAME
   INSTANCE_TYPE

   # 컨테이너 이미지 (ECS용)
   MAIN_APP_IMAGE
   ADMIN_APP_IMAGE

   # EKS 설정
   CLUSTER_NAME

   # 도메인 설정 (선택사항)
   DOMAIN_NAME
   CERTIFICATE_ARN
   ```

3. **환경별 보호 규칙 설정**
   
   Repository Settings > Environments에서 환경 생성:
   - `development`
   - `staging`
   - `production`

### 워크플로우 트리거

- **자동 배포**: `main` 브랜치에 푸시 시 프로덕션 배포
- **개발 배포**: `develop` 브랜치에 푸시 시 개발 환경 배포
- **수동 배포**: Actions 탭에서 수동 실행
- **PR 검증**: Pull Request 시 템플릿 검증

## 📊 모니터링 및 관리

### CloudWatch 대시보드

배포 후 자동으로 생성되는 CloudWatch 대시보드에서 다음 메트릭 모니터링:

- CPU 사용률
- 메모리 사용률
- 네트워크 트래픽
- 애플리케이션 로그
- 로드 밸런서 메트릭

### 로그 확인

```bash
# CloudWatch Logs 확인
aws logs describe-log-groups --log-group-name-prefix "/aws/ec2/msp-checklist"

# 로그 스트림 확인
aws logs describe-log-streams --log-group-name "/aws/ec2/msp-checklist-stack"

# 로그 내용 확인
aws logs get-log-events --log-group-name "/aws/ec2/msp-checklist-stack" --log-stream-name "main-app"
```

### 애플리케이션 상태 확인

```bash
# 헬스 체크
curl http://your-load-balancer-dns/api/health
curl http://your-load-balancer-dns/admin/api/health

# 애플리케이션 버전 확인
curl http://your-load-balancer-dns/api/version
```

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. 권한 오류
```bash
# IAM 정책 확인
aws iam list-attached-user-policies --user-name your-username
aws iam get-policy-version --policy-arn arn:aws:iam::aws:policy/PowerUserAccess --version-id v1
```

#### 2. 리소스 한도 초과
```bash
# EC2 인스턴스 한도 확인
aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A

# VPC 한도 확인
aws service-quotas get-service-quota --service-code vpc --quota-code L-F678F1CE
```

#### 3. 네트워크 연결 문제
```bash
# 보안 그룹 확인
aws ec2 describe-security-groups --group-names msp-checklist-web-sg

# 라우팅 테이블 확인
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-xxxxxxxxx"
```

#### 4. 애플리케이션 시작 실패
```bash
# EC2 인스턴스 로그 확인
aws ec2 get-console-output --instance-id i-xxxxxxxxx

# ECS 태스크 로그 확인
aws ecs describe-tasks --cluster msp-checklist-cluster --tasks task-id

# EKS 파드 로그 확인
kubectl logs -f deployment/msp-checklist-main
```

### 복구 절차

#### 1. 롤백
```bash
# CloudFormation 롤백
aws cloudformation cancel-update-stack --stack-name msp-checklist-stack

# Terraform 롤백
terraform apply -var-file="prod.tfvars" -target=resource.to.rollback
```

#### 2. 재배포
```bash
# 전체 재배포
./deploy.sh ec2 production

# 특정 리소스만 재배포
terraform apply -var-file="prod.tfvars" -target=module.ec2
```

## 📚 추가 리소스

### 문서
- [AWS CloudFormation 사용자 가이드](https://docs.aws.amazon.com/cloudformation/)
- [Terraform AWS Provider 문서](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS 개발자 가이드](https://docs.aws.amazon.com/ecs/)
- [Amazon EKS 사용자 가이드](https://docs.aws.amazon.com/eks/)

### 도구
- [AWS CLI 참조](https://docs.aws.amazon.com/cli/)
- [kubectl 참조](https://kubernetes.io/docs/reference/kubectl/)
- [Helm 차트](https://helm.sh/docs/)

### 모니터링
- [CloudWatch 사용자 가이드](https://docs.aws.amazon.com/cloudwatch/)
- [AWS X-Ray 개발자 가이드](https://docs.aws.amazon.com/xray/)

## 🆘 지원

문제가 발생하거나 질문이 있는 경우:

1. 이 README의 트러블슈팅 섹션 확인
2. AWS 문서 참조
3. GitHub Issues에 문제 보고
4. 팀 Slack 채널에서 도움 요청

---

**참고**: 이 가이드는 MSP 체크리스트 시스템의 AWS 배포를 위한 것입니다. 프로덕션 환경에서 사용하기 전에 충분한 테스트를 수행하시기 바랍니다.