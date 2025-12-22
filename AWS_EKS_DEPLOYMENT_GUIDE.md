# MSP 체크리스트 시스템 AWS EKS 배포 가이드

## 📋 목차
1. [EKS 개요](#eks-개요)
2. [사전 준비사항](#사전-준비사항)
3. [EKS 클러스터 생성](#eks-클러스터-생성)
4. [Docker 이미지 준비](#docker-이미지-준비)
5. [Kubernetes 매니페스트](#kubernetes-매니페스트)
6. [Helm 차트 배포](#helm-차트-배포)
7. [Ingress 및 SSL](#ingress-및-ssl)
8. [모니터링 및 로깅](#모니터링-및-로깅)
9. [자동 스케일링](#자동-스케일링)
10. [CI/CD 파이프라인](#cicd-파이프라인)
11. [보안 설정](#보안-설정)

## 🚀 EKS 개요

Amazon EKS(Elastic Kubernetes Service)는 완전 관리형 Kubernetes 서비스입니다.

### 장점
- 완전 관리형 Kubernetes 컨트롤 플레인
- AWS 서비스와의 네이티브 통합
- 고가용성 및 보안
- 멀티 AZ 배포
- 자동 스케일링 및 로드 밸런싱

### 아키텍처
```
Internet → ALB Ingress Controller → Kubernetes Services
                                   ├── Main App Pods
                                   └── Admin App Pods
                                        ↓
                                   EFS CSI Driver (Persistent Storage)
```

## 🛠️ 사전 준비사항

### 1. 필수 도구 설치

#### Ubuntu 22.04 LTS
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Docker
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Amazon Linux 2023
```bash
# AWS CLI (이미 설치되어 있을 수 있음)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Docker
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. AWS 자격 증명 설정
```bash
aws configure
# Access Key ID, Secret Access Key, Region 설정
```

### 3. 필요한 IAM 권한
- EKS 클러스터 관리 권한
- EC2 및 VPC 권한
- ECR 권한
- CloudFormation 권한
- IAM 역할 생성 권한

## 🏗️ EKS 클러스터 생성

### 1. eksctl을 사용한 클러스터 생성
```yaml
# deploy/eks/cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: msp-checklist-cluster
  region: us-east-1
  version: "1.28"

vpc:
  enableDnsHostnames: true
  enableDnsSupport: true

iam:
  withOIDC: true

addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest
  - name: aws-efs-csi-driver
    version: latest

nodeGroups:
  - name: msp-checklist-nodes
    instanceType: t3.medium
    desiredCapacity: 2
    minSize: 1
    maxSize: 5
    volumeSize: 20
    volumeType: gp3
    amiFamily: AmazonLinux2
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEFSClientWrite
    ssh:
      allow: true
      publicKeyName: msp-checklist-key
    tags:
      Environment: production
      Application: msp-checklist

managedNodeGroups:
  - name: msp-checklist-managed-nodes
    instanceTypes: ["t3.medium", "t3.large"]
    minSize: 1
    maxSize: 10
    desiredCapacity: 2
    volumeSize: 20
    volumeType: gp3
    amiFamily: AmazonLinux2
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEFSClientWrite
    tags:
      Environment: production
      Application: msp-checklist
    
cloudWatch:
  clusterLogging:
    enable: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
```

### 2. 클러스터 생성 실행
```bash
eksctl create cluster -f deploy/eks/cluster.yaml
```

### 3. kubectl 설정
```bash
aws eks update-kubeconfig --region us-east-1 --name msp-checklist-cluster
kubectl get nodes
```

## 🐳 Docker 이미지 준비

### 1. ECR 리포지토리 생성
```bash
aws ecr create-repository --repository-name msp-checklist-main --region us-east-1
aws ecr create-repository --repository-name msp-checklist-admin --region us-east-1
```

### 2. Dockerfile (ECS와 동일)
```dockerfile
# deploy/eks/Dockerfile.main
FROM node:18-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
COPY msp-checklist/package*.json ./msp-checklist/
RUN npm ci --only=production
RUN cd msp-checklist && npm ci --only=production

# 애플리케이션 코드 복사 및 빌드
COPY . .
RUN cd msp-checklist && npm run build

# 비root 사용자 생성
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/api/health || exit 1

CMD ["npm", "start", "--prefix", "msp-checklist"]
```

## 📋 Kubernetes 매니페스트

### 1. Namespace
```yaml
# deploy/eks/manifests/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: msp-checklist
  labels:
    name: msp-checklist
    environment: production
```

### 2. ConfigMap
```yaml
# deploy/eks/manifests/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: msp-checklist-config
  namespace: msp-checklist
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_PATH: "/data/msp-assessment.db"
  CACHE_TTL: "3600"
```

### 3. Secret
```yaml
# deploy/eks/manifests/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: msp-checklist-secret
  namespace: msp-checklist
type: Opaque
data:
  SESSION_SECRET: <base64-encoded-secret>
  OPENAI_API_KEY: <base64-encoded-key>
  ANTHROPIC_API_KEY: <base64-encoded-key>
```

### 4. PersistentVolume (EFS)
```yaml
# deploy/eks/manifests/pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: msp-checklist-efs-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-xxxxxxxxx
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: msp-checklist-efs-pvc
  namespace: msp-checklist
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
```

### 5. 메인 애플리케이션 Deployment
```yaml
# deploy/eks/manifests/main-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msp-checklist-main
  namespace: msp-checklist
  labels:
    app: msp-checklist-main
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: msp-checklist-main
  template:
    metadata:
      labels:
        app: msp-checklist-main
        version: v1
    spec:
      containers:
      - name: msp-checklist-main
        image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:latest
        ports:
        - containerPort: 3010
          name: http
        env:
        - name: PORT
          value: "3010"
        envFrom:
        - configMapRef:
            name: msp-checklist-config
        - secretRef:
            name: msp-checklist-secret
        volumeMounts:
        - name: data-storage
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3010
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3010
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      volumes:
      - name: data-storage
        persistentVolumeClaim:
          claimName: msp-checklist-efs-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: msp-checklist-main-service
  namespace: msp-checklist
  labels:
    app: msp-checklist-main
spec:
  selector:
    app: msp-checklist-main
  ports:
  - port: 80
    targetPort: 3010
    protocol: TCP
    name: http
  type: ClusterIP
```

### 6. 관리자 애플리케이션 Deployment
```yaml
# deploy/eks/manifests/admin-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: msp-checklist-admin
  namespace: msp-checklist
  labels:
    app: msp-checklist-admin
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: msp-checklist-admin
  template:
    metadata:
      labels:
        app: msp-checklist-admin
        version: v1
    spec:
      containers:
      - name: msp-checklist-admin
        image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:latest
        ports:
        - containerPort: 3011
          name: http
        env:
        - name: PORT
          value: "3011"
        envFrom:
        - configMapRef:
            name: msp-checklist-config
        - secretRef:
            name: msp-checklist-secret
        volumeMounts:
        - name: data-storage
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3011
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3011
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
      volumes:
      - name: data-storage
        persistentVolumeClaim:
          claimName: msp-checklist-efs-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: msp-checklist-admin-service
  namespace: msp-checklist
  labels:
    app: msp-checklist-admin
spec:
  selector:
    app: msp-checklist-admin
  ports:
  - port: 80
    targetPort: 3011
    protocol: TCP
    name: http
  type: ClusterIP
```

## 🎯 Helm 차트 배포

### 1. Helm 차트 구조
```
deploy/eks/helm/msp-checklist/
├── Chart.yaml
├── values.yaml
├── values-prod.yaml
├── templates/
│   ├── deployment-main.yaml
│   ├── deployment-admin.yaml
│   ├── service-main.yaml
│   ├── service-admin.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── pvc.yaml
│   └── hpa.yaml
└── charts/
```

### 2. Chart.yaml
```yaml
# deploy/eks/helm/msp-checklist/Chart.yaml
apiVersion: v2
name: msp-checklist
description: MSP Checklist Application Helm Chart
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - msp
  - checklist
  - assessment
home: https://github.com/your-org/msp-checklist
maintainers:
  - name: MSP Team
    email: msp-team@example.com
```

### 3. values.yaml
```yaml
# deploy/eks/helm/msp-checklist/values.yaml
global:
  imageRegistry: <account-id>.dkr.ecr.us-east-1.amazonaws.com
  imagePullPolicy: Always
  storageClass: efs-sc

mainApp:
  name: msp-checklist-main
  image:
    repository: msp-checklist-main
    tag: latest
  replicaCount: 2
  port: 3010
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

adminApp:
  name: msp-checklist-admin
  image:
    repository: msp-checklist-admin
    tag: latest
  replicaCount: 1
  port: 3011
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "250m"
  autoscaling:
    enabled: false

persistence:
  enabled: true
  storageClass: efs-sc
  accessMode: ReadWriteMany
  size: 5Gi

ingress:
  enabled: true
  className: alb
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:account-id:certificate/xxx
    alb.ingress.kubernetes.io/ssl-redirect: '443'
  hosts:
    - host: msp.example.com
      paths:
        - path: /
          pathType: Prefix
          service: msp-checklist-main-service
        - path: /admin
          pathType: Prefix
          service: msp-checklist-admin-service

config:
  nodeEnv: production
  logLevel: info
  cacheTimeout: 3600

secrets:
  sessionSecret: ""
  openaiApiKey: ""
  anthropicApiKey: ""

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

### 4. Helm 배포
```bash
# 네임스페이스 생성
kubectl create namespace msp-checklist

# Helm 차트 배포
helm install msp-checklist ./deploy/eks/helm/msp-checklist \
  --namespace msp-checklist \
  --values ./deploy/eks/helm/msp-checklist/values-prod.yaml

# 업그레이드
helm upgrade msp-checklist ./deploy/eks/helm/msp-checklist \
  --namespace msp-checklist \
  --values ./deploy/eks/helm/msp-checklist/values-prod.yaml
```

## 🌐 Ingress 및 SSL

### 1. AWS Load Balancer Controller 설치
```bash
# IAM 역할 생성
eksctl create iamserviceaccount \
  --cluster=msp-checklist-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
  --approve

# Helm으로 설치
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=msp-checklist-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 2. Ingress 설정
```yaml
# deploy/eks/manifests/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: msp-checklist-ingress
  namespace: msp-checklist
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:account-id:certificate/xxx
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /api/health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '3'
spec:
  rules:
  - host: msp.example.com
    http:
      paths:
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: msp-checklist-admin-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: msp-checklist-main-service
            port:
              number: 80
```

## 📊 모니터링 및 로깅

### 1. Prometheus 및 Grafana 설치
```bash
# Prometheus Operator 설치
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin123
```

### 2. ServiceMonitor 설정
```yaml
# deploy/eks/manifests/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: msp-checklist-monitor
  namespace: msp-checklist
  labels:
    app: msp-checklist
spec:
  selector:
    matchLabels:
      app: msp-checklist-main
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### 3. Fluent Bit 로깅
```bash
# Fluent Bit 설치
helm repo add fluent https://fluent.github.io/helm-charts
helm install fluent-bit fluent/fluent-bit \
  --namespace logging \
  --create-namespace \
  --set cloudWatch.enabled=true \
  --set cloudWatch.region=us-east-1 \
  --set cloudWatch.logGroupName=/aws/eks/msp-checklist/logs
```

## 🎯 자동 스케일링

### 1. Horizontal Pod Autoscaler
```yaml
# deploy/eks/manifests/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: msp-checklist-main-hpa
  namespace: msp-checklist
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: msp-checklist-main
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. Cluster Autoscaler
```bash
# Cluster Autoscaler 설치
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# 클러스터 이름 설정
kubectl -n kube-system annotate deployment.apps/cluster-autoscaler cluster-autoscaler.kubernetes.io/safe-to-evict="false"
kubectl -n kube-system edit deployment.apps/cluster-autoscaler
```

## 🔄 CI/CD 파이프라인

### 1. GitHub Actions 워크플로우
```yaml
# .github/workflows/eks-deploy.yml
name: Deploy to EKS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER_NAME: msp-checklist-cluster

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push Docker images
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        # Build and push main app
        docker build -f deploy/eks/Dockerfile.main -t $ECR_REGISTRY/msp-checklist-main:$IMAGE_TAG .
        docker push $ECR_REGISTRY/msp-checklist-main:$IMAGE_TAG
        
        # Build and push admin app
        docker build -f deploy/eks/Dockerfile.admin -t $ECR_REGISTRY/msp-checklist-admin:$IMAGE_TAG .
        docker push $ECR_REGISTRY/msp-checklist-admin:$IMAGE_TAG

    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name ${{ env.EKS_CLUSTER_NAME }}

    - name: Deploy to EKS
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        # Update image tags in Helm values
        helm upgrade --install msp-checklist ./deploy/eks/helm/msp-checklist \
          --namespace msp-checklist \
          --create-namespace \
          --set mainApp.image.tag=$IMAGE_TAG \
          --set adminApp.image.tag=$IMAGE_TAG \
          --set global.imageRegistry=$ECR_REGISTRY \
          --wait --timeout=10m

    - name: Verify deployment
      run: |
        kubectl rollout status deployment/msp-checklist-main -n msp-checklist
        kubectl rollout status deployment/msp-checklist-admin -n msp-checklist
        kubectl get pods -n msp-checklist
```

## 🔒 보안 설정

### 1. Pod Security Standards
```yaml
# deploy/eks/manifests/pod-security-policy.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: msp-checklist
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 2. Network Policies
```yaml
# deploy/eks/manifests/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: msp-checklist-network-policy
  namespace: msp-checklist
spec:
  podSelector:
    matchLabels:
      app: msp-checklist-main
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 3010
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
    - protocol: UDP
      port: 53
```

## 💰 비용 최적화

### 1. Spot 인스턴스 사용
```yaml
# eksctl 설정에 추가
nodeGroups:
  - name: msp-checklist-spot-nodes
    instancesDistribution:
      maxPrice: 0.05
      instanceTypes: ["t3.medium", "t3.large", "t3a.medium", "t3a.large"]
      onDemandBaseCapacity: 0
      onDemandPercentageAboveBaseCapacity: 0
      spotInstancePools: 4
```

### 2. 리소스 최적화
```bash
# 리소스 사용량 모니터링
kubectl top nodes
kubectl top pods -n msp-checklist

# 미사용 리소스 정리
kubectl get pods --all-namespaces | grep Evicted | awk '{print $1 " " $2}' | xargs -n2 kubectl delete pod -n
```

## 🛠️ 트러블슈팅

### 1. 일반적인 문제들
```bash
# Pod 상태 확인
kubectl get pods -n msp-checklist -o wide

# Pod 로그 확인
kubectl logs -f deployment/msp-checklist-main -n msp-checklist

# 이벤트 확인
kubectl get events -n msp-checklist --sort-by='.lastTimestamp'

# 서비스 엔드포인트 확인
kubectl get endpoints -n msp-checklist

# Ingress 상태 확인
kubectl describe ingress msp-checklist-ingress -n msp-checklist
```

### 2. 디버깅 도구
```bash
# 임시 디버그 Pod 생성
kubectl run debug --image=busybox -it --rm --restart=Never -- sh

# 네트워크 연결 테스트
kubectl run netshoot --image=nicolaka/netshoot -it --rm --restart=Never -- bash
```

이 가이드를 따라하면 AWS EKS에서 MSP 체크리스트 시스템을 Kubernetes 기반으로 확장 가능하고 안전하게 배포할 수 있습니다.