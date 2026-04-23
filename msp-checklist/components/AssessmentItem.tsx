'use client';

import { AssessmentItem, EvidenceFile, EvidenceEvaluation } from '../lib/csv-parser';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdvice } from '@/contexts/AdviceContext';
import { extractTextFromPDF, isPDFFile } from '../lib/pdf-utils';
import QASection from './QASection';
import { renderTextWithLinks } from '../lib/text-utils';
import { getClientAdviceCacheService } from '../lib/advice-cache-client';
import { createMarkdownHtml } from '../lib/markdown-parser';

interface AssessmentItemProps {
  item: AssessmentItem;
  assessmentType: 'prerequisites' | 'technical';
  onUpdate: (itemId: string, updates: Partial<AssessmentItem>) => void;
  onFocus?: () => void;
}

// 증빙자료 샘플 생성 함수
const generateEvidenceSamples = (item: AssessmentItem, language: 'ko' | 'en') => {
  const samples = [];
  
  // 카테고리별 샘플 증빙자료 정의
  const samplesByCategory: Record<string, { ko: string[], en: string[] }> = {
    'Business': {
      ko: [
        '📄 회사 소개서 (사업자등록증, 조직도 포함)',
        '📊 최근 12개월 AWS 서비스 매출 보고서',
        '🏆 AWS 파트너 포털 스크린샷 (파트너 등급 확인)',
        '📋 AWS 워크로드 관련 고객 사례 연구 (최소 2건)',
        '💼 AWS 전담 팀 구성 및 역할 분담표'
      ],
      en: [
        '📄 Company profile (business registration, org chart)',
        '📊 AWS service revenue report (last 12 months)',
        '🏆 AWS Partner Portal screenshot (partner tier)',
        '📋 AWS workload customer case studies (min. 2)',
        '💼 AWS dedicated team structure and roles'
      ]
    },
    'People': {
      ko: [
        '🎓 AWS 인증서 스캔본 (Solutions Architect Professional, DevOps Engineer 등)',
        '📚 AWS 공식 교육 이수증 (AWS Training and Certification)',
        '👥 기술팀 구성원 이력서 (AWS 경력 3년 이상)',
        '📈 연간 인력 개발 계획서 (AWS 교육 로드맵 포함)',
        '🏅 AWS 커뮤니티 활동 증빙 (발표, 블로그, 기여도)'
      ],
      en: [
        '🎓 AWS certification scans (Solutions Architect Pro, DevOps Engineer)',
        '📚 AWS official training certificates',
        '👥 Technical team resumes (3+ years AWS experience)',
        '📈 Annual workforce development plan (AWS training roadmap)',
        '🏅 AWS community activity evidence (presentations, blogs)'
      ]
    },
    'Governance': {
      ko: [
        '📋 품질 관리 프로세스 문서',
        '🔒 보안 정책 및 절차서',
        '📊 서비스 수준 협약서 (SLA)',
        '🎯 거버넌스 프레임워크 문서'
      ],
      en: [
        '📋 Quality management process documents',
        '🔒 Security policies and procedures',
        '📊 Service Level Agreements (SLA)',
        '🎯 Governance framework documents'
      ]
    },
    'Platform': {
      ko: [
        '🏗️ 아키텍처 다이어그램',
        '⚙️ 인프라 구성 문서',
        '🔧 자동화 스크립트 및 템플릿',
        '📱 모니터링 대시보드 스크린샷'
      ],
      en: [
        '🏗️ Architecture diagrams',
        '⚙️ Infrastructure configuration documents',
        '🔧 Automation scripts and templates',
        '📱 Monitoring dashboard screenshots'
      ]
    },
    'Security': {
      ko: [
        '🛡️ 외부 보안 감사 보고서 (ISO 27001, SOC 2 등)',
        '🔐 데이터 암호화 정책 및 키 관리 절차서',
        '🚨 보안 인시던트 대응 플레이북 (24/7 대응체계)',
        '✅ 컴플라이언스 인증서 (GDPR, HIPAA, PCI-DSS 등)',
        '🔒 AWS Security Hub 대시보드 스크린샷'
      ],
      en: [
        '🛡️ External security audit reports (ISO 27001, SOC 2)',
        '🔐 Data encryption policies and key management procedures',
        '🚨 Security incident response playbook (24/7 response)',
        '✅ Compliance certificates (GDPR, HIPAA, PCI-DSS)',
        '🔒 AWS Security Hub dashboard screenshots'
      ]
    },
    'Operations': {
      ko: [
        '📊 운영 메트릭 대시보드',
        '🔄 백업 및 복구 절차서',
        '📈 성능 모니터링 보고서',
        '🎛️ 운영 자동화 도구 문서'
      ],
      en: [
        '📊 Operational metrics dashboard',
        '🔄 Backup and recovery procedures',
        '📈 Performance monitoring reports',
        '🎛️ Operations automation tool documentation'
      ]
    }
  };

  // 기본 샘플 (카테고리가 매칭되지 않을 경우)
  const defaultSamples = {
    ko: [
      '📄 관련 정책 문서',
      '📊 실행 결과 보고서',
      '🏆 인증서 또는 증명서',
      '📋 프로세스 문서화'
    ],
    en: [
      '📄 Related policy documents',
      '📊 Implementation result reports',
      '🏆 Certificates or credentials',
      '📋 Process documentation'
    ]
  };

  const categoryKey = Object.keys(samplesByCategory).find(key => 
    item.category.toLowerCase().includes(key.toLowerCase())
  );
  
  const selectedSamples = categoryKey 
    ? samplesByCategory[categoryKey][language]
    : defaultSamples[language];

  return selectedSamples.slice(0, 4); // 최대 4개 샘플 표시
};

