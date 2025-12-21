// 한국어 버전 - AWS MSP Self Assessment - MSP Prerequisites

import { AssessmentItem } from '../lib/csv-parser';

export const prerequisitesDataKo: AssessmentItem[] = [
  {
    id: "BUSP-001",
    category: "비즈니스",
    title: "웹 존재",
    description: "웹 존재\n필수\n\nAWS 파트너는 AWS 관리형 서비스 실무를 설명하고 공개 사례 연구에 링크하는 공개 랜딩 페이지를 주요 웹사이트에 보유하고 있습니다. 이 페이지는 AWS에서 워크로드를 설계, 구축 및 관리하는 파트너의 차별화된 전문성을 설명해야 합니다.\n\n증빙자료는 AWS MSP 실무 랜딩 페이지의 공개 URL 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 AWS MSP 실무 랜딩 페이지의 공개 URL 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "BUSP-002",
    category: "비즈니스",
    title: "영업 및 마케팅 인증",
    description: "영업 및 마케팅 인증\n필수\n\nAWS MSP 실무를 지원하는 AWS 파트너 영업팀, 마케팅팀 및/또는 해당 사업부는 모두 AWS Partner: Sales Accreditation (Business) (https://skillbuilder.aws/learn/BP1WX82N37/aws-partner-sales-accreditation-business/8UV4TQWVZ6) 또는 AWS Partner: Accreditation (Technical) (https://skillbuilder.aws/learn/8DDTPJ2RK5/aws-partner-accreditation-technical/AHX1VJYYVV)을 완료했습니다.\n\n증빙자료는 적절한 인증 기록 형태여야 합니다. 기록 형식은 pdf, 스프레드시트, 도구 스크린샷 등일 수 있습니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 적절한 인증 기록 형태여야 합니다. 기록 형식은 pdf, 스프레드시트, 도구 스크린샷 등일 수 있습니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "BUSP-003",
    category: "비즈니스",
    title: "고객 사례 연구",
    description: "고객 사례 연구\n필수\n\nAWS 파트너는 ≥ 4개의 AWS 고객 사례 연구(체크리스트의 정의 섹션에 정의된 대로)를 보유하고 있습니다. 제공된 사례 연구 중 최소 2개는 AWS 파트너가 제공하는 AWS 관리형 서비스가 고객 과제를 해결하는 데 어떻게 도움이 되었는지 설명하는 공개적으로 이용 가능한 아티팩트가 있어야 합니다.\n\n이러한 공개적으로 이용 가능한 아티팩트는 공식 고객 사례 연구, 백서, 비디오 또는 블로그 게시물 등의 형태일 수 있으며 이전 MSP 감사 및 갱신에서 사용되지 않은 것이어야 합니다. 비공개 사례 연구는 PDF, Powerpoint 또는 Word 문서 형태일 수 있으며 이전 MSP 감사 및 갱신에서 사용되지 않은 것이어야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 공식 고객 사례 연구, 백서, 비디오 또는 블로그 게시물 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "PEOP-001",
    category: "인력",
    title: "직원 기술",
    description: "직원 기술\n필수\n\nAWS 파트너는 직원의 기술 전문성을 지속적으로 향상시키기 위한 정의된 전략을 보유하고 있습니다. 이는 공식 교육 및 인증 및/또는 지속적인 학습 문화를 촉진하는 기타 접근 방식을 포함할 수 있습니다.\n\n증빙자료는 관리형 서비스 운영을 지원하는 직원을 위해 지난 12개월 내에 실시된 학습 이벤트 또는 활동의 예시 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 관리형 서비스 운영을 지원하는 직원을 위해 지난 12개월 내에 실시된 학습 이벤트 또는 활동의 예시 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "GOVP-001",
    category: "거버넌스",
    title: "공급업체 관리",
    description: "공급업체 관리\n필수\n\nAWS 파트너는 공급업체 선택 및 평가를 위한 정의된 프로세스를 보유하고 있습니다(예: SaaS 공급업체 또는 활동이나 서비스가 하도급되는 기타 제3자, 또는 관리형 서비스 제공을 위해 조달된 ISV 도구).\n\n증빙자료는 공급업체 선택을 위한 상세한 SOP 형태여야 합니다. 또는 적절한 공급업체 관리 절차의 증빙은 공급업체 자체가 달성한 정보 보안 관련 현재 업계 인증(예: ISO 27001, SOC2) 형태일 수도 있습니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 공급업체 선택을 위한 상세한 SOP 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "GOVP-002",
    category: "거버넌스",
    title: "운영 개선",
    description: "운영 개선\n필수\n\nAWS 파트너는 인시던트 관리, 클라우드 비용 관리, 아키텍처 패턴, 성능, 보안 등과 같은 운영 프로세스를 정기적으로 검토하고 기회를 식별하며 노력의 우선순위를 정하는 일정을 포함하는 지속적 개선 프로세스를 수립했습니다.\n\n증빙자료는 개선 기회 식별에 중점을 둔 거버넌스 프로세스 문서 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 개선 기회 식별에 중점을 둔 거버넌스 프로세스 문서 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "GOVP-003",
    category: "거버넌스",
    title: "지속가능성 약속",
    description: "지속가능성 약속\n필수\n\nAWS 파트너는 장기 전략의 일부로 지속가능성 비전에 전념하고 있습니다.\n\n증빙자료는 CxO 사무실의 리더십 약속이 포함된 정책 문서/커뮤니케이션 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 CxO 사무실의 리더십 약속이 포함된 정책 문서/커뮤니케이션 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "PLATP-001",
    category: "플랫폼",
    title: "전문가 설계 검토",
    description: "전문가 설계 검토\n필수\n\nAWS 파트너는 AWS Solutions Architect – Associate 또는 Professional 인증을 보유한 개인이 모든 고객 AWS 프로젝트의 설계 및 구현을 검토하도록 요구하는 문서화된 정책을 보유하고 있습니다. 정책에는 Professional 또는 Specialty 수준 인증을 보유한 개인이 검토를 수행해야 하는 시기에 대한 구체적인 지침도 포함되어야 합니다.\n\n증빙자료는 문서화된 정책과 Professional 또는 Specialty 수준 인증을 보유한 개인이 검토하고 승인했음을 보여주는 고객 프로젝트 문서 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 문서화된 정책과 Professional 또는 Specialty 수준 인증을 보유한 개인이 검토하고 승인했음을 보여주는 고객 프로젝트 문서 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "SECP-001",
    category: "보안",
    title: "액세스 키 노출 감지",
    description: "액세스 키 노출 감지\n필수\n\nAWS Trusted Advisor는 인기 있는 코드 리포지토리에서 공개된 액세스 키와 손상된 액세스 키의 결과일 수 있는 비정상적인 Amazon Elastic Compute Cloud(Amazon EC2) 사용을 확인합니다. 액세스 키 노출이 감지되면 서비스는 AWS CloudWatch Events에서 이벤트를 트리거합니다. AWS MSP 파트너가 이러한 이벤트를 적극적으로 모니터링하고 신속하게 대응할 수 있는 메커니즘을 만드는 것이 중요합니다.\n\nAWS 파트너는 관리되는 모든 고객 계정에서 서비스 유형이 \"RISK\"인 모든 AWS Health 이벤트를 처리하기 위한 자동화된 메커니즘을 구현해야 합니다. 최소한 노출된 액세스 키 알림이 수신될 때 최고 심각도로 ITSM 또는 보안 티켓팅 시스템에 새 티켓을 생성하는 자동화된 시스템이 있어야 합니다.\n\n또한 파트너는 노출된 자격 증명을 삭제하거나 교체하는 것을 포함하는 노출된 자격 증명 알림 처리를 위한 문서화된 절차를 보유해야 합니다.\n\n증빙자료는 노출된 키를 처리하는 방법에 대한 문서화된 대응 절차 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 노출된 키를 처리하는 방법에 대한 문서화된 대응 절차 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "SECP-002",
    category: "보안",
    title: "공개 리소스",
    description: "공개 리소스\n필수\n\nAWS 파트너는 고객 리소스를 의도치 않게 또는 불필요하게 공개적으로 액세스 가능하게 만드는 구성을 방지 및/또는 감지하기 위한 도구 및 프로세스를 보유하고 있습니다. 이는 최소한 다음 리소스를 포함해야 합니다:\n\n• Amazon S3 버킷\n• Amazon RDS 인스턴스\n• Amazon EC2 인스턴스\n• 민감한 포트에 대한 무제한 액세스가 있는 보안 그룹\n• Amazon EBS 스냅샷\n• Amazon RDS 스냅샷\n• Amazon Machine Images(AMI)\n\n\n증빙자료는 의도하지 않은 공개 액세스의 위험을 완화하기 위한 문서화된 절차 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 의도하지 않은 공개 액세스의 위험을 완화하기 위한 문서화된 절차 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "OPSP-001",
    category: "운영",
    title: "인시던트 관리",
    description: "인시던트 관리\n필수\n\nAWS 파트너는 다음을 포함하는 문서화된 인시던트 관리 프로세스를 보유하고 있습니다:\n\n• IT 및 보안 인시던트가 식별되는 방법\n• IT 및 보안 인시던트가 기록되는 방법\n• IT 및 보안 인시던트가 분류되는 방법\n• IT 및 보안 인시던트의 우선순위가 지정되는 방법\n• IT 및 보안 인시던트가 조사되고 진단되는 방법\n• 플레이북 형태의 IT 및 보안 인시던트 대응 계획\n• 고객과 소통하는 방법\n• IT 및 보안 인시던트가 해결되는 방법\n• IT 및 보안 인시던트가 종료되는 방법\n\n\nAWS 파트너는 IT 및 보안 인시던트를 모두 다루는 문서화된 인시던트 관리 프로세스의 증빙자료를 제공해야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 IT 및 보안 인시던트를 모두 다루는 문서화된 인시던트 관리 프로세스 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "OPSP-002",
    category: "운영",
    title: "문제 관리",
    description: "문제 관리\n필수\n\nAWS 파트너는 고객에게 영향을 미치는 이벤트 후 사후 인시던트 분석을 수행하고 고객에게 커뮤니케이션을 제공합니다. 분석 프로세스는 기여 원인을 식별하고 완화 방안을 개발하고 재발을 제한하거나 방지하기 위한 조치 계획을 정의해야 합니다. 기여 원인 및 조치 계획에 관한 맞춤형 커뮤니케이션은 적시에 고객과 공유됩니다.\n\n증빙자료는 완료된 조치 계획 및 고객 커뮤니케이션을 포함한 완료된 사후 인시던트 분석 보고서의 예시 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 완료된 조치 계획 및 고객 커뮤니케이션을 포함한 완료된 사후 인시던트 분석 보고서의 예시 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "OPSP-003",
    category: "운영",
    title: "배포 위험 관리",
    description: "배포 위험 관리\n필수\n\nAWS 파트너는 제한적/카나리 배포, 병렬 환경 배포(예: 블루/그린 배포, 트래픽 전환) 또는 실패한 프로덕션 변경의 위험을 제한하기 위한 기타 고급 접근 방식을 구현할 수 있는 기능을 보유하고 있습니다.\n\n증빙자료는 프로덕션 배포 위험을 완화하기 위한 문서화된 절차 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 프로덕션 배포 위험을 완화하기 위한 문서화된 절차 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "OPSP-004",
    category: "운영",
    title: "클라우드 재무 관리",
    description: "클라우드 재무 관리\n필수\n\nAWS 파트너는 고객 AWS 비용을 정기적으로 평가하고 최적화를 위한 권장 사항을 제공합니다.\n\n증빙자료는 고객에게 제공된 문서화된 권장 사항 형태여야 합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 고객에게 제공된 문서화된 권장 사항 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  },
  {
    id: "OPSP-005",
    category: "운영",
    title: "서비스 연속성",
    description: "서비스 연속성\n필수\n\nAWS 파트너는 고객에게 서비스를 제공하는 능력에 영향을 미칠 수 있는 이벤트에 대응하기 위한 프로세스를 정의하고 테스트합니다. 이러한 절차는 완전한 데이터 및 인프라 손실, 상당 부분의 인력에 영향을 미치는 환경 이벤트(예: 사무실에 대한 물리적 접근을 방해하는 재해), 고객에게 서비스를 제공하는 데 중요한 제3자 서비스의 중단(예: 내부 티켓팅 및 헬프데스크 시스템의 장기 중단)을 다룹니다. 대체/백업 인프라, 도구 및 용량을 실행하는 비즈니스 연속성 테스트는 매년 수행되어야 합니다.\n\n증빙자료는 위 사항을 다루는 문서화된 프로세스와 지난 12개월 내에 수행된 비즈니스 연속성 테스트 결과 형태여야 합니다. 또는 AWS 파트너의 AWS MSP 실무에 특별히 범위가 지정된 ISO 22301 인증도 충분합니다.",
    isMandatory: true,
    evidenceRequired: "증빙자료는 문서화된 프로세스와 지난 12개월 내에 수행된 비즈니스 연속성 테스트 결과 형태여야 합니다.",
    met: null,
    partnerResponse: "",
    lastUpdated: new Date()
  }
];
