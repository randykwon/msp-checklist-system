# MSP 체크리스트 시스템 (MSP Checklist System)

AWS MSP(Managed Service Provider) 파트너 프로그램 검증을 위한 종합적인 체크리스트 및 평가 시스템입니다.

## 🚀 주요 기능

### 📋 체크리스트 관리
- **사전요구사항 검증** (15개 항목)
- **기술검증** (46개 항목) 
- **프로파일별 진행상황 관리**
- **실시간 진행률 추적**

### 👥 사용자 관리
- **4단계 역할 시스템**: user → operator → admin → superadmin
- **사용자별 독립적인 평가 진행**
- **조직별 사용자 그룹 관리**

### 🤖 AI 기반 지원
- **자동 조언 생성** (OpenAI GPT 기반)
- **가상 증빙 생성**
- **Q&A 자동 응답**
- **캐시 기반 성능 최적화**

### 📊 관리자 대시보드
- **실시간 진행상황 모니터링**
- **사용자별/프로파일별 상세 분석**
- **시스템 관리 및 백업**
- **공지사항 관리**

### 🌐 다국어 지원
- **한국어/영어 완전 지원**
- **언어별 독립적인 데이터 관리**
- **실시간 언어 전환**

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐
│   Main App      │    │   Admin App     │
│   (Port 3000)   │    │   (Port 3011)   │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────┐
         │   Shared Data   │
         │   (SQLite DB)   │
         └─────────────────┘
```

### 기술 스택
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite (파일 기반)
- **AI**: OpenAI GPT-4
- **Deployment**: Docker, AWS (EC2/ECS/EKS)

## 📦 설치 및 실행

### 사전 요구사항
- **Node.js 22+** (LTS 권장)
- **npm 10+** 또는 **yarn 4+**
- **Git**
- **지원 OS**: Ubuntu 22.04 LTS, Amazon Linux 2023, macOS, Windows (WSL2)

### 로컬 개발 환경 설정

1. **저장소 클론**
   ```bash
   git clone https://github.com/your-username/msp-checklist-system.git
   cd msp-checklist-system
   ```

2. **Node.js 설치 (필요한 경우)**
   
   **Ubuntu 22.04 LTS:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
   
   **Amazon Linux 2023:**
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
   sudo dnf install -y nodejs
   ```

3. **의존성 설치**
   ```bash
   # 루트 의존성 설치
   npm install
   
   # 메인 앱 의존성 설치
   cd msp-checklist
   npm install
   
   # 관리자 앱 의존성 설치
   cd admin
   npm install
   cd ../..
   ```

