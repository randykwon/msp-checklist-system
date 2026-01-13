'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface JourneyStep {
  id: string;
  title: string;
  titleKo: string;
  description: string;
  descriptionKo: string;
  requirements: string[];
  requirementsKo: string[];
  duration: string;
  durationKo: string;
  status: 'current' | 'completed' | 'upcoming';
}

const journeySteps: JourneyStep[] = [
  {
    id: 'discuss',
    title: 'Discuss',
    titleKo: '논의',
    description: 'Initial consultation and alignment with AWS to understand MSP program requirements and opportunities',
    descriptionKo: 'MSP 프로그램 요구사항과 기회를 이해하기 위한 AWS와의 초기 상담 및 조율',
    requirements: [
      'Schedule consultation with AWS Partner Development Manager',
      'Review MSP program overview and benefits',
      'Assess current capabilities and readiness',
      'Define partnership goals and timeline',
      'Understand market opportunities and customer needs'
    ],
    requirementsKo: [
      'AWS 파트너 개발 관리자와 상담 일정 잡기',
      'MSP 프로그램 개요 및 혜택 검토',
      '현재 역량 및 준비 상태 평가',
      '파트너십 목표 및 일정 정의',
      '시장 기회 및 고객 요구사항 이해'
    ],
    duration: '1-2 weeks',
    durationKo: '1-2주',
    status: 'completed'
  },
  {
    id: 'learn',
    title: 'Learn',
    titleKo: '학습',
    description: 'Acquire necessary knowledge, certifications, and skills to deliver managed services on AWS',
    descriptionKo: 'AWS에서 관리 서비스를 제공하기 위한 필요한 지식, 인증 및 기술 습득',
    requirements: [
      'Complete AWS technical certifications (minimum 3)',
      'Attend MSP-specific training programs',
      'Study AWS Well-Architected Framework',
      'Learn AWS service management best practices',
      'Understand compliance and security requirements'
    ],
    requirementsKo: [
      'AWS 기술 인증 완료 (최소 3개)',
      'MSP 전용 교육 프로그램 참석',
      'AWS Well-Architected Framework 학습',
      'AWS 서비스 관리 모범 사례 학습',
      '규정 준수 및 보안 요구사항 이해'
    ],
    duration: '2-3 months',
    durationKo: '2-3개월',
    status: 'current'
  },
  {
    id: 'build',
    title: 'Build',
    titleKo: '구축',
    description: 'Develop and implement the technical infrastructure, processes, and capabilities required for MSP services',
    descriptionKo: 'MSP 서비스에 필요한 기술 인프라, 프로세스 및 역량 개발 및 구현',
    requirements: [
      'Establish monitoring and observability platform',
      'Implement security and compliance framework',
      'Set up backup and disaster recovery systems',
      'Develop customer management processes',
      'Create service delivery workflows',
      'Build cost optimization capabilities'
    ],
    requirementsKo: [
      '모니터링 및 관찰 가능성 플랫폼 구축',
      '보안 및 규정 준수 프레임워크 구현',
      '백업 및 재해 복구 시스템 설정',
      '고객 관리 프로세스 개발',
      '서비스 제공 워크플로우 생성',
      '비용 최적화 역량 구축'
    ],
    duration: '3-6 months',
    durationKo: '3-6개월',
    status: 'upcoming'
  },
  {
    id: 'assess',
    title: 'Assess',
    titleKo: '평가',
    description: 'Complete formal assessment and validation process to demonstrate MSP readiness and capabilities',
    descriptionKo: 'MSP 준비 상태와 역량을 입증하기 위한 공식 평가 및 검증 프로세스 완료',
    requirements: [
      'Submit prerequisites documentation',
      'Complete technical validation assessment',
      'Provide customer case studies and references',
      'Demonstrate service delivery capabilities',
      'Pass AWS technical interviews',
      'Meet all MSP program requirements'
    ],
    requirementsKo: [
      '사전 요구사항 문서 제출',
      '기술 검증 평가 완료',
      '고객 사례 연구 및 참조 제공',
      '서비스 제공 역량 입증',
      'AWS 기술 인터뷰 통과',
      '모든 MSP 프로그램 요구사항 충족'
    ],
    duration: '2-4 months',
    durationKo: '2-4개월',
    status: 'upcoming'
  },
  {
    id: 'go-to-market',
    title: 'Go To Market',
    titleKo: '시장 진출',
    description: 'Launch MSP services and execute go-to-market strategy with AWS support and co-marketing opportunities',
    descriptionKo: 'AWS 지원 및 공동 마케팅 기회를 통해 MSP 서비스 출시 및 시장 진출 전략 실행',
    requirements: [
      'Receive MSP partner designation and badge',
      'Launch public MSP practice webpage',
      'Execute joint marketing campaigns with AWS',
      'Participate in AWS partner events and webinars',
      'Leverage AWS lead sharing programs',
      'Develop customer acquisition strategies'
    ],
    requirementsKo: [
      'MSP 파트너 지정 및 배지 수령',
      '공개 MSP 실무 웹페이지 출시',
      'AWS와 공동 마케팅 캠페인 실행',
      'AWS 파트너 이벤트 및 웨비나 참여',
      'AWS 리드 공유 프로그램 활용',
      '고객 확보 전략 개발'
    ],
    duration: '1-3 months',
    durationKo: '1-3개월',
    status: 'upcoming'
  },
  {
    id: 'grow',
    title: 'Grow',
    titleKo: '성장',
    description: 'Scale MSP practice, expand service offerings, and continuously improve capabilities with ongoing AWS support',
    descriptionKo: '지속적인 AWS 지원을 통해 MSP 실무 확장, 서비스 제공 확대 및 역량 지속적 개선',
    requirements: [
      'Scale customer base and service delivery',
      'Expand to new AWS services and regions',
      'Develop specialized service offerings',
      'Participate in quarterly business reviews',
      'Maintain compliance and certifications',
      'Contribute to AWS partner community'
    ],
    requirementsKo: [
      '고객 기반 및 서비스 제공 확장',
      '새로운 AWS 서비스 및 지역으로 확장',
      '전문 서비스 제공 개발',
      '분기별 비즈니스 검토 참여',
      '규정 준수 및 인증 유지',
      'AWS 파트너 커뮤니티에 기여'
    ],
    duration: 'Ongoing',
    durationKo: '지속적',
    status: 'upcoming'
  }
];

