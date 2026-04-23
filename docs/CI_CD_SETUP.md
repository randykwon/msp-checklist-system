# CI/CD 자동 배포 설정 가이드

MSP Checklist 프로젝트의 자동 배포를 위한 설정 가이드입니다.
두 가지 방식을 지원하며, 상황에 맞게 선택하세요.

| 방식 | 비용 | 보안 | 난이도 | 파일 |
|------|------|------|--------|------|
| SSH 방식 | $0 | 보통 | 쉬움 | `.github/workflows/deploy-ssh.yml` |
| SSM 방식 | $0 | 높음 | 중간 | `.github/workflows/deploy-ssm.yml` |

---

## 방식 A: SSH 배포 설정

### 1. GitHub Secrets 등록

GitHub 리포 → Settings → Secrets and variables → Actions → New repository secret

| Secret 이름 | 값 | 예시 |
|---|---|---|
| `EC2_HOST` | EC2 퍼블릭 IP 또는 도메인 | `mychecker.com` 또는 `13.xxx.xxx.xxx` |
| `EC2_USER` | SSH 사용자명 | `ec2-user` |
| `EC2_SSH_KEY` | SSH 프라이빗 키 전체 내용 | PEM 파일 내용 (아래 참고) |

SSH 키 복사 방법:
```bash
# macOS
cat ~/.ssh/your-ec2-key.pem | pbcopy

# Linux
cat ~/.ssh/your-ec2-key.pem | xclip -selection clipboard

# 또는 직접 출력 후 복사
cat ~/.ssh/your-ec2-key.pem
```

### 2. EC2 보안 그룹 확인

SSH(22번 포트)가 열려 있어야 합니다.
- 소스: `0.0.0.0/0` (키 인증이므로 비교적 안전)
- 또는 GitHub Actions IP 대역으로 제한 (변동 가능하여 권장하지 않음)

### 3. 동작 방식

- `main` 브랜치에 push하면 자동 배포
- `.md` 파일, `docs/` 변경은 배포 트리거하지 않음
- GitHub Actions → Workflow → "Deploy via SSH" 에서 수동 실행 가능
- 수동 실행 시 배포 대상 선택 가능 (all/main-only/admin-only/skip-build)

### 4. 테스트

```bash
# 수동 트리거 (GitHub CLI)
gh workflow run deploy-ssh.yml

# 또는 GitHub 웹에서
# Actions 탭 → "Deploy via SSH" → Run workflow
```

---

## 방식 B: SSM 배포 설정

### 1. EC2 SSM Agent 확인

Amazon Linux 2023에는 기본 설치되어 있습니다.

```bash
# EC2에서 실행
sudo systemctl status amazon-ssm-agent

# 설치되어 있지 않다면
sudo yum install -y amazon-ssm-agent
sudo systemctl enable --now amazon-ssm-agent
```

### 2. EC2 IAM Role 설정

EC2 인스턴스에 SSM 접근 권한이 필요합니다.

```
EC2 콘솔 → 인스턴스 선택 → Actions → Security → Modify IAM role
```

IAM Role에 연결할 정책: `AmazonSSMManagedInstanceCore`

확인:
```bash
# EC2에서 실행
aws ssm describe-instance-information \
  --query "InstanceInformationList[0].{Id:InstanceId,Status:PingStatus}" \
  --output table
```

### 3. CloudFormation으로 IAM 설정 (권장)

```bash
# 로컬 또는 CloudShell에서 실행
aws cloudformation deploy \
  --template-file scripts/deploy/aws-setup-ssm.yml \
  --stack-name github-actions-deploy \
  --parameter-overrides \
    GitHubOrg=randykwon \
    GitHubRepo=msp-qna-teams \
    GitHubBranch=main \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-northeast-2

# 생성된 Role ARN 확인
aws cloudformation describe-stacks \
  --stack-name github-actions-deploy \
  --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" \
  --output text
```

### 3-alt. 수동 IAM 설정

CloudFormation을 사용하지 않는 경우:

#### a) IAM Identity Provider 생성

AWS 콘솔 → IAM → Identity providers → Add provider:
- Provider type: `OpenID Connect`
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

