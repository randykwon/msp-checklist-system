'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface MSPProgramSection {
  id: string;
  title: string;
  titleKo: string;
  content: string;
  contentKo: string;
  icon: string;
}

const mspProgramSections: MSPProgramSection[] = [
  {
    id: 'overview',
    title: 'Program Overview',
    titleKo: '프로그램 개요',
    icon: '🎯',
    content: `The AWS Managed Service Provider (MSP) Partner Program is designed to help AWS Partners build and scale their managed services practice on AWS. This program provides partners with the tools, resources, and support needed to deliver comprehensive managed services to their customers.

Key Benefits:
• Access to AWS MSP Partner designation and marketing benefits
• Technical and business support from AWS
• Co-marketing opportunities and lead sharing
• Access to MSP-specific training and certification programs
• Priority support and dedicated partner success managers`,
    contentKo: `AWS Managed Service Provider(MSP) 파트너 프로그램은 AWS 파트너가 AWS에서 관리 서비스 실무를 구축하고 확장할 수 있도록 설계되었습니다. 이 프로그램은 파트너가 고객에게 포괄적인 관리 서비스를 제공하는 데 필요한 도구, 리소스 및 지원을 제공합니다.

주요 혜택:
• AWS MSP 파트너 지정 및 마케팅 혜택 액세스
• AWS의 기술 및 비즈니스 지원
• 공동 마케팅 기회 및 리드 공유
• MSP 전용 교육 및 인증 프로그램 액세스
• 우선 지원 및 전담 파트너 성공 관리자`
  },
  {
    id: 'requirements',
    title: 'Core Requirements',
    titleKo: '핵심 요구사항',
    icon: '📋',
    content: `To become an AWS MSP Partner, organizations must meet specific requirements across multiple areas:

Prerequisites:
• APN Advanced or Premier Service Partner tier
• Minimum 3 AWS technical certifications
• Minimum 4 customer case studies
• Public website with MSP practice information

Technical Validation Areas:
• Customer Management processes
• Service Delivery capabilities
• Monitoring & Observability
• Security & Compliance
• Backup & Disaster Recovery
• Cost Optimization`,
    contentKo: `AWS MSP 파트너가 되기 위해서는 여러 영역에서 특정 요구사항을 충족해야 합니다:

사전 요구사항:
• APN Advanced 또는 Premier 서비스 파트너 등급
• 최소 3개의 AWS 기술 인증
• 최소 4개의 고객 사례 연구
• MSP 실무 정보가 있는 공개 웹사이트

기술 검증 영역:
• 고객 관리 프로세스
• 서비스 제공 역량
• 모니터링 및 관찰 가능성
• 보안 및 규정 준수
• 백업 및 재해 복구
• 비용 최적화`
  },
  {
    id: 'benefits',
    title: 'Partner Benefits',
    titleKo: '파트너 혜택',
    icon: '🎁',
    content: `AWS MSP Partners receive exclusive benefits and support to grow their managed services business:

Marketing & Sales Benefits:
• MSP Partner badge and co-branding rights
• Listing in AWS Partner Solutions Finder
• Joint marketing campaigns and events
• Lead sharing and referral opportunities
• Case study development support

Technical Benefits:
• Access to MSP-specific AWS services and pricing
• Technical training and certification programs
• Architecture review and best practices guidance
• Early access to new AWS services and features
• Dedicated technical account management

Business Benefits:
• Quarterly business reviews with AWS
• Partner success manager support
• Access to MSP partner community and events
• Business development and go-to-market support`,
    contentKo: `AWS MSP 파트너는 관리 서비스 비즈니스를 성장시키기 위한 독점적인 혜택과 지원을 받습니다:

마케팅 및 영업 혜택:
• MSP 파트너 배지 및 공동 브랜딩 권한
• AWS 파트너 솔루션 파인더 등록
• 공동 마케팅 캠페인 및 이벤트
• 리드 공유 및 추천 기회
• 사례 연구 개발 지원

기술적 혜택:
• MSP 전용 AWS 서비스 및 가격 액세스
• 기술 교육 및 인증 프로그램
• 아키텍처 검토 및 모범 사례 가이드
• 새로운 AWS 서비스 및 기능 조기 액세스
• 전담 기술 계정 관리

비즈니스 혜택:
• AWS와의 분기별 비즈니스 검토
• 파트너 성공 관리자 지원
• MSP 파트너 커뮤니티 및 이벤트 액세스
• 비즈니스 개발 및 시장 진출 지원`
  },
  {
    id: 'validation',
    title: 'Validation Process',
    titleKo: '검증 프로세스',
    icon: '🔍',
    content: `The MSP Partner validation process ensures partners meet AWS standards for managed service delivery:

Phase 1: Prerequisites Review
• Documentation submission and review
• APN tier and certification verification
• Customer case study validation
• Website and marketing material review

Phase 2: Technical Validation
• Deep-dive technical interviews
• Process and procedure documentation review
• Customer reference calls
• Hands-on technical demonstrations

Phase 3: Final Assessment
• Comprehensive review by AWS MSP team
• Final approval and partner designation
• Onboarding to MSP partner program
• Access to partner benefits and resources

Timeline: The entire validation process typically takes 8-16 weeks from initial submission to final approval.`,
    contentKo: `MSP 파트너 검증 프로세스는 파트너가 관리 서비스 제공을 위한 AWS 표준을 충족하는지 확인합니다:

1단계: 사전 요구사항 검토
• 문서 제출 및 검토
• APN 등급 및 인증 확인
• 고객 사례 연구 검증
• 웹사이트 및 마케팅 자료 검토

2단계: 기술 검증
• 심층 기술 인터뷰
• 프로세스 및 절차 문서 검토
• 고객 참조 통화
• 실습 기술 시연

3단계: 최종 평가
• AWS MSP 팀의 종합 검토
• 최종 승인 및 파트너 지정
• MSP 파트너 프로그램 온보딩
• 파트너 혜택 및 리소스 액세스

일정: 전체 검증 프로세스는 일반적으로 초기 제출부터 최종 승인까지 8-16주가 소요됩니다.`
  },
  {
    id: 'categories',
    title: 'Service Categories',
    titleKo: '서비스 카테고리',
    icon: '🏗️',
    content: `AWS MSP Partners must demonstrate capabilities across six core service delivery areas:

1. Customer Management
• Customer onboarding and lifecycle management
• Service level agreement (SLA) management
• Customer communication and reporting
• Escalation and incident management procedures

2. Service Delivery
• Infrastructure provisioning and management
• Application deployment and maintenance
• Change management and release processes
• Performance optimization and tuning

3. Monitoring & Observability
• Comprehensive monitoring and alerting
• Log aggregation and analysis
• Performance metrics and dashboards
• Proactive issue identification and resolution

4. Security & Compliance
• Security framework implementation
• Compliance monitoring and reporting
• Identity and access management
• Data protection and encryption

5. Backup & Disaster Recovery
• Backup strategy and implementation
• Disaster recovery planning and testing
• Business continuity procedures
• Recovery time and point objectives

6. Cost Optimization
• Cost monitoring and analysis
• Resource optimization recommendations
• Budget management and forecasting
• Reserved instance and savings plan management`,
    contentKo: `AWS MSP 파트너는 6개의 핵심 서비스 제공 영역에서 역량을 입증해야 합니다:

1. 고객 관리
• 고객 온보딩 및 라이프사이클 관리
• 서비스 수준 계약(SLA) 관리
• 고객 커뮤니케이션 및 보고
• 에스컬레이션 및 인시던트 관리 절차

2. 서비스 제공
• 인프라 프로비저닝 및 관리
• 애플리케이션 배포 및 유지보수
• 변경 관리 및 릴리스 프로세스
• 성능 최적화 및 튜닝

3. 모니터링 및 관찰 가능성
• 포괄적인 모니터링 및 알림
• 로그 집계 및 분석
• 성능 메트릭 및 대시보드
• 사전 문제 식별 및 해결

4. 보안 및 규정 준수
• 보안 프레임워크 구현
• 규정 준수 모니터링 및 보고
• 신원 및 액세스 관리
• 데이터 보호 및 암호화

5. 백업 및 재해 복구
• 백업 전략 및 구현
• 재해 복구 계획 및 테스트
• 비즈니스 연속성 절차
• 복구 시간 및 지점 목표

6. 비용 최적화
• 비용 모니터링 및 분석
• 리소스 최적화 권장사항
• 예산 관리 및 예측
• 예약 인스턴스 및 절약 계획 관리`
  }
];

