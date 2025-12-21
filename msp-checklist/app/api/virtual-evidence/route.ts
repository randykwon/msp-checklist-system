import { NextRequest, NextResponse } from 'next/server';
import { createLLMService, LLMMessage } from '@/lib/llm-service';
import { getCachedVirtualEvidence, setCachedVirtualEvidence } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { itemId, title, description, evidenceRequired, advice, language } = await request.json();

    // 먼저 새로운 캐시 시스템에서 확인
    try {
      const { getVirtualEvidenceCacheService } = await import('@/lib/virtual-evidence-cache');
      const cacheService = getVirtualEvidenceCacheService();
      const cachedEvidence = cacheService.getCachedVirtualEvidence(itemId, language);
      
      if (cachedEvidence) {
        return NextResponse.json({ 
          virtualEvidence: cachedEvidence.virtualEvidence,
          provider: 'cached',
          isDummy: false,
          fromCache: true
        });
      }
    } catch (error) {
      console.log('New cache system not available, falling back to old cache');
    }

    // 기존 서버 사이드 캐시에서 확인 (호환성 유지)
    const cachedVirtualEvidence = getCachedVirtualEvidence(itemId, language);
    if (cachedVirtualEvidence) {
      return NextResponse.json({ 
        virtualEvidence: cachedVirtualEvidence,
        provider: 'cached',
        isDummy: false,
        fromCache: true
      });
    }

    // 시연 키워드 확인
    const isDemonstration = evidenceRequired.toLowerCase().includes('시연') || 
                           evidenceRequired.toLowerCase().includes('demonstration') ||
                           evidenceRequired.toLowerCase().includes('demo');

    // 시각적 자료 필요성 판단
    const needsVisualContent = evidenceRequired.toLowerCase().includes('아키텍처') ||
                              evidenceRequired.toLowerCase().includes('다이어그램') ||
                              evidenceRequired.toLowerCase().includes('architecture') ||
                              evidenceRequired.toLowerCase().includes('diagram') ||
                              evidenceRequired.toLowerCase().includes('chart') ||
                              evidenceRequired.toLowerCase().includes('infographic') ||
                              evidenceRequired.toLowerCase().includes('slide') ||
                              evidenceRequired.toLowerCase().includes('슬라이드') ||
                              evidenceRequired.toLowerCase().includes('차트') ||
                              evidenceRequired.toLowerCase().includes('인포그래픽');

    // LLM 서비스 초기화
    const llmService = createLLMService();

    // 더미 응답 처리 (API 키가 없을 때) - 각 항목별로 다른 내용 생성
    const providerName = llmService.getProviderName();
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.CLAUDE_API_KEY && !process.env.AWS_ACCESS_KEY_ID) {
      const generateItemSpecificDummy = () => {
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
        
        return isDemonstration ? 
          (language === 'ko' ? 
            `🎯 **${itemId} 시연 가이드 (더미 데이터)**

**${title}** 항목 시연을 위한 맞춤형 가이드:

🔹 **${itemId} 특화 준비사항**
- 시연 대상: ${title} 요구사항 충족 증명
- 필요 자료: ${specificContent}
- 검증 포인트: ${description.substring(0, 100)}...
- 예상 시간: ${itemCategory === 'Security' ? '45-60분' : '30-45분'}

🔹 **${itemCategory} 카테고리 시연 절차**
1. **${itemId} 개요 설명**: 항목 목적 및 중요성 (5분)
2. **실제 구현 시연**: ${title} 관련 시스템/프로세스 (20-30분)
3. **증빙 자료 제시**: ${specificContent} 검토 (10분)
4. **질의응답 및 검증**: 평가자 질문 대응 (10분)

💡 **${itemId} 시연 팁**: 이 특정 항목의 요구사항에 맞는 구체적인 증빙을 준비하세요.` :
            `🎯 **${itemId} Demonstration Guide (Dummy Data)**

Customized guide for demonstrating **${title}**:

🔹 **${itemId} Specific Preparation**
- Demo Target: Prove ${title} requirement compliance
- Required Materials: ${specificContent}
- Validation Points: ${description.substring(0, 100)}...
- Expected Duration: ${itemCategory === 'Security' ? '45-60 minutes' : '30-45 minutes'}

🔹 **${itemCategory} Category Demo Procedure**
1. **${itemId} Overview**: Item purpose and importance (5 min)
2. **Actual Implementation Demo**: ${title} related systems/processes (20-30 min)
3. **Evidence Presentation**: Review ${specificContent} (10 min)
4. **Q&A and Validation**: Respond to evaluator questions (10 min)

💡 **${itemId} Demo Tips**: Prepare specific evidence matching this particular item's requirements.`) :
          (language === 'ko' ? 
            `📋 **${itemId} 가상증빙예제-참고용 (더미 데이터)**

**${title}** 항목을 위한 맞춤형 증빙예제:

🔹 **문서 1: ${itemCategory} 특화 문서**
- 파일명: ${itemId}_${itemCategory}_${title.replace(/\s+/g, '_')}_v2.1.pdf
- 내용: ${title} 요구사항 충족을 위한 ${specificContent}
- 승인자: ${itemCategory === 'Security' ? 'CISO' : itemCategory === 'Operations' ? 'COO' : 'CTO'}, 승인일: 2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}

🔹 **문서 2: ${itemId} 구현 증빙**
- 파일명: ${itemId}_Implementation_Evidence_${new Date().getFullYear()}.xlsx
- 내용: ${description.substring(0, 50)}... 관련 구현 결과 및 메트릭
- 담당자: ${itemCategory} 팀장, 작성일: 2024-12-${Math.floor(Math.random() * 28) + 1}

🔹 **문서 3: ${itemCategory} 검증 자료**
- 파일명: ${itemId}_${itemCategory}_Validation_${Date.now().toString().slice(-6)}.png
- 내용: ${title} 관련 시스템 화면 및 설정 증빙
- 검증일: 2024-12-${Math.floor(Math.random() * 28) + 1}

${needsVisualContent ? `
📊 **${itemId} 시각적 자료 예제**

\`\`\`
┌─────────────────────────────────────────┐
│        ${itemId} - ${itemCategory}       │
├─────────────────────────────────────────┤
│  ${title.substring(0, 30)}...           │
│                                         │
│  [구현] → [검증] → [문서화] → [승인]     │
│     ↓        ↓        ↓        ↓       │
│  ${specificContent.substring(0, 35)}... │
└─────────────────────────────────────────┘
\`\`\`

🎨 **${itemId} 시각적 자료 설명**
- 자료 유형: ${itemCategory} 프로세스 다이어그램
- 주요 구성요소: ${title} 구현 흐름도
- 시각화 포인트: ${itemCategory} 카테고리 특성 반영
- 제작 도구 추천: ${itemCategory === 'Platform' ? 'Draw.io, Lucidchart' : itemCategory === 'Security' ? 'Visio, PlantUML' : 'PowerPoint, Miro'}
` : ''}

💡 **${itemId} 실무 팁**: 이 특정 항목(${title})에 맞는 구체적인 증빙자료를 준비하세요.` :
            `📋 **${itemId} Virtual Evidence Example (Dummy Data)**

Customized evidence example for **${title}**:

🔹 **Document 1: ${itemCategory} Specialized Document**
- Filename: ${itemId}_${itemCategory}_${title.replace(/\s+/g, '_')}_v2.1.pdf
- Content: ${specificContent} for ${title} requirement compliance
- Approved by: ${itemCategory === 'Security' ? 'CISO' : itemCategory === 'Operations' ? 'COO' : 'CTO'}, Date: 2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}

🔹 **Document 2: ${itemId} Implementation Evidence**
- Filename: ${itemId}_Implementation_Evidence_${new Date().getFullYear()}.xlsx
- Content: ${description.substring(0, 50)}... related implementation results and metrics
- Owner: ${itemCategory} Team Lead, Created: 2024-12-${Math.floor(Math.random() * 28) + 1}

🔹 **Document 3: ${itemCategory} Validation Materials**
- Filename: ${itemId}_${itemCategory}_Validation_${Date.now().toString().slice(-6)}.png
- Content: ${title} related system screens and configuration evidence
- Validated: 2024-12-${Math.floor(Math.random() * 28) + 1}

${needsVisualContent ? `
📊 **${itemId} Visual Material Examples**

\`\`\`
┌─────────────────────────────────────────┐
│        ${itemId} - ${itemCategory}       │
├─────────────────────────────────────────┤
│  ${title.substring(0, 30)}...           │
│                                         │
│  [Implement] → [Verify] → [Document] → [Approve] │
│       ↓          ↓          ↓          ↓        │
│  ${specificContent.substring(0, 35)}...         │
└─────────────────────────────────────────┘
\`\`\`

🎨 **${itemId} Visual Material Description**
- Material Type: ${itemCategory} Process Diagram
- Key Components: ${title} implementation flow
- Visualization Points: ${itemCategory} category characteristics
- Recommended Tools: ${itemCategory === 'Platform' ? 'Draw.io, Lucidchart' : itemCategory === 'Security' ? 'Visio, PlantUML' : 'PowerPoint, Miro'}
` : ''}

💡 **${itemId} Practical Note**: Prepare specific evidence materials for this particular item (${title}).`);
      };

      const dummyVirtualEvidence = generateItemSpecificDummy();

      return NextResponse.json({ 
        virtualEvidence: dummyVirtualEvidence,
        provider: providerName,
        isDummy: true 
      });
    }

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

    const itemCategory = getItemCategory(itemId);

    // 언어에 따른 프롬프트 설정
    const systemMessage = language === 'ko' ? 
      `당신은 AWS MSP(Managed Service Provider) 프로그램의 전문가입니다. 

**중요**: 각 평가 항목마다 고유하고 구체적인 ${isDemonstration ? '시연 가이드' : '가상증빙예제'}를 생성해야 합니다. 절대로 일반적이거나 템플릿 형태의 답변을 하지 마세요.

**항목 정보**:
- 항목 ID: ${itemId}
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
- Item ID: ${itemId}
- Category: ${itemCategory}
- Title: ${title}

**Generation Principles**:
1. Focus exclusively on this specific item's requirements
2. Create customized content reflecting the item ID, title, and description
3. Incorporate ${itemCategory} category characteristics
4. Provide concrete examples usable in actual MSP environments
5. ${needsVisualContent ? 'Include ASCII art or text-based diagrams when visual materials are needed' : ''}

${isDemonstration ? 'Demonstration guides should present specific methods for actually demonstrating this particular item.' : 'Evidence examples should provide actual document or material examples to satisfy this specific item.'}`;

    const userPrompt = language === 'ko' ? 
      `다음 AWS MSP 평가 항목에 대한 ${isDemonstration ? '시연 가이드' : '가상증빙예제-참고용'}를 생성해주세요:

**항목 ID**: ${itemId}
**카테고리**: ${itemCategory}
**평가 항목**: ${title}
**상세 설명**: ${description}
**필요한 증빙**: ${evidenceRequired}
**AI 조언**: ${advice || '조언 없음'}

**중요**: 이 특정 항목(${itemId})에만 해당하는 맞춤형 내용을 생성하세요. 다른 항목과 구별되는 고유한 특성을 반영해주세요.

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

**Item ID**: ${itemId}
**Category**: ${itemCategory}
**Assessment Item**: ${title}
**Detailed Description**: ${description}
**Evidence Required**: ${evidenceRequired}
**AI Advice**: ${advice || 'No advice available'}

**IMPORTANT**: Generate customized content specific to this item (${itemId}) only. Reflect unique characteristics that distinguish it from other items.

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

    const messages: LLMMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt }
    ];

    // LLM 서비스를 통해 가상증빙예제 생성 (높은 창의성으로 각 항목별 고유 내용 생성)
    const result = await llmService.generateText(messages, {
      temperature: 0.9, // 높은 창의성으로 각 항목별 다른 결과 생성
      maxTokens: 2000   // 더 상세한 내용 생성
    });

    // 생성된 가상증빙예제를 서버 사이드 캐시에 저장 (모든 사용자 공통)
    setCachedVirtualEvidence(itemId, language, result.content);

    return NextResponse.json({ 
      virtualEvidence: result.content,
      provider: providerName,
      usage: result.usage,
      isDummy: false,
      fromCache: false
    });

  } catch (error: any) {
    console.error('Error generating virtual evidence:', error);
    return NextResponse.json(
      { error: 'Failed to generate virtual evidence', details: error.message },
      { status: 500 }
    );
  }
}