# 다중 LLM AI 조언 및 증빙 평가 기능 테스트 가이드

## 🧪 테스트 방법

### 1. 테스트 페이지 접속
브라우저에서 다음 URL로 접속하세요:
```
http://localhost:3010/test-llm       # 🆕 다중 LLM 제공업체 테스트
http://localhost:3010/test-advice    # AI 조언 기능 테스트
http://localhost:3010/test-pdf       # PDF 텍스트 추출 테스트
```

### 2. 로그인 기능 테스트
```
http://localhost:3010/login
```

#### 🆕 로그인 페이지 기능:
1. **이메일 기억하기**: 체크박스 선택 후 로그인 시 이메일 자동 저장
2. **패스워드 보기**: 👁️ 아이콘 클릭으로 패스워드 표시/숨김
3. **언어 전환**: 한국어/English 실시간 전환
4. **자동 복원**: 다음 방문 시 저장된 이메일 자동 입력

#### 🆕 회원가입 페이지 기능:
```
http://localhost:3010/register
```
1. **패스워드 보기**: 패스워드 및 확인 패스워드 모두 보기 기능
2. **실시간 검증**: 패스워드 일치 여부 및 길이 검증
3. **언어 지원**: 한국어/영어 완전 지원

### 3. Assessment 페이지에서 직접 테스트
```
http://localhost:3010/assessment
```

#### AI 조언 기능 테스트:
1. 아무 항목이나 펼치기 (▼ 버튼 클릭)
2. "💡 조언" 버튼 클릭
3. AI 조언 생성 확인
4. "🔽 조언 보기" 버튼으로 인라인 표시 확인

#### 🆕 증빙 파일 업로드 및 평가 테스트:
1. 아무 항목이나 펼치기 (▼ 버튼 클릭)
2. "📄 파일 추가" 버튼 클릭하여 이미지 또는 PDF 파일 업로드
3. "📁 파일 보기" 버튼으로 갤러리 확인
4. PDF 파일의 경우 텍스트 추출 상태 확인 (✓ 표시)
5. 먼저 "💡 조언" 생성 (평가를 위해 필요)
6. "🤖 증빙 평가하기" 버튼 클릭
7. AI 평가 결과 및 점수 확인 (이미지 + PDF 텍스트 모두 분석)

#### 개별 언어 토글 테스트:
1. 각 항목의 "🇰🇷 한국어 ↔ 🇺🇸 English" 버튼 클릭
2. 언어별로 다른 조언 및 평가 확인

#### 🆕 PDF 파일 테스트:
1. PDF 문서 업로드 (보고서, 인증서, 정책 문서 등)
2. "처리 중..." 상태에서 클라이언트 사이드 텍스트 추출 대기
3. 파일 갤러리에서 "텍스트 추출됨" 또는 "텍스트 없음" 상태 확인
4. **🆕 텍스트 편집**: "텍스트 편집" 버튼 클릭하여 PDF 내용 수동 입력/수정
5. AI 평가 시 PDF 내용이 분석에 포함되는지 확인
6. 브라우저 개발자 도구에서 PDF.js 로딩 상태 확인 가능

#### 지원 파일 형식:
- **이미지**: JPG, PNG, GIF, WebP 등 모든 이미지 형식
- **PDF**: PDF 문서 (자동 텍스트 추출 + 수동 편집 가능)
- **파일 크기**: 최대 10MB per 파일
- **다중 업로드**: 여러 파일 동시 선택 가능

#### 🆕 PDF 텍스트 편집 기능:
- **자동 추출**: PDF.js를 사용한 자동 텍스트 추출
- **수동 편집**: 추출 실패 시 또는 보완이 필요한 경우 수동 입력
- **실시간 저장**: 편집된 텍스트 즉시 저장 및 AI 평가에 반영
- **오류 복구**: PDF 처리 오류 시에도 파일 업로드 및 수동 입력 가능

## 🔧 API 키 설정

