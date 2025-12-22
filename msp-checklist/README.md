# AWS MSP 파트너 프로그램 검증 체크리스트

AWS 관리형 서비스 제공업체(MSP) 파트너 프로그램 검증 체크리스트 v7.1을 기반으로 한 종합 웹 애플리케이션입니다.

## 주요 기능

### 📊 대시보드
- 전체 진행 현황 실시간 추적
- 카테고리별 진행률 시각화
- 완료/진행 중/미시작 항목 통계

### ✅ 체크리스트 관리
- **7개 주요 카테고리**:
  1. 사전 요구사항 제어 (4항목)
  2. 고객 관리 (5항목)
  3. 서비스 제공 (5항목)
  4. 모니터링 및 옵저버빌리티 (4항목)
  5. 보안 및 규정 준수 (5항목)
  6. 백업 및 재해 복구 (4항목)
  7. 비용 최적화 (4항목)

- **항목별 관리 기능**:
  - 상태 변경 (시작 안함/진행 중/완료/해당없음)
  - 담당자 지정
  - 메모 및 진행 상황 기록
  - 필요한 증빙 자료 확인
  - **🆕 증빙 파일 업로드**: 문서, 스크린샷, 차트, 보고서 등을 이미지 또는 PDF로 업로드
  - **🆕 AI 증빙 평가**: 다중 LLM 제공업체를 통한 자동 증빙 평가 및 피드백

### 🔍 필터링 및 검색
- 상태별 필터링
- 유형별 필터링 (사전 요구사항/기술 검증)
- 키워드 검색 (제어 항목, 설명, 메모)

### 💾 데이터 저장
- LocalStorage를 활용한 자동 저장
- 페이지 새로고침 시 데이터 유지
- 진행률 자동 재계산

### 🔐 사용자 인증
- **로그인/회원가입**: 안전한 사용자 인증 시스템
- **이메일 기억하기**: 로그인 시 이메일 자동 저장 및 복원
- **패스워드 보기**: 입력한 패스워드 확인 가능
- **세션 관리**: 자동 로그인 상태 유지

### 🤖 AI 기반 증빙 평가 (신규)
- **파일 업로드**: 각 항목별로 여러 증빙 파일 업로드 (이미지 + PDF, 최대 10MB)
- **PDF 텍스트 추출**: 클라이언트 사이드에서 PDF.js를 사용하여 텍스트 추출
- **PDF 텍스트 편집**: 추출된 텍스트 수동 편집 및 보완 기능
- **다중 LLM 지원**: OpenAI, Google Gemini, Anthropic Claude, AWS Bedrock 중 선택 가능
- **자동 평가**: 선택한 LLM을 통한 증빙 자료 자동 평가
- **세부 평가 기준**:
  - 문서 완성도 (0-100점)
  - 품질 및 명확성 (0-100점)
  - 요구사항 충족도 (0-100점)
- **상세 피드백**: 개선 제안 및 구체적인 권장사항 제공
- **파일 갤러리**: 업로드된 이미지 및 PDF 파일 미리보기 및 관리
- **평가 결과 저장**: 평가 점수 및 피드백 자동 저장

### 💡 AI 조언 시스템
- **다중 LLM 지원**: OpenAI, Google Gemini, Anthropic Claude, AWS Bedrock 중 선택
- **맞춤형 조언**: 각 항목의 요구사항에 맞는 구체적인 조언 생성
- **조언 캐싱**: 24시간 캐시로 빠른 재접근
- **인라인 표시**: Evidence Required 섹션 바로 아래 조언 표시
- **언어별 조언**: 한국어/영어 각각 별도 생성 및 캐시

## 기술 스택

- **Frontend**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Data Persistence**: LocalStorage
- **PDF Processing**: PDF.js (클라이언트 사이드)

## 시작하기

### 필수 요구사항

