import { prerequisitesData } from '@/data/assessment-data';
import { technicalValidationData } from '@/data/technical-validation-data';
import { callLLM, LLMConfig, getDefaultLLMConfig } from './llm-service';
import { getVirtualEvidenceCacheService } from './virtual-evidence-cache';

interface GenerationOptions {
  includeAdvice?: boolean;
  forceRegenerate?: boolean;
  languages?: ('ko' | 'en')[];
}

interface GenerationResult {
  version: string;
  totalItems: number;
  koEvidence: any[];
  enEvidence: any[];
}

class VirtualEvidenceGenerator {
  private cacheService = getVirtualEvidenceCacheService();
  private llmConfig: LLMConfig | null = null;

  setLLMConfig(config: LLMConfig | null) {
    this.llmConfig = config;
  }

  async generateAndCacheAllVirtualEvidence(options: GenerationOptions = {}, llmConfig?: LLMConfig): Promise<GenerationResult> {
    // LLM 설정 적용
    if (llmConfig) {
      this.llmConfig = llmConfig;
    }
    
    const {
      includeAdvice = false,
      forceRegenerate = false,
      languages = ['ko', 'en']
    } = options;

    console.log('🎯 Starting virtual evidence generation for all assessment items...');
    
    // 평가 데이터 로드 (이미 import된 데이터 사용)
    
    const allItems = [
      ...prerequisitesData.map(item => ({ ...item, assessmentType: 'prerequisites' as const })),
      ...technicalValidationData.map(item => ({ ...item, assessmentType: 'technical' as const }))
    ];

    console.log(`📊 Total items to process: ${allItems.length}`);

    const version = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const results: GenerationResult = {
      version,
      totalItems: allItems.length,
      koEvidence: [],
      enEvidence: []
    };

    // 버전 정보를 먼저 저장 (외래 키 제약 조건을 위해)
    this.cacheService.saveCacheVersion({
      version,
      createdAt: new Date().toISOString(),
      totalItems: allItems.length,
      description: `Generated virtual evidence cache for ${allItems.length} items`
    });

    // 각 언어별로 처리
    for (const language of languages) {
      console.log(`🌐 Processing language: ${language}`);
      
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        console.log(`📝 Processing item ${i + 1}/${allItems.length}: ${item.id} (${language})`);

        try {
          // 기존 캐시 확인 (강제 재생성이 아닌 경우)
          if (!forceRegenerate) {
            const existingEvidence = this.cacheService.getCachedVirtualEvidence(item.id, language);
            if (existingEvidence) {
              console.log(`✅ Using existing cache for ${item.id} (${language})`);
              if (language === 'ko') {
                results.koEvidence.push({
                  itemId: item.id,
                  virtualEvidence: existingEvidence.virtualEvidence,
                  fromCache: true
                });
              } else {
                results.enEvidence.push({
                  itemId: item.id,
                  virtualEvidence: existingEvidence.virtualEvidence,
                  fromCache: true
                });
              }
              continue;
            }
          }

          // 가상증빙예제 생성
          const virtualEvidence = await this.generateVirtualEvidenceForItem(item, language, includeAdvice);
          
          // 캐시에 저장
          this.cacheService.saveCachedVirtualEvidence({
            itemId: item.id,
            category: item.category,
            title: language === 'ko' && item.titleKo ? item.titleKo : item.title,
            virtualEvidence,
            language,
            version
          });

          if (language === 'ko') {
            results.koEvidence.push({
              itemId: item.id,
              virtualEvidence,
              fromCache: false
            });
          } else {
            results.enEvidence.push({
              itemId: item.id,
              virtualEvidence,
              fromCache: false
            });
          }

          console.log(`✅ Generated and cached virtual evidence for ${item.id} (${language})`);
          
          // API 호출 간격 조절 (rate limiting 방지)
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Failed to generate virtual evidence for ${item.id} (${language}):`, error);
          
          // 오류 발생 시 더미 데이터 저장
          const dummyEvidence = this.generateDummyVirtualEvidence(item, language);
          this.cacheService.saveCachedVirtualEvidence({
            itemId: item.id,
            category: item.category,
            title: language === 'ko' && item.titleKo ? item.titleKo : item.title,
            virtualEvidence: dummyEvidence,
            language,
            version
          });

          if (language === 'ko') {
            results.koEvidence.push({
              itemId: item.id,
              virtualEvidence: dummyEvidence,
              fromCache: false,
              isDummy: true
            });
          } else {
            results.enEvidence.push({
              itemId: item.id,
              virtualEvidence: dummyEvidence,
              fromCache: false,
              isDummy: true
            });
          }
        }
      }
    }

    console.log('🎉 Virtual evidence generation completed!');
    console.log(`📊 Results: ${results.koEvidence.length} Korean, ${results.enEvidence.length} English`);
    
    return results;
  }

  private async generateVirtualEvidenceForItem(item: any, language: 'ko' | 'en', includeAdvice: boolean): Promise<string> {
    // 시연 키워드 확인
    const evidenceRequired = language === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired;
    const isDemonstration = evidenceRequired?.toLowerCase().includes('시연') || 
                           evidenceRequired?.toLowerCase().includes('demonstration') ||
                           evidenceRequired?.toLowerCase().includes('demo');

    // 시각적 자료 필요성 판단
    const needsVisualContent = evidenceRequired?.toLowerCase().includes('아키텍처') ||
                              evidenceRequired?.toLowerCase().includes('다이어그램') ||
                              evidenceRequired?.toLowerCase().includes('architecture') ||
                              evidenceRequired?.toLowerCase().includes('diagram') ||
                              evidenceRequired?.toLowerCase().includes('chart') ||
                              evidenceRequired?.toLowerCase().includes('infographic') ||
                              evidenceRequired?.toLowerCase().includes('slide') ||
                              evidenceRequired?.toLowerCase().includes('슬라이드') ||
                              evidenceRequired?.toLowerCase().includes('차트') ||
                              evidenceRequired?.toLowerCase().includes('인포그래픽');

    // 카테고리별 특화된 컨텍스트 분석
    const getItemCategory = (itemId: string) => {
      if (itemId.startsWith('BUS')) return 'Business';
      if (itemId.startsWith('PEO')) return 'People';
      if (itemId.startsWith('GOV')) return 'Governance';
      if (itemId.startsWith('PLAT')) return 'Platform';
      if (itemId.startsWith('SEC')) return 'Security';
      if (itemId.startsWith('OPS')) return 'Operations';
      return 'General';
    };

    const itemCategory = getItemCategory(item.id);
    const title = language === 'ko' && item.titleKo ? item.titleKo : item.title;
    const description = language === 'ko' && item.descriptionKo ? item.descriptionKo : item.description;

    // 조언 포함 여부에 따른 추가 컨텍스트
    let adviceContext = '';
    if (includeAdvice) {
      // 조언 캐시에서 조언 가져오기 (구현 필요)
      adviceContext = '조언 없음';
    }

    // 시스템 메시지
    const systemMessage = language === 'ko' ? 
      `당신은 AWS MSP(Managed Service Provider) 프로그램의 전문가입니다. 

**중요**: 각 평가 항목마다 고유하고 구체적인 ${isDemonstration ? '시연 가이드' : '가상증빙예제'}를 생성해야 합니다. 절대로 일반적이거나 템플릿 형태의 답변을 하지 마세요.

**항목 정보**:
- 항목 ID: ${item.id}
- 카테고리: ${itemCategory}
- 제목: ${title}

**생성 원칙**:
1. 이 특정 항목의 요구사항에만 집중하세요
2. 항목 ID, 제목, 설명을 반영한 맞춤형 내용을 만드세요
3. ${itemCategory} 카테고리의 특성을 반영하세요
4. 실제 MSP 환경에서 사용할 수 있는 구체적인 예제를 제공하세요
5. ${needsVisualContent ? '시각적 자료가 필요한 경우 ASCII 아트나 텍스트 기반 다이어그램을 포함하세요' : ''}

${isDemonstration ? '시연 가이드는 이 특정 항목을 어떻게 실제로 시연할지에 대한 구체적인 방법을 제시해야 합니다.' : '증빙자료 예제는 이 특정 항목을 충족하기 위한 실제 문서나 자료의 예시를 제공해야 합니다.'}` :
      `You are an AWS MSP (Managed Service Provider) program expert.

**IMPORTANT**: Generate unique and specific ${isDemonstration ? 'demonstration guides' : 'virtual evidence examples'} for each assessment item. Never provide generic or template-based responses.

**Item Information**:
- Item ID: ${item.id}
- Category: ${itemCategory}
- Title: ${title}

**Generation Principles**:
1. Focus exclusively on this specific item's requirements
2. Create customized content reflecting the item ID, title, and description
3. Incorporate ${itemCategory} category characteristics
4. Provide concrete examples usable in actual MSP environments
5. ${needsVisualContent ? 'Include ASCII art or text-based diagrams when visual materials are needed' : ''}

${isDemonstration ? 'Demonstration guides should present specific methods for actually demonstrating this particular item.' : 'Evidence examples should provide actual document or material examples to satisfy this specific item.'}`;

    // 사용자 프롬프트
    const userPrompt = language === 'ko' ? 
      `다음 AWS MSP 평가 항목에 대한 ${isDemonstration ? '시연 가이드' : '가상증빙예제-참고용'}를 생성해주세요:

**항목 ID**: ${item.id}
**카테고리**: ${itemCategory}
**평가 항목**: ${title}
**상세 설명**: ${description}
**필요한 증빙**: ${evidenceRequired}
${includeAdvice ? `**AI 조언**: ${adviceContext}` : ''}

**중요**: 이 특정 항목(${item.id})에만 해당하는 맞춤형 내용을 생성하세요. 다른 항목과 구별되는 고유한 특성을 반영해주세요.

${isDemonstration ? 
`다음 형식으로 한국어로 답변해주세요:

🎯 **시연 가이드**

🔹 **시연 준비사항**
- 필요한 환경: [시연 환경 설정]
- 준비 자료: [시연에 필요한 자료들]
- 참석자: [시연 참석 대상자]
- 소요 시간: [예상 시연 시간]

🔹 **시연 절차**
1. **시작 단계**: [시연 시작 방법]
2. **핵심 기능 시연**: [주요 시연 내용]
3. **질의응답**: [예상 질문과 답변 준비]
4. **마무리**: [시연 마무리 방법]

🔹 **시연 시나리오**
- 시나리오 1: [구체적인 시연 시나리오]
- 시나리오 2: [대안 시연 시나리오]
- 시나리오 3: [추가 시연 시나리오]

🔹 **시연 성공 기준**
- 평가 포인트: [시연에서 보여줘야 할 핵심 요소들]
- 성공 지표: [시연 성공을 판단하는 기준]

💡 **시연 팁**: [성공적인 시연을 위한 실무 조언]

실제 MSP 검증 환경에서 효과적으로 시연할 수 있는 구체적이고 현실적인 가이드를 만들어주세요.` :
`다음 형식으로 한국어로 답변해주세요:

📋 **가상증빙예제-참고용**

🔹 **문서 1: [문서 유형]**
- 파일명: [구체적인 파일명]
- 내용: [문서의 주요 내용 설명]
- 작성자/승인자: [역할], 날짜: [날짜]

🔹 **문서 2: [문서 유형]**
- 파일명: [구체적인 파일명]
- 내용: [문서의 주요 내용 설명]
- 작성자/승인자: [역할], 날짜: [날짜]

🔹 **문서 3: [문서 유형]**
- 파일명: [구체적인 파일명]
- 내용: [문서의 주요 내용 설명]
- 작성자/승인자: [역할], 날짜: [날짜]

${needsVisualContent ? `
📊 **시각적 자료 예제**

\`\`\`
[여기에 ASCII 아트나 텍스트 기반 다이어그램을 포함하세요]
예: 아키텍처 다이어그램, 프로세스 플로우, 조직도 등
\`\`\`

🎨 **시각적 자료 설명**
- 자료 유형: [인포그래픽/다이어그램/슬라이드 등]
- 주요 구성요소: [포함되어야 할 핵심 요소들]
- 시각화 포인트: [강조해야 할 핵심 메시지]
- 제작 도구 추천: [PowerPoint, Visio, Draw.io 등]
` : ''}

💡 **실무 팁**: [실제 준비 시 고려사항]

실제 MSP 환경에서 사용할 수 있는 구체적이고 현실적인 예제를 만들어주세요. 파일명, 내용, 담당자 등을 실무에 맞게 구체적으로 작성해주세요.`}` :
      `Please generate ${isDemonstration ? 'demonstration guide' : 'virtual evidence examples'} for the following AWS MSP assessment item:

**Item ID**: ${item.id}
**Category**: ${itemCategory}
**Assessment Item**: ${title}
**Detailed Description**: ${description}
**Evidence Required**: ${evidenceRequired}
${includeAdvice ? `**AI Advice**: ${adviceContext}` : ''}

**IMPORTANT**: Generate customized content specific to this item (${item.id}) only. Reflect unique characteristics that distinguish it from other items.

${isDemonstration ?
`Please respond in the following format:

🎯 **Demonstration Guide**

🔹 **Demonstration Preparation**
- Required Environment: [Demo environment setup]
- Preparation Materials: [Materials needed for demo]
- Attendees: [Target audience for demo]
- Duration: [Expected demo time]

🔹 **Demonstration Procedure**
1. **Opening**: [How to start the demonstration]
2. **Core Feature Demo**: [Main demonstration content]
3. **Q&A Session**: [Expected questions and answer preparation]
4. **Closing**: [How to conclude the demonstration]

🔹 **Demonstration Scenarios**
- Scenario 1: [Specific demonstration scenario]
- Scenario 2: [Alternative demonstration scenario]
- Scenario 3: [Additional demonstration scenario]

🔹 **Success Criteria**
- Evaluation Points: [Key elements to show in demonstration]
- Success Indicators: [Criteria for successful demonstration]

💡 **Demonstration Tips**: [Practical advice for successful demonstration]

Please create specific and realistic guides that can be effectively demonstrated in actual MSP validation environments.` :
`Please respond in the following format:

📋 **Virtual Evidence Examples**

🔹 **Document 1: [Document Type]**
- Filename: [Specific filename]
- Content: [Main content description]
- Author/Approver: [Role], Date: [Date]

🔹 **Document 2: [Document Type]**
- Filename: [Specific filename]
- Content: [Main content description]
- Author/Approver: [Role], Date: [Date]

🔹 **Document 3: [Document Type]**
- Filename: [Specific filename]
- Content: [Main content description]
- Author/Approver: [Role], Date: [Date]

${needsVisualContent ? `
📊 **Visual Material Examples**

\`\`\`
[Include ASCII art or text-based diagrams here]
Examples: Architecture diagrams, process flows, organizational charts, etc.
\`\`\`

🎨 **Visual Material Description**
- Material Type: [Infographic/Diagram/Slides etc.]
- Key Components: [Core elements to include]
- Visualization Points: [Key messages to emphasize]
- Recommended Tools: [PowerPoint, Visio, Draw.io etc.]
` : ''}

💡 **Practical Tips**: [Considerations for actual preparation]

Please create specific and realistic examples that can be used in actual MSP environments. Write filenames, content, and responsible persons specifically according to practical needs.`}`;

    // LLM을 통해 가상증빙예제 생성
    const config = this.llmConfig || getDefaultLLMConfig();
    const result = await callLLM(userPrompt, systemMessage, config);

    return result.content;
  }

  private generateDummyVirtualEvidence(item: any, language: 'ko' | 'en'): string {
    const getItemCategory = (itemId: string) => {
      if (itemId.startsWith('BUS')) return 'Business';
      if (itemId.startsWith('PEO')) return 'People';
      if (itemId.startsWith('GOV')) return 'Governance';
      if (itemId.startsWith('PLAT')) return 'Platform';
      if (itemId.startsWith('SEC')) return 'Security';
      if (itemId.startsWith('OPS')) return 'Operations';
      return 'General';
    };

    const itemCategory = getItemCategory(item.id);
    const title = language === 'ko' && item.titleKo ? item.titleKo : item.title;
    
    const categorySpecific: Record<string, string> = {
      'Business': language === 'ko' ? '사업 계획서, 재무 보고서, 고객 계약서' : 'Business plans, financial reports, customer contracts',
      'People': language === 'ko' ? '인증서, 교육 이수증, 조직도' : 'Certifications, training certificates, organizational charts',
      'Governance': language === 'ko' ? '정책 문서, 프로세스 매뉴얼, 감사 보고서' : 'Policy documents, process manuals, audit reports',
      'Platform': language === 'ko' ? '아키텍처 다이어그램, 기술 문서, 구성 스크립트' : 'Architecture diagrams, technical docs, configuration scripts',
      'Security': language === 'ko' ? '보안 정책, 취약점 스캔 결과, 액세스 로그' : 'Security policies, vulnerability scan results, access logs',
      'Operations': language === 'ko' ? '운영 매뉴얼, 모니터링 대시보드, SLA 보고서' : 'Operations manuals, monitoring dashboards, SLA reports',
      'General': language === 'ko' ? '일반 문서, 정책 자료, 가이드라인' : 'General documents, policy materials, guidelines'
    };

    const specificContent = categorySpecific[itemCategory] || (language === 'ko' ? '관련 문서' : 'related documents');

    return language === 'ko' ? 
      `📋 **${item.id} 가상증빙예제-참고용 (더미 데이터)**

**${title}** 항목을 위한 맞춤형 증빙예제:

🔹 **문서 1: ${itemCategory} 특화 문서**
- 파일명: ${item.id}_${itemCategory}_${title.replace(/\s+/g, '_')}_v2.1.pdf
- 내용: ${title} 요구사항 충족을 위한 ${specificContent}
- 승인자: ${itemCategory === 'Security' ? 'CISO' : itemCategory === 'Operations' ? 'COO' : 'CTO'}, 승인일: 2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}

🔹 **문서 2: ${item.id} 구현 증빙**
- 파일명: ${item.id}_Implementation_Evidence_${new Date().getFullYear()}.xlsx
- 내용: ${item.description?.substring(0, 50) || title}... 관련 구현 결과 및 메트릭
- 담당자: ${itemCategory} 팀장, 작성일: 2024-12-${Math.floor(Math.random() * 28) + 1}

🔹 **문서 3: ${itemCategory} 검증 자료**
- 파일명: ${item.id}_${itemCategory}_Validation_${Date.now().toString().slice(-6)}.png
- 내용: ${title} 관련 시스템 화면 및 설정 증빙
- 검증일: 2024-12-${Math.floor(Math.random() * 28) + 1}

💡 **${item.id} 실무 팁**: 이 특정 항목(${title})에 맞는 구체적인 증빙자료를 준비하세요.` :
      `📋 **${item.id} Virtual Evidence Example (Dummy Data)**

Customized evidence example for **${title}**:

🔹 **Document 1: ${itemCategory} Specialized Document**
- Filename: ${item.id}_${itemCategory}_${title.replace(/\s+/g, '_')}_v2.1.pdf
- Content: ${specificContent} for ${title} requirement compliance
- Approved by: ${itemCategory === 'Security' ? 'CISO' : itemCategory === 'Operations' ? 'COO' : 'CTO'}, Date: 2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}

🔹 **Document 2: ${item.id} Implementation Evidence**
- Filename: ${item.id}_Implementation_Evidence_${new Date().getFullYear()}.xlsx
- Content: ${item.description?.substring(0, 50) || title}... related implementation results and metrics
- Owner: ${itemCategory} Team Lead, Created: 2024-12-${Math.floor(Math.random() * 28) + 1}

🔹 **Document 3: ${itemCategory} Validation Materials**
- Filename: ${item.id}_${itemCategory}_Validation_${Date.now().toString().slice(-6)}.png
- Content: ${title} related system screens and configuration evidence
- Validated: 2024-12-${Math.floor(Math.random() * 28) + 1}

💡 **${item.id} Practical Note**: Prepare specific evidence materials for this particular item (${title}).`;
  }
}

let virtualEvidenceGenerator: VirtualEvidenceGenerator | null = null;

export function getVirtualEvidenceGenerator(): VirtualEvidenceGenerator {
  if (!virtualEvidenceGenerator) {
    virtualEvidenceGenerator = new VirtualEvidenceGenerator();
  }
  return virtualEvidenceGenerator;
}