#### b) IAM Role 생성

AWS 콘솔 → IAM → Roles → Create role:
- Trusted entity: `Web identity`
- Identity provider: `token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

Trust Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:randykwon/msp-qna-teams:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Permission Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ssm:ListCommandInvocations",
        "ssm:DescribeInstanceInformation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "ec2:DescribeInstances",
      "Resource": "*"
    }
  ]
}
```

Role 이름: `github-actions-msp-deploy`

### 4. GitHub Secrets 등록

| Secret 이름 | 값 | 예시 |
|---|---|---|
| `AWS_ROLE_ARN` | IAM Role ARN | `arn:aws:iam::123456789012:role/github-actions-msp-deploy` |
| `EC2_INSTANCE_ID` | EC2 인스턴스 ID | `i-0abc123def456789` |

EC2 인스턴스 ID 확인:
```bash
# EC2에서
curl -s http://169.254.169.254/latest/meta-data/instance-id

# 또는 AWS CLI로
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*msp*" \
  --query "Reservations[].Instances[].InstanceId" \
  --output text
```

### 5. 테스트

```bash
# 수동 트리거 (GitHub CLI)
gh workflow run deploy-ssm.yml

# 또는 GitHub 웹에서
# Actions 탭 → "Deploy via SSM" → Run workflow
```

---

## 배포 스크립트 (공통)

두 방식 모두 EC2에서 `scripts/deploy/ci-deploy.sh`를 실행합니다.

### 배포 흐름

```
1. NVM/Node.js 로드
2. DB 백업 (로컬, 선택적 S3)
3. git pull (최신 코드)
4. npm install + build (shared → main → admin)
5. pm2 reload (무중단 재시작)
6. 헬스 체크 (최대 15회, 4초 간격)
7. 실패 시 자동 롤백 (DB 복원 + 이전 커밋)
```

### 옵션

```bash
# 전체 배포
bash scripts/deploy/ci-deploy.sh

# 메인 앱만
bash scripts/deploy/ci-deploy.sh --main-only

# Admin 앱만
bash scripts/deploy/ci-deploy.sh --admin-only

# 빌드 건너뛰기 (재시작만)
bash scripts/deploy/ci-deploy.sh --skip-build

# S3 백업 포함
bash scripts/deploy/ci-deploy.sh --s3-backup
```

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `MSP_PROJECT_DIR` | `/opt/msp-checklist-system` | 프로젝트 디렉토리 |
| `MSP_S3_BACKUP_BUCKET` | (없음) | S3 백업 버킷명 |

---

## 트러블슈팅

### SSH 방식: "Permission denied"
- EC2_SSH_KEY에 PEM 키 전체가 들어갔는지 확인 (`-----BEGIN` ~ `-----END` 포함)
- EC2_USER가 올바른지 확인 (Amazon Linux: `ec2-user`, Ubuntu: `ubuntu`)

### SSH 방식: "Connection timed out"
- EC2 보안 그룹에서 22번 포트가 열려 있는지 확인
- EC2_HOST가 올바른 IP/도메인인지 확인

### SSM 방식: "SSM Agent 오프라인"
- EC2에서 `sudo systemctl status amazon-ssm-agent` 확인
- EC2 IAM Role에 `AmazonSSMManagedInstanceCore` 정책 연결 확인
- VPC 엔드포인트 또는 인터넷 접근 확인

### SSM 방식: "AssumeRoleWithWebIdentity 실패"
- IAM OIDC Provider URL이 정확한지 확인
- Trust Policy의 `sub` 조건에서 리포명/브랜치명 확인
- GitHub Actions의 `permissions.id-token: write` 설정 확인

### 공통: "빌드 실패"
- EC2 메모리 확인 (`free -m`), 2GB 미만이면 swap 설정 필요
- `NODE_OPTIONS=--max-old-space-size=2048` 설정 확인
- `npm install` 실패 시 `node_modules` 삭제 후 재시도

### 공통: "헬스 체크 실패 → 롤백"
- `pm2 logs`로 앱 에러 확인
- `.env.local` 파일이 존재하는지 확인
- 포트 3010/3011이 다른 프로세스에 점유되지 않았는지 확인