### OpenAI API 키가 없는 경우
1. [OpenAI Platform](https://platform.openai.com/api-keys)에서 계정 생성
2. API 키 발급 (유료 계정 필요)
3. `.env.local` 파일에 키 설정:
   ```
   OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```
4. 개발 서버 재시작

### 테스트용 더미 응답 (API 키 없이 테스트)
API 키 없이 테스트하려면 `/api/advice/route.ts` 파일을 임시로 수정:

```typescript
// 임시 테스트용 - 실제 API 호출 대신 더미 응답 반환
if (apiKey === 'test_key_for_development') {
  const dummyAdvice = isKorean ? 
    `🎯 핵심 포인트:
• 공개 웹사이트에 AWS MSP 전용 랜딩 페이지 필요
• 최소 2개의 공개 사례 연구 링크 포함
• AWS 워크로드 관리 전문성 명시

📝 증빙 준비 가이드:
• 회사 주요 웹사이트에 전용 페이지 생성
• 고객 사례 연구를 PDF 또는 웹페이지로 준비
• AWS 인증 및 파트너십 정보 포함
• 연락처 및 서비스 문의 방법 명시

⚠️ 주의사항:
• 일반적인 클라우드 서비스 페이지가 아닌 AWS 전용 페이지
• 사례 연구는 실제 고객 프로젝트여야 함
• 모든 링크가 정상 작동하는지 확인

🔍 품질 확인 체크리스트:
• URL이 공개적으로 접근 가능한지 확인
• 모바일에서도 정상 표시되는지 테스트
• 사례 연구 링크가 모두 작동하는지 검증

💡 추가 팁:
• SEO 최적화로 검색 노출도 향상
• 정기적인 콘텐츠 업데이트로 최신성 유지` :
    `🎯 Key Points:
• Public landing page dedicated to AWS MSP practice required
• Include links to at least 2 public case studies
• Clearly state expertise in AWS workload management

📝 Evidence Preparation Guide:
• Create dedicated page on company's main website
• Prepare customer case studies as PDFs or web pages
• Include AWS certifications and partnership information
• Provide contact information and service inquiry methods

⚠️ Precautions:
• Must be AWS-specific page, not generic cloud services
• Case studies must be from actual customer projects
• Verify all links are working properly

🔍 Quality Check Checklist:
• Confirm URL is publicly accessible
• Test proper display on mobile devices
• Verify all case study links are functional

💡 Additional Tips:
• Improve search visibility with SEO optimization
• Maintain freshness with regular content updates`;

  return NextResponse.json({ advice: dummyAdvice });
}
```

## 📊 테스트 시나리오

### 성공 케이스
- [x] API 키 올바르게 설정됨
- [x] 한국어 조언 생성 성공
- [x] 영어 조언 생성 성공
- [x] 모달 창 정상 표시
- [x] 로딩 상태 표시

### 오류 케이스
- [x] API 키 미설정 시 오류 메시지
- [x] 네트워크 오류 시 재시도 기능
- [x] OpenAI API 한도 초과 시 처리

## 🔍 디버깅

### 브라우저 개발자 도구
1. F12로 개발자 도구 열기
2. Network 탭에서 `/api/advice` 요청 확인
3. Console 탭에서 오류 메시지 확인

### 서버 로그
터미널에서 Next.js 개발 서버 로그 확인:
```bash
# msp-checklist 디렉토리에서
npm run dev
```

## ✅ 테스트 완료 체크리스트

- [ ] 테스트 페이지에서 API 호출 성공
- [ ] Assessment 페이지에서 조언 버튼 작동
- [ ] 한국어 조언 생성 확인
- [ ] 영어 조언 생성 확인
- [ ] 오류 처리 및 재시도 기능 확인
- [ ] 모바일 반응형 디자인 확인

## 🚀 배포 전 확인사항

1. `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
2. 프로덕션 환경에서 환경 변수 설정
3. OpenAI API 사용량 모니터링 설정
4. 오류 로깅 및 모니터링 구성

## 🆕 다중 LLM 제공업체 테스트

### LLM 제공업체 설정 및 테스트
```
http://localhost:3010/test-llm
```

#### 지원하는 LLM 제공업체:
1. **🤖 OpenAI**: GPT-4o, GPT-4o-mini
2. **🧠 Google Gemini**: Gemini-1.5-Flash  
3. **🎭 Anthropic Claude**: Claude-3.5-Sonnet
4. **☁️ AWS Bedrock**: Claude via Bedrock

#### 환경 변수 설정:
`.env.local` 파일에서 다음과 같이 설정:

```bash
# 사용할 LLM 제공업체 선택
LLM_PROVIDER=openai  # openai, gemini, claude, bedrock 중 선택

# 각 제공업체별 API 키 설정 (선택한 제공업체만 필요)
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here  
CLAUDE_API_KEY=your_claude_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
```

#### 테스트 방법:
1. 원하는 LLM 제공업체의 API 키를 `.env.local`에 설정
2. `LLM_PROVIDER` 환경 변수를 해당 제공업체로 설정
3. 서버 재시작: `./restart-server.sh`
4. 테스트 페이지에서 "조언 생성 테스트" 또는 "증빙 평가 테스트" 클릭
5. 응답에서 사용된 제공업체, 토큰 사용량, 더미 여부 확인

#### 테스트 결과 확인 항목:
- ✅ **Provider**: 설정한 LLM 제공업체가 올바르게 표시되는지
- ✅ **Usage**: 토큰 사용량 정보가 제공되는지
- ✅ **isDummy**: API 키가 있으면 false, 없으면 true
- ✅ **Content**: 한국어로 적절한 조언/평가가 생성되는지

#### 더미 응답 테스트:
- 모든 API 키를 제거하거나 잘못된 키를 설정
- 더미 응답이 제공되는지 확인 (`isDummy: true`)
- 기본 기능은 정상 작동하는지 확인