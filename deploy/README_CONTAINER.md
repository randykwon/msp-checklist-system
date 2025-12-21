# MSP 체크리스트 컨테이너 배포 가이드

이 디렉토리에는 MSP Checklist 시스템을 AWS ECS와 EKS에 배포하기 위한 모든 파일과 스크립트가 포함되어 있습니다.

## 📁 디렉토리 구조

```
deploy/
├── ecs/                          # ECS 배포 파일
│   ├── Dockerfile.main           # 메인 앱 Dockerfile
│   ├── Dockerfile.admin          # 관리자 앱 Dockerfile
│   ├── setup-infrastructure.sh   # ECS 인프라 설정
│   └── deploy-ecs.sh             # ECS 배포 스크립트
│
├── eks/                          # EKS 배포 파일
│   ├── cluster.yaml              # EKS 클러스터 설정
│   ├── Dockerfile.main           # 메인 앱 Dockerfile (EKS용)
│   ├── Dockerfile.admin          # 관리자 앱 Dockerfile (EKS용)
│   ├── manifests/                # Kubernetes 매니페스트
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   ├── pv.yaml
│   │   ├── main-app.yaml
│   │   ├── admin-app.yaml
│   │   ├── ingress.yaml
│   │   └── hpa.yaml
│   └── helm/                     # Helm 차트
│       └── msp-checklist/
│           ├── Chart.yaml
│           ├── values.yaml
│           └── values-prod.yaml
│
└── README_CONTAINER.md           # 이 파일
```

## 🚀 배포 방법 선택

### 1. AWS ECS (Fargate)
**추천 대상**: 간단한 컨테이너 배포, 서버리스 선호

**장점**:
- 서버 관리 불필요
- AWS 서비스와 완벽한 통합
- 빠른 시작
- 낮은 학습 곡선

**단점**:
- Kubernetes 기능 제한
- 멀티 클라우드 어려움

**배포 가이드**: [AWS_ECS_DEPLOYMENT_GUIDE.md](../AWS_ECS_DEPLOYMENT_GUIDE.md)

### 2. AWS EKS (Kubernetes)
**추천 대상**: 복잡한 마이크로서비스, Kubernetes 경험 있음

**장점**:
- 완전한 Kubernetes 기능
- 높은 확장성
- 멀티 클라우드 가능
- 풍부한 에코시스템

**단점**:
- 높은 학습 곡선
- 관리 복잡도 증가
- 초기 설정 시간

**배포 가이드**: [AWS_EKS_DEPLOYMENT_GUIDE.md](../AWS_EKS_DEPLOYMENT_GUIDE.md)

## 📊 비교표

| 항목 | ECS | EKS |
|------|-----|-----|
| 관리 복잡도 | 낮음 | 높음 |
| 학습 곡선 | 낮음 | 높음 |
| 확장성 | 중간 | 높음 |
| 비용 | 낮음 | 중간 |
| AWS 통합 | 완벽 | 좋음 |
| 멀티 클라우드 | 어려움 | 쉬움 |
| 시작 시간 | 빠름 | 느림 |

## 🎯 빠른 시작

### ECS 배포
```bash
# 1. 인프라 설정
cd deploy/ecs
./setup-infrastructure.sh

# 2. 애플리케이션 배포
./deploy-ecs.sh

# 3. 서비스 생성 (AWS 콘솔 또는 CLI)
```

### EKS 배포
```bash
# 1. 클러스터 생성
eksctl create cluster -f deploy/eks/cluster.yaml

# 2. Helm 차트 배포
helm install msp-checklist ./deploy/eks/helm/msp-checklist \
  --namespace msp-checklist \
  --create-namespace \
  --values ./deploy/eks/helm/msp-checklist/values-prod.yaml
```

## 🔧 사전 준비사항

### 공통 요구사항
- AWS CLI 설치 및 구성
- Docker 설치
- AWS 계정 및 적절한 IAM 권한
- 도메인 (선택사항)

### ECS 추가 요구사항
- 없음 (AWS CLI만 있으면 됨)

### EKS 추가 요구사항
- kubectl 설치
- eksctl 설치
- Helm 3 설치

## 📝 환경 변수 설정

### 필수 환경 변수
```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export IMAGE_TAG=latest
```

### 선택적 환경 변수
```bash
export DOMAIN=msp.example.com
export SSL_CERT_ARN=arn:aws:acm:us-east-1:account:certificate/xxx
export EFS_ID=fs-xxxxxxxxx
```

## 🔒 보안 고려사항

### 1. 이미지 보안
- 비root 사용자로 실행
- 최소 권한 원칙
- 정기적인 이미지 스캔

### 2. 네트워크 보안
- 보안 그룹 최소화
- 프라이빗 서브넷 사용
- 네트워크 정책 적용

### 3. 데이터 보안
- 전송 중 암호화 (TLS)
- 저장 시 암호화 (EFS)
- 시크릿 관리 (AWS Secrets Manager)

## 📊 모니터링

### ECS 모니터링
- CloudWatch Logs
- CloudWatch Container Insights
- X-Ray (선택사항)

### EKS 모니터링
- Prometheus + Grafana
- CloudWatch Container Insights
- Fluent Bit 로깅

## 💰 비용 최적화

### ECS 비용 최적화
1. Fargate Spot 사용
2. 적절한 CPU/메모리 할당
3. 불필요한 로그 제거

### EKS 비용 최적화
1. Spot 인스턴스 사용
2. Cluster Autoscaler 설정
3. 리소스 요청/제한 최적화
4. 미사용 리소스 정리

## 🔄 CI/CD 통합

### GitHub Actions
- `.github/workflows/ecs-deploy.yml` (ECS)
- `.github/workflows/eks-deploy.yml` (EKS)

### GitLab CI
- `.gitlab-ci.yml` 예제 제공

### Jenkins
- `Jenkinsfile` 예제 제공

## 🛠️ 트러블슈팅

### 일반적인 문제

#### 1. 이미지 빌드 실패
```bash
# Docker 로그 확인
docker logs <container-id>

# 빌드 캐시 제거
docker system prune -a
```

#### 2. 배포 실패
```bash
# ECS: 태스크 로그 확인
aws logs tail /ecs/msp-checklist-main --follow

# EKS: Pod 로그 확인
kubectl logs -f deployment/msp-checklist-main -n msp-checklist
```

#### 3. 네트워크 연결 문제
```bash
# 보안 그룹 확인
aws ec2 describe-security-groups --group-ids sg-xxx

# 네트워크 정책 확인 (EKS)
kubectl describe networkpolicy -n msp-checklist
```

## 📚 추가 리소스

### 공식 문서
- [AWS ECS 문서](https://docs.aws.amazon.com/ecs/)
- [AWS EKS 문서](https://docs.aws.amazon.com/eks/)
- [Kubernetes 문서](https://kubernetes.io/docs/)
- [Helm 문서](https://helm.sh/docs/)

### 유용한 도구
- [eksctl](https://eksctl.io/)
- [k9s](https://k9scli.io/) - Kubernetes CLI UI
- [Lens](https://k8slens.dev/) - Kubernetes IDE
- [AWS Copilot](https://aws.github.io/copilot-cli/) - ECS CLI

## 🤝 지원

문제가 발생하면:
1. 해당 배포 가이드의 트러블슈팅 섹션 확인
2. AWS 로그 확인
3. GitHub Issues에 문의

## 📄 라이선스

MIT License

---

**참고**: 프로덕션 배포 전에 반드시 보안 검토를 수행하세요.