export default function AssessmentItemComponent({ item, assessmentType, onUpdate, onFocus }: AssessmentItemProps) {
  const { language, t } = useLanguage();
  const { getAdvice, setAdvice, getVirtualEvidence, setVirtualEvidence } = useAdvice();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdviceInline, setShowAdviceInline] = useState(false);
  const [adviceContent, setAdviceContent] = useState<string>('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string>('');
  const [isAdviceFromServerCache, setIsAdviceFromServerCache] = useState(false);
  const [itemLanguage, setItemLanguage] = useState<'ko' | 'en'>('ko'); // Fixed initial value
  const [showVirtualEvidence, setShowVirtualEvidence] = useState(false);
  const [virtualEvidenceContent, setVirtualEvidenceContent] = useState<string>('');
  const [isGeneratingVirtualEvidence, setIsGeneratingVirtualEvidence] = useState(false);
  const [virtualEvidenceError, setVirtualEvidenceError] = useState<string>('');
  const [isVirtualEvidenceFromServerCache, setIsVirtualEvidenceFromServerCache] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 조언 요약 관련 state
  const [showSummaryInline, setShowSummaryInline] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // 가상증빙예제 요약 관련 state
  const [showVESummaryInline, setShowVESummaryInline] = useState(false);
  const [veSummaryContent, setVESummaryContent] = useState<string>('');
  const [isLoadingVESummary, setIsLoadingVESummary] = useState(false);
  
  // 증빙 파일 업로드 및 평가 관련 상태
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string>('');
  const [showFileGallery, setShowFileGallery] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [editingPdfText, setEditingPdfText] = useState<string | null>(null);
  const [pdfTextInput, setPdfTextInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [evidenceUploadEnabled, setEvidenceUploadEnabled] = useState(false);

  // 시스템 설정에서 증빙 업로드 활성화 여부 확인
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/system/settings');
        if (response.ok) {
          const data = await response.json();
          setEvidenceUploadEnabled(data.evidenceUploadEnabled || false);
        }
      } catch (error) {
        console.error('Failed to fetch system settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // 하이드레이션 완료 후 초기화
  useEffect(() => {
    setIsHydrated(true);
    setItemLanguage(language); // 클라이언트에서 실제 언어로 설정
    setEvidenceFiles(item.evidenceFiles || []); // 클라이언트에서 증빙 파일 설정
  }, [language, item.evidenceFiles]);

  // 컴포넌트 마운트 시 캐시된 조언과 가상증빙예제 확인
  useEffect(() => {
    if (isHydrated) {
      // 먼저 로컬 캐시 확인
      const cachedAdvice = getAdvice(item.id, itemLanguage);
      if (cachedAdvice) {
        setAdviceContent(cachedAdvice);
      } else {
        // 로컬 캐시에 없으면 DB 캐시 확인
        loadCachedAdviceFromDB();
      }
      
      const cachedVirtualEvidence = getVirtualEvidence(item.id, itemLanguage);
      if (cachedVirtualEvidence) {
        setVirtualEvidenceContent(cachedVirtualEvidence);
        // 캐시에서 로드할 때도 자동으로 표시하지 않음
      } else {
        // 로컬 캐시에 없으면 DB 캐시 확인
        loadCachedVirtualEvidenceFromDB();
      }
    }
  }, [item.id, itemLanguage, getAdvice, getVirtualEvidence, isHydrated]);

  // DB에서 캐시된 조언 로드
  const loadCachedAdviceFromDB = async () => {
    try {
      const cacheService = getClientAdviceCacheService();
      const cachedAdvice = await cacheService.getCachedAdvice(item.id, itemLanguage);
      
      if (cachedAdvice) {
        setAdviceContent(cachedAdvice.advice);
        // 로컬 캐시에도 저장
        setAdvice(item.id, cachedAdvice.advice, itemLanguage);
      }
    } catch (error) {
      console.error('Failed to load cached advice from DB:', error);
    }
  };

  // DB에서 캐시된 가상증빙예제 로드 (virtual-evidence-cache에서만 조회)
  const loadCachedVirtualEvidenceFromDB = async () => {
    try {
      // virtual-evidence-cache에서 확인 (가상증빙예제는 별도 캐시에서만 관리)
      const veResponse = await fetch(`/api/virtual-evidence-cache?action=evidence&itemId=${item.id}&language=${itemLanguage}`);
      if (veResponse.ok) {
        const veData = await veResponse.json();
        if (veData.evidence && veData.evidence.virtualEvidence) {
          setVirtualEvidenceContent(veData.evidence.virtualEvidence);
          setVirtualEvidence(item.id, veData.evidence.virtualEvidence, itemLanguage);
          setIsVirtualEvidenceFromServerCache(true);
        }
      }
    } catch (error) {
      console.error('Failed to load cached virtual evidence from DB:', error);
    }
  };

  // 가상증빙예제 생성 함수
  const generateVirtualEvidence = async () => {
    // 로컬 캐시에서 먼저 확인
    const cachedVirtualEvidence = getVirtualEvidence(item.id, itemLanguage);
    if (cachedVirtualEvidence) {
      setVirtualEvidenceContent(cachedVirtualEvidence);
      return;
    }

    // virtual-evidence-cache DB에서 확인
    try {
      const veResponse = await fetch(`/api/virtual-evidence-cache?action=evidence&itemId=${item.id}&language=${itemLanguage}`);
      if (veResponse.ok) {
        const veData = await veResponse.json();
        if (veData.evidence && veData.evidence.virtualEvidence) {
          setVirtualEvidenceContent(veData.evidence.virtualEvidence);
          setVirtualEvidence(item.id, veData.evidence.virtualEvidence, itemLanguage);
          setIsVirtualEvidenceFromServerCache(true);
          return;
        }
      }
    } catch (veError) {
      console.error('Failed to check virtual-evidence-cache:', veError);
    }

    setIsGeneratingVirtualEvidence(true);
    setVirtualEvidenceError('');
    
    try {
      const response = await fetch('/api/virtual-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          title: itemLanguage === 'ko' ? item.titleKo || item.title : item.title,
          description: itemLanguage === 'ko' ? item.descriptionKo || item.description : item.description,
          evidenceRequired: itemLanguage === 'ko' ? item.evidenceRequiredKo || item.evidenceRequired : item.evidenceRequired,
          advice: adviceContent,
          language: itemLanguage
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVirtualEvidenceContent(data.virtualEvidence);
        setIsVirtualEvidenceFromServerCache(data.fromCache || false);
        
        // 캐시에 저장
        setVirtualEvidence(item.id, data.virtualEvidence, itemLanguage);
        
        // 생성 후 자동으로 표시하지 않음 - 사용자가 "보기" 버튼을 클릭해야 함
      } else {
        const errorData = await response.json();
        setVirtualEvidenceError(errorData.error || '가상증빙예제 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error generating virtual evidence:', error);
      setVirtualEvidenceError('가상증빙예제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingVirtualEvidence(false);
    }
  };

  // 가상증빙예제 + 요약 통합 보기 함수
  const handleShowVirtualEvidenceAndSummary = async () => {
    // 이미 가상증빙예제가 있으면 토글
    if (virtualEvidenceContent) {
      const newState = !showVirtualEvidence;
      setShowVirtualEvidence(newState);
      setShowVESummaryInline(newState);
      
      // 요약이 아직 로드되지 않았으면 로드
      if (newState && !veSummaryContent) {
        setIsLoadingVESummary(true);
        try {
          const summaryResponse = await fetch(`/api/virtual-evidence-summary?action=item&itemId=${item.id}&language=${itemLanguage}`);
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            if (summaryData.summaries && summaryData.summaries.length > 0) {
              setVESummaryContent(summaryData.summaries[0].summary);
            } else {
              setVESummaryContent(itemLanguage === 'ko' ? '이 항목에 대한 요약이 아직 생성되지 않았습니다. 관리자 페이지에서 요약을 생성해주세요.' : 'No summary available for this item yet. Please generate summaries from the admin page.');
            }
          }
        } catch (error) {
          console.error('Error loading VE summary:', error);
          setVESummaryContent(itemLanguage === 'ko' ? '요약을 불러오는데 실패했습니다.' : 'Failed to load summary.');
        } finally {
          setIsLoadingVESummary(false);
        }
      }
      return;
    }

    setIsGeneratingVirtualEvidence(true);
    setIsLoadingVESummary(true);
    setVirtualEvidenceError('');
    
    try {
      // 가상증빙예제와 요약을 병렬로 로드
      const [veResponse, summaryResponse] = await Promise.all([
        // 가상증빙예제 로드
        fetch(`/api/virtual-evidence-cache?action=evidence&itemId=${item.id}&language=${itemLanguage}`),
        // 요약 로드
        fetch(`/api/virtual-evidence-summary?action=item&itemId=${item.id}&language=${itemLanguage}`)
      ]);

      // 가상증빙예제 처리
      if (veResponse.ok) {
        const veData = await veResponse.json();
        if (veData.evidence && veData.evidence.virtualEvidence) {
          setVirtualEvidenceContent(veData.evidence.virtualEvidence);
          setVirtualEvidence(item.id, veData.evidence.virtualEvidence, itemLanguage);
          setIsVirtualEvidenceFromServerCache(true);
          setShowVirtualEvidence(true);
        } else {
          // 캐시에 없으면 생성 시도
          await generateVirtualEvidence();
          setShowVirtualEvidence(true);
        }
      }

      // 요약 처리
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.summaries && summaryData.summaries.length > 0) {
          setVESummaryContent(summaryData.summaries[0].summary);
        } else {
          setVESummaryContent(itemLanguage === 'ko' ? '이 항목에 대한 요약이 아직 생성되지 않았습니다. 관리자 페이지에서 요약을 생성해주세요.' : 'No summary available for this item yet. Please generate summaries from the admin page.');
        }
        setShowVESummaryInline(true);
      } else {
        // 요약 API 실패 시에도 메시지 표시
        setVESummaryContent(itemLanguage === 'ko' ? '이 항목에 대한 요약이 아직 생성되지 않았습니다. 관리자 페이지에서 요약을 생성해주세요.' : 'No summary available for this item yet. Please generate summaries from the admin page.');
        setShowVESummaryInline(true);
      }
      
    } catch (error: any) {
      console.error('Error fetching virtual evidence:', error);
      setVirtualEvidenceError(itemLanguage === 'ko' ? 
        '가상증빙예제를 불러오는 중 오류가 발생했습니다.' : 
        'An error occurred while loading virtual evidence.');
    } finally {
      setIsGeneratingVirtualEvidence(false);
      setIsLoadingVESummary(false);
    }
  };

  const toggleItemLanguage = () => {
    const newLanguage = itemLanguage === 'ko' ? 'en' : 'ko';
    setItemLanguage(newLanguage);
    
    // 언어 변경 시 캐시된 조언이 있으면 로드
    const cachedAdvice = getAdvice(item.id, newLanguage);
    if (cachedAdvice) {
      setAdviceContent(cachedAdvice);
    } else {
      setAdviceContent('');
      setShowAdviceInline(false);
    }
    
    // 언어 변경 시 요약 내용 초기화 (새 언어로 다시 로드 필요)
    setSummaryContent('');
    setShowSummaryInline(false);
    
    // 언어 변경 시 캐시된 가상증빙예제가 있으면 로드
    const cachedVirtualEvidence = getVirtualEvidence(item.id, newLanguage);
    if (cachedVirtualEvidence) {
      setVirtualEvidenceContent(cachedVirtualEvidence);
      // 언어 변경 시에도 자동으로 표시하지 않음
    } else {
      setVirtualEvidenceContent('');
      setShowVirtualEvidence(false);
    }
    
    // 언어 변경 시 VE 요약 내용 초기화 (새 언어로 다시 로드 필요)
    setVESummaryContent('');
    setShowVESummaryInline(false);
  };

  const handleMetChange = (value: boolean | null) => {
    onUpdate(item.id, { met: value, lastUpdated: new Date() });
  };



  // 파일 업로드 처리 (이미지 및 PDF)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsProcessingPdf(true);
    const newFiles: EvidenceFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(itemLanguage === 'ko' ? 
          `파일 "${file.name}"이 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.` :
          `File "${file.name}" is too large. Only files under 10MB are allowed.`
        );
        continue;
      }

      // 지원되는 파일 타입 확인 (이미지 또는 PDF)
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        alert(itemLanguage === 'ko' ? 
          `"${file.name}"은 지원되지 않는 파일 형식입니다. 이미지 파일 또는 PDF 파일만 업로드 가능합니다.` :
          `"${file.name}" is not a supported file format. Only image files or PDF files are allowed.`
        );
        continue;
      }

      // Base64로 변환
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // data:image/jpeg;base64, 부분 제거
        };
        reader.readAsDataURL(file);
      });

      let extractedText = '';
      
      // PDF인 경우 클라이언트 사이드에서 텍스트 추출
      if (isPdf) {
        try {
          extractedText = await extractTextFromPDF(base64Data);
          if (!extractedText) {
            console.warn(`No text extracted from PDF: ${file.name}`);
            // 텍스트 추출 실패 시 사용자에게 알림
            alert(itemLanguage === 'ko' ? 
              `PDF "${file.name}"에서 텍스트를 추출할 수 없습니다. 파일은 업로드되지만 AI 평가 시 내용이 포함되지 않을 수 있습니다.` :
              `Could not extract text from PDF "${file.name}". The file will be uploaded but may not be included in AI evaluation.`
            );
          }
        } catch (error) {
          console.error('Error extracting PDF text:', error);
          // 텍스트 추출에 실패해도 파일은 업로드되도록 함
          alert(itemLanguage === 'ko' ? 
            `PDF "${file.name}" 처리 중 오류가 발생했습니다. 파일은 업로드되지만 텍스트 추출이 실패했습니다.` :
            `Error processing PDF "${file.name}". The file will be uploaded but text extraction failed.`
          );
        }
      }

      const newFile: EvidenceFile = {
        id: `${item.id}_${Date.now()}_${i}`,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        base64Data,
        mimeType: file.type,
        fileType: isImage ? 'image' : 'pdf',
        extractedText: isPdf ? extractedText : undefined
      };

      newFiles.push(newFile);
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...evidenceFiles, ...newFiles];
      setEvidenceFiles(updatedFiles);
      onUpdate(item.id, { evidenceFiles: updatedFiles, lastUpdated: new Date() });
      
      // 서버에 파일 저장 (백그라운드에서 실행)
      for (const newFile of newFiles) {
        try {
          await fetch('/api/evidence/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              assessmentType,
              fileId: newFile.id,
              fileName: newFile.fileName,
              fileType: newFile.fileType,
              base64Data: newFile.base64Data
            })
          });
        } catch (error) {
          console.error('Failed to save evidence file to server:', error);
        }
      }
    }

    setIsProcessingPdf(false);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 파일 삭제
  const handleFileDelete = (fileId: string) => {
    const updatedFiles = evidenceFiles.filter(file => file.id !== fileId);
    setEvidenceFiles(updatedFiles);
    onUpdate(item.id, { evidenceFiles: updatedFiles, lastUpdated: new Date() });
  };

  // PDF 텍스트 편집 시작
  const handleEditPdfText = (fileId: string) => {
    const file = evidenceFiles.find(f => f.id === fileId);
    if (file && file.fileType === 'pdf') {
      setEditingPdfText(fileId);
      setPdfTextInput(file.extractedText || '');
    }
  };

  // PDF 텍스트 저장
  const handleSavePdfText = () => {
    if (editingPdfText) {
      const updatedFiles = evidenceFiles.map(file => 
        file.id === editingPdfText 
          ? { ...file, extractedText: pdfTextInput }
          : file
      );
      setEvidenceFiles(updatedFiles);
      onUpdate(item.id, { evidenceFiles: updatedFiles, lastUpdated: new Date() });
      setEditingPdfText(null);
      setPdfTextInput('');
    }
  };

  // PDF 텍스트 편집 취소
  const handleCancelPdfEdit = () => {
    setEditingPdfText(null);
    setPdfTextInput('');
  };

  // 증빙 평가 요청
  const handleEvaluateEvidence = async () => {
    if (evidenceFiles.length === 0) {
      alert(itemLanguage === 'ko' ? 
        '평가할 증빙 파일을 먼저 업로드해주세요.' :
        'Please upload evidence files to evaluate first.'
      );
      return;
    }

    setIsEvaluating(true);
    setEvaluationError('');

    // 조언이 없으면 자동으로 가져오기
    let currentAdvice = adviceContent;
    if (!currentAdvice) {
      try {
        // 먼저 캐시에서 확인
        const cachedAdvice = getAdvice(item.id, itemLanguage);
        if (cachedAdvice) {
          currentAdvice = cachedAdvice;
          setAdviceContent(cachedAdvice);
        } else {
          // DB 캐시에서 확인
          const cacheResponse = await fetch(`/api/advice/cache?itemId=${item.id}&language=${itemLanguage}`);
          if (cacheResponse.ok) {
            const cacheData = await cacheResponse.json();
            if (cacheData.advice) {
              currentAdvice = cacheData.advice;
              setAdviceContent(cacheData.advice);
              setAdvice(item.id, cacheData.advice, itemLanguage);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cached advice:', error);
      }
    }

    // 가상증빙예제도 자동으로 가져오기
    let currentVirtualEvidence = virtualEvidenceContent;
    if (!currentVirtualEvidence) {
      try {
        const cachedVE = getVirtualEvidence(item.id, itemLanguage);
        if (cachedVE) {
          currentVirtualEvidence = cachedVE;
        } else {
          // DB 캐시에서 확인
          const veResponse = await fetch(`/api/virtual-evidence-cache?action=evidence&itemId=${item.id}&language=${itemLanguage}`);
          if (veResponse.ok) {
            const veData = await veResponse.json();
            if (veData.evidence && veData.evidence.virtualEvidence) {
              currentVirtualEvidence = veData.evidence.virtualEvidence;
              setVirtualEvidenceContent(currentVirtualEvidence);
              setVirtualEvidence(item.id, currentVirtualEvidence, itemLanguage);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cached virtual evidence:', error);
      }
    }

    try {
      const response = await fetch('/api/evaluate-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          title: itemLanguage === 'ko' && item.titleKo ? item.titleKo : item.title,
          description: itemLanguage === 'ko' && item.descriptionKo ? item.descriptionKo : item.description,
          evidenceRequired: itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired,
          advice: currentAdvice || '',
          virtualEvidence: currentVirtualEvidence || '',
          files: evidenceFiles,
          language: itemLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to evaluate evidence');
      }

      const data = await response.json();
      onUpdate(item.id, { 
        evaluation: data.evaluation, 
        lastUpdated: new Date() 
      });

    } catch (error: any) {
      console.error('Error evaluating evidence:', error);
      
      let errorMessage = '';
      if (error.message.includes('API key')) {
        errorMessage = itemLanguage === 'ko' ? 
          'OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.' : 
          'OpenAI API key is not configured. Please contact the administrator.';
      } else {
        errorMessage = itemLanguage === 'ko' ? 
          '증빙 평가 중 오류가 발생했습니다. 다시 시도해주세요.' : 
          'An error occurred while evaluating evidence. Please try again.';
      }
      
      setEvaluationError(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAdviceClick = async () => {
    // 캐시된 조언이 있으면 바로 표시
    const cachedAdvice = getAdvice(item.id, itemLanguage);
    if (cachedAdvice) {
      setAdviceContent(cachedAdvice);
      setShowAdviceInline(true);
      return;
    }

    setIsLoadingAdvice(true);
    setAdviceError('');
    
    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          title: itemLanguage === 'ko' && item.titleKo ? item.titleKo : item.title,
          description: itemLanguage === 'ko' && item.descriptionKo ? item.descriptionKo : item.description,
          evidenceRequired: itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired,
          language: itemLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate advice');
      }

      const data = await response.json();
      setAdviceContent(data.advice);
      setIsAdviceFromServerCache(data.fromCache || false);
      
      // 캐시에 저장
      setAdvice(item.id, data.advice, itemLanguage);
      
      setShowAdviceInline(true);
    } catch (error: any) {
      console.error('Error fetching advice:', error);
      
      let errorMessage = '';
      if (error.message.includes('API key')) {
        errorMessage = itemLanguage === 'ko' ? 
          'OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.' : 
          'OpenAI API key is not configured. Please contact the administrator.';
      } else {
        errorMessage = itemLanguage === 'ko' ? 
          '조언을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.' : 
          'An error occurred while generating advice. Please try again.';
      }
      
      setAdviceError(errorMessage);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  // 조언 + 요약 통합 보기 함수
  const handleShowAdviceAndSummary = async () => {
    // 이미 조언이 있으면 토글
    if (adviceContent) {
      const newState = !showAdviceInline;
      setShowAdviceInline(newState);
      setShowSummaryInline(newState);
      
      // 요약이 아직 로드되지 않았으면 로드
      if (newState && !summaryContent) {
        setIsLoadingSummary(true);
        try {
          const summaryResponse = await fetch(`/api/advice-summary?action=item&itemId=${item.id}&language=${itemLanguage}`);
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            if (summaryData.summaries && summaryData.summaries.length > 0) {
              setSummaryContent(summaryData.summaries[0].summary);
            } else {
              setSummaryContent(itemLanguage === 'ko' ? '이 항목에 대한 요약이 아직 생성되지 않았습니다.' : 'No summary available for this item yet.');
            }
          }
        } catch (error) {
          console.error('Error loading advice summary:', error);
          setSummaryContent(itemLanguage === 'ko' ? '요약을 불러오는데 실패했습니다.' : 'Failed to load summary.');
        } finally {
          setIsLoadingSummary(false);
        }
      }
      return;
    }

    setIsLoadingAdvice(true);
    setIsLoadingSummary(true);
    setAdviceError('');
    
    try {
      // 조언과 요약을 병렬로 로드
      const [adviceResponse, summaryResponse] = await Promise.all([
        fetch('/api/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: item.id,
            title: itemLanguage === 'ko' && item.titleKo ? item.titleKo : item.title,
            description: itemLanguage === 'ko' && item.descriptionKo ? item.descriptionKo : item.description,
            evidenceRequired: itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired,
            language: itemLanguage,
          }),
        }),
        fetch(`/api/advice-summary?action=item&itemId=${item.id}&language=${itemLanguage}`)
      ]);

      // 조언 처리
      if (adviceResponse.ok) {
        const adviceData = await adviceResponse.json();
        setAdviceContent(adviceData.advice);
        setIsAdviceFromServerCache(adviceData.fromCache || false);
        setAdvice(item.id, adviceData.advice, itemLanguage);
        setShowAdviceInline(true);
      } else {
        const errorData = await adviceResponse.json();
        throw new Error(errorData.error || 'Failed to generate advice');
      }

      // 요약 처리
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.summaries && summaryData.summaries.length > 0) {
          setSummaryContent(summaryData.summaries[0].summary);
        } else {
          setSummaryContent(itemLanguage === 'ko' ? '이 항목에 대한 요약이 아직 생성되지 않았습니다.' : 'No summary available for this item yet.');
        }
        setShowSummaryInline(true);
      }
      
    } catch (error: any) {
      console.error('Error fetching advice:', error);
      
      let errorMessage = '';
      if (error.message.includes('API key')) {
        errorMessage = itemLanguage === 'ko' ? 
          'OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.' : 
          'OpenAI API key is not configured. Please contact the administrator.';
      } else {
        errorMessage = itemLanguage === 'ko' ? 
          '조언을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.' : 
          'An error occurred while generating advice. Please try again.';
      }
      
      setAdviceError(errorMessage);
    } finally {
      setIsLoadingAdvice(false);
      setIsLoadingSummary(false);
    }
  };

  // 하이드레이션 전에는 기본 상태로 렌더링
  if (!isHydrated) {
    return (
      <div style={{
        background: 'var(--theme-card-bg)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px var(--theme-shadow)',
        border: '1px solid var(--theme-border)',
        marginBottom: 12
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Top Row - ID, Tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 700,
              color: '#1877F2',
              background: '#E7F3FF',
              padding: '4px 10px',
              borderRadius: 6
            }}>
              {item.id}
            </span>
            {item.isMandatory && (
              <span style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#DC2626',
                background: '#FEE2E2',
                borderRadius: 6
              }}>
                필수
              </span>
            )}
          </div>

          {/* Title */}
          <h4 style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
            margin: 0,
            cursor: 'pointer'
          }}>
            {itemLanguage === 'ko' && item.titleKo ? item.titleKo : item.title}
          </h4>

          {/* Met Status Buttons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16,
            padding: '12px 0',
            borderTop: '1px solid var(--theme-border)'
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text-secondary)' }}>{t('assessmentItem.met')}?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleMetChange(true)}
                style={{
                  minWidth: 60,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: item.met === true ? 'none' : '2px solid #D1D5DB',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: item.met === true ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#F9FAFB',
                  color: item.met === true ? 'white' : '#374151',
                  boxShadow: item.met === true ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                ✓ {t('assessmentItem.yes')}
              </button>
              <button
                onClick={() => handleMetChange(false)}
                style={{
                  minWidth: 70,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: item.met === false ? 'none' : '2px solid #D1D5DB',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: item.met === false ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : '#F9FAFB',
                  color: item.met === false ? 'white' : '#374151',
                  boxShadow: item.met === false ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none'
                }}
              >
                ✗ {t('assessmentItem.no')}
              </button>
              <button
                onClick={() => handleMetChange(null)}
                style={{
                  minWidth: 80,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: item.met === null ? 'none' : '2px solid #D1D5DB',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: item.met === null ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' : '#F9FAFB',
                  color: item.met === null ? 'white' : '#374151',
                  boxShadow: item.met === null ? '0 2px 8px rgba(107, 114, 128, 0.4)' : 'none'
                }}
              >
                — {t('assessmentItem.na')}
              </button>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => { setIsExpanded(!isExpanded); if (!isExpanded) onFocus?.(); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 10,
            cursor: 'pointer',
            marginTop: 12,
            boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          📋 세부사항 펼치기 ▼
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--theme-card-bg)',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 2px 8px var(--theme-shadow)',
      border: '1px solid var(--theme-border)',
      marginBottom: 12
    }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Top Row - ID, Tags, Language Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#1877F2',
            background: '#E7F3FF',
            padding: '4px 10px',
            borderRadius: 6
          }}>
            {item.id}
          </span>
          {item.isMandatory && (
            <span style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#DC2626',
              background: '#FEE2E2',
              borderRadius: 6
            }}>
              {t('assessmentDashboard.mandatory')}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleItemLanguage();
            }}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#8B5CF6',
              background: '#EDE9FE',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {itemLanguage === 'ko' ? '🇺🇸 English' : '🇰🇷 한국어'}
          </button>
        </div>

        {/* Title */}
        <h4 
          onClick={() => { setIsExpanded(!isExpanded); if (!isExpanded) onFocus?.(); }}
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--theme-text-primary)',
            margin: 0,
            cursor: 'pointer'
          }}
        >
          {itemLanguage === 'ko' && item.titleKo ? item.titleKo : item.title}
        </h4>

        {/* Met Status Buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 16,
          padding: '12px 0',
          borderTop: '1px solid var(--theme-border)'
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text-secondary)' }}>{t('assessmentItem.met')}?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleMetChange(true)}
              style={{
                minWidth: 60,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: item.met === true ? 'none' : '2px solid #D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: item.met === true ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#F9FAFB',
                color: item.met === true ? 'white' : '#374151',
                boxShadow: item.met === true ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'
              }}
            >
              ✓ {t('assessmentItem.yes')}
            </button>
            <button
              onClick={() => handleMetChange(false)}
              style={{
                minWidth: 70,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: item.met === false ? 'none' : '2px solid #D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: item.met === false ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : '#F9FAFB',
                color: item.met === false ? 'white' : '#374151',
                boxShadow: item.met === false ? '0 2px 8px rgba(239, 68, 68, 0.4)' : 'none'
              }}
            >
              ✗ {t('assessmentItem.no')}
            </button>
            <button
              onClick={() => handleMetChange(null)}
              style={{
                minWidth: 80,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: item.met === null ? 'none' : '2px solid #D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: item.met === null ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' : '#F9FAFB',
                color: item.met === null ? 'white' : '#374151',
                boxShadow: item.met === null ? '0 2px 8px rgba(107, 114, 128, 0.4)' : 'none'
              }}
            >
              — {t('assessmentItem.na')}
            </button>
          </div>
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => { setIsExpanded(!isExpanded); if (!isExpanded) onFocus?.(); }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: 'white',
          background: isExpanded 
            ? 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' 
            : 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
          border: 'none',
          padding: '12px 20px',
          borderRadius: 10,
          cursor: 'pointer',
          marginTop: 12,
          boxShadow: isExpanded 
            ? '0 4px 12px rgba(107, 114, 128, 0.3)' 
            : '0 4px 12px rgba(24, 119, 242, 0.3)',
          transition: 'all 0.2s'
        }}
      >
        {isExpanded ? '📋 세부사항 접기 ▲' : '📋 세부사항 펼치기 ▼'}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4" style={{ borderTop: '1px solid var(--theme-border)' }}>
          {/* Description - 파란색 테마 */}
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                📝 {t('assessmentItem.description')}
              </h5>
              <button
                onClick={toggleItemLanguage}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                title={itemLanguage === 'ko' ? 'Switch to English' : '한국어로 전환'}
              >
                {itemLanguage === 'ko' ? '🇰🇷 한국어' : '🌐 English'}
              </button>
            </div>
            <div style={{ padding: 20, background: 'var(--theme-card-bg)' }}>
              <div style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--theme-text-primary)', whiteSpace: 'pre-line' }}>
                {renderTextWithLinks(itemLanguage === 'ko' && item.descriptionKo ? item.descriptionKo : item.description)}
              </div>
            </div>
          </div>

          {/* Evidence Required - 녹색 테마 */}
          {(item.evidenceRequired || item.evidenceRequiredKo) && (
            <div style={{
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 8px var(--theme-shadow)'
            }}>
              <div style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  📋 {t('assessmentItem.evidenceRequired')}
                </h5>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* 조언 + 요약 통합 버튼 */}
                  <button
                    onClick={handleShowAdviceAndSummary}
                    disabled={isLoadingAdvice || isLoadingSummary}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      background: showAdviceInline ? 'white' : 'rgba(255,255,255,0.2)',
                      color: showAdviceInline ? '#42B883' : 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: (isLoadingAdvice || isLoadingSummary) ? 'not-allowed' : 'pointer',
                      opacity: (isLoadingAdvice || isLoadingSummary) ? 0.7 : 1
                    }}
                  >
                    {(isLoadingAdvice || isLoadingSummary) ? '⏳ 로딩...' : showAdviceInline ? '🔼 조언 숨기기' : '💡 조언 보기'}
                  </button>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--theme-text-primary)' }}>
                  {renderTextWithLinks(itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired)}
                </div>
              
                {/* 인라인 요약 표시 (먼저 표시) */}
                {showSummaryInline && summaryContent && (
                  <div style={{
                    marginTop: 16,
                    padding: 20,
                    background: 'var(--theme-summary-bg, linear-gradient(135deg, #422006 0%, #451a03 100%))',
                    borderRadius: 12,
                    border: '1px solid var(--theme-summary-border, #92400e)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h6 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--theme-summary-title, #fde68a)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        📝 {itemLanguage === 'ko' ? '핵심 요약' : 'Key Summary'}
                        <span style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'var(--theme-summary-border, #92400e)',
                          color: 'white',
                          borderRadius: 12
                        }}>
                          {itemLanguage === 'ko' ? '3~5줄 정리' : 'Quick Overview'}
                        </span>
                      </h6>
                    </div>
                    <div 
                      className="markdown-content-dark"
                      style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--theme-summary-text, #fffbeb)' }}
                      dangerouslySetInnerHTML={createMarkdownHtml(summaryContent)}
                    />
                  </div>
                )}

                {/* 인라인 조언 표시 (요약 아래에 표시) */}
                {showAdviceInline && adviceContent && (
                  <div style={{
                    marginTop: 16,
                    padding: 20,
                    background: 'var(--theme-advice-bg, linear-gradient(135deg, #0c4a6e 0%, #164e63 100%))',
                    borderRadius: 12,
                    border: '1px solid var(--theme-advice-border, #0ea5e9)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h6 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--theme-advice-title, #bae6fd)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        💡 {t('assessmentItem.adviceTitle')}
                        <span style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'var(--theme-advice-badge-bg, #0284c7)',
                          color: 'var(--theme-advice-badge-text, #f0f9ff)',
                          borderRadius: 12
                        }}>
                          {itemLanguage === 'ko' ? '상세 조언' : 'Detailed Advice'}
                        </span>
                      </h6>
                    </div>
                    <div 
                      className="markdown-content-dark"
                      style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--theme-advice-text, #e0f2fe)' }}
                      dangerouslySetInnerHTML={createMarkdownHtml(adviceContent)}
                    />
                  </div>
                )}

                {/* 오류 표시 */}
                {adviceError && (
                  <div style={{
                    marginTop: 16,
                    padding: 20,
                    background: 'linear-gradient(135deg, #0c4a6e 0%, #164e63 100%)',
                    borderRadius: 12,
                    border: '1px solid #0ea5e9'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h6 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: '#bae6fd' }}>
                          ⚠️ {t('assessmentItem.error')}
                        </h6>
                        <div style={{ fontSize: 14, color: '#e0f2fe', lineHeight: '1.6' }}>{adviceError}</div>
                      </div>
                      <button
                        onClick={handleAdviceClick}
                        disabled={isLoadingAdvice}
                        style={{
                          padding: '10px 18px',
                          fontSize: 13,
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: isLoadingAdvice ? 'not-allowed' : 'pointer',
                          opacity: isLoadingAdvice ? 0.7 : 1,
                          boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)'
                        }}
                      >
                        {isLoadingAdvice ? t('assessmentItem.retrying') : t('assessmentItem.retry')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Virtual Evidence Examples - 보라색 테마 */}
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {(() => {
                  const evidenceText = itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired;
                  const isDemonstration = evidenceText?.toLowerCase().includes('시연') || 
                                        evidenceText?.toLowerCase().includes('demonstration') ||
                                        evidenceText?.toLowerCase().includes('demo');
                  
                  if (isDemonstration) {
                    return itemLanguage === 'ko' ? '🎯 시연 가이드' : '🎯 Demonstration Guide';
                  } else {
                    return itemLanguage === 'ko' ? '💡 가상증빙예제-참고용' : '💡 Virtual Evidence Examples';
                  }
                })()}
              </h5>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleShowVirtualEvidenceAndSummary}
                  disabled={isGeneratingVirtualEvidence || isLoadingVESummary}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: showVirtualEvidence ? 'white' : 'rgba(255,255,255,0.2)',
                    color: showVirtualEvidence ? '#2563eb' : 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: (isGeneratingVirtualEvidence || isLoadingVESummary) ? 'not-allowed' : 'pointer',
                    opacity: (isGeneratingVirtualEvidence || isLoadingVESummary) ? 0.7 : 1
                  }}
                >
                  {(() => {
                    if (isGeneratingVirtualEvidence || isLoadingVESummary) {
                      return itemLanguage === 'ko' ? '⏳ 로딩...' : '⏳ Loading...';
                    } else if (showVirtualEvidence) {
                      return itemLanguage === 'ko' ? '🔼 숨기기' : '🔼 Hide';
                    } else if (virtualEvidenceContent) {
                      return itemLanguage === 'ko' ? '🔽 보기' : '🔽 Show';
                    } else {
                      const evidenceText = itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired;
                      const isDemonstration = evidenceText?.toLowerCase().includes('시연') || 
                                            evidenceText?.toLowerCase().includes('demonstration') ||
                                            evidenceText?.toLowerCase().includes('demo');
                      if (isDemonstration) {
                        return itemLanguage === 'ko' ? '🎯 시연 가이드 보기' : '🎯 View Demo Guide';
                      } else {
                        return itemLanguage === 'ko' ? '✨ 예제 보기' : '✨ View Examples';
                      }
                    }
                  })()}
                </button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              {/* Generated Virtual Evidence */}
              {showVirtualEvidence && virtualEvidenceContent && (
                <div style={{
                  padding: 16,
                  background: 'var(--theme-ve-bg, linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%))',
                  borderRadius: 10,
                  border: '1px solid var(--theme-ve-border, #3b82f6)'
                }}>
                  {/* 가상증빙예제 요약 표시 (먼저 표시) */}
                  {showVESummaryInline && veSummaryContent && (
                    <div style={{
                      marginBottom: 16,
                      padding: 16,
                      background: 'var(--theme-summary-bg, linear-gradient(135deg, #422006 0%, #451a03 100%))',
                      borderRadius: 8,
                      border: '1px solid var(--theme-summary-border, #92400e)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>📝</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-summary-title, #fde68a)' }}>
                          {itemLanguage === 'ko' ? '핵심 요약' : 'Key Summary'}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          fontSize: 11,
                          background: 'var(--theme-summary-border, #92400e)',
                          color: 'white',
                          borderRadius: 10
                        }}>
                          {itemLanguage === 'ko' ? '3~5줄 정리' : 'Quick Overview'}
                        </span>
                      </div>
                      <div 
                        className="markdown-content-dark"
                        style={{ fontSize: 13, color: 'var(--theme-summary-text, #fffbeb)', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={createMarkdownHtml(veSummaryContent)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                    {(() => {
                      const evidenceText = itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired;
                      const isDemonstration = evidenceText?.toLowerCase().includes('시연') || 
                                            evidenceText?.toLowerCase().includes('demonstration') ||
                                            evidenceText?.toLowerCase().includes('demo');
                      
                      return (
                        <>
                          <span style={{ fontSize: 18, color: 'var(--theme-ve-title, #bfdbfe)' }}>{isDemonstration ? '🎯' : '✨'}</span>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-ve-title, #bfdbfe)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isDemonstration ? 
                                (itemLanguage === 'ko' ? 'AI 생성 시연 가이드' : 'AI-Generated Demonstration Guide') :
                                (itemLanguage === 'ko' ? 'AI 생성 가상증빙예제-참고용' : 'AI-Generated Virtual Evidence Examples')
                              }
                              <span style={{
                                padding: '2px 8px',
                                fontSize: 11,
                                background: '#0284c7',
                                color: '#f0f9ff',
                                borderRadius: 10
                              }}>
                                {itemLanguage === 'ko' ? '상세 내용' : 'Details'}
                              </span>
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--theme-ve-text, #e0f2fe)' }}>
                              {isDemonstration ?
                                (itemLanguage === 'ko' 
                                  ? '이 항목의 설명과 조언을 바탕으로 AI가 생성한 구체적인 시연 방법 가이드입니다.'
                                  : 'Specific demonstration guide generated by AI based on this item\'s description and advice.') :
                                (itemLanguage === 'ko' 
                                  ? '이 항목의 설명과 조언을 바탕으로 AI가 생성한 구체적인 증빙자료 예제입니다.'
                                  : 'Specific evidence examples generated by AI based on this item\'s description and advice.')
                              }
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div style={{
                    background: 'transparent',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid #1e293b'
                  }}>
                    <div 
                      className="markdown-content-dark"
                      style={{ fontSize: 14, lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={createMarkdownHtml(virtualEvidenceContent)}
                    />
                  </div>
                  
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: 'transparent',
                    borderRadius: 8,
                    border: '1px solid #1e293b'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: '#F59E0B', fontSize: 14 }}>💡</span>
                      <p style={{ fontSize: 12, color: 'var(--theme-ve-text, #e0f2fe)', fontWeight: 500 }}>
                        {(() => {
                          const evidenceText = itemLanguage === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired;
                          const isDemonstration = evidenceText?.toLowerCase().includes('시연') || 
                                                evidenceText?.toLowerCase().includes('demonstration') ||
                                                evidenceText?.toLowerCase().includes('demo');
                          
                          if (isDemonstration) {
                            return itemLanguage === 'ko' 
                              ? '이 가이드를 참고하여 실제 시연을 준비하고, 시연 과정을 녹화하거나 스크린샷으로 기록하여 아래 "파일 추가" 버튼으로 업로드하세요.'
                              : 'Use this guide to prepare your actual demonstration, and record the demo process or take screenshots to upload using the "Add Files" button below.';
                          } else {
                            return itemLanguage === 'ko' 
                              ? '이 예제를 참고하여 실제 증빙자료를 준비하고, 아래 "파일 추가" 버튼으로 업로드하세요.'
                              : 'Use these examples as reference to prepare your actual evidence and upload using the "Add Files" button below.';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Virtual Evidence Error */}
              {virtualEvidenceError && (
                <div style={{
                  padding: 16,
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
                  borderRadius: 10,
                  border: '1px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h6 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: '#bfdbfe' }}>
                        ⚠️ {itemLanguage === 'ko' ? '오류' : 'Error'}
                      </h6>
                      <div style={{ fontSize: 13, color: '#e0f2fe' }}>{virtualEvidenceError}</div>
                    </div>
                    <button
                      onClick={generateVirtualEvidence}
                      disabled={isGeneratingVirtualEvidence}
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: isGeneratingVirtualEvidence ? 'not-allowed' : 'pointer',
                        opacity: isGeneratingVirtualEvidence ? 0.7 : 1,
                        boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      {isGeneratingVirtualEvidence ? 
                        (itemLanguage === 'ko' ? '재시도 중...' : 'Retrying...') : 
                        (itemLanguage === 'ko' ? '다시 시도' : 'Retry')
                      }
                    </button>
                  </div>
                </div>
              )}
              
              {/* 캐시된 값이 없으면 안내 메시지 */}
              {!virtualEvidenceContent && !virtualEvidenceError && !isGeneratingVirtualEvidence && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--theme-text-secondary)' }}>
                  <p style={{ fontSize: 13 }}>
                    {itemLanguage === 'ko' 
                      ? '상단의 "예제 보기" 버튼을 클릭하면 AI 가상증빙예제를 생성하여 보여줍니다.'
                      : 'Click the "View Examples" button above to generate and display AI virtual evidence examples.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Q&A Section - 주황색 테마 */}
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px var(--theme-shadow)'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
              color: 'white'
            }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                💬 {itemLanguage === 'ko' ? '질의응답' : 'Q&A'}
              </h5>
            </div>
            <div style={{ background: 'var(--theme-card-bg)' }}>
              <QASection 
                itemId={item.id}
                assessmentType={assessmentType}
              />
            </div>
          </div>

          {/* Evidence Upload Section - 청록색 테마 */}
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px var(--theme-shadow)'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                📎 {t('assessmentItem.evidenceUpload')}
                {!evidenceUploadEnabled && (
                  <span style={{ 
                    marginLeft: 8, 
                    padding: '2px 8px', 
                    background: 'rgba(255,255,255,0.3)', 
                    borderRadius: 10, 
                    fontSize: 10 
                  }}>
                    {itemLanguage === 'ko' ? '비활성화됨' : 'Disabled'}
                  </span>
                )}
              </h5>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={!evidenceUploadEnabled}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPdf || !evidenceUploadEnabled}
                  title={!evidenceUploadEnabled ? (itemLanguage === 'ko' ? '관리자가 업로드 기능을 비활성화했습니다' : 'Upload feature is disabled by admin') : ''}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: evidenceUploadEnabled ? 'white' : 'rgba(255,255,255,0.5)',
                    color: evidenceUploadEnabled ? '#14B8A6' : '#6B7280',
                    border: 'none',
                    borderRadius: 6,
                    cursor: (isProcessingPdf || !evidenceUploadEnabled) ? 'not-allowed' : 'pointer',
                    opacity: (isProcessingPdf || !evidenceUploadEnabled) ? 0.7 : 1
                  }}
                >
                  {isProcessingPdf ? 
                    (itemLanguage === 'ko' ? '📄 처리 중...' : '📄 Processing...') :
                    (itemLanguage === 'ko' ? '📄 파일 추가' : '📄 Add Files')
                  }
                </button>
                {evidenceFiles.length > 0 && (
                  <button
                    onClick={() => setShowFileGallery(!showFileGallery)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    📁 {itemLanguage === 'ko' ? `파일 보기 (${evidenceFiles.length})` : `View Files (${evidenceFiles.length})`}
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ padding: 16, background: 'var(--theme-card-bg)' }}>
              {/* File Gallery */}
              {showFileGallery && evidenceFiles.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: 'var(--theme-surface-hover)', borderRadius: 10 }}>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {evidenceFiles.map((file) => (
                      <div key={file.id} className="relative group">
                        {file.fileType === 'image' ? (
                          <img
                            src={`data:${file.mimeType};base64,${file.base64Data}`}
                          alt={file.fileName}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-full h-24 bg-red-100 rounded-lg border border-red-200 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl text-red-600 mb-1">📄</div>
                            <div className="text-xs text-red-800 font-medium">PDF</div>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                        <button
                          onClick={() => handleFileDelete(file.id)}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate" title={file.fileName}>
                        {file.fileName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(file.fileSize / 1024).toFixed(1)}KB
                        {file.fileType === 'pdf' && file.extractedText && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                      </div>
                      {file.fileType === 'pdf' && (
                        <div className="text-xs mt-1 space-y-1">
                          {file.extractedText ? (
                            <div className="text-green-600">
                              {itemLanguage === 'ko' ? '텍스트 추출됨' : 'Text extracted'}
                            </div>
                          ) : (
                            <div className="text-yellow-600">
                              {itemLanguage === 'ko' ? '텍스트 없음' : 'No text'}
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPdfText(file.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {itemLanguage === 'ko' ? '텍스트 편집' : 'Edit text'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluation Section */}
            {evidenceFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={handleEvaluateEvidence}
                    disabled={isEvaluating}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {isEvaluating ? 
                      t('assessmentItem.evaluating') :
                      t('assessmentItem.evaluateEvidence')
                    }
                  </button>
                </div>

                {/* Evaluation Results */}
                {item.evaluation && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h6 className="text-sm font-semibold text-green-900">
                          📊 {t('assessmentItem.evaluationResults')}
                        </h6>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          item.evaluation.score >= 80 ? 'bg-green-100 text-green-800' :
                          item.evaluation.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.evaluation.score}점
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.evaluation.evaluatedAt).toLocaleString(itemLanguage === 'ko' ? 'ko-KR' : 'en-US')}
                      </div>
                    </div>

                    {/* Criteria Scores */}
                    <div className="mb-4 space-y-2">
                      {item.evaluation.criteria.map((criteria, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {itemLanguage === 'ko' && criteria.nameKo ? criteria.nameKo : criteria.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  criteria.score >= 80 ? 'bg-green-500' :
                                  criteria.score >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${criteria.score}%` }}
                              ></div>
                            </div>
                            <span className="font-medium text-gray-900 w-8 text-right">
                              {criteria.score}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Feedback */}
                    <div className="text-sm text-gray-700 bg-white p-4 rounded border space-y-3">
                      {(itemLanguage === 'ko' && item.evaluation.feedbackKo ? 
                        item.evaluation.feedbackKo : 
                        item.evaluation.feedback
                      ).split('\n').map((line, idx) => {
                        // 빈 줄 처리
                        if (!line.trim()) return <div key={idx} className="h-2" />;
                        
                        // 이모지 헤더 (🎯, 📊, 💡, ✅ 등)
                        if (/^[🎯📊💡✅⚠️❌🔍📌]\s*\*\*/.test(line)) {
                          const text = line.replace(/\*\*/g, '');
                          return (
                            <div key={idx} className="font-bold text-base text-gray-900 mt-3 first:mt-0 border-b border-gray-200 pb-2">
                              {text}
                            </div>
                          );
                        }
                        
                        // 불릿 포인트 (• 또는 -)
                        if (/^[•\-]\s/.test(line.trim())) {
                          const text = line.trim().replace(/^[•\-]\s*/, '').replace(/\*\*/g, '');
                          // 점수가 포함된 라인 (예: 문서 완성도: 70점)
                          const scoreMatch = text.match(/^(.+?):\s*(\d+)점\s*[-–]\s*(.+)$/);
                          if (scoreMatch) {
                            const [, label, score, desc] = scoreMatch;
                            const scoreNum = parseInt(score);
                            const scoreColor = scoreNum >= 80 ? 'text-green-600' : scoreNum >= 60 ? 'text-yellow-600' : 'text-red-600';
                            return (
                              <div key={idx} className="flex items-start gap-2 pl-4">
                                <span className="text-gray-400">•</span>
                                <div className="flex-1">
                                  <span className="font-semibold text-gray-800">{label}:</span>
                                  <span className={`font-bold ml-1 ${scoreColor}`}>{score}점</span>
                                  <span className="text-gray-600 ml-1">- {desc}</span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-4">
                              <span className="text-gray-400">•</span>
                              <span className="flex-1">{text}</span>
                            </div>
                          );
                        }
                        
                        // **굵은 텍스트** 처리
                        if (line.includes('**')) {
                          const parts = line.split(/\*\*(.+?)\*\*/g);
                          return (
                            <div key={idx}>
                              {parts.map((part, i) => 
                                i % 2 === 1 ? 
                                  <span key={i} className="font-semibold text-gray-900">{part}</span> : 
                                  <span key={i}>{part}</span>
                              )}
                            </div>
                          );
                        }
                        
                        // 일반 텍스트
                        return <div key={idx}>{line}</div>;
                      })}
                    </div>
                  </div>
                )}

                {/* Evaluation Error */}
                {evaluationError && (
                  <div className="mt-3 rounded-lg p-3" style={{ background: '#CCFBF1', border: '1px solid #5EEAD4' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="text-sm font-semibold mb-1" style={{ color: '#0F766E' }}>
                          ⚠️ {t('assessmentItem.evaluationError')}
                        </h6>
                        <div className="text-sm" style={{ color: '#0D9488' }}>{evaluationError}</div>
                      </div>
                      <button
                        onClick={handleEvaluateEvidence}
                        disabled={isEvaluating}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: isEvaluating ? 'not-allowed' : 'pointer',
                          opacity: isEvaluating ? 0.7 : 1,
                          boxShadow: '0 2px 4px rgba(20, 184, 166, 0.3)'
                        }}
                      >
                        {isEvaluating ? 
                          t('assessmentItem.retrying') : 
                          t('assessmentItem.retry')
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Instructions */}
            {evidenceFiles.length === 0 && (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                {evidenceUploadEnabled ? (
                  <>
                    💡 {itemLanguage === 'ko' ? 
                      '증빙 자료를 이미지 또는 PDF 파일로 업로드하세요. 문서, 스크린샷, 차트, 보고서 등을 포함할 수 있습니다. (최대 10MB, 여러 파일 선택 가능)' :
                      'Upload your evidence documents as images or PDF files. You can include documents, screenshots, charts, reports, etc. (Max 10MB, multiple files allowed)'
                    }
                  </>
                ) : (
                  <>
                    🚫 {itemLanguage === 'ko' ? 
                      '증빙 자료 업로드 기능이 현재 비활성화되어 있습니다. 관리자에게 문의하세요.' :
                      'Evidence upload feature is currently disabled. Please contact the administrator.'
                    }
                  </>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500">
            {t('assessmentItem.lastUpdated')}: {new Date(item.lastUpdated).toLocaleString(itemLanguage === 'ko' ? 'ko-KR' : 'en-US')}
          </div>
        </div>
      )}

      {/* PDF Text Edit Modal */}
      {editingPdfText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📄 {itemLanguage === 'ko' ? 'PDF 텍스트 편집' : 'Edit PDF Text'}
                </h3>
                <button
                  onClick={handleCancelPdfEdit}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {itemLanguage === 'ko' ? 
                    'PDF에서 자동 추출된 텍스트를 확인하고 필요시 수정하세요. 이 텍스트는 AI 평가에 사용됩니다.' :
                    'Review and edit the automatically extracted text from the PDF. This text will be used for AI evaluation.'
                  }
                </p>
                <div className="text-xs text-gray-500">
                  {itemLanguage === 'ko' ? 
                    '파일명: ' + (evidenceFiles.find(f => f.id === editingPdfText)?.fileName || '') :
                    'File: ' + (evidenceFiles.find(f => f.id === editingPdfText)?.fileName || '')
                  }
                </div>
              </div>

              <textarea
                value={pdfTextInput}
                onChange={(e) => setPdfTextInput(e.target.value)}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder={itemLanguage === 'ko' ? 
                  'PDF 내용을 입력하거나 수정하세요...' :
                  'Enter or edit PDF content...'
                }
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={handleCancelPdfEdit}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  {itemLanguage === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={handleSavePdfText}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {itemLanguage === 'ko' ? '저장' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