interface MSPProgramInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MSPProgramInfoModal({ isOpen, onClose }: MSPProgramInfoModalProps) {
  const { language } = useLanguage();
  const [selectedSection, setSelectedSection] = useState<string>('overview');

  if (!isOpen) return null;

  const currentSection = mspProgramSections.find(section => section.id === selectedSection);

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal fb-modal-with-sidebar" style={{ maxWidth: '1100px', maxHeight: '90vh' }}>
        {/* Sidebar Navigation */}
        <div className="fb-modal-sidebar">
          <div className="fb-modal-sidebar-title">
            {language === 'ko' ? 'AWS MSP 프로그램' : 'AWS MSP Program'}
          </div>
          <p className="fb-modal-sidebar-subtitle">
            {language === 'ko' 
              ? 'Managed Service Provider 파트너 프로그램 상세 정보'
              : 'Managed Service Provider Partner Program Details'
            }
          </p>

          <nav className="fb-modal-sidebar-nav">
            {mspProgramSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`fb-modal-sidebar-item ${
                  selectedSection === section.id ? 'active' : ''
                }`}
              >
                <span className="fb-modal-sidebar-item-icon">{section.icon}</span>
                <span>
                  {language === 'ko' ? section.titleKo : section.title}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="fb-modal-main">
          {/* Header */}
          <div className="fb-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--fb-spacing-md)' }}>
              <span style={{ fontSize: 'var(--fb-font-size-2xl)' }}>{currentSection?.icon}</span>
              <h3 className="fb-modal-title">
                {language === 'ko' ? currentSection?.titleKo : currentSection?.title}
              </h3>
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

          {/* Content */}
          <div className="fb-modal-body fb-modal-scrollable" style={{ flex: 1 }}>
            <div style={{ 
              color: 'var(--fb-text-primary)', 
              lineHeight: '1.6', 
              whiteSpace: 'pre-line',
              fontSize: 'var(--fb-font-size-base)'
            }}>
              {language === 'ko' ? currentSection?.contentKo : currentSection?.content}
            </div>
          </div>

          {/* Footer */}
          <div className="fb-modal-footer fb-modal-footer-between" style={{ backgroundColor: 'var(--fb-background)' }}>
            <div style={{ fontSize: 'var(--fb-font-size-sm)', color: 'var(--fb-text-secondary)' }}>
              {language === 'ko' 
                ? 'AWS MSP 파트너 프로그램에 대한 자세한 정보는 AWS 파트너 포털을 참조하세요.'
                : 'For more detailed information about the AWS MSP Partner Program, please refer to the AWS Partner Portal.'
              }
            </div>
            <div style={{ display: 'flex', gap: 'var(--fb-spacing-sm)' }}>
              <button
                onClick={onClose}
                className="fb-btn fb-btn-secondary"
              >
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/assessment';
                }}
                className="fb-btn fb-btn-primary"
              >
                {language === 'ko' ? '평가 시작하기' : 'Start Assessment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}