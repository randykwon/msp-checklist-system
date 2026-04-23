'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 번역 데이터
const translations = {
  en: {
    // Auth pages
    'auth.login.title': 'AWS MSP Self Assessment Guide',
    'auth.login.subtitle': 'MSP Acquisition Assistant System',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.button': 'Sign In',
    'auth.login.loading': 'Signing in...',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.signup': 'Sign Up',
    'auth.login.rememberEmail': 'Remember email',

    'auth.register.title': 'AWS MSP Self Assessment Guide',
    'auth.register.subtitle': 'MSP Acquisition Assistant System',
    'auth.register.name': 'Name',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password (minimum 6 characters)',
    'auth.register.confirmPassword': 'Confirm Password',
    'auth.register.button': 'Sign Up',
    'auth.register.loading': 'Creating account...',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.signin': 'Sign In',
    'auth.register.passwordMismatch': 'Passwords do not match',
    'auth.register.passwordTooShort': 'Password must be at least 6 characters',

    // Header
    'header.title': 'AWS MSP Self-Assessment Helper System',
    'header.logout': 'Logout',
    'header.deleteAccount': 'Delete Account',

    // Delete confirmation
    'delete.title': 'Confirm Account Deletion',
    'delete.message': 'Are you sure you want to delete your account? This action cannot be undone and all your assessment data will be permanently deleted.',
    'delete.cancel': 'Cancel',
    'delete.confirm': 'Delete',

    // Assessment page
    'assessment.title': 'AWS MSP Self-Assessment Helper System',
    'assessment.subtitle': 'The information provided by this service is for reference only and may not be accurate.',
    'assessment.prerequisites': 'Prerequisites (15 items)',
    'assessment.technical': 'Technical Validation (46 items)',
    'assessment.exportProgress': '📥 Export Progress',
    'assessment.importProgress': '📤 Import Progress',

    'assessment.prerequisitesProgress': 'Prerequisites Assessment Progress',
    'assessment.technicalProgress': 'Technical Validation Progress',
    'assessment.footer.version': 'AWS MSP Partner Program Checklist v7.1',
    'assessment.footer.storage': 'Data is automatically saved to your browser\'s local storage',
    'assessment.footer.systemName': 'AWS MSP Self-Assessment Helper System',
    'assessment.loading': 'Loading...',


    // MSP Partner Journey
    'journey.viewJourney': '🗺️ View Partner Journey',
    'journey.title': 'AWS MSP Partner Journey',
    'journey.subtitle': 'Step-by-step guide to becoming an AWS Managed Service Provider partner',

    // MSP Program Info
    'program.viewInfo': '📖 Program Details',
    'program.title': 'AWS MSP Program',
    'program.subtitle': 'Managed Service Provider Partner Program Details',

    // Home page
    'home.title': 'AWS MSP Partner Program Validation Checklist',
    'home.version': 'Version',
    'home.lastModified': 'Last Modified',
    'home.loginSignup': 'Login / Sign Up →',
    'home.checklist': 'AWS MSP Checklist',
    'home.badge': '🚀 AWS MSP Partner Program',
    'home.heroTitle1': 'Partner Program',
    'home.heroTitle2': 'Self-Assessment System',
    'home.heroDesc': 'Systematically verify AWS MSP requirements and manage your assessment progress in real-time',
    'home.ctaStart': 'Get Started',
    'home.ctaSignup': 'Sign Up',
    'home.feature1Title': 'Systematic Assessment',
    'home.feature1Desc': 'Check MSP requirements step by step and track progress',
    'home.feature2Title': 'Real-time Dashboard',
    'home.feature2Desc': 'View assessment progress and completion status at a glance',
    'home.feature3Title': 'AI Guide',
    'home.feature3Desc': 'Detailed guides and best practices for each requirement',
    'home.programInfo': 'Program Info',
    'home.partnerJourney': 'Partner Journey',
    'home.announcements': 'Announcements',
    'home.important': 'Important',
    'home.copyright': '© 2024 AWS MSP Checklist System',
    'home.heroCheck1': 'Basic Requirements',
    'home.heroCheck2': 'Operations Management',
    'home.heroCheck3': 'Security Compliance',

    // Dashboard
    'dashboard.overallProgress': 'Overall Progress',
    'dashboard.totalItems': 'Total Items',
    'dashboard.completed': 'Completed',
    'dashboard.inProgress': 'In Progress',
    'dashboard.progress': 'Progress',

    // Filter
    'filter.status': 'Status',
    'filter.type': 'Type',
    'filter.search': 'Search',
    'filter.all': 'All',
    'filter.notStarted': 'Not Started',
    'filter.inProgress': 'In Progress',
    'filter.completed': 'Completed',
    'filter.notApplicable': 'Not Applicable',
    'filter.prerequisite': 'Prerequisites',
    'filter.technical': 'Technical Validation',
    'filter.searchPlaceholder': 'Search controls or descriptions...',

    // Assessment Dashboard
    'assessmentDashboard.totalItems': 'Total Items',
    'assessmentDashboard.mandatory': 'Mandatory',
    'assessmentDashboard.met': 'Met',
    'assessmentDashboard.notMet': 'Not Met',
    'assessmentDashboard.pending': 'Pending',
    'assessmentDashboard.complete': 'complete',
    'assessmentDashboard.needWork': 'need work',
    'assessmentDashboard.toReview': 'to review',
    'assessmentDashboard.overallProgress': 'Overall Progress',
    'assessmentDashboard.categoryBreakdown': 'Category Breakdown',
    'assessmentDashboard.items': 'items',

    // Assessment Item
    'assessmentItem.met': 'Met',
    'assessmentItem.yes': 'Yes',
    'assessmentItem.no': 'No',
    'assessmentItem.na': 'N/A',
    'assessmentItem.description': 'Description',
    'assessmentItem.evidenceRequired': 'Evidence Required',
    'assessmentItem.partnerResponse': 'Partner Response',
    'assessmentItem.responsePlaceholder': 'Enter your response and evidence details here...',
    'assessmentItem.lastUpdated': 'Last updated',
    'assessmentItem.collapse': 'Collapse',
    'assessmentItem.expandDetails': 'Expand Details',
    'assessmentItem.advice': 'Evidence Advice',
    'assessmentItem.adviceButton': '💡 Advice',
    'assessmentItem.adviceTitle': 'Evidence Preparation Advice',
    'assessmentItem.adviceSubtitle': 'AI-Generated Tips and Precautions',
    'assessmentItem.close': 'Close',
    'assessmentItem.generating': '⏳ Generating...',
    'assessmentItem.error': 'Error',
    'assessmentItem.retry': 'Retry',
    'assessmentItem.retrying': 'Retrying...',
    'assessmentItem.showAdvice': '🔽 Show Advice',
    'assessmentItem.hideAdvice': '🔼 Hide Advice',
    'assessmentItem.refreshAdvice': '🔄 Refresh Advice',
    'assessmentItem.cached': 'Cached',
    'assessmentItem.switchToKorean': '🇰🇷 한국어',
    'assessmentItem.switchToEnglish': '🇺🇸 English',
    'assessmentItem.languageToggle': 'Language',
    'assessmentItem.evidenceUpload': 'Evidence Upload',
    'assessmentItem.addImages': 'Add Images',
    'assessmentItem.viewImages': 'View Images',
    'assessmentItem.evaluateEvidence': 'Evaluate Evidence',
    'assessmentItem.evaluating': 'Evaluating...',
    'assessmentItem.evaluationResults': 'Evaluation Results',
    'assessmentItem.evaluationError': 'Evaluation Error',
    'assessmentItem.uploadInstructions': 'Upload your evidence documents as images or PDF files. You can include documents, screenshots, charts, reports, etc. (Max 10MB, multiple files allowed)',
    'assessmentItem.addFiles': 'Add Files',
    'assessmentItem.viewFiles': 'View Files',
    'assessmentItem.processing': 'Processing...',
    'assessmentItem.evidenceSamples': 'Evidence Samples',
    'assessmentItem.showSamples': 'Show Samples',
    'assessmentItem.hideSamples': 'Hide Samples',
    'assessmentItem.virtualEvidence': 'Virtual Evidence Examples',
    'assessmentItem.generateExamples': 'Generate Examples',
    'assessmentItem.regenerateExamples': 'Regenerate',
    'assessmentItem.generatingExamples': 'Generating...',
    'assessmentItem.basicSamples': 'Basic Evidence Samples',
    'assessmentItem.aiGenerated': 'AI-Generated Virtual Evidence Examples',

    // Q&A
    'qa.title': 'Questions & Answers',
    'qa.askQuestion': 'Ask Question',
    'qa.questionPlaceholder': 'Enter your question about this requirement...',
    'qa.submitQuestion': 'Submit Question',
    'qa.answerPlaceholder': 'Enter your answer...',
    'qa.submitAnswer': 'Submit Answer',
    'qa.noQuestions': 'No questions yet. Be the first to ask!',
    'qa.adminOnly': 'Only administrators can answer questions',
    'qa.questionBy': 'Question by',
    'qa.answeredBy': 'Answered by',
    'qa.delete': 'Delete',
    'qa.answer': 'Answer',
    'qa.unanswered': 'Unanswered',

    // Checklist
    'checklist.items': 'items',
    'checklist.noItems': 'No items match the filter criteria.',
    'checklist.category': 'Category',
    'checklist.evidenceRequired': 'Evidence Required',
    'checklist.assignee': 'Assignee',
    'checklist.assigneePlaceholder': 'Assignee name',
    'checklist.notes': 'Notes',
    'checklist.notesPlaceholder': 'Record progress, issues, references, etc...',
    'checklist.save': 'Save',
    'checklist.cancel': 'Cancel',
    'checklist.editNotes': 'Edit Notes',
    'checklist.lastUpdated': 'Last Updated',
  },
  ko: {
    // Auth pages
    'auth.login.title': 'AWS MSP 자체 평가 가이드',
    'auth.login.subtitle': 'MSP 취득 도우미 시스템',
    'auth.login.email': '이메일',
    'auth.login.password': '비밀번호',
    'auth.login.button': '로그인',
    'auth.login.loading': '로그인 중...',
    'auth.login.noAccount': '계정이 없으신가요?',
    'auth.login.signup': '회원가입',
    'auth.login.rememberEmail': '이메일 기억하기',

    'auth.register.title': 'AWS MSP 자체 평가 가이드',
    'auth.register.subtitle': 'MSP 취득 도우미 시스템',
    'auth.register.name': '이름',
    'auth.register.email': '이메일',
    'auth.register.password': '비밀번호 (최소 6자)',
    'auth.register.confirmPassword': '비밀번호 확인',
    'auth.register.button': '회원가입',
    'auth.register.loading': '계정 생성 중...',
    'auth.register.hasAccount': '이미 계정이 있으신가요?',
    'auth.register.signin': '로그인',
    'auth.register.passwordMismatch': '비밀번호가 일치하지 않습니다',
    'auth.register.passwordTooShort': '비밀번호는 최소 6자 이상이어야 합니다',

    // Header
    'header.title': 'AWS MSP 자체 평가 어드바이저',
    'header.logout': '로그아웃',
    'header.deleteAccount': '계정 삭제',

    // Delete confirmation
    'delete.title': '계정 삭제 확인',
    'delete.message': '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 평가 데이터가 영구적으로 삭제됩니다.',
    'delete.cancel': '취소',
    'delete.confirm': '삭제',

    // MSP Partner Journey
    'journey.viewJourney': '🗺️ 파트너 여정 보기',
    'journey.title': 'AWS MSP 파트너 여정',
    'journey.subtitle': 'AWS Managed Service Provider 파트너가 되기 위한 단계별 가이드',

    // MSP Program Info
    'program.viewInfo': '📖 프로그램 상세',
    'program.title': 'AWS MSP 프로그램',
    'program.subtitle': 'Managed Service Provider 파트너 프로그램 상세 정보',

    // Assessment page
    'assessment.title': 'AWS MSP 자체 평가 어드바이저',
    'assessment.subtitle': '이 서비스에서 제공하는 정보는 참고용이며 정확하지 않을 수 있습니다.',
    'assessment.prerequisites': '사전 요구사항 (15개 항목)',
    'assessment.technical': '기술 검증 (46개 항목)',
    'assessment.exportProgress': '📥 진행상황 내보내기',
    'assessment.importProgress': '📤 진행상황 가져오기',

    'assessment.prerequisitesProgress': '사전 요구사항 평가 진행상황',
    'assessment.technicalProgress': '기술 검증 진행상황',
    'assessment.footer.version': 'AWS MSP Partner Program Checklist v7.1',
    'assessment.footer.storage': '데이터는 브라우저의 로컬 스토리지에 자동 저장됩니다',
    'assessment.footer.systemName': 'AWS MSP 자체 평가 어드바이저',
    'assessment.loading': '로딩 중...',


    // Home page
    'home.title': 'AWS MSP 파트너 프로그램 검증 체크리스트',
    'home.version': '버전',
    'home.lastModified': '마지막 수정',
    'home.loginSignup': '로그인 / 회원가입 →',
    'home.checklist': 'AWS MSP 체크리스트',
    'home.badge': '🚀 AWS MSP Partner Program',
    'home.heroTitle1': '파트너 프로그램',
    'home.heroTitle2': '자체 평가 시스템',
    'home.heroDesc': 'AWS MSP 요구사항을 체계적으로 확인하고 평가 진행률을 실시간으로 관리하세요',
    'home.ctaStart': '시작하기',
    'home.ctaSignup': '회원가입',
    'home.feature1Title': '체계적 평가',
    'home.feature1Desc': 'MSP 요구사항을 단계별로 체크하고 진행상황을 추적',
    'home.feature2Title': '실시간 대시보드',
    'home.feature2Desc': '평가 진행률과 완료 상태를 한눈에 확인',
    'home.feature3Title': 'AI 가이드',
    'home.feature3Desc': '각 요구사항에 대한 상세 가이드와 모범 사례 제공',
    'home.programInfo': '프로그램 정보',
    'home.partnerJourney': '파트너 여정',
    'home.announcements': '공지사항',
    'home.important': '중요',
    'home.copyright': '© 2024 AWS MSP Checklist System',
    'home.heroCheck1': '기본 요구사항',
    'home.heroCheck2': '운영 관리',
    'home.heroCheck3': '보안 컴플라이언스',

    // Dashboard
    'dashboard.overallProgress': '전체 진행 현황',
    'dashboard.totalItems': '전체 항목',
    'dashboard.completed': '완료',
    'dashboard.inProgress': '진행 중',
    'dashboard.progress': '진행률',

    // Filter
    'filter.status': '상태',
    'filter.type': '유형',
    'filter.search': '검색',
    'filter.all': '전체',
    'filter.notStarted': '시작 안함',
    'filter.inProgress': '진행 중',
    'filter.completed': '완료',
    'filter.notApplicable': '해당없음',
    'filter.prerequisite': '사전 요구사항',
    'filter.technical': '기술 검증',
    'filter.searchPlaceholder': '제어 항목 또는 설명 검색...',

    // Assessment Dashboard
    'assessmentDashboard.totalItems': '전체 항목',
    'assessmentDashboard.mandatory': '필수',
    'assessmentDashboard.met': '충족',
    'assessmentDashboard.notMet': '미충족',
    'assessmentDashboard.pending': '대기',
    'assessmentDashboard.complete': '완료',
    'assessmentDashboard.needWork': '작업 필요',
    'assessmentDashboard.toReview': '검토 필요',
    'assessmentDashboard.overallProgress': '전체 진행률',
    'assessmentDashboard.categoryBreakdown': '카테고리별 현황',
    'assessmentDashboard.items': '항목',

    // Assessment Item
    'assessmentItem.met': '충족',
    'assessmentItem.yes': '예',
    'assessmentItem.no': '아니오',
    'assessmentItem.na': '해당없음',
    'assessmentItem.description': '설명',
    'assessmentItem.evidenceRequired': '필요한 증빙',
    'assessmentItem.partnerResponse': '파트너 응답',
    'assessmentItem.responsePlaceholder': '응답 및 증빙 세부사항을 입력하세요...',
    'assessmentItem.lastUpdated': '마지막 수정',
    'assessmentItem.collapse': '접기',
    'assessmentItem.expandDetails': '세부사항 펼치기',
    'assessmentItem.advice': '증빙 조언',
    'assessmentItem.adviceButton': '💡 조언',
    'assessmentItem.adviceTitle': '증빙 준비 조언',
    'assessmentItem.adviceSubtitle': 'AI 생성 팁과 주의사항',
    'assessmentItem.close': '닫기',
    'assessmentItem.generating': '⏳ 생성 중...',
    'assessmentItem.error': '오류',
    'assessmentItem.retry': '다시 시도',
    'assessmentItem.retrying': '재시도 중...',
    'assessmentItem.showAdvice': '🔽 조언 보기',
    'assessmentItem.hideAdvice': '🔼 조언 숨기기',
    'assessmentItem.refreshAdvice': '🔄 조언 새로고침',
    'assessmentItem.cached': '캐시됨',
    'assessmentItem.switchToKorean': '🇰🇷 한국어',
    'assessmentItem.switchToEnglish': '🇺🇸 English',
    'assessmentItem.languageToggle': '언어',
    'assessmentItem.evidenceUpload': '증빙 자료 업로드',
    'assessmentItem.addImages': '이미지 추가',
    'assessmentItem.viewImages': '이미지 보기',
    'assessmentItem.evaluateEvidence': '증빙 평가하기',
    'assessmentItem.evaluating': '평가 중...',
    'assessmentItem.evaluationResults': '평가 결과',
    'assessmentItem.evaluationError': '평가 오류',
    'assessmentItem.uploadInstructions': '증빙 자료를 이미지 또는 PDF 파일로 업로드하세요. 문서, 스크린샷, 차트, 보고서 등을 포함할 수 있습니다. (최대 10MB, 여러 파일 선택 가능)',
    'assessmentItem.addFiles': '파일 추가',
    'assessmentItem.viewFiles': '파일 보기',
    'assessmentItem.processing': '처리 중...',
    'assessmentItem.evidenceSamples': '증빙자료 샘플',
    'assessmentItem.showSamples': '샘플 보기',
    'assessmentItem.hideSamples': '샘플 숨기기',
    'assessmentItem.virtualEvidence': '가상증빙예제-참고용',
    'assessmentItem.generateExamples': '예제 생성',
    'assessmentItem.regenerateExamples': '새로 생성',
    'assessmentItem.generatingExamples': '생성 중...',
    'assessmentItem.basicSamples': '기본 증빙자료 샘플',
    'assessmentItem.aiGenerated': 'AI 생성 가상증빙예제-참고용',

    // Q&A
    'qa.title': '질의/응답',
    'qa.askQuestion': '질문하기',
    'qa.questionPlaceholder': '이 요구사항에 대한 질문을 입력하세요...',
    'qa.submitQuestion': '질문 등록',
    'qa.answerPlaceholder': '답변을 입력하세요...',
    'qa.submitAnswer': '답변 등록',
    'qa.noQuestions': '아직 질문이 없습니다. 첫 번째 질문을 해보세요!',
    'qa.adminOnly': '관리자만 답변할 수 있습니다',
    'qa.questionBy': '질문자',
    'qa.answeredBy': '답변자',
    'qa.delete': '삭제',
    'qa.answer': '답변',
    'qa.unanswered': '미답변',

    // Checklist
    'checklist.items': '항목',
    'checklist.noItems': '필터 조건에 맞는 항목이 없습니다.',
    'checklist.category': '분류',
    'checklist.evidenceRequired': '필요한 증빙',
    'checklist.assignee': '담당자',
    'checklist.assigneePlaceholder': '담당자 이름',
    'checklist.notes': '메모',
    'checklist.notesPlaceholder': '진행 상황, 이슈, 참고사항 등을 기록하세요...',
    'checklist.save': '저장',
    'checklist.cancel': '취소',
    'checklist.editNotes': '메모 편집',
    'checklist.lastUpdated': '마지막 수정',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko'); // 기본값 한국어
  const [isHydrated, setIsHydrated] = useState(false);

  // LocalStorage에서 언어 설정 로드 (hydration 후에만)
  useEffect(() => {
    setIsHydrated(true);
    const savedLanguage = localStorage.getItem('app-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ko')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (isHydrated) {
      localStorage.setItem('app-language', lang);
    }
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  // Always render children to avoid hydration mismatch
  // The language will update after hydration if needed
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
