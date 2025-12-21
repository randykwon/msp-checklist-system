# AWS MSP Assessment Tracker

## 개요

AWS MSP Partner Program의 Prerequisites와 Technical Validation 항목을 체계적으로 관리할 수 있는 평가 추적 시스템입니다.

## 주요 기능

### 1. Prerequisites Assessment (15개 항목)
- **카테고리**: Business, People, Governance, Platform, Security, Operations
- **상태 관리**: Met (충족) / Not Met (미충족) / N/A (해당없음)
- **Partner Response**: 각 항목에 대한 상세 답변 및 증빙 자료 설명 입력
- **자동 저장**: LocalStorage를 통한 자동 저장 기능

### 2. 대시보드
- 전체 진행률 실시간 추적
- 카테고리별 진행률 시각화
- Met/Not Met/Pending 통계
- 카테고리별 상세 통계

### 3. 상세 항목 관리
- 항목별 확장/축소 가능한 인터페이스
- 전체 설명 표시
- Evidence Required 섹션 강조
- Partner Response 텍스트 입력
- 마지막 수정 시간 자동 기록

## 파일 구조

```
msp-checklist/
├── app/
│   └── assessment/
│       └── page.tsx                    # 메인 Assessment 페이지
├── components/
│   ├── AssessmentDashboard.tsx         # 진행률 대시보드
│   ├── AssessmentView.tsx              # 카테고리별 항목 뷰
│   └── AssessmentItem.tsx              # 개별 항목 컴포넌트
├── data/
│   └── assessment-data.ts              # Prerequisites 데이터 (15개 항목)
└── lib/
    └── csv-parser.ts                   # CSV 파싱 유틸리티
```

## 데이터 구조

### AssessmentItem Interface
```typescript
export interface AssessmentItem {
  id: string;                 // 예: "BUSP-001"
  category: string;           // 예: "Business"
  title: string;              // 예: "Web Presence"
  description: string;        // 전체 설명 (Mandatory 포함)
  isMandatory: boolean;       // Mandatory 여부
  evidenceRequired: string;   // 필요한 증빙 자료 설명
  met: boolean | null;        // Met (true) / Not Met (false) / N/A (null)
  partnerResponse: string;    // Partner의 답변
  lastUpdated: Date;          // 마지막 수정 시간
}
```

## Prerequisites 항목 (15개)

### Business (3개)
- BUSP-001: Web Presence
- BUSP-002: Sales and Marketing Accreditations
- BUSP-003: Customer Case Studies

### People (1개)
- PEOP-001: Personnel Skills

### Governance (3개)
- GOVP-001: Supplier Management
- GOVP-002: Operations Improvement
- GOVP-003: Sustainability Commitment

### Platform (1개)
- PLATP-001: Expert Design Review

### Security (2개)
- SECP-001: Access Key Exposure Detection
- SECP-002: Public Resources

### Operations (5개)
- OPSP-001: Incident Management
- OPSP-002: Problem Management
- OPSP-003: Deployment Risk Management
- OPSP-004: Cloud Financial Management
- OPSP-005: Service Continuity

## 사용 방법

### 1. Assessment 페이지 접속
```
http://localhost:3010/assessment
```

### 2. 항목 평가
1. 카테고리를 클릭하여 확장
2. 각 항목의 "▼ Expand Details" 클릭
3. Met/Not Met/N/A 버튼으로 상태 선택
4. Partner Response에 상세 답변 입력
5. 자동으로 LocalStorage에 저장됨

### 3. 진행률 확인
- 대시보드에서 실시간 진행률 확인
- 카테고리별 진행률 시각화
- 전체 통계 한눈에 파악

### 4. 데이터 관리
- **Export Progress**: 현재 진행 상황을 JSON 파일로 내보내기
- **Reset All Data**: 모든 데이터 초기화 (주의: 되돌릴 수 없음)

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS
- **Storage**: LocalStorage (클라이언트 사이드)
- **TypeScript**: ES2018 타겟

## 향후 개발 계획

### Technical Validation 섹션
- CSV 파일 기반 Technical Validation 항목 파싱
- 약 60+ 항목 추가 예정
- Prerequisites와 동일한 인터페이스 제공

### 추가 기능
- [ ] 파일 첨부 기능 (증빙 자료 업로드)
- [ ] PDF 리포트 생성
- [ ] 진행률 이메일 공유
- [ ] 팀 협업 기능 (서버 사이드)
- [ ] 히스토리 추적 (변경 이력)

## 데이터 저장

- **LocalStorage Key**: `msp-assessment-prerequisites`
- **자동 저장**: 모든 변경사항 즉시 저장
- **데이터 복원**: 페이지 새로고침 시 자동 복원
- **브라우저별 독립**: 각 브라우저마다 독립적인 데이터 관리

## 주의사항

1. LocalStorage는 브라우저별로 독립적입니다
2. 브라우저 데이터 삭제 시 저장된 데이터도 삭제됩니다
3. 중요한 데이터는 주기적으로 Export 하세요
4. Reset All Data는 되돌릴 수 없습니다

## 문제 해결

### 빌드 오류
```bash
cd msp-checklist
source ~/.nvm/nvm.sh
nvm use 20.9.0
npm run build
```

### 개발 서버 재시작
```bash
cd msp-checklist
npm run dev
```

### 포트 변경
package.json의 dev 스크립트에서 `-p 3010` 수정

## 참고 자료

- [AWS MSP Partner Program](https://aws.amazon.com/partners/programs/msp/)
- [AWS MSP Checklist v7.1](../msp_data/7.x/)
- [메인 체크리스트](http://localhost:3010/)