interface MSPPartnerJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MSPPartnerJourneyModal({ isOpen, onClose }: MSPPartnerJourneyModalProps) {
  const { language, t } = useLanguage();
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const getStepIcon = (status: string, index: number) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
            ✓
          </div>
        );
      case 'current':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {index + 1}
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
            {index + 1}
          </div>
        );
    }
  };

  const getStepColor = (status: string) => {
    // 다크 모드에 맞는 색상 사용
    switch (status) {
      case 'completed':
        return 'border-green-600 bg-green-900/30';
      case 'current':
        return 'border-blue-500 bg-blue-900/30';
      default:
        return 'border-gray-600 bg-gray-800/50';
    }
  };

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal fb-modal-xl" style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div className="fb-modal-header">
          <div>
            <h2 className="fb-modal-title">
              {language === 'ko' ? 'AWS MSP 파트너 여정' : 'AWS MSP Partner Journey'}
            </h2>
            <p className="fb-modal-subtitle">
              {language === 'ko' 
                ? 'AWS Managed Service Provider 파트너가 되기 위한 단계별 가이드'
                : 'Step-by-step guide to becoming an AWS Managed Service Provider partner'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="fb-modal-close"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="fb-modal-body fb-modal-scrollable" style={{ maxHeight: '70vh' }}>

          {/* Journey Timeline */}
          <div className="space-y-6" style={{ padding: '0 var(--fb-spacing-lg)' }}>
            {journeySteps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connector Line */}
                {index < journeySteps.length - 1 && (
                  <div className="absolute left-4 top-12 w-0.5 h-16" style={{ background: 'var(--theme-border)' }}></div>
                )}
                
                {/* Step Card */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${getStepColor(step.status)} ${
                    selectedStep === step.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Step Icon */}
                    {getStepIcon(step.status, index)}
                    
                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                          {language === 'ko' ? step.titleKo : step.title}
                        </h3>
                        <span className="text-sm px-2 py-1 rounded" style={{ color: 'var(--theme-text-primary)', background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
                          {language === 'ko' ? step.durationKo : step.duration}
                        </span>
                      </div>
                      
                      <p className="mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
                        {language === 'ko' ? step.descriptionKo : step.description}
                      </p>

                      {/* Requirements Preview */}
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                        <span>
                          {language === 'ko' ? '요구사항' : 'Requirements'}:
                        </span>
                        <span>
                          {(language === 'ko' ? step.requirementsKo : step.requirements).length} 
                          {language === 'ko' ? '개 항목' : ' items'}
                        </span>
                        <button className="text-blue-600 hover:text-blue-800">
                          {selectedStep === step.id 
                            ? (language === 'ko' ? '접기' : 'Collapse')
                            : (language === 'ko' ? '자세히 보기' : 'View Details')
                          }
                        </button>
                      </div>

                      {/* Expanded Requirements */}
                      {selectedStep === step.id && (
                        <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
                          <h4 className="font-semibold mb-3" style={{ color: 'var(--theme-text-primary)' }}>
                            {language === 'ko' ? '세부 요구사항:' : 'Detailed Requirements:'}
                          </h4>
                          <ul className="space-y-2">
                            {(language === 'ko' ? step.requirementsKo : step.requirements).map((req, reqIndex) => (
                              <li key={reqIndex} className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span style={{ color: 'var(--theme-text-primary)' }}>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="fb-modal-info-box" style={{ margin: 'var(--fb-spacing-lg)' }}>
            <div className="fb-modal-info-box-icon">💡</div>
            <div className="fb-modal-info-box-content">
              <h4 className="fb-modal-info-box-title">
                {language === 'ko' ? '도움말' : 'Helpful Tips'}
              </h4>
              <p className="fb-modal-info-box-text">
                {language === 'ko' 
                  ? '각 단계는 이전 단계의 완료를 전제로 합니다. 현재 Assessment 도구를 사용하여 Prerequisites와 Technical Validation 단계를 체계적으로 준비할 수 있습니다.'
                  : 'Each step builds upon the completion of previous steps. Use this Assessment tool to systematically prepare for the Prerequisites and Technical Validation phases.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fb-modal-footer">
          <button
            onClick={onClose}
            className="fb-btn fb-btn-secondary"
          >
            {language === 'ko' ? '닫기' : 'Close'}
          </button>
          <button
            onClick={() => {
              onClose();
              // Navigate to assessment page
              window.location.href = '/assessment';
            }}
            className="fb-btn fb-btn-primary"
          >
            {language === 'ko' ? '평가 시작하기' : 'Start Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}