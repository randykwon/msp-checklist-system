'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createMarkdownHtml } from '@/lib/markdown-parser';

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
    id: 'journey',
    title: 'MSP Partner Journey',
    titleKo: 'MSP 파트너 여정',
    icon: '🗺️',
    content: `AWS MSP Partner Journey: A Step-by-Step Guide to Success

The AWS MSP Partner journey consists of six key stages that guide partners from initial discussion to continuous growth.

**1. Discussion 💬**
Discussion with AWS Partner Manager
• Cloud MSP business model development, key considerations
• Discuss with AWS Partner Manager for guidance and support

**2. Learning 📚**
Understanding Program Requirements
• Review AWS MSP Program Guide to understand requirements
• Learn about MSP practices

Understanding Next-Gen MSP
• Understand DevOps-based operational models through APN blog posts
• Learn about right-sizing development

Checklist & Adjustment Guide Mastery
• Master MSP Program Checklist (VCL) requirements
• Understand adjustment guides and prepare with AWS Partner team

**3. Build 🏗️**
Best Practice Documentation
• Build MSP practices processes using updated checklists and adjustment guides

Leverage Best Practice Documents
• Prepare evidence using MSP guides and adjustment documents provided in Partner Central

Participate in Build Workshops (Recommended)
• Participate in workshops with AWS service team constraints to understand MSP requirements

**4. Assessment 📋**
Hybrid Audit Model Introduction
• "Challenge First" approach - submit documents for initial review, then conduct detailed review after passing

Self-Assessment Spreadsheet Completion
• Complete self-assessment spreadsheet with evidence
• Submit via email within 33 days

Full Audit
• 90-day PERSON audit
• Receive final results and feedback

**5. Market Launch 🚀**
Official AWS MSP Partner Registration
• Upon program achievement, AWS MSP Partner officially registered in Partner Central
• Unlock benefits and services

GTM Strategy Acceleration
• Accelerate go-to-market strategy using Marketing Central
• Establish market entry strategy

Program Achievement Benefits:
• $50K MDF funding
• $25K MDF additional funding
• MSP Partner badge (3 years)
• 1 year free

GTM Support
• MSP Partner GTM support
• MSP Essentials access

Visibility (Enablement)
• AWS Partner Solutions Finder
• Marketplace listing

**6. Growth 🌳**
Differentiation for Additional Growth
• AWS DevOps Competency, additional competencies
• Expand services through differentiation

Program Innovation & Continuous Development
• Continuous improvement with AWS MSP Program
• Enhance service quality through partner collaboration

3-Year Review & Renewal Process
• Annual review and renewal every 3 years
• Maintain certification through continuous improvement`,
    contentKo: `AWS MSP 파트너 여정: 성공을 향한 단계별 가이드

AWS MSP 파트너 여정은 초기 논의부터 지속적인 성장까지 파트너를 안내하는 6가지 핵심 단계로 구성됩니다.

**1. 논의 💬**
AWS 파트너 관리자와의 논의
• 클라우드 MSP 비즈니스 모델 구축, 주요 고려사항
• AWS 파트너 관리자와 상담 시작

**2. 학습 📚**
프로그램 요구사항 파악
• AWS MSP 프로그램 가이드를 검토하여 프로그램 요구사항에 대해 학습하고 MSP 프랙티스 구축을 시작합니다.

차세대 MSP 이해
• APN 블로그의 성공 사례를 통해 DevOps 기반 운영모델을 이해하고 라이트사이징 개발을 학습합니다.

검증 체크리스트 및 조정 가이드 숙지
• MSP 프로그램 검증 체크리스트(VCL)의 요구사항을 이해하고, 조정 가이드를 숙지하여 AWS 파트너팀과 함께 준비합니다.

**3. 구축 🏗️**
모범 사례 문서 활용
• 최신 버전의 검증 체크리스트와 조정 도구 가이드를 활용하여 MSP 프랙티스의 프로세스를 구축합니다.

모범 사례 문서 활용
• Partner Central에서 제공하는 MSP 검증 체크리스트와 조정 가이드를 활용하여 증빙 자료를 준비합니다.

빌드 워크숍 참여 (권장)
• AWS 서비스 팀에서 여러 제한사항으로 제한되는 워크숍에 참여하여 MSP 요구사항을 이해합니다.

**4. 평가 📋**
하이브리드 감사 모형 도입
• 챌린지는 "먼저 도전 제안" 방식을 먼저 검증하여 통과한 후, 제3자 감사 기관과 기술 검증을 진행하는 절차입니다.

1. 자체 평가 스프레드시트 완료
• 자체 평가 스프레드시트를 증빙 자료와 함께 작성하여 AWS MSP 프로그램 팀에 이메일로 제출합니다.
• 감사 이메일 도착 후 33일 이내에 제출해야 합니다.

2. 정식 감사 (Full Audit)
• 90일간 PERSON 감사를 받고 최종 결과 및 피드백을 수령합니다.

**5. 시장 출시 🚀**
AWS MSP 파트너로 공식 등재
• 프로그램 달성 시, AWS MSP 파트너로 공식적으로 Partner Central에 등록되어 혜택과 서비스를 활용할 수 있습니다.

GTM 전략 가속화
• Marketing Central의 기능 이해를 바탕으로 활용하여 서비스 모델을 빠르게 시장 진출 전략을 정립합니다.

프로그램 달성 혜택:
• 펀딩: $50K MDF 펀딩, $25K MDF 추가 펀딩
• 가시성: MSP 파트너배지(3년), 1년 무료
• GTM 지원: MSP 파트너 GTM 지원, MSP Essentials 이용 자격
• 전문성 강화(Enablement): AWS Partner Solutions Finder, Marketplace 리스팅 등

**6. 성장 🌳**
차별화를 통한 추가 성장
• AWS DevOps 컴피턴시, 어드밴스드 컴피턴시 등 다른 프로그램을 통해서 서비스를 더욱 차별화합니다.

프로그램 혁신 및 지속적인 발전
• AWS MSP 프로그램과 함께, 파트너사 협업을 통해 서비스의 수준을 높이고 비즈니스 성장을 도모합니다.

3년 주기 감사 및 갱신 프로세스
• 3년마다 1년간의 갱신 감사를 받아야 하며 인증을 유지하기 위해 기준을 충족해야 합니다.`
  },
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
  const [selectedSection, setSelectedSection] = useState<string>('journey');

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
            <div 
              style={{ 
                color: 'var(--fb-text-primary)', 
                lineHeight: '1.6', 
                fontSize: 'var(--fb-font-size-base)'
              }}
              dangerouslySetInnerHTML={createMarkdownHtml(
                language === 'ko' ? currentSection?.contentKo || '' : currentSection?.content || ''
              )}
            />
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