- **Node.js 22.x 이상** (LTS 권장)
- **npm 10.x 이상** 또는 **yarn 4.x 이상** 패키지 매니저
- **지원 OS**: Ubuntu 22.04 LTS, Amazon Linux 2023, macOS, Windows (WSL2)
- **LLM API 키** (AI 기능 사용 시 - OpenAI, Gemini, Claude, 또는 AWS Bedrock 중 선택)

### 📚 추가 문서

- **[서버 관리 가이드](../SERVER_MANAGEMENT.md)**: 서버 시작/중지/상태 확인 등 상세 가이드
- **[테스트 가이드](TEST_GUIDE.md)**: AI 기능 및 PDF 처리 테스트 방법

### 설치

#### Ubuntu 22.04 LTS
```bash
# Node.js 22 설치 (필요한 경우)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 프로젝트 루트 디렉토리에서
# 1. 파일 감시 시스템 의존성 설치
npm install

# 2. MSP 체크리스트 앱 의존성 설치
cd msp-checklist
npm install

# 3. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 편집하여 LLM 제공업체 및 API 키를 설정하세요

# 4. 서버 시작 (프로젝트 루트에서)
cd ..
./restart-server.sh
# 또는 간단히
npm run restart
```

#### Amazon Linux 2023
```bash
# Node.js 22 설치 (필요한 경우)
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

# 프로젝트 루트 디렉토리에서
# 1. 파일 감시 시스템 의존성 설치
npm install

# 2. MSP 체크리스트 앱 의존성 설치
cd msp-checklist
npm install

# 3. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 편집하여 LLM 제공업체 및 API 키를 설정하세요

# 4. 서버 시작 (프로젝트 루트에서)
cd ..
./restart-server.sh
# 또는 간단히
npm run restart
```