3. **환경 변수 설정**
   ```bash
   # .env 파일 생성 (루트 디렉토리)
   cp .env.example .env
   
   # 필요한 환경 변수 설정
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **개발 서버 실행**
   ```bash
   # 통합 개발 서버 시작
   ./start-dev.sh
   
   # 또는 개별 실행
   npm run dev          # 메인 앱 (포트 3000)
   npm run dev:admin    # 관리자 앱 (포트 3011)
   ```

### 빠른 시작

```bash
# 빠른 시작 스크립트 실행
./quick-restart.sh
```

이 스크립트는 다음을 수행합니다:
- 기존 프로세스 종료
- 의존성 설치
- 데이터베이스 초기화
- 서버 시작

## 🔧 관리 스크립트

### 서버 관리
```bash
./start-dev.sh          # 개발 서버 시작
./restart-servers.sh    # 서버 재시작
./stop-servers.sh       # 서버 중지
./server-status.sh      # 서버 상태 확인
```

### 사용자 관리
```bash
node create-admin.cjs           # 관리자 계정 생성
node create-operator.cjs        # 운영자 계정 생성
node upgrade-to-superadmin.cjs  # 슈퍼관리자 권한 부여
```

### 시스템 유틸리티
```bash
node file-watcher.js           # 파일 변경 감지
node test-admin-login.js       # 관리자 로그인 테스트
node convert-xlsx-to-csv.js    # Excel 파일 변환
```

## 🌐 접속 정보

### 개발 환경
- **메인 애플리케이션**: http://localhost:3000
- **관리자 대시보드**: http://localhost:3011

### 기본 계정
- **관리자**: admin@example.com / admin123
- **사용자**: user@example.com / user123

## 📚 주요 문서

### 설정 가이드
- [📖 설정 가이드](SETUP_GUIDE.md) - 상세한 설치 및 설정 방법
- [🚀 빠른 시작](QUICK_START.md) - 빠른 시작 가이드
- [🧪 테스트 가이드](msp-checklist/TEST_GUIDE.md) - 테스트 실행 방법

### 기능 문서
- [👥 역할 시스템](ROLE_SYSTEM_GUIDE.md) - 사용자 역할 및 권한
- [🔧 관리자 시스템](ADMIN_SYSTEM_GUIDE.md) - 관리자 기능 가이드
- [📊 평가 기능](ASSESSMENT_FEATURE.md) - 평가 시스템 상세

### 기술 문서
- [🖥️ 서버 관리](SERVER_MANAGEMENT.md) - 서버 운영 가이드
- [📝 서버 스크립트](SERVER_SCRIPTS_GUIDE.md) - 관리 스크립트 설명
- [🔄 시스템 관리](SYSTEM_MANAGEMENT_IMPLEMENTATION.md) - 시스템 관리 구현

### 배포 가이드
- [☁️ AWS 배포](AWS_DEPLOYMENT_GUIDE.md) - AWS EC2 배포 가이드
- [🐳 ECS 배포](AWS_ECS_DEPLOYMENT_GUIDE.md) - AWS ECS 배포 가이드
- [☸️ EKS 배포](AWS_EKS_DEPLOYMENT_GUIDE.md) - AWS EKS 배포 가이드
- [🏗️ IaC 배포](AWS_IAC_DEPLOYMENT_GUIDE.md) - Infrastructure as Code 가이드

## 🚀 배포

### AWS 클라우드 배포

이 시스템은 다양한 AWS 배포 옵션을 지원합니다:

#### 1. EC2 배포 (권장)
```bash
cd deploy/cloudformation
./deploy.sh ec2 production
```

#### 2. ECS 배포 (컨테이너)
```bash
cd deploy/cloudformation
./deploy.sh ecs production
```

#### 3. EKS 배포 (Kubernetes)
```bash
cd deploy/cloudformation
./deploy.sh eks production
```

#### 4. Terraform 배포
```bash
cd deploy/terraform
./deploy.sh ec2 production apply
```

자세한 배포 방법은 [deploy/README.md](deploy/README.md)를 참조하세요.

## 🔍 모니터링

### 시스템 상태 확인
```bash
# 서버 상태
./server-status.sh

# 헬스 체크
curl http://localhost:3000/api/health
curl http://localhost:3011/api/health
```

### 로그 확인
```bash
# 서버 로그
tail -f server.log
tail -f admin-server.log

# 파일 감시 로그
tail -f file-watcher.log
```

## 🛠️ 개발

### 프로젝트 구조
```
msp-checklist-system/
├── msp-checklist/          # 메인 애플리케이션
│   ├── app/                # Next.js 앱 라우터
│   ├── components/         # React 컴포넌트
│   ├── lib/               # 유틸리티 라이브러리
│   └── data/              # 체크리스트 데이터
├── msp-checklist/admin/    # 관리자 애플리케이션
│   ├── app/               # 관리자 앱 라우터
│   ├── components/        # 관리자 컴포넌트
│   └── lib/              # 관리자 라이브러리
├── deploy/                # 배포 설정
│   ├── cloudformation/    # AWS CloudFormation
│   ├── terraform/         # Terraform IaC
│   └── github-actions/    # CI/CD 워크플로우
├── msp_data/             # MSP 프로그램 데이터
└── scripts/              # 관리 스크립트
```

### 개발 워크플로우
1. 기능 브랜치 생성
2. 로컬에서 개발 및 테스트
3. Pull Request 생성
4. 코드 리뷰 및 승인
5. main 브랜치 병합
6. 자동 배포 (CI/CD)

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/msp-checklist-system/issues)
- **문서**: [Wiki](https://github.com/your-username/msp-checklist-system/wiki)
- **이메일**: support@example.com

## 🔄 업데이트 로그

### v2.0.0 (2024-12-22)
- ✨ 프로파일별 진행상황 관리 기능 추가
- 🔧 관리자 시스템 완전 분리 (포트 3011)
- 🤖 AI 조언 생성 및 캐싱 시스템 구현
- 🌐 완전한 다국어 지원 (한국어/영어)
- ☁️ AWS 클라우드 배포 지원 (EC2/ECS/EKS)
- 🏗️ Infrastructure as Code (CloudFormation/Terraform)
- 🔄 CI/CD 파이프라인 구축

### v1.0.0 (2024-11-15)
- 🎉 초기 릴리스
- 📋 기본 체크리스트 기능
- 👥 사용자 관리 시스템
- 📊 기본 대시보드

---

**Made with ❤️ for AWS MSP Partners**