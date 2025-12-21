import { AssessmentItem } from '../lib/csv-parser';

// Prerequisites 데이터 (13 items)
export const prerequisitesData: AssessmentItem[] = [
  {
    id: 'BUSP-001',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'Web Presence',
    titleKo: '웹 사이트 존재',
    description: `Web Presence
Mandatory

AWS Partner has a public landing page on their primary website that describes their AWS managed services practice and links to their public case studies. This page must describe the Partner's differentiated expertise in designing, building, and managing workloads on AWS.

Evidence must be in the form of a public URL for their AWS MSP practice landing page.`,
    descriptionKo: `웹 사이트 존재
필수

AWS 파트너는 AWS 관리 서비스 실무를 설명하고 공개 사례 연구에 링크하는 공개 랜딩 페이지를 주요 웹사이트에 보유해야 합니다. 이 페이지는 AWS에서 워크로드를 설계, 구축 및 관리하는 파트너의 차별화된 전문성을 설명해야 합니다.

증빙은 AWS MSP 실무 랜딩 페이지의 공개 URL 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a public URL for their AWS MSP practice landing page.',
    evidenceRequiredKo: '증빙은 AWS MSP 실무 랜딩 페이지의 공개 URL 형태여야 합니다.',
    advice: `🌐 Web Presence Evidence Preparation

✅ Required Elements for Landing Page:
• Clear description of AWS managed services practice
• Links to public case studies (minimum 2)
• Differentiated expertise in AWS workload management
• Professional design and current information

📝 Content Guidelines:
• Highlight specific AWS services expertise
• Include customer success stories
• Show certifications and partnerships
• Provide contact information for MSP services

⚠️ Common Mistakes to Avoid:
• Generic cloud services page without AWS focus
• Broken links to case studies
• Outdated information or certifications
• Missing contact information

🔍 Quality Check:
• Test all links work properly
• Ensure page loads quickly
• Verify mobile responsiveness
• Check for spelling/grammar errors`,
    adviceKo: `🌐 웹 사이트 존재 증빙 준비

✅ 랜딩 페이지 필수 요소:
• AWS 관리 서비스 실무에 대한 명확한 설명
• 공개 사례 연구 링크 (최소 2개)
• AWS 워크로드 관리의 차별화된 전문성
• 전문적인 디자인과 최신 정보

📝 콘텐츠 가이드라인:
• 특정 AWS 서비스 전문성 강조
• 고객 성공 사례 포함
• 인증 및 파트너십 표시
• MSP 서비스 연락처 정보 제공

⚠️ 피해야 할 일반적인 실수:
• AWS 중심이 아닌 일반적인 클라우드 서비스 페이지
• 사례 연구로의 깨진 링크
• 오래된 정보나 인증
• 연락처 정보 누락

🔍 품질 확인:
• 모든 링크가 제대로 작동하는지 테스트
• 페이지 로딩 속도 확인
• 모바일 반응성 검증
• 맞춤법/문법 오류 확인`,
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'BUSP-002',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'Sales and Marketing Accreditations',
    titleKo: '영업 및 마케팅 인증',
    description: `Sales and Marketing Accreditations
Mandatory

AWS Partner sales teams, marketing teams, and/or applicable business units supporting the AWS MSP practice have all completed the AWS Partner: Sales Accreditation (Business) (https://skillbuilder.aws/learn/BP1WX82N37/aws-partner-sales-accreditation-business/8UV4TQWVZ6) or AWS Partner: Accreditation (Technical) (https://skillbuilder.aws/learn/8DDTPJ2RK5/aws-partner-accreditation-technical/AHX1VJYYVV).

Evidence must be in the form of records of the appropriate accreditations. The form of records may be in the form of pdf, spreadsheet, tool screenshot,etc.`,
    descriptionKo: `영업 및 마케팅 인증
필수

AWS MSP 실무를 지원하는 AWS 파트너 영업팀, 마케팅팀 및/또는 해당 사업부는 모두 AWS Partner: Sales Accreditation (Business) (https://skillbuilder.aws/learn/BP1WX82N37/aws-partner-sales-accreditation-business/8UV4TQWVZ6) 또는 AWS Partner: Accreditation (Technical) (https://skillbuilder.aws/learn/8DDTPJ2RK5/aws-partner-accreditation-technical/AHX1VJYYVV)을 완료했습니다.

증빙은 적절한 인증 기록 형태여야 합니다. 기록 형태는 PDF, 스프레드시트, 도구 스크린샷 등이 될 수 있습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of records of the appropriate accreditations. The form of records may be in the form of pdf, spreadsheet, tool screenshot,etc.',
    evidenceRequiredKo: '증빙은 적절한 인증 기록 형태여야 합니다. 기록 형태는 PDF, 스프레드시트, 도구 스크린샷 등이 될 수 있습니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'BUSP-003',
    category: 'Business',
    categoryKo: '비즈니스',
    title: 'Customer Case Studies',
    titleKo: '고객 사례 연구',
    description: `Customer Case Studies
Mandatory

AWS Partner has ≥ 4 AWS Customer Case Studies (as defined in the Definitions section of the Checklist). At least two (2) of the provided case studies must have a publicly available artifacts describing how AWS managed services delivered by the AWS Partner helped solve a customer challenge.

These publicly available artifacts may be in the form of formal customer case studies, white papers, videos, or blog posts etc. and were not used in any previous MSP audits and renewals. The private case studies may be in the form of PDF, Powerpoint, or Word document and were not used in any previous MSP audits and renewals.`,
    descriptionKo: `고객 사례 연구
필수

AWS 파트너는 4개 이상의 AWS 고객 사례 연구를 보유해야 합니다(체크리스트의 정의 섹션에 정의된 대로). 제공된 사례 연구 중 최소 2개는 AWS 파트너가 제공한 AWS 관리 서비스가 고객 과제를 해결하는 데 어떻게 도움이 되었는지 설명하는 공개적으로 이용 가능한 자료를 보유해야 합니다.

이러한 공개적으로 이용 가능한 자료는 공식 고객 사례 연구, 백서, 비디오 또는 블로그 게시물 등의 형태일 수 있으며 이전 MSP 감사 및 갱신에서 사용되지 않았어야 합니다. 비공개 사례 연구는 PDF, PowerPoint 또는 Word 문서 형태일 수 있으며 이전 MSP 감사 및 갱신에서 사용되지 않았어야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of case studies with publicly available artifacts and private case studies not used in previous audits.',
    evidenceRequiredKo: '증빙은 공개적으로 이용 가능한 자료가 있는 사례 연구와 이전 감사에서 사용되지 않은 비공개 사례 연구 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PEOP-001',
    category: 'People',
    categoryKo: '인력',
    title: 'Personnel Skills',
    titleKo: '인력 기술',
    description: `Personnel Skills
Mandatory

AWS Partner has a defined strategy for continuously improving the technical expertise of their staff. This may include formal training and certification and/or other approaches that promote a culture of continuous learning.

Evidence must be in the form of examples of learning events or activities conducted within the past 12 months for their staff supporting the managed services operations.`,
    descriptionKo: `인력 기술
필수

AWS 파트너는 직원의 기술적 전문성을 지속적으로 향상시키기 위한 정의된 전략을 보유해야 합니다. 여기에는 공식 교육 및 인증 및/또는 지속적인 학습 문화를 촉진하는 기타 접근 방식이 포함될 수 있습니다.

증빙은 관리 서비스 운영을 지원하는 직원을 위해 지난 12개월 내에 실시된 학습 이벤트 또는 활동의 예시 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of examples of learning events or activities conducted within the past 12 months for their staff supporting the managed services operations.',
    evidenceRequiredKo: '증빙은 관리 서비스 운영을 지원하는 직원을 위해 지난 12개월 내에 실시된 학습 이벤트 또는 활동의 예시 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOVP-001',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Supplier Management',
    titleKo: '공급업체 관리',
    description: `Supplier Management
Mandatory

AWS Partner has defined processes for selection and evaluation of suppliers (e.g., SaaS vendors or any other third parties to whom activities or services are subcontracted, or any ISV tools procured to deliver managed services).

Evidence must be in the form of a detailed SOP for selecting suppliers. Alternatively, evidence of proper supplier management procedures may also be in the form of current industry certification related to information security (e.g., ISO 27001, SOC2) achieved by the suppliers themselves.`,
    descriptionKo: `공급업체 관리
필수

AWS 파트너는 공급업체 선택 및 평가를 위한 정의된 프로세스를 보유해야 합니다(예: SaaS 공급업체 또는 활동이나 서비스가 하도급되는 기타 제3자, 또는 관리 서비스 제공을 위해 조달된 ISV 도구).

증빙은 공급업체 선택을 위한 상세한 SOP 형태여야 합니다. 또는 적절한 공급업체 관리 절차의 증빙은 공급업체 자체가 달성한 정보 보안 관련 현재 업계 인증(예: ISO 27001, SOC2) 형태일 수도 있습니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a detailed SOP for selecting suppliers or industry certification (ISO 27001, SOC2).',
    evidenceRequiredKo: '증빙은 공급업체 선택을 위한 상세한 SOP 또는 업계 인증(ISO 27001, SOC2) 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOVP-002',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Operations Improvement',
    titleKo: '운영 개선',
    description: `Operations Improvement
Mandatory

AWS Partner has established processes for continuous improvement that includes a regular cadence for reviewing operational processes like incident managment, cloud cost management, architecture pattern, performance, security, etc. and identifying opportunities, and prioritizing efforts.

Evidence must be in the form of governance process documentation focusing on identifying improvement opportunities.`,
    descriptionKo: `운영 개선
필수

AWS 파트너는 인시던트 관리, 클라우드 비용 관리, 아키텍처 패턴, 성능, 보안 등과 같은 운영 프로세스를 정기적으로 검토하고 기회를 식별하며 노력의 우선순위를 정하는 것을 포함하는 지속적인 개선을 위한 프로세스를 수립해야 합니다.

증빙은 개선 기회 식별에 중점을 둔 거버넌스 프로세스 문서 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of governance process documentation focusing on identifying improvement opportunities.',
    evidenceRequiredKo: '증빙은 개선 기회 식별에 중점을 둔 거버넌스 프로세스 문서 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'GOVP-003',
    category: 'Governance',
    categoryKo: '거버넌스',
    title: 'Sustainability Commitment',
    titleKo: '지속가능성 약속',
    description: `Sustainability Commitment
Mandatory

AWS Partner is committed with a sustainability vision as part of their long-term strategy.

Evidence must be in the form of a policy documentation / communication with a leadership commitment from a CxO office.`,
    descriptionKo: `지속가능성 약속
필수

AWS 파트너는 장기 전략의 일부로 지속가능성 비전에 대한 약속을 가져야 합니다.

증빙은 CxO 사무실의 리더십 약속이 포함된 정책 문서/커뮤니케이션 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a policy documentation / communication with a leadership commitment from a CxO office.',
    evidenceRequiredKo: '증빙은 CxO 사무실의 리더십 약속이 포함된 정책 문서/커뮤니케이션 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'PLATP-001',
    category: 'Platform',
    categoryKo: '플랫폼',
    title: 'Expert Design Review',
    titleKo: '전문가 설계 검토',
    description: `Expert Design Review
Mandatory

The AWS Partner has a documented policy requiring an AWS Solutions Architect – Associate or Professional certified individual to review the design and implementation of all customer AWS projects. The policy must also include specific guidance for when reviews should be conducted by individuals with Professional or Specialty level certifications.

Evidence must be in the form of a documented policy and a customer project document which shows that the document has been reviewed and approved by the individuals with Professional or Specialty level certifications.`,
    descriptionKo: `전문가 설계 검토
필수

AWS 파트너는 모든 고객 AWS 프로젝트의 설계 및 구현을 AWS Solutions Architect – Associate 또는 Professional 인증을 받은 개인이 검토하도록 요구하는 문서화된 정책을 보유해야 합니다. 정책에는 Professional 또는 Specialty 수준 인증을 받은 개인이 검토를 수행해야 하는 경우에 대한 구체적인 지침도 포함되어야 합니다.

증빙은 문서화된 정책과 Professional 또는 Specialty 수준 인증을 받은 개인이 검토하고 승인했음을 보여주는 고객 프로젝트 문서 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a documented policy and a customer project document reviewed by certified individuals.',
    evidenceRequiredKo: '증빙은 문서화된 정책과 인증받은 개인이 검토한 고객 프로젝트 문서 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SECP-001',
    category: 'Security',
    categoryKo: '보안',
    title: 'Access Key Exposure Detection',
    titleKo: '액세스 키 노출 탐지',
    description: `Access Key Exposure Detection
Mandatory

AWS Partner must implement an automated mechanism for handling all AWS Health events with service type "RISK" in all managed customer accounts. At a minimum, an automated system must be in place to create new tickets in an ITSM or security ticketing system at the highest severity when exposed access key notifications are received. See Learn to Detect & Mitigate Account Compromise Issues (https://partnercentral.awspartner.com/apex/WebcastMain?Id=a1G0h00000CXSz3EAH) for an example solution.

Additionally, the Partner must have a documented procedure for handling exposed credential notifications that includes deleting or rotating the exposed credentials.

Evidence must be in the form of a documented response procedure on how to handle exposed key.`,
    descriptionKo: `액세스 키 노출 탐지
필수

AWS 파트너는 모든 관리 고객 계정에서 서비스 유형이 "RISK"인 모든 AWS Health 이벤트를 처리하는 자동화된 메커니즘을 구현해야 합니다. 최소한 노출된 액세스 키 알림을 받을 때 ITSM 또는 보안 티켓팅 시스템에서 최고 심각도로 새 티켓을 생성하는 자동화된 시스템이 있어야 합니다. 예제 솔루션은 Learn to Detect & Mitigate Account Compromise Issues (https://partnercentral.awspartner.com/apex/WebcastMain?Id=a1G0h00000CXSz3EAH)를 참조하십시오.

또한 파트너는 노출된 자격 증명을 삭제하거나 교체하는 것을 포함하여 노출된 자격 증명 알림을 처리하는 문서화된 절차를 보유해야 합니다.

증빙은 노출된 키를 처리하는 방법에 대한 문서화된 대응 절차 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a documented response procedure on how to handle exposed key.',
    evidenceRequiredKo: '증빙은 노출된 키를 처리하는 방법에 대한 문서화된 대응 절차 형태여야 합니다.',
    advice: `🔐 Access Key Exposure Detection Evidence

✅ Required Documentation:
• Automated AWS Health event monitoring setup
• ITSM/Security ticketing system integration
• Step-by-step response procedure document
• Credential rotation/deletion process

🛠️ Technical Implementation:
• AWS Health API integration or EventBridge rules
• Automated ticket creation with highest severity
• Real-time alerting mechanism
• Audit trail for all actions taken

📋 Response Procedure Must Include:
1. Immediate key deactivation steps
2. Impact assessment process
3. Customer notification procedure
4. Key rotation/replacement steps
5. Post-incident review process

⚠️ Critical Points:
• Response time should be < 15 minutes
• All actions must be logged and auditable
• Customer communication templates ready
• Regular testing of the automated system

🔍 Evidence Quality Check:
• Include screenshots of monitoring setup
• Show sample tickets created automatically
• Demonstrate end-to-end process flow
• Provide evidence of regular testing`,
    adviceKo: `🔐 액세스 키 노출 탐지 증빙

✅ 필수 문서:
• 자동화된 AWS Health 이벤트 모니터링 설정
• ITSM/보안 티켓팅 시스템 통합
• 단계별 대응 절차 문서
• 자격 증명 교체/삭제 프로세스

🛠️ 기술적 구현:
• AWS Health API 통합 또는 EventBridge 규칙
• 최고 심각도로 자동 티켓 생성
• 실시간 알림 메커니즘
• 모든 조치에 대한 감사 추적

📋 대응 절차 포함 사항:
1. 즉시 키 비활성화 단계
2. 영향 평가 프로세스
3. 고객 알림 절차
4. 키 교체/대체 단계
5. 사후 인시던트 검토 프로세스

⚠️ 중요 포인트:
• 응답 시간은 15분 미만이어야 함
• 모든 조치는 기록되고 감사 가능해야 함
• 고객 커뮤니케이션 템플릿 준비
• 자동화된 시스템의 정기적 테스트

🔍 증빙 품질 확인:
• 모니터링 설정 스크린샷 포함
• 자동 생성된 샘플 티켓 표시
• 엔드투엔드 프로세스 플로우 시연
• 정기적 테스트 증거 제공`,
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'SECP-002',
    category: 'Security',
    categoryKo: '보안',
    title: 'Public Resources',
    titleKo: '공개 리소스',
    description: `Public Resources
Mandatory

AWS Partner has tooling and processes to prevent and/or detect configurations that make customer resources unintentionally or unnecessarily publicly accessible. This should cover at minimum: Amazon S3 buckets, Amazon RDS instances, Amazon EC2 instances, Security groups with unrestricted access to sensitive ports, Amazon EBS snapshots, Amazon RDS snapshots, and Amazon Machine Images (AMIs).

Evidence must be in the form of a documented procedure to mitigate the risk of unintentional public access.`,
    descriptionKo: `공개 리소스
필수

AWS 파트너는 고객 리소스가 의도치 않게 또는 불필요하게 공개적으로 액세스 가능하게 만드는 구성을 방지하고/또는 탐지하는 도구와 프로세스를 보유해야 합니다. 최소한 다음을 포함해야 합니다: Amazon S3 버킷, Amazon RDS 인스턴스, Amazon EC2 인스턴스, 민감한 포트에 대한 무제한 액세스가 있는 보안 그룹, Amazon EBS 스냅샷, Amazon RDS 스냅샷, Amazon Machine Images(AMI).

증빙은 의도하지 않은 공개 액세스의 위험을 완화하는 문서화된 절차 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a documented procedure to mitigate the risk of unintentional public access.',
    evidenceRequiredKo: '증빙은 의도하지 않은 공개 액세스의 위험을 완화하는 문서화된 절차 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPSP-001',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Incident Management',
    titleKo: '인시던트 관리',
    description: `Incident Management
Mandatory

AWS Partner has documented incident management processes, including:
• How IT and Security incidents are identified
• How IT and Security incidents are logged
• How IT and Security incidents are categorized
• How IT and Security incidents are prioritized
• How IT and Security incidents are investigated and diagnosed
• IT and Security Incidents response plans in the form of playbooks
• How customers are communicated
• How IT and Security incidents are resolved
• How IT and Security incidents are closed

AWS Partner must provide evidence of a documented incident management process that addresses both IT and Security incidents.`,
    descriptionKo: `인시던트 관리
필수

AWS 파트너는 다음을 포함한 문서화된 인시던트 관리 프로세스를 보유해야 합니다:
• IT 및 보안 인시던트가 어떻게 식별되는지
• IT 및 보안 인시던트가 어떻게 기록되는지
• IT 및 보안 인시던트가 어떻게 분류되는지
• IT 및 보안 인시던트가 어떻게 우선순위가 정해지는지
• IT 및 보안 인시던트가 어떻게 조사되고 진단되는지
• 플레이북 형태의 IT 및 보안 인시던트 대응 계획
• 고객과의 커뮤니케이션 방법
• IT 및 보안 인시던트가 어떻게 해결되는지
• IT 및 보안 인시던트가 어떻게 종료되는지

AWS 파트너는 IT 및 보안 인시던트를 모두 다루는 문서화된 인시던트 관리 프로세스의 증빙을 제공해야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a documented incident management process that addresses both IT and Security incidents.',
    evidenceRequiredKo: '증빙은 IT 및 보안 인시던트를 모두 다루는 문서화된 인시던트 관리 프로세스 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPSP-002',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Problem Management',
    titleKo: '문제 관리',
    description: `Problem Management
Mandatory

AWS Partner performs post-incident analysis and provides communication to customers after customer-impacting events. The analysis process should identify contributing causes and define an action plan to develop mitigations and limit or prevent recurrence.

Evidence must be in the form of an example of a completed post-incident analysis report including completed action plan and customer communications.`,
    descriptionKo: `문제 관리
필수

AWS 파트너는 고객에게 영향을 미치는 이벤트 후 사후 인시던트 분석을 수행하고 고객에게 커뮤니케이션을 제공합니다. 분석 프로세스는 기여 원인을 식별하고 완화 방안을 개발하고 재발을 제한하거나 방지하기 위한 실행 계획을 정의해야 합니다.

증빙은 완료된 실행 계획과 고객 커뮤니케이션을 포함한 완료된 사후 인시던트 분석 보고서의 예시 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of an example of a completed post-incident analysis report including completed action plan and customer communications.',
    evidenceRequiredKo: '증빙은 완료된 실행 계획과 고객 커뮤니케이션을 포함한 완료된 사후 인시던트 분석 보고서의 예시 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPSP-003',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Deployment Risk Management',
    titleKo: '배포 위험 관리',
    description: `Deployment Risk Management
Mandatory

AWS Partner has capabilities for implementing limited/canary deployments, parallel environment deployments (e.g.- blue/green deployments, traffic shifting), or other advanced approaches for limiting the risk of failed production changes.

Evidence must be in the form of documented procedure to mitigate the risk of production deployment.`,
    descriptionKo: `배포 위험 관리
필수

AWS 파트너는 제한적/카나리 배포, 병렬 환경 배포(예: 블루/그린 배포, 트래픽 이동) 또는 실패한 프로덕션 변경의 위험을 제한하는 기타 고급 접근 방식을 구현할 수 있는 역량을 보유해야 합니다.

증빙은 프로덕션 배포의 위험을 완화하는 문서화된 절차 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of documented procedure to mitigate the risk of production deployment.',
    evidenceRequiredKo: '증빙은 프로덕션 배포의 위험을 완화하는 문서화된 절차 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPSP-004',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Cloud Financial Management',
    titleKo: '클라우드 재무 관리',
    description: `Cloud Financial Management
Mandatory

AWS Partner regularly assess customer AWS costs and provides recommendations for optimization.

Evidence must be in the form of documented recommendations provided to a customer.`,
    descriptionKo: `클라우드 재무 관리
필수

AWS 파트너는 정기적으로 고객의 AWS 비용을 평가하고 최적화를 위한 권장사항을 제공합니다.

증빙은 고객에게 제공된 문서화된 권장사항 형태여야 합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of documented recommendations provided to a customer.',
    evidenceRequiredKo: '증빙은 고객에게 제공된 문서화된 권장사항 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  },
  {
    id: 'OPSP-005',
    category: 'Operations',
    categoryKo: '운영',
    title: 'Service Continuity',
    titleKo: '서비스 연속성',
    description: `Service Continuity
Mandatory

The AWS Partner defines and tests processes to respond to events that could impact their ability to service customers. Business continuity tests that exercise alternative/backup infrastructure, tools, and capacity should be conducted annually.

Evidence must be in the form of a documented process that addresses the above, as well as results of a business continuity test performed within the last 12 months. Alternatively, ISO 22301 certification specifically scoped to the AWS Partner's AWS MSP practice is also sufficient.`,
    descriptionKo: `서비스 연속성
필수

AWS 파트너는 고객 서비스 능력에 영향을 미칠 수 있는 이벤트에 대응하는 프로세스를 정의하고 테스트합니다. 대체/백업 인프라, 도구 및 용량을 활용하는 비즈니스 연속성 테스트는 매년 실시되어야 합니다.

증빙은 위의 내용을 다루는 문서화된 프로세스와 지난 12개월 내에 수행된 비즈니스 연속성 테스트 결과 형태여야 합니다. 또는 AWS 파트너의 AWS MSP 실무에 특별히 범위가 지정된 ISO 22301 인증도 충분합니다.`,
    isMandatory: true,
    evidenceRequired: 'Evidence must be in the form of a documented process and test results within the last 12 months, or ISO 22301 certification.',
    evidenceRequiredKo: '증빙은 지난 12개월 내의 문서화된 프로세스와 테스트 결과 또는 ISO 22301 인증 형태여야 합니다.',
    met: null,
    partnerResponse: '',
    lastUpdated: new Date()
  }
];

// 카테고리별로 그룹화
export const prerequisitesByCategory = prerequisitesData.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item);
  return acc;
}, {} as Record<string, AssessmentItem[]>);
