import { AssessmentItem } from '../lib/csv-parser';

// Technical Validation 데이터 (60+ items)
export const technicalValidationData: AssessmentItem[] = [
  // Business (4 items)
  {
    id: 'BUS-001',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'Company Overview',
    titleKo: '회사 개요',
    description: `Company Overview
Mandatory

AWS Partner has a company overview presentation to set the stage for customer conversations as applicable to its MSP practice, in addition to demonstration capabilities.

Presentation will contain information about next generation cloud managed services; how managed services are different in an AWS environment vs. traditional on premise or hosted managed services with emphasis on automation enabled by DevOps practices.

Overview presentations contain:
• Company history
• Office locations
• Number of employees
• Location of AWS MSP support and operation staff
• Customer profile, including number, size and geography of customers, and industry/segment
• Service differentiators
• AWS relationship overview/details, including AWS Partner Paths, monthly AWS billings, etc.

Evidence must be a presentation delivered during the Full Audit. Presentation should be limited to no more than 20 minutes.`,
    descriptionKo: `회사 개요
필수

AWS 파트너는 데모 역량 외에도 MSP 실무에 적용 가능한 고객 대화의 무대를 설정하기 위한 회사 개요 프레젠테이션을 보유해야 합니다.

프레젠테이션에는 차세대 클라우드 관리 서비스에 대한 정보가 포함되어야 합니다. DevOps 관행으로 가능해진 자동화에 중점을 두어 AWS 환경에서의 관리 서비스가 기존 온프레미스 또는 호스팅 관리 서비스와 어떻게 다른지 설명해야 합니다.

개요 프레젠테이션에는 다음이 포함됩니다:
• 회사 역사
• 사무실 위치
• 직원 수
• AWS MSP 지원 및 운영 직원의 위치
• 고객 프로필(고객 수, 규모, 지역, 업계/부문 포함)
• 서비스 차별화 요소
• AWS 파트너 경로, 월별 AWS 청구 등을 포함한 AWS 관계 개요/세부사항

증빙은 전체 감사 중에 제공되는 프레젠테이션이어야 합니다. 프레젠테이션은 20분 이내로 제한되어야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be a presentation delivered during the Full Audit. Presentation should be limited to no more than 20 minutes.',
    evidenceRequiredKo: '증빙은 전체 감사 중에 제공되는 프레젠테이션이어야 합니다. 프레젠테이션은 20분 이내로 제한되어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'BUS-002',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'MSP Practice Growth',
    titleKo: 'MSP 실무 성장',
    description: `MSP Practice Growth
Mandatory

AWS Partner is actively growing their MSP Practice on AWS.

All customer contracts must be for net new customers onboarded within the last 18 months, or demonstrate significant growth, like migration of new applications or refactoring of existing architecture, of an existing customer engagement. Renewal of ongoing managed services for existing workloads is not sufficient without any additional scope of work.

Evidence must be in the form of ≥ 4 new contracts or addenda that demonstrate customer growth. All those new contracts or addenda should be ongoing managed services engagements.`,
    descriptionKo: `MSP 실무 성장
필수

AWS 파트너는 AWS에서 MSP 실무를 적극적으로 성장시키고 있습니다.

모든 고객 계약은 지난 18개월 내에 온보딩된 순수 신규 고객이거나, 새로운 애플리케이션 마이그레이션 또는 기존 아키텍처 리팩토링과 같은 기존 고객 참여의 상당한 성장을 보여주어야 합니다. 기존 워크로드에 대한 지속적인 관리 서비스의 갱신은 추가 작업 범위 없이는 충분하지 않습니다.

증빙은 고객 성장을 보여주는 4개 이상의 새로운 계약 또는 부록 형태여야 합니다. 이러한 모든 새로운 계약 또는 부록은 진행 중인 관리 서비스 참여여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of ≥ 4 new contracts or addenda that demonstrate customer growth.',
    evidenceRequiredKo: '증빙은 고객 성장을 보여주는 4개 이상의 새로운 계약 또는 부록 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'BUS-003',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'Financial Planning and Reporting',
    titleKo: '재무 계획 및 보고',
    description: `Financial Planning and Reporting
Mandatory

AWS Partner has processes in place for financial planning, including forecasting, budgeting, and review of financial metrics and reports.

Evidence can be in the form of either budgets, financial forecasts, and reports for the prior quarter or month, or documented policies and processes related to financial planning and review of financial metrics. Public securities filings for the most recent period are sufficient evidence for publicly traded companies.`,
    descriptionKo: `재무 계획 및 보고
필수

AWS 파트너는 예측, 예산 편성, 재무 지표 및 보고서 검토를 포함한 재무 계획을 위한 프로세스를 보유하고 있습니다.

증빙은 이전 분기 또는 월의 예산, 재무 예측 및 보고서 또는 재무 계획 및 재무 지표 검토와 관련된 문서화된 정책 및 프로세스 형태일 수 있습니다. 상장 기업의 경우 최근 기간의 공개 증권 신고서가 충분한 증빙입니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence can be in the form of budgets, financial forecasts, reports, or documented policies. Public securities filings sufficient for publicly traded companies.',
    evidenceRequiredKo: '증빙은 예산, 재무 예측, 보고서 또는 문서화된 정책 형태일 수 있습니다. 상장 기업의 경우 공개 증권 신고서로 충분합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'BUS-004',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'Go-To-Market',
    titleKo: '시장 진출 전략',
    description: `Go-To-Market
Mandatory

AWS Partner must have processes on how they identify Managed Services opportunities, train their sellers to recognize and sell these opportunities, and their specific efforts to generate demand and leads for their AWS Managed Services (MSP) practice.

Evidence must be in a form of a documented process or first call deck on how the AWS Partner engages with customers, their internal sales team, and AWS sales representatives (if applicable) to promote and sell their Managed Services offerings.`,
    descriptionKo: `시장 진출 전략
필수

AWS 파트너는 관리 서비스 기회를 식별하고, 판매자가 이러한 기회를 인식하고 판매하도록 교육하며, AWS 관리 서비스(MSP) 실무에 대한 수요와 리드를 생성하기 위한 구체적인 노력에 대한 프로세스를 보유해야 합니다.

증빙은 AWS 파트너가 관리 서비스 제품을 홍보하고 판매하기 위해 고객, 내부 영업팀 및 AWS 영업 담당자(해당하는 경우)와 어떻게 협력하는지에 대한 문서화된 프로세스 또는 첫번째 소개 자료 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in a form of a documented process or first call deck on how the AWS Partner engages with customers.',
    evidenceRequiredKo: '증빙은 AWS 파트너가 고객과 어떻게 협력하는지에 대한 문서화된 프로세스 또는 첫번째 소개 자료 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },

  // People (3 items)
  {
    id: 'PEO-001',
    category: 'People',
    categoryKo: '인력',
    title: 'Personnel Onboarding',
    titleKo: '인력 온보딩',
    description: `Personnel Onboarding
Mandatory

AWS Partner has defined processes and checklists for onboarding of personnel relevant to the AWS Partner's AWS managed service practice.

Evidence must be in the form of completed on-boarding records scoped to the AWS Partner's AWS managed service practice; examples may include completed checklists, training plans, or other records.`,
    descriptionKo: `인력 온보딩
필수

AWS 파트너는 AWS 파트너의 AWS 관리 서비스 실무와 관련된 인력의 온보딩을 위한 정의된 프로세스와 체크리스트를 보유해야 합니다.

증빙은 AWS 파트너의 AWS 관리 서비스 실무에 범위가 지정된 완료된 온보딩 기록 형태여야 합니다. 예시로는 완료된 체크리스트, 교육 계획 또는 기타 기록이 포함될 수 있습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of completed on-boarding records; examples may include completed checklists, training plans, or other records.',
    evidenceRequiredKo: '증빙은 완료된 온보딩 기록 형태여야 합니다. 예시로는 완료된 체크리스트, 교육 계획 또는 기타 기록이 포함될 수 있습니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PEO-002',
    category: 'People',
    categoryKo: '인력',
    title: 'Cloud Center of Excellence (CCOE)',
    titleKo: '클라우드 우수성 센터 (CCOE)',
    description: `Cloud Center of Excellence (CCOE)
Mandatory

AWS Partner maintains a Cloud Center of Excellence (CCOE).

A CCOE is a team of cross-functional people dedicated to creating, evangelizing, and institutionalizing cloud best practices, frameworks, and governance for evolving technology operations.

This dedicated cross functional team shapes and supports the direction of the MSP practice across the following domains:
1. Cloud adoption and retooling: Promoting the adoption of cloud services across the organization
2. Training and change management: Coordinating cloud learnings and embracing a change-as-normal mindset
3. Governance: Setting up initial governance processes and best practices
4. Strategy: Aligning cloud offerings with the organizational business strategy
5. Operations and automation: Standardizing and automating commonly needed platform components

Evidence of a CCOE must be in the form of documented charter, organization structure, and operational process for the CCOE and how it engages across the AWS Partner's business.`,
    descriptionKo: `클라우드 우수성 센터 (CCOE)
필수

AWS 파트너는 클라우드 우수성 센터(CCOE)를 유지합니다.

CCOE는 진화하는 기술 운영을 위한 클라우드 모범 사례, 프레임워크 및 거버넌스를 생성, 전파 및 제도화하는 데 전념하는 다기능 팀입니다.

이 전담 다기능 팀은 다음 영역에서 MSP 실무의 방향을 형성하고 지원합니다:
1. 클라우드 채택 및 재도구화: 조직 전반에 걸친 클라우드 서비스 채택 촉진
2. 교육 및 변경 관리: 클라우드 학습 조정 및 변화를 정상으로 받아들이는 사고방식 수용
3. 거버넌스: 초기 거버넌스 프로세스 및 모범 사례 설정
4. 전략: 클라우드 제품을 조직의 비즈니스 전략과 일치시키기
5. 운영 및 자동화: 일반적으로 필요한 플랫폼 구성 요소 표준화 및 자동화

CCOE의 증빙은 CCOE에 대한 문서화된 헌장, 조직 구조 및 운영 프로세스와 AWS 파트너의 비즈니스 전반에 걸쳐 어떻게 참여하는지에 대한 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of documented charter, organization structure, and operational process for the CCOE.',
    evidenceRequiredKo: '증빙은 CCOE에 대한 문서화된 헌장, 조직 구조 및 운영 프로세스 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PEO-003',
    category: 'People',
    categoryKo: '인력',
    title: 'Personnel Offboarding',
    titleKo: '인력 오프보딩',
    description: `Personnel Offboarding
Mandatory

AWS Partner has defined termination processes and checklists for off-boarding of personnel relevant to the AWS Partner's AWS managed service practice in order to ensure all access to customer and Partner systems and data is revoked.

Evidence must be in the form of completed off-boarding records scoped to the AWS Partner's AWS managed service practice; examples must include termination of personnel access to AWS Partner and customer systems. Records may also be in the form of current industry certification related to information security (e.g., ISO 27001, SOC2) that are scoped to include the AWS Partner's AWS MSP practice.`,
    descriptionKo: `인력 오프보딩
필수

AWS 파트너는 고객 및 파트너 시스템과 데이터에 대한 모든 액세스가 취소되도록 하기 위해 AWS 파트너의 AWS 관리 서비스 실무와 관련된 인력의 오프보딩을 위한 정의된 종료 프로세스와 체크리스트를 보유해야 합니다.

증빙은 AWS 파트너의 AWS 관리 서비스 실무에 범위가 지정된 완료된 오프보딩 기록 형태여야 합니다. 예시에는 AWS 파트너 및 고객 시스템에 대한 인력 액세스 종료가 포함되어야 합니다. 기록은 AWS 파트너의 AWS MSP 실무를 포함하도록 범위가 지정된 정보 보안 관련 현재 업계 인증(예: ISO 27001, SOC2) 형태일 수도 있습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of completed off-boarding records including termination of access, or industry certification (ISO 27001, SOC2).',
    evidenceRequiredKo: '증빙은 액세스 종료를 포함한 완료된 오프보딩 기록 또는 업계 인증(ISO 27001, SOC2) 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },

  // Governance (6 items)
  {
    id: 'GOV-001',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Risk and Mitigation Plans',
    titleKo: '위험 및 완화 계획',
    description: `Risk and Mitigation Plans
Mandatory

Areas of business risk including the AWS practice are outlined with documented mitigation plans. This may include financial risks, age and maturity of business, planning for rapid growth, assumption or loss of large deals/customers, etc.

Evidence must be in the form of documented risk analysis and mitigation plan(s) relevant to the AWS Partner's AWS managed service practice. This should detail how the partner manages the full life-cycle of the risk management documentation, from initial assessment through ongoing monitoring and updates.`,
    descriptionKo: `위험 및 완화 계획
필수

AWS 실무를 포함한 비즈니스 위험 영역이 문서화된 완화 계획과 함께 개략적으로 설명됩니다. 여기에는 재정적 위험, 비즈니스의 연령 및 성숙도, 급속한 성장 계획, 대규모 거래/고객의 가정 또는 손실 등이 포함될 수 있습니다.

증빙은 AWS 파트너의 AWS 관리 서비스 실무와 관련된 문서화된 위험 분석 및 완화 계획 형태여야 합니다. 이는 파트너가 초기 평가부터 지속적인 모니터링 및 업데이트까지 위험 관리 문서의 전체 생명주기를 어떻게 관리하는지 자세히 설명해야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of documented risk analysis and mitigation plan(s) with full life-cycle management details.',
    evidenceRequiredKo: '증빙은 전체 생명주기 관리 세부사항이 포함된 문서화된 위험 분석 및 완화 계획 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOV-002',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Customer Satisfaction',
    titleKo: '고객 만족도',
    description: `Customer Satisfaction
Mandatory

AWS Partner has a mechanism to objectively capture customer satisfaction data. This is done via formal survey process, contact-based surveys after a customer interaction, or as part of customer review meetings.

Evidence must be in the form of a demonstration of how feedback is collected and concerns are addressed, if any. AWS owned and operated Customer Satisfaction (CSAT) data collected through Partner Central will not be accepted.`,
    descriptionKo: `고객 만족도
필수

AWS 파트너는 고객 만족도 데이터를 객관적으로 수집하는 메커니즘을 보유해야 합니다. 이는 공식적인 설문 조사 프로세스, 고객 상호작용 후 연락 기반 설문 조사 또는 고객 검토 회의의 일부를 통해 수행됩니다.

증빙은 피드백이 수집되고 우려사항이 해결되는 방법에 대한 시연 형태여야 합니다(있는 경우). Partner Central을 통해 수집된 AWS 소유 및 운영 고객 만족도(CSAT) 데이터는 허용되지 않습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a demonstration of how feedback is collected and concerns are addressed.',
    evidenceRequiredKo: '증빙은 피드백이 수집되고 우려사항이 해결되는 방법에 대한 시연 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOV-003',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Data Ownership and Customer Offboarding',
    titleKo: '데이터 소유권 및 고객 오프보딩',
    description: `Data Ownership and Customer Offboarding
Mandatory

Customer contracts define the specific legal ownership of data, including arrangements for handling of customer data upon termination of the contract by either party, including:
• Time commitment as to when data/account is handed to customer
• Format and method for transfer of data/account credentials
• If applicable, the process for removal of non-customer IAM accounts, groups, roles, and federation
• A defined procedure for offboarding customer AWS accounts from the Partner's managed services

Evidence must be in the form of a contract template scoped to the AWS Partner's AWS managed service practice addressing the above requirements.`,
    descriptionKo: `데이터 소유권 및 고객 오프보딩
필수

고객 계약은 다음을 포함하여 어느 당사자든 계약 종료 시 고객 데이터 처리 방안을 포함한 데이터의 구체적인 법적 소유권을 정의합니다:
• 데이터/계정이 고객에게 인계되는 시기에 대한 시간 약속
• 데이터/계정 자격 증명 전송을 위한 형식 및 방법
• 해당하는 경우, 비고객 IAM 계정, 그룹, 역할 및 페더레이션 제거 프로세스
• 파트너의 관리 서비스에서 고객 AWS 계정을 오프보딩하기 위한 정의된 절차

증빙은 위의 요구사항을 다루는 AWS 파트너의 AWS 관리 서비스 실무에 범위가 지정된 계약 템플릿 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a contract template addressing data ownership and offboarding procedures.',
    evidenceRequiredKo: '증빙은 데이터 소유권 및 오프보딩 절차를 다루는 계약 템플릿 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOV-004',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Operational Readiness',
    titleKo: '운영 준비성',
    description: `Operational Readiness
Mandatory

AWS Partner has an Operational Readiness process in form of checklist/process description document detailing how the operations team will support customer environments post go live.

Evidence must be in the form of documented processes including checklists to determine operational readiness with respect to personnel, tools, and operational processes.`,
    descriptionKo: `운영 준비성
필수

AWS 파트너는 운영팀이 서비스 개시 후 고객 환경을 어떻게 지원할지 자세히 설명하는 체크리스트/프로세스 설명 문서 형태의 운영 준비성 프로세스를 보유하고 있습니다.

증빙은 인력, 도구 및 운영 프로세스와 관련하여 운영 준비성을 결정하는 체크리스트를 포함한 문서화된 프로세스 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of documented processes including checklists for operational readiness.',
    evidenceRequiredKo: '증빙은 운영 준비성을 위한 체크리스트를 포함한 문서화된 프로세스 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOV-005',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Shared Responsibility Model',
    titleKo: '공동 책임 모델',
    description: `Shared Responsibility Model
Mandatory

AWS Partner defines security requirements and operational expectations from the customers related to the AWS environments managed by the Partner, and formalize those in terms of roles and responsibilities matrix (RACI) between the Partner and their Customer.

Evidence must be in the form of onboarding documentation provided to customers.`,
    descriptionKo: `공동 책임 모델
필수

AWS 파트너는 파트너가 관리하는 AWS 환경과 관련하여 고객의 보안 요구사항 및 운영 기대사항을 정의하고, 파트너와 고객 간의 역할 및 책임 매트릭스(RACI) 관점에서 이를 공식화합니다.

증빙은 고객에게 제공되는 온보딩 문서 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of onboarding documentation with RACI matrix.',
    evidenceRequiredKo: '증빙은 RACI 매트릭스가 포함된 온보딩 문서 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOV-006',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Sustainability Best Practices',
    titleKo: '지속가능성 모범 사례',
    description: `Sustainability Best Practices
Mandatory

AWS Partner takes steps towards optimizing workload placement, architecture for user, software, data, hardware and deployment patterns to increase energy efficiency.

Evidence must be in the form of explanation and any examples where improvements were identified, proposed and/or implemented within the last 12 months scoped to the AWS Partner's AWS managed service practice.`,
    descriptionKo: `지속가능성 모범 사례
필수

AWS 파트너는 에너지 효율성을 높이기 위해 워크로드 배치, 사용자, 소프트웨어, 데이터, 하드웨어 및 배포 패턴에 대한 아키텍처를 최적화하는 단계를 수행합니다.

증빙은 AWS 파트너의 AWS 관리 서비스 실무에 범위가 지정된 지난 12개월 내에 개선사항이 식별, 제안 및/또는 구현된 설명 및 예시 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of explanation and examples of improvements within the last 12 months.',
    evidenceRequiredKo: '증빙은 지난 12개월 내의 개선사항에 대한 설명 및 예시 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },

  // Platform (5 items)
  {
    id: 'PLAT-001',
    category: 'Platform',
    categoryKo: '플랫폼',
    title: 'Account Management',
    titleKo: '계정 관리',
    description: `Account Management
Mandatory

AWS accounts are not shared across multiple customers. This does not apply in cases where the AWS Partner operates a multi-tenant software product they own in a software as a service (SaaS) model.

Evidence must be in the form of a documented policy that describes how customer environment isolation is maintained including procedures for creating new AWS accounts or assuming management of existing customer accounts.`,
    descriptionKo: `계정 관리
필수

AWS 계정은 여러 고객 간에 공유되지 않습니다. 이는 AWS 파트너가 SaaS(Software as a Service) 모델에서 자체 소유한 멀티 테넌트 소프트웨어 제품을 운영하는 경우에는 적용되지 않습니다.

증빙은 새로운 AWS 계정 생성 또는 기존 고객 계정의 관리 인수 절차를 포함하여 고객 환경 격리가 어떻게 유지되는지를 설명하는 문서화된 정책 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a documented policy for customer environment isolation.',
    evidenceRequiredKo: '증빙은 고객 환경 격리를 위한 문서화된 정책 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PLAT-002',
    category: 'Platform',
    categoryKo: '플랫폼',
    title: 'Solution Capabilities',
    titleKo: '솔루션 역량',
    description: `Solution Capabilities
Mandatory

The AWS Partner delivers a detailed design document to customers for major engagements. This document must be reviewed and approved by an AWS expert who holds a current AWS Solutions Architect certification.

Evidence must be in the form of implemented system detailed design documents produced within the last 18 months for 2 independent and unrelated customers. Each document must contain:
1. Documentation of customer requirements
2. Architectural details of the proposed design`,
    descriptionKo: `솔루션 역량
필수

AWS 파트너는 주요 프로젝트에 대해 고객에게 상세한 설계 문서를 제공합니다. 이 문서는 현재 AWS Solutions Architect 인증을 보유한 AWS 전문가가 검토하고 승인해야 합니다.

증빙은 지난 18개월 내에 2개의 독립적이고 관련 없는 고객을 위해 작성된 구현된 시스템 상세 설계 문서 형태여야 합니다. 각 문서에는 다음이 포함되어야 합니다:
1. 고객 요구사항 문서화
2. 제안된 설계의 아키텍처 세부사항`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of 2 detailed design documents from last 18 months with requirements and architecture.',
    evidenceRequiredKo: '증빙은 지난 18개월간 요구사항과 아키텍처가 포함된 2개의 상세 설계 문서 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PLAT-003',
    category: 'Platform',
    categoryKo: '플랫폼',
    title: 'Non-Functional Requirement',
    titleKo: '비기능적 요구사항',
    description: `Non-Functional Requirement
Mandatory

The AWS Partner delivers a detailed design document to customers for major engagements that includes the approach to fulfill the non-functional requirements including:
• Definition of system requirements or goals for performance, capacity, and availability
• Service level agreements (SLAs) if applicable
• Tools and approaches used to monitor these aspects
• Overview of the test or verification process

Evidence must be in the form of implemented system detailed design documents produced within the last 18 months for 2 independent customers with non-functional requirements.`,
    descriptionKo: `비기능적 요구사항
필수

AWS 파트너는 주요 프로젝트에 대해 다음을 포함한 비기능적 요구사항을 충족하는 접근 방식이 포함된 상세한 설계 문서를 고객에게 제공합니다:
• 성능, 용량 및 가용성에 대한 시스템 요구사항 또는 목표 정의
• 해당하는 경우 서비스 수준 계약(SLA)
• 이러한 측면을 모니터링하는 데 사용되는 도구 및 접근 방식
• 테스트 또는 검증 프로세스 개요

증빙은 지난 18개월 내에 비기능적 요구사항이 포함된 2개의 독립적인 고객을 위해 작성된 구현된 시스템 상세 설계 문서 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of 2 detailed design documents with non-functional requirements from last 18 months.',
    evidenceRequiredKo: '증빙은 지난 18개월간 비기능적 요구사항이 포함된 2개의 상세 설계 문서 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PLAT-004',
    category: 'Platform',
    categoryKo: '플랫폼',
    title: 'Well-Architected',
    titleKo: 'Well-Architected',
    description: `Well-Architected
Mandatory

Detailed design that shows customer infrastructure is well-architected as per AWS Well-Architected Framework as outlined in https://aws.amazon.com/architecture/well-architected/.

Evidence must be in the form of implemented system detailed design documents produced within the last 18 months for 2 independent customers. Alternatively, if you have completed an AWS Well-Architected Framework Review (WAFR) for the customer which shows zero outstanding high-risk issues (HRIs) in Security, Operational Excellence, and Reliability pillars, you can present an exported WAFR report instead.`,
    descriptionKo: `Well-Architected
필수

https://aws.amazon.com/architecture/well-architected/에 요약된 AWS Well-Architected Framework에 따라 고객 인프라가 잘 아키텍처되었음을 보여주는 세부 설계.

증빙은 지난 18개월 내에 2개의 독립적인 고객을 위해 작성된 구현된 시스템 상세 설계 문서 형태여야 합니다. 또는 보안, 운영 우수성 및 안정성 기둥에서 미해결 고위험 이슈(HRI)가 0개인 고객을 위한 AWS Well-Architected Framework Review(WAFR)를 완료한 경우 대신 내보낸 WAFR 보고서를 제시할 수 있습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be 2 detailed design documents or WAFR reports with zero HRIs in Security, Ops Excellence, and Reliability.',
    evidenceRequiredKo: '증빙은 보안, 운영 우수성, 안정성에서 HRI가 0개인 2개의 상세 설계 문서 또는 WAFR 보고서여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PLAT-005',
    category: 'Platform',
    categoryKo: '플랫폼',
    title: 'AWS Service Expertise',
    titleKo: 'AWS 서비스 전문성',
    description: `AWS Service Expertise
Mandatory

AWS Partners who currently hold three or more AWS Competency or AWS Service Delivery designations are exempt from this requirement.

AWS Partner has demonstrated expertise in leveraging the breadth of AWS services to improve or implement solutions for customers.

Evidence must be in the form of two example customer workloads designed or rearchitected by the AWS Partner which each make significant utilization of at least four AWS services not including: EC2, VPC, RDS, S3, EBS, IAM, CloudWatch, CloudTrail, CloudFormation.`,
    descriptionKo: `AWS 서비스 전문성
필수

현재 3개 이상의 AWS Competency 또는 AWS Service Delivery 지정을 보유한 AWS 파트너는 이 요구사항에서 면제됩니다.

AWS 파트너는 고객을 위한 솔루션을 개선하거나 구현하기 위해 AWS 서비스의 폭넓은 활용에 대한 전문성을 입증했습니다.

증빙은 AWS 파트너가 설계하거나 재설계한 2개의 고객 워크로드 예시 형태여야 하며, 각각은 EC2, VPC, RDS, S3, EBS, IAM, CloudWatch, CloudTrail, CloudFormation을 제외한 최소 4개의 AWS 서비스를 상당히 활용해야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be 2 customer workloads using ≥4 AWS services (excluding common services). Exempt if holding 3+ Competencies.',
    evidenceRequiredKo: '증빙은 4개 이상의 AWS 서비스를 사용하는 2개의 고객 워크로드여야 합니다(일반 서비스 제외). 3개 이상의 Competency 보유 시 면제.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },

  // Security (10 items)
  {
    id: 'SEC-001',
    category: 'Security',
    categoryKo: '보안',
    title: 'Security Policies and Procedures',
    titleKo: '보안 정책 및 절차',
    description: `Security Policies and Procedures
Mandatory

AWS Partner has established security policies and procedures to protect its own systems from attacks and these policies have been reviewed and approved by AWS Partner's internal management.

Evidence of security policies and procedures may be in the form of current industry certification related to information security (e.g., ISO 27001, SOC2) scoped to the Partner's MSP practice or proof of infrastructure security and information security management processes.`,
    descriptionKo: `보안 정책 및 절차
필수

AWS 파트너는 자체 시스템을 공격으로부터 보호하기 위한 보안 정책과 절차를 수립했으며, 이러한 정책은 AWS 파트너의 내부 관리진에 의해 검토되고 승인되었습니다.

보안 정책 및 절차의 증빙은 파트너의 MSP 실무에 범위가 지정된 정보 보안 관련 현재 업계 인증(예: ISO 27001, SOC2) 또는 인프라 보안 및 정보 보안 관리 프로세스의 증명 형태일 수 있습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence may be industry certification (ISO 27001, SOC2) or proof of security management processes.',
    evidenceRequiredKo: '증빙은 업계 인증(ISO 27001, SOC2) 또는 보안 관리 프로세스의 증명일 수 있습니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-002',
    category: 'Security',
    categoryKo: '보안',
    title: 'Security Awareness Training and testing',
    titleKo: '보안 인식 교육 및 테스트',
    description: `Security Awareness Training and testing
Mandatory

AWS Partner's MSP Practice employees complete annual security awareness training.

AWS Partners may use https://learnsecurity.amazon.com/ or another similar training program.

Evidence must be in the form of training completion record for current employees of the Partner's MSP business.`,
    descriptionKo: `보안 인식 교육 및 테스트
필수

AWS 파트너의 MSP 실무 직원은 연간 보안 인식 교육을 완료합니다.

AWS 파트너는 https://learnsecurity.amazon.com/ 또는 유사한 다른 교육 프로그램을 사용할 수 있습니다.

증빙은 파트너의 MSP 비즈니스 현재 직원에 대한 교육 완료 기록 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of training completion record for current employees.',
    evidenceRequiredKo: '증빙은 현재 직원에 대한 교육 완료 기록 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-003',
    category: 'Security',
    categoryKo: '보안',
    title: 'AWS Account Configuration',
    titleKo: 'AWS 계정 구성',
    description: `AWS Account Configuration
Mandatory

AWS Partner defines a standard set of security controls implemented for all managed customer environments. This standard at a minimum includes all items defined in Appendix A: Minimum AWS Account Security Configuration.

Evidence must be in the form of security dashboards showing the security configuration status across all AWS accounts in at least one AWS Organization managed by the AWS Partner. All high or critical severity findings must be accompanied with documentation on how the risk is being mitigated and/or timelines for remediation.`,
    descriptionKo: `AWS 계정 구성
필수

AWS 파트너는 모든 관리 고객 환경에 구현된 표준 보안 제어 세트를 정의합니다. 이 표준은 최소한 부록 A: 최소 AWS 계정 보안 구성에 정의된 모든 항목을 포함합니다.

증빙은 AWS 파트너가 관리하는 최소 하나의 AWS Organization에서 모든 AWS 계정의 보안 구성 상태를 보여주는 보안 대시보드 형태여야 합니다. 모든 높음 또는 중요 심각도 발견사항은 위험이 어떻게 완화되고 있는지 및/또는 수정 일정에 대한 문서와 함께 제공되어야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be security dashboards with configuration status and mitigation plans for high/critical findings.',
    evidenceRequiredKo: '증빙은 구성 상태와 높음/중요 발견사항에 대한 완화 계획이 포함된 보안 대시보드여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-004',
    category: 'Security',
    categoryKo: '보안',
    title: 'Identity and Access Management',
    titleKo: '신원 및 액세스 관리',
    description: `Identity and Access Management
Mandatory

AWS Partner uses a centralized identity provider for managing access to all AWS accounts and other systems containing customer data.

Evidence must be in the form of a demonstration of the authentication process for accessing customer accounts and other systems.`,
    descriptionKo: `신원 및 액세스 관리
필수

AWS 파트너는 모든 AWS 계정과 고객 데이터가 포함된 기타 시스템에 대한 액세스를 관리하기 위해 중앙 집중식 신원 공급자를 사용합니다.

증빙은 고객 계정 및 기타 시스템에 액세스하기 위한 인증 프로세스의 시연 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a demonstration of the authentication process.',
    evidenceRequiredKo: '증빙은 인증 프로세스의 시연 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-005',
    category: 'Security',
    categoryKo: '보안',
    title: 'Policy Management',
    titleKo: '정책 관리',
    description: `Policy Management
Mandatory

AWS Partner has established a mechanism to evaluate and restrict permissions. This includes baselining the group and role membership of identities and evaluating the specific permissions granted. This must specifically include reviews of AWS IAM policies using IAM Access Analyzer or similar tools.

Evidence must be in the form of such reviews being performed (more than once during the last 12 months) and the outcomes thereof.`,
    descriptionKo: `정책 관리
필수

AWS 파트너는 권한을 평가하고 제한하는 메커니즘을 수립했습니다. 여기에는 신원의 그룹 및 역할 멤버십을 기준선으로 설정하고 부여된 특정 권한을 평가하는 것이 포함됩니다. 여기에는 IAM Access Analyzer 또는 유사한 도구를 사용한 AWS IAM 정책 검토가 특별히 포함되어야 합니다.

증빙은 이러한 검토가 수행된 것(지난 12개월 동안 한 번 이상)과 그 결과의 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be reviews performed more than once in last 12 months using IAM Access Analyzer or similar.',
    evidenceRequiredKo: '증빙은 IAM Access Analyzer 또는 유사한 도구를 사용하여 지난 12개월 동안 한 번 이상 수행된 검토여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-006',
    category: 'Security',
    categoryKo: '보안',
    title: 'Role-Based Access',
    titleKo: '역할 기반 액세스',
    description: `Role-Based Access
Mandatory

AWS Partners ensures that all access to AWS accounts by human or machine identities owned by the Partner uses temporary credentials. Cases where specific AWS services require static credentials are allowed as long as policies are limited to the service in question.

Evidence must be in the form of a demonstration of IAM roles with permissions based on functional roles and follows the principle of least privilege.`,
    descriptionKo: `역할 기반 액세스
필수

AWS 파트너는 파트너가 소유한 인간 또는 기계 신원에 의한 AWS 계정에 대한 모든 액세스가 임시 자격 증명을 사용하도록 보장합니다. 특정 AWS 서비스가 정적 자격 증명을 요구하는 경우는 정책이 해당 서비스로 제한되는 한 허용됩니다.

증빙은 기능적 역할에 기반한 권한을 가진 IAM 역할의 시연 형태여야 하며 최소 권한 원칙을 따라야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be demonstration of IAM roles following least privilege principle.',
    evidenceRequiredKo: '증빙은 최소 권한 원칙을 따르는 IAM 역할의 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-007',
    category: 'Security',
    categoryKo: '보안',
    title: 'Multi-Factor Authentication',
    titleKo: '다중 인증',
    description: `Multi-Factor Authentication
Mandatory

All access to AWS accounts by human identities from the AWS Partner requires multi-factor authentication (MFA).

Evidence must be in the form of a demonstration of the mechanism used to enforce MFA within the identity provider used for AWS access.`,
    descriptionKo: `다중 인증
필수

AWS 파트너의 인간 신원에 의한 AWS 계정에 대한 모든 액세스는 다중 인증(MFA)을 요구합니다.

증빙은 AWS 액세스에 사용되는 신원 공급자 내에서 MFA를 강제하는 데 사용되는 메커니즘의 시연 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be demonstration of MFA enforcement mechanism.',
    evidenceRequiredKo: '증빙은 MFA 강제 메커니즘의 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-008',
    category: 'Security',
    categoryKo: '보안',
    title: 'Vulnerability Management',
    titleKo: '취약점 관리',
    description: `Vulnerability Management
Mandatory

AWS Partner provides vulnerability scanning functionality that allows them to evaluate the security and compliance of the AWS infrastructure.

Evidence must be in the form of a demonstration of the technical solution that is used to solve this requirement.`,
    descriptionKo: `취약점 관리
필수

AWS 파트너는 AWS 인프라의 보안 및 규정 준수를 평가할 수 있는 취약점 스캔 기능을 제공합니다.

증빙은 이 요구사항을 해결하는 데 사용되는 기술 솔루션의 시연 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be demonstration of vulnerability scanning solution.',
    evidenceRequiredKo: '증빙은 취약점 스캔 솔루션의 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-009',
    category: 'Security',
    categoryKo: '보안',
    title: 'Security Event Logging',
    titleKo: '보안 이벤트 로깅',
    description: `Security Event Logging
Mandatory

AWS Partner 1/ defines security event logging requirements with customers including retention periods and 2/ captures required security events logging, and 3/ implements controls to ensure retention periods are honored.

Evidence must be in the form of a customer example demonstrating 1/ agreed upon requirements, 2/ how logs are captured and 3/ retained for the agreed upon periods.`,
    descriptionKo: `보안 이벤트 로깅
필수

AWS 파트너는 1/ 보존 기간을 포함하여 고객과 보안 이벤트 로깅 요구사항을 정의하고 2/ 필요한 보안 이벤트 로깅을 캡처하며 3/ 보존 기간이 준수되도록 하는 제어를 구현합니다.

증빙은 1/ 합의된 요구사항, 2/ 로그가 캡처되는 방법, 3/ 합의된 기간 동안 보존되는 방법을 보여주는 고객 예시 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be customer example showing requirements, log capture, and retention implementation.',
    evidenceRequiredKo: '증빙은 요구사항, 로그 캡처 및 보존 구현을 보여주는 고객 예시여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SEC-010',
    category: 'Security',
    categoryKo: '보안',
    title: 'SaaS Tooling Account Access',
    titleKo: 'SaaS 도구 계정 액세스',
    description: `SaaS Tooling Account Access
Mandatory

Any third party SaaS tool or any tools administered by the AWS Partner that require access to customer AWS accounts must use IAM Roles with external IDs to provide cross-account access.

Evidence must be in the form of a list of SaaS tools with access to customer AWS accounts and example IAM role trust policies that require external ID.`,
    descriptionKo: `SaaS 도구 계정 액세스
필수

고객 AWS 계정에 액세스해야 하는 모든 제3자 SaaS 도구 또는 AWS 파트너가 관리하는 모든 도구는 교차 계정 액세스를 제공하기 위해 외부 ID가 있는 IAM 역할을 사용해야 합니다.

증빙은 고객 AWS 계정에 액세스할 수 있는 SaaS 도구 목록과 외부 ID를 요구하는 IAM 역할 신뢰 정책 예시 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be list of SaaS tools and example IAM role trust policies with external IDs.',
    evidenceRequiredKo: '증빙은 SaaS 도구 목록과 외부 ID가 있는 IAM 역할 신뢰 정책 예시여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },

  // Operations (18 items)
  {
    id: 'OPS-001',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Service Level Management',
    titleKo: '서비스 수준 관리',
    description: `Service Level Management
Mandatory

AWS Partners defines SLAs related to the service offerings they provide to their customers. Examples include incident management, service levels, performance analysis, etc.

SLAs may include response times when customer opens ticket, time from event trigger to remediation, and turnaround time for customer-initiated changes.

Evidence must be in the form of 1/ SLA documentation or report, 2/ its review process with customers scoped to the AWS Partner's AWS managed service practice.`,
    descriptionKo: `서비스 수준 관리
필수

AWS 파트너는 고객에게 제공하는 서비스 제공과 관련된 SLA를 정의합니다. 예시로는 인시던트 관리, 서비스 수준, 성능 분석 등이 있습니다.

SLA에는 고객이 티켓을 열 때의 응답 시간, 이벤트 트리거부터 해결까지의 시간, 고객이 시작한 변경에 대한 처리 시간이 포함될 수 있습니다.

증빙은 1/ SLA 문서 또는 보고서, 2/ AWS 파트너의 AWS 관리 서비스 실무에 범위가 지정된 고객과의 검토 프로세스 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be SLA documentation/report and review process with customers.',
    evidenceRequiredKo: '증빙은 SLA 문서/보고서와 고객과의 검토 프로세스여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-002',
    category: 'Operations',
    categoryKo: '운영',
    title: 'AWS Support Plan for Partner owned Management and Member Account',
    titleKo: '파트너 소유 관리 및 멤버 계정을 위한 AWS 지원 플랜',
    description: `AWS Support Plan for Partner owned Management and Member Account
Mandatory

AWS Partner has enrolled all AWS Organizations management accounts (aka payer accounts) and member accounts with production workloads in a Business, Enterprise or PLS (Partner-Led) Support subscription.

Evidence must be in the form of a list of AWS Organizations managed by AWS Partner and each organization's management and member account's support level.`,
    descriptionKo: `파트너 소유 관리 및 멤버 계정을 위한 AWS 지원 플랜
필수

AWS 파트너는 모든 AWS Organizations 관리 계정(일명 지불자 계정)과 프로덕션 워크로드가 있는 멤버 계정을 Business, Enterprise 또는 PLS(Partner-Led) 지원 구독에 등록했습니다.

증빙은 AWS 파트너가 관리하는 AWS Organizations 목록과 각 조직의 관리 및 멤버 계정의 지원 수준 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be list of AWS Organizations with management and member account support levels.',
    evidenceRequiredKo: '증빙은 관리 및 멤버 계정 지원 수준이 포함된 AWS Organizations 목록이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-003',
    category: 'Operations',
    categoryKo: '운영',
    title: 'AWS Support Plan for Customer owned Member Account',
    titleKo: '고객 소유 멤버 계정을 위한 AWS 지원 플랜',
    description: `AWS Support Plan for Customer owned Member Account
Mandatory

AWS Partner clearly communicates to customers the value of AWS Premium Support plans and recommends Business or Enterprise support for all customer accounts hosting production workloads.

Evidence must be in the form of a list of managed customer accounts with associated AWS support levels, and communications to customers without AWS Business Support coverage on production accounts.`,
    descriptionKo: `고객 소유 멤버 계정을 위한 AWS 지원 플랜
필수

AWS 파트너는 고객에게 AWS Premium 지원 플랜의 가치를 명확히 전달하고 프로덕션 워크로드를 호스팅하는 모든 고객 계정에 대해 Business 또는 Enterprise 지원을 권장합니다.

증빙은 관련 AWS 지원 수준이 포함된 관리 고객 계정 목록과 프로덕션 계정에서 AWS Business 지원 범위가 없는 고객에 대한 커뮤니케이션 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be list of customer accounts with support levels and communications regarding support.',
    evidenceRequiredKo: '증빙은 지원 수준이 포함된 고객 계정 목록과 지원에 관한 커뮤니케이션이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-004',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Service Desk Operations',
    titleKo: '서비스 데스크 운영',
    description: `Service Desk Operations
Mandatory

AWS Partner provides 24x7 service desk function available over multiple communication means; may be a staffed 24x7 call center or 8x5 service with after-hours support.

Evidence must be in the form of a documented agreement (formal or otherwise) with customer covering this requirement.`,
    descriptionKo: `서비스 데스크 운영
필수

AWS 파트너는 여러 커뮤니케이션 수단을 통해 이용 가능한 24x7 서비스 데스크 기능을 제공합니다. 24x7 직원 배치 콜센터 또는 시간 외 지원이 있는 8x5 서비스일 수 있습니다.

증빙은 이 요구사항을 다루는 고객과의 문서화된 계약(공식적이든 아니든) 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be documented agreement with customer covering 24x7 service desk.',
    evidenceRequiredKo: '증빙은 24x7 서비스 데스크를 다루는 고객과의 문서화된 계약이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-005',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Implement a Comprehensive ITSM platform',
    titleKo: '포괄적인 ITSM 플랫폼 구현',
    description: `Implement a Comprehensive ITSM platform
Mandatory

AWS partner must have a well-designed and integrated ITSM platform. The ITSM platform must provide:
1. Incident and Problem Management
2. Change Management
3. Service Request Management
4. Reporting and Analytics
5. Integration and Automation

AWS partner must demonstrate the implementation and effective use of the ITSM platform covering the above items.`,
    descriptionKo: `포괄적인 ITSM 플랫폼 구현
필수

AWS 파트너는 잘 설계되고 통합된 ITSM 플랫폼을 보유해야 합니다. ITSM 플랫폼은 다음을 제공해야 합니다:
1. 인시던트 및 문제 관리
2. 변경 관리
3. 서비스 요청 관리
4. 보고 및 분석
5. 통합 및 자동화

AWS 파트너는 위의 항목을 다루는 ITSM 플랫폼의 구현과 효과적인 사용을 시연해야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Demonstration of ITSM platform with incident, change, request management, reporting, and automation.',
    evidenceRequiredKo: '인시던트, 변경, 요청 관리, 보고 및 자동화가 포함된 ITSM 플랫폼의 시연.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-006',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Release Management',
    titleKo: '릴리스 관리',
    description: `Release Management
Mandatory

AWS MSP partners should implement comprehensive release management practice including:
1. Version control for code and deployment assets
2. Standard procedures for testing in non-production before production
3. System for managing approvals before production deployment
4. Use of declarative or imperative automated infrastructure deployment tools

Evidence must be customer example demonstrating end-to-end process for validating and managing changes to production.`,
    descriptionKo: `릴리스 관리
필수

AWS MSP 파트너는 다음을 포함한 포괄적인 릴리스 관리 실무를 구현해야 합니다:
1. 코드 및 배포 자산에 대한 버전 제어
2. 프로덕션 전 비프로덕션에서 테스트하기 위한 표준 절차
3. 프로덕션 배포 전 승인 관리 시스템
4. 선언적 또는 명령적 자동화된 인프라 배포 도구 사용

증빙은 프로덕션 변경사항을 검증하고 관리하는 엔드투엔드 프로세스를 보여주는 고객 예시여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be customer example of end-to-end release management process.',
    evidenceRequiredKo: '증빙은 엔드투엔드 릴리스 관리 프로세스의 고객 예시여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-007',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Configuration Management',
    titleKo: '구성 관리',
    description: `Configuration Management
Mandatory

The AWS Partner maintains records of environment configuration changes with system that tracks:
• Resources that were added/removed/updated
• Date and time of the change
• Current status (deployed/rolled back)
• Individual who executed the change
• Approval workflow or alert of change

Evidence must be customer example with demonstration of viewing configuration records and recent approved changes.`,
    descriptionKo: `구성 관리
필수

AWS 파트너는 다음을 추적하는 시스템으로 환경 구성 변경 기록을 유지합니다:
• 추가/제거/업데이트된 리소스
• 변경 날짜 및 시간
• 현재 상태(배포됨/롤백됨)
• 변경을 실행한 개인
• 변경에 대한 승인 워크플로 또는 알림

증빙은 구성 기록 보기 및 최근 승인된 변경사항을 시연하는 고객 예시여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be customer example demonstrating configuration change tracking system.',
    evidenceRequiredKo: '증빙은 구성 변경 추적 시스템을 시연하는 고객 예시여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-008',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Patch Management',
    titleKo: '패치 관리',
    description: `Patch Management
Mandatory

AWS Partner has automated the process of patching customer compute resources for operating systems, applications, and security and compliance related patching.

Evidence must be in the form of a technology demonstration of the patch automation tooling in use and patch status reporting.`,
    descriptionKo: `패치 관리
필수

AWS 파트너는 운영 체제, 애플리케이션, 보안 및 규정 준수 관련 패치에 대한 고객 컴퓨팅 리소스 패치 프로세스를 자동화했습니다.

증빙은 사용 중인 패치 자동화 도구와 패치 상태 보고의 기술 시연 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be demonstration of patch automation tooling and status reporting.',
    evidenceRequiredKo: '증빙은 패치 자동화 도구 및 상태 보고의 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-009',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Customer Deployment Pipelines',
    titleKo: '고객 배포 파이프라인',
    description: `Customer Deployment Pipelines
Mandatory

AWS Partners who hold the AWS DevOps Competency are exempt from this requirement.

AWS Partner supports automated deployments and rollbacks. Customers or partners must be able to deploy new versions without manual involvement. Manual approval steps are acceptable.

Evidence must be demonstration of automated deployment in sandbox, or customer example with deployment logs showing consistent usage.`,
    descriptionKo: `고객 배포 파이프라인
필수

AWS DevOps Competency를 보유한 AWS 파트너는 이 요구사항에서 면제됩니다.

AWS 파트너는 자동화된 배포 및 롤백을 지원합니다. 고객 또는 파트너는 수동 개입 없이 새 버전을 배포할 수 있어야 합니다. 수동 승인 단계는 허용됩니다.

증빙은 샌드박스에서의 자동화된 배포 시연 또는 일관된 사용을 보여주는 배포 로그가 있는 고객 예시여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be demonstration or customer example with deployment history. Exempt if holding DevOps Competency.',
    evidenceRequiredKo: '증빙은 배포 이력이 있는 시연 또는 고객 예시여야 합니다. DevOps Competency 보유 시 면제.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-010',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Event Management and Dynamic Monitoring',
    titleKo: '이벤트 관리 및 동적 모니터링',
    description: `Event Management and Dynamic Monitoring
Mandatory

Define, monitor and analyze customer workload and infrastructure health KPIs:
a. Defining, collecting and analyzing metrics
b. Exporting standard application logs
c. Defining threshold metrics to generate alerts
d. Use tags to organize resources

Evidence must be tool demonstration showing monitoring through metrics, logs, traces, alarms, and real time dashboards.`,
    descriptionKo: `이벤트 관리 및 동적 모니터링
필수

고객 워크로드 및 인프라 상태 KPI를 정의, 모니터링 및 분석:
a. 메트릭 정의, 수집 및 분석
b. 표준 애플리케이션 로그 내보내기
c. 알림을 생성하기 위한 임계값 메트릭 정의
d. 리소스 구성을 위한 태그 사용

증빙은 메트릭, 로그, 추적, 알람 및 실시간 대시보드를 통한 모니터링을 보여주는 도구 시연이어야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be tool demonstration of monitoring with metrics, logs, alarms, and dashboards.',
    evidenceRequiredKo: '증빙은 메트릭, 로그, 알람 및 대시보드를 사용한 모니터링의 도구 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-011',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Operational Runbooks',
    titleKo: '운영 런북',
    description: `Operational Runbooks
Mandatory

AWS Partner has runbooks to perform procedures for responding to specific workload/infrastructure/security alerts.

Evidence must be in the form of runbooks used in day to day operations.`,
    descriptionKo: `운영 런북
필수

AWS 파트너는 특정 워크로드/인프라/보안 알림에 대응하기 위한 절차를 수행하는 런북을 보유하고 있습니다.

증빙은 일상 운영에서 사용되는 런북 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be runbooks used in day to day operations.',
    evidenceRequiredKo: '증빙은 일상 운영에서 사용되는 런북이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-012',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Anomaly Detection',
    titleKo: '이상 탐지',
    description: `Anomaly Detection
Mandatory

AWS Partner implements statistical or machine learning anomaly detection models to generate alerts across a broad range of workload metrics. Anomaly detection is used to reduce false positives and avoid alarm fatigue.

Evidence must be in the form of one customer example that demonstrate anomaly detection implementation.`,
    descriptionKo: `이상 탐지
필수

AWS 파트너는 광범위한 워크로드 메트릭에 걸쳐 알림을 생성하기 위해 통계적 또는 기계 학습 이상 탐지 모델을 구현합니다. 이상 탐지는 거짓 양성을 줄이고 알람 피로를 방지하는 데 사용됩니다.

증빙은 이상 탐지 구현을 보여주는 하나의 고객 예시 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be customer example demonstrating anomaly detection implementation.',
    evidenceRequiredKo: '증빙은 이상 탐지 구현을 보여주는 고객 예시여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-013',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Predictive Monitoring and AIOps',
    titleKo: '예측 모니터링 및 AIOps',
    description: `Predictive Monitoring and AIOps
Recommended

AWS Partner has implemented predictive models that can identify trends in monitoring and logging data and alert or trigger actions before an anomaly or threshold breach is detected.

Evidence must be in the form of one customer example that demonstrate predictive monitoring and AIOps.`,
    descriptionKo: `예측 모니터링 및 AIOps
권장

AWS 파트너는 모니터링 및 로깅 데이터의 추세를 식별하고 이상 또는 임계값 위반이 탐지되기 전에 알림을 보내거나 작업을 트리거할 수 있는 예측 모델을 구현했습니다.

증빙은 예측 모니터링 및 AIOps를 보여주는 하나의 고객 예시 형태여야 합니다.`,
    isMandatory: false,
    evidenceRequired: 'Evidence must be customer example demonstrating predictive monitoring and AIOps.',
    evidenceRequiredKo: '증빙은 예측 모니터링 및 AIOps를 보여주는 고객 예시여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-014',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Knowledge Management',
    titleKo: '지식 관리',
    description: `Knowledge Management
Mandatory

AWS Partner maintains a knowledge management system for organizing information about internal operational processes and customer workload-specific details.

Evidence must be in the form of a demonstration of the knowledge management system.`,
    descriptionKo: `지식 관리
필수

AWS 파트너는 내부 운영 프로세스 및 고객 워크로드별 세부사항에 대한 정보를 구성하기 위한 지식 관리 시스템을 유지합니다.

증빙은 지식 관리 시스템의 시연 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be demonstration of knowledge management system.',
    evidenceRequiredKo: '증빙은 지식 관리 시스템의 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-015',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Disaster Recovery',
    titleKo: '재해 복구',
    description: `Disaster Recovery
Mandatory

AWS Partner implements automated backups for all customer workloads and infrastructure against each workload's predefined recovery time objective (RTO) and recovery point objective (RPO).

Evidence must be example backup jobs and recovery tests for any two AWS services. Recovery tests are evaluated against predefined RTO and RPO.`,
    descriptionKo: `재해 복구
필수

AWS 파트너는 각 워크로드의 사전 정의된 복구 시간 목표(RTO) 및 복구 지점 목표(RPO)에 대해 모든 고객 워크로드 및 인프라에 대한 자동화된 백업을 구현합니다.

증빙은 임의의 두 AWS 서비스에 대한 백업 작업 및 복구 테스트 예시여야 합니다. 복구 테스트는 사전 정의된 RTO 및 RPO에 대해 평가됩니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be backup jobs and recovery tests for 2 AWS services evaluated against RTO/RPO.',
    evidenceRequiredKo: '증빙은 RTO/RPO에 대해 평가된 2개 AWS 서비스의 백업 작업 및 복구 테스트여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-016',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Cloud Financial Management',
    titleKo: '클라우드 재무 관리',
    description: `Cloud Financial Management
Mandatory

The AWS Partner has methodology, process and tooling for:
1. Creation of TCO analysis for customers moving to cloud
2. Strategy/processes to measure and monitor cloud spend
3. Tools to show AWS usage cost based on agreed rates (for resellers)

Evidence must be technology demonstration explaining the capabilities listed above.`,
    descriptionKo: `클라우드 재무 관리
필수

AWS 파트너는 다음에 대한 방법론, 프로세스 및 도구를 보유하고 있습니다:
1. 클라우드로 이전하는 고객을 위한 TCO 분석 생성
2. 클라우드 지출을 측정하고 모니터링하는 전략/프로세스
3. 합의된 요율에 기반한 AWS 사용 비용을 보여주는 도구(리셀러용)

증빙은 위에 나열된 기능을 설명하는 기술 시연이어야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be technology demonstration of TCO, cost monitoring, and usage cost tools.',
    evidenceRequiredKo: '증빙은 TCO, 비용 모니터링 및 사용 비용 도구의 기술 시연이어야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-017',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Migrations',
    titleKo: '마이그레이션',
    description: `Migrations
Mandatory

AWS Partners who currently hold the AWS Migration Competency designation are exempt from this requirement.

AWS Partner has capabilities for migrating or modernizing customer workloads using standard methodology covering:
• Portfolio discovery and migration strategy (7Rs)
• Migration governance with communication and cutover plans
• People and Skills with RACI and training
• Landing zone setup
• Operations with runbooks and monitoring
• Security, Risk and Compliance processes
• Application Migration with pilot/MVP documentation

Evidence must be 2 customer examples with documentation covering above items. At least one must include refactoring or replatforming as described in https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html.`,
    descriptionKo: `마이그레이션
필수

현재 AWS Migration Competency 지정을 보유한 AWS 파트너는 이 요구사항에서 면제됩니다.

AWS 파트너는 다음을 다루는 표준 방법론을 사용하여 고객 워크로드를 마이그레이션하거나 현대화할 수 있는 역량을 보유하고 있습니다:
• 포트폴리오 발견 및 마이그레이션 전략(7Rs)
• 커뮤니케이션 및 전환 계획이 포함된 마이그레이션 거버넌스
• RACI 및 교육이 포함된 인력 및 기술
• 랜딩 존 설정
• 런북 및 모니터링이 포함된 운영
• 보안, 위험 및 규정 준수 프로세스
• 파일럿/MVP 문서가 포함된 애플리케이션 마이그레이션

증빙은 위 항목을 다루는 관련 문서와 함께 2개의 고객 예시 형태여야 합니다. 최소한 하나의 예시에는 https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html에 설명된 대로 리팩토링 또는 리플랫포밍이 포함되어야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be 2 customer examples (1 with refactoring/replatforming). Exempt if holding Migration Competency.',
    evidenceRequiredKo: '증빙은 2개의 고객 예시(1개는 리팩토링/리플랫포밍 포함)여야 합니다. Migration Competency 보유 시 면제.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPS-018',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Artificial Intelligence',
    titleKo: '인공지능',
    description: `Artificial Intelligence
Recommended

Managed services providers are uniquely positioned to bring transformative AI solutions to businesses. Through AI, they refine user experiences while reducing managed services cost and assist customers with Generative AI technologies.

Evidence may include documentation demonstrating use of Generative AI for internal use or customer projects. This may include SOW, Project Plans, Sprint Plans, or other deliverables.`,
    descriptionKo: `인공지능
권장

관리 서비스 제공업체는 비즈니스에 혁신적인 AI 솔루션을 제공할 수 있는 독특한 위치에 있습니다. AI를 통해 관리 서비스 비용을 줄이면서 사용자 경험을 개선하고 고객에게 생성형 AI 기술을 지원합니다.

증빙에는 내부 사용 또는 고객 프로젝트에 대한 생성형 AI 사용을 보여주는 문서가 포함될 수 있습니다. 여기에는 SOW, 프로젝트 계획, 스프린트 계획 또는 기타 결과물이 포함될 수 있습니다.`,
    isMandatory: false,
    evidenceRequired: 'Evidence may include documentation of Generative AI usage (SOW, Project Plans, Sprint Plans, etc.).',
    evidenceRequiredKo: '증빙에는 생성형 AI 사용에 대한 문서(SOW, 프로젝트 계획, 스프린트 계획 등)가 포함될 수 있습니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  }
];

// 카테고리별로 그룹화
export const technicalValidationByCategory = technicalValidationData.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item);
  return acc;
}, {} as Record<string, AssessmentItem[]>);

// 통계
export const technicalValidationStats = {
  total: technicalValidationData.length,
  mandatory: technicalValidationData.filter(item => item.isMandatory).length,
  recommended: technicalValidationData.filter(item => !item.isMandatory).length,
  categories: Object.keys(technicalValidationByCategory).length
};