브라우저에서 [http://localhost:3010](http://localhost:3010)을 열어 애플리케이션을 확인하세요.

### 환경 변수 설정

AI 기반 증빙 조언 및 평가 기능을 사용하려면 LLM 제공업체의 API 키가 필요합니다:

1. `.env.local.example` 파일을 `.env.local`로 복사
2. 원하는 LLM 제공업체를 선택하고 해당 API 키를 설정:

   ```bash
   # LLM 제공업체 선택 (openai, gemini, claude, bedrock 중 하나)
   LLM_PROVIDER=openai

   # OpenAI (기본값)
   OPENAI_API_KEY=your_openai_api_key_here

   # Google Gemini
   GEMINI_API_KEY=your_gemini_api_key_here

   # Anthropic Claude
   CLAUDE_API_KEY=your_claude_api_key_here

   # AWS Bedrock
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1
   ```

**지원하는 LLM 제공업체**:
- 🤖 **OpenAI**: GPT-4o, GPT-4o-mini (텍스트 + 비전)
- 🧠 **Google Gemini**: Gemini-1.5-Flash (텍스트 + 비전)
- 🎭 **Anthropic Claude**: Claude-3.5-Sonnet (텍스트 + 비전)
- ☁️ **AWS Bedrock**: Claude via Bedrock (텍스트 + 비전)

**AI 기능**:
- ✅ **조언 생성**: 각 항목별 맞춤형 증빙 준비 조언
- ✅ **증빙 평가**: 업로드된 이미지 및 PDF 기반 자동 평가 및 피드백
- ✅ **다국어 지원**: 한국어/영어 자동 감지 및 응답
- ✅ **비전 분석**: 이미지 파일 내용 분석 및 평가
- ✅ **더미 응답**: API 키 없이도 테스트용 더미 응답 제공

**참고**: API 키 없이도 기본 체크리스트 관리 기능은 모두 사용 가능합니다.

### 서버 관리

프로젝트 루트 디렉토리에서 다음 스크립트들을 사용할 수 있습니다:

```bash
# 서버 재시작 (전체 기능)
./restart-server.sh
# 또는
npm run restart

# 서버 중지
./stop-server.sh
# 또는
npm run stop

# 서버 상태 확인
./server-status.sh
# 또는
npm run status

# 빠른 재시작 (간단 버전)
./quick-restart.sh
# 또는
npm run quick-restart
```

### 빌드

```bash
# 프로덕션 빌드
cd msp-checklist
npm run build

# 프로덕션 서버 시작
npm start
```

## 프로젝트 구조

```
msp-checklist/
├── app/
│   ├── page.tsx              # 메인 페이지
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 글로벌 스타일
├── components/
│   ├── Dashboard.tsx         # 대시보드 컴포넌트
│   ├── FilterBar.tsx         # 필터 바 컴포넌트
│   ├── ChecklistView.tsx     # 체크리스트 뷰 컴포넌트
│   └── ChecklistItemComponent.tsx  # 체크리스트 항목 컴포넌트
├── data/
│   └── msp-checklist-data.ts # MSP 체크리스트 데이터
├── types/
│   └── index.ts              # TypeScript 타입 정의
└── README.md
```

## 사용 방법

### 1. 카테고리 탐색
- 각 카테고리를 클릭하여 해당 카테고리의 체크리스트 항목 확인

### 2. 항목 상태 업데이트
- 각 항목의 상태 드롭다운에서 진행 상황 선택:
  - **시작 안함**: 아직 시작하지 않은 항목
  - **진행 중**: 현재 작업 중인 항목
  - **완료**: 완료된 항목
  - **해당없음**: 해당하지 않는 항목

### 3. 메모 및 담당자 추가
- "메모 편집" 버튼 클릭
- 담당자 이름 입력
- 진행 상황, 이슈, 참고사항 등을 메모에 기록
- "저장" 버튼으로 변경사항 저장

### 4. 필터링 및 검색
- **상태 필터**: 특정 상태의 항목만 표시
- **유형 필터**: 사전 요구사항 또는 기술 검증 항목만 표시
- **검색**: 키워드로 관련 항목 빠르게 찾기

### 5. 진행률 추적
- 대시보드에서 전체 진행률 확인
- 카테고리별 진행률 비교
- 완료된 항목 수 실시간 확인

## 데이터 관리

### 데이터 저장
- 모든 변경사항은 자동으로 브라우저의 LocalStorage에 저장됩니다
- 페이지를 새로고침해도 데이터가 유지됩니다

### 데이터 초기화
- 브라우저의 개발자 도구(F12)를 엽니다
- Console 탭에서 다음 명령어 실행:
  ```javascript
  localStorage.removeItem('msp-checklist-data')
  ```
- 페이지를 새로고침하면 초기 데이터로 복원됩니다

### 데이터 백업
- 브라우저의 개발자 도구(F12)를 엽니다
- Console 탭에서 다음 명령어 실행:
  ```javascript
  console.log(localStorage.getItem('msp-checklist-data'))
  ```
- 출력된 JSON 데이터를 복사하여 파일로 저장합니다

## AWS MSP 파트너 프로그램 정보

### 검증 체크리스트 버전
- **현재 버전**: 7.1
- **발행일**: 2024년 12월

### 주요 변경사항 (v7.0 → v7.1)
- Well-Architected Framework 검토 요구사항 강화
- 고객 참조 사례 수 증가 (2개 → 4개)
- Cloud Center of Excellence (CCoE) 요구사항 추가
- ITSM 프로세스 문서화 요구사항 세분화

### 검증 프로세스
1. **사전 요구사항 충족** (필수)
   - APN Advanced/Premier 서비스 파트너
   - AWS 기술 인증 보유자 3명 이상
   - 고객 사례 4개 이상
   - Well-Architected 검토 2개 이상

2. **기술 검증 제어** (선택적)
   - 고객 관리 프로세스
   - 서비스 제공 및 운영
   - 모니터링 및 옵저버빌리티
   - 보안 및 규정 준수
   - 백업 및 재해 복구
   - 비용 최적화

3. **ISSI 심사**
   - 제3자 감사 기관(ISSI)을 통한 검증
   - 하이브리드 심사 모델 적용

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 문의 및 지원

AWS MSP 파트너 프로그램에 대한 자세한 정보는 [AWS 파트너 네트워크](https://aws.amazon.com/partners/programs/msp/)를 참조하세요.
