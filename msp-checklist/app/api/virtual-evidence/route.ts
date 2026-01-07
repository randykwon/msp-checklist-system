import { NextRequest, NextResponse } from 'next/server';
import { callLLM, getDefaultLLMConfig, validateLLMConfig } from '@/lib/llm-service';
import { getCachedVirtualEvidence, setCachedVirtualEvidence } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { itemId, title, description, evidenceRequired, advice, language } = await request.json();

    // 필수 필드 검증
    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    // 기본값 설정
    const safeTitle = title || itemId;
    const safeDescription = description || '';
    const safeEvidenceRequired = evidenceRequired || '';
    const safeAdvice = advice || '';
    const safeLanguage = language || 'ko';

    // 먼저 새로운 캐시 시스템에서 확인
    try {
      const { getVirtualEvidenceCacheService } = await import('@/lib/virtual-evidence-cache');
      const cacheService = getVirtualEvidenceCacheService();
      const cachedEvidence = cacheService.getCachedVirtualEvidence(itemId, safeLanguage);
      
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
    const cachedVirtualEvidence = getCachedVirtualEvidence(itemId, safeLanguage);
    if (cachedVirtualEvidence) {
      return NextResponse.json({ 
        virtualEvidence: cachedVirtualEvidence,
        provider: 'cached',
        isDummy: false,
        fromCache: true
      });
    }

    // LLM 설정 가져오기 및 유효성 검사
    const llmConfig = getDefaultLLMConfig();
    const validation = validateLLMConfig(llmConfig);

    // API 키가 없으면 에러 반환 (더미 데이터 생성하지 않음)
    if (!validation.valid) {
      return NextResponse.json({ 
        error: '가상증빙예제가 캐시에 없습니다. 관리자에게 문의하여 캐시를 생성해주세요.',
        details: 'Virtual evidence not found in cache. Please contact administrator to generate cache.',
        itemId,
        language: safeLanguage
      }, { status: 404 });
    }

    // 시연 키워드 확인
    const isDemonstration = safeEvidenceRequired.toLowerCase().includes('시연') || 
                           safeEvidenceRequired.toLowerCase().includes('demonstration') ||
                           safeEvidenceRequired.toLowerCase().includes('demo');

    // 시각적 자료 필요성 판단
    const needsVisualContent = safeEvidenceRequired.toLowerCase().includes('아키텍처') ||
                              safeEvidenceRequired.toLowerCase().includes('다이어그램') ||
                              safeEvidenceRequired.toLowerCase().includes('architecture') ||
                              safeEvidenceRequired.toLowerCase().includes('diagram') ||
                              safeEvidenceRequired.toLowerCase().includes('chart') ||
                              safeEvidenceRequired.toLowerCase().includes('infographic') ||
                              safeEvidenceRequired.toLowerCase().includes('slide') ||
                              safeEvidenceRequired.toLowerCase().includes('슬라이드') ||
                              safeEvidenceRequired.toLowerCase().includes('차트') ||
                              safeEvidenceRequired.toLowerCase().includes('인포그래픽');

    // 카테고리별 특화된 컨텍스트 분석
    const getItemCategory = (id: string) => {
      if (id.startsWith('BUS')) return 'Business';
      if (id.startsWith('PEO')) return 'People';
      if (id.startsWith('GOV')) return 'Governance';
      if (id.startsWith('PLAT')) return 'Platform';
      if (id.startsWith('SEC')) return 'Security';
      if (id.startsWith('OPS')) return 'Operations';
      return 'General';
    };

    const itemCategory = getItemCategory(itemId);
    const providerName = llmConfig.provider;

    // 언어에 따른 프롬프트 설정
    const systemMessage = safeLanguage === 'ko' ? 
      `당신은 AWS MSP(Managed Service Provider) 프로그램의 전문가입니다. 

**중요**: 각 평가 항목마다 고유하고 구체적인 ${isDemonstration ? '시연 가이드' : '가상증빙예제'}를 생성해야 합니다. 절대로 일반적이거나 템플릿 형태의 답변을 하지 마세요.

**항목 정보**:
- 항목 ID: ${itemId}
- 카테고리: ${itemCategory}
- 제목: ${safeTitle}

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
- Title: ${safeTitle}

**Generation Principles**:
1. Focus exclusively on this specific item's requirements
2. Create customized content reflecting the item ID, title, and description
3. Incorporate ${itemCategory} category characteristics
4. Provide concrete examples usable in actual MSP environments
5. ${needsVisualContent ? 'Include ASCII art or text-based diagrams when visual materials are needed' : ''}

${isDemonstration ? 'Demonstration guides should present specific methods for actually demonstrating this particular item.' : 'Evidence examples should provide actual document or material examples to satisfy this specific item.'}`;

    const userPrompt = safeLanguage === 'ko' ? 
      `다음 AWS MSP 평가 항목에 대한 ${isDemonstration ? '시연 가이드' : '가상증빙예제-참고용'}를 생성해주세요:

**항목 ID**: ${itemId}
**카테고리**: ${itemCategory}
**평가 항목**: ${safeTitle}
**상세 설명**: ${safeDescription}
**필요한 증빙**: ${safeEvidenceRequired}
**AI 조언**: ${safeAdvice || '조언 없음'}

**중요**: 이 특정 항목(${itemId})에만 해당하는 맞춤형 내용을 생성하세요.

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

💡 **실무 팁**: [실제 준비 시 고려사항]` :
      `Please generate ${isDemonstration ? 'demonstration guide' : 'virtual evidence examples'} for the following AWS MSP assessment item:

**Item ID**: ${itemId}
**Category**: ${itemCategory}
**Assessment Item**: ${safeTitle}
**Detailed Description**: ${safeDescription}
**Evidence Required**: ${safeEvidenceRequired}
**AI Advice**: ${safeAdvice || 'No advice available'}

**IMPORTANT**: Generate customized content specific to this item (${itemId}) only.

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

💡 **Practical Tips**: [Considerations for actual preparation]`;

    // LLM 서비스를 통해 가상증빙예제 생성
    llmConfig.temperature = 0.9;
    llmConfig.maxTokens = 2000;
    
    const result = await callLLM(userPrompt, systemMessage, llmConfig);

    // 생성된 가상증빙예제를 서버 사이드 캐시에 저장
    setCachedVirtualEvidence(itemId, safeLanguage, result.content);

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
