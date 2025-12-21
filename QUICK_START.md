# 🚀 빠른 시작 가이드

AWS MSP 체크리스트 애플리케이션을 빠르게 시작하는 방법입니다.

## ⚡ 1분 설치

```bash
# 1. 저장소 클론
git clone <repository-url>
cd msp-qna

# 2. 의존성 설치
npm install
cd msp-checklist && npm install && cd ..

# 3. 환경 설정 (선택사항)
cd msp-checklist
cp .env.local.example .env.local
# OpenAI API 키가 있다면 .env.local에 추가
cd ..

# 4. 서버 시작
./restart-server.sh
```

## 🌐 접속

- **메인 애플리케이션**: http://localhost:3010
- **Assessment 페이지**: http://localhost:3010/assessment
- **PDF 테스트**: http://localhost:3010/test-pdf
- **AI 조언 테스트**: http://localhost:3010/test-advice

## 🎯 주요 기능

### ✅ 체크리스트 관리
- 36개 AWS MSP 요구사항 항목
- 7개 주요 카테고리
- 진행률 실시간 추적

### 🤖 AI 기능 (OpenAI API 키 필요)
- **맞춤형 조언**: 각 항목별 구체적인 증빙 준비 가이드
- **증빙 평가**: 업로드된 파일 자동 분석 및 점수 제공
- **다국어 지원**: 한국어/영어 완전 지원

### 📄 파일 처리
- **이미지 업로드**: JPG, PNG, GIF, WebP 등
- **PDF 처리**: 자동 텍스트 추출 + 수동 편집
- **다중 업로드**: 여러 파일 동시 업로드

## 🛠️ 서버 관리

```bash
# 서버 상태 확인
./server-status.sh

# 서버 재시작
./restart-server.sh

# 서버 중지
./stop-server.sh

# 빠른 재시작
./quick-restart.sh
```

## 🔧 문제 해결

### 서버가 시작되지 않는 경우
```bash
# 1. Node.js 버전 확인 (20.9.0 필요)
node --version

# 2. 포트 3010 사용 확인
lsof -i:3010

# 3. 로그 확인
tail -f server.log
```

### AI 기능이 작동하지 않는 경우
```bash
# 1. OpenAI API 키 확인
cat msp-checklist/.env.local

# 2. API 키 없이도 더미 응답으로 테스트 가능
# (실제 AI 기능은 API 키 필요)
```

## 📚 상세 문서

- **[전체 README](msp-checklist/README.md)**: 상세한 기능 설명
- **[서버 관리 가이드](SERVER_MANAGEMENT.md)**: 서버 운영 가이드
- **[테스트 가이드](msp-checklist/TEST_GUIDE.md)**: 기능 테스트 방법

## 🎉 완료!

이제 http://localhost:3010 에서 AWS MSP 체크리스트 애플리케이션을 사용할 수 있습니다!

### 첫 번째 사용법
1. **Assessment 페이지** 접속
2. 아무 항목이나 **펼치기** (▼ 버튼)
3. **"💡 조언"** 버튼으로 AI 조언 확인
4. **"📄 파일 추가"** 버튼으로 증빙 자료 업로드
5. **"🤖 증빙 평가하기"** 버튼으로 AI 평가 받기

---

**문제가 있나요?** `./server-status.sh`를 실행하여 시스템 상태를 확인하세요!