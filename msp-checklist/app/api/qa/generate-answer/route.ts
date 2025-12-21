import { NextRequest, NextResponse } from 'next/server';
import { createLLMService, LLMMessage } from '@/lib/llm-service';
import { prerequisitesData } from '@/data/assessment-data';
import { technicalValidationData } from '@/data/technical-validation-data';
import Database from 'better-sqlite3';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { question, itemId, assessmentType } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Create LLM service
    const llmService = createLLMService();

    // 해당 항목의 조언과 가상증빙예제 가져오기
    let itemAdvice = '';
    let itemVirtualEvidence = '';
    let itemDetails = null;

    if (itemId && assessmentType) {
      try {
        // 평가 항목 상세 정보 가져오기
        const assessmentData = assessmentType === 'prerequisites' ? prerequisitesData : technicalValidationData;
        itemDetails = assessmentData.find(item => item.id === itemId);

        // 메인 데이터베이스에서 조언과 가상증빙예제 가져오기
        const dbPath = path.join(process.cwd(), 'msp-assessment.db');
        const db = new Database(dbPath);

        try {
          // 활성 버전 조회
          const activeVersionsQuery = db.prepare('SELECT version, cache_type FROM active_cache_versions');
          const activeVersionsResult = activeVersionsQuery.all() as any[];
          const activeAdviceVersion = activeVersionsResult.find(r => r.cache_type === 'advice')?.version;
          const activeVirtualEvidenceVersion = activeVersionsResult.find(r => r.cache_type === 'virtual_evidence')?.version;
          


          // 조언 캐시에서 해당 항목의 조언 가져오기 (메인 데이터베이스는 버전 필드가 없음)
          const adviceQuery = db.prepare('SELECT advice_content FROM advice_cache WHERE item_id = ? AND language = ?');
          const adviceResult = adviceQuery.get(itemId, 'ko') as any;
          if (adviceResult) {
            itemAdvice = adviceResult.advice_content;
          }

          // 가상증빙예제 캐시에서 해당 항목의 예제 가져오기 (메인 데이터베이스는 버전 필드가 없음)
          const virtualEvidenceQuery = db.prepare('SELECT virtual_evidence_content FROM virtual_evidence_cache WHERE item_id = ? AND language = ?');
          const virtualEvidenceResult = virtualEvidenceQuery.get(itemId, 'ko') as any;
          if (virtualEvidenceResult) {
            itemVirtualEvidence = virtualEvidenceResult.virtual_evidence_content;
          }
        } finally {
          db.close();
        }
      } catch (error) {
        console.error('Error fetching item context:', error);
      }
    }

    // 컨텍스트 정보 구성
    let contextInfo = '';
    if (itemDetails) {
      contextInfo += `\n**평가 항목 정보:**
- 항목 ID: ${itemDetails.id}
- 제목: ${itemDetails.titleKo || itemDetails.title}
- 설명: ${itemDetails.descriptionKo || itemDetails.description}
- 필요 증빙: ${itemDetails.evidenceRequiredKo || itemDetails.evidenceRequired}
- 카테고리: ${itemDetails.category}
- 필수 여부: ${itemDetails.isMandatory ? '필수' : '선택'}`;
    }

    if (itemAdvice) {
      contextInfo += `\n\n**해당 항목의 AI 조언:**
${itemAdvice}`;
    }

    if (itemVirtualEvidence) {
      contextInfo += `\n\n**해당 항목의 가상증빙예제:**
${itemVirtualEvidence}`;
    }

    // Prepare system prompt for MSP-specific context with item context
    const systemPrompt = `당신은 AWS MSP (Managed Service Provider) 파트너 프로그램의 전문 컨설턴트입니다. 
사용자의 질문에 대해 정확하고 실용적인 답변을 제공해야 합니다.

**핵심 원칙:**
1. 질문의 핵심 의도를 정확히 파악하고 직접적으로 답변하세요
2. 제공된 평가 항목의 조언과 가상증빙예제를 적극 활용하세요
3. 실무에서 바로 적용할 수 있는 구체적인 가이드라인을 제공하세요
4. 질문자가 궁금해하는 부분을 우선적으로 해결하세요

**답변 구성:**
1. **🎯 핵심 답변**: 질문에 대한 명확하고 간결한 답변을 먼저 제시
2. **📋 상세 설명**: 필요한 배경 정보와 구체적인 방법론 설명
3. **⚡ 실무 적용**: 제공된 가상증빙예제를 참고한 실제 구현 방법
4. **⚠️ 주의사항**: 놓치기 쉬운 중요한 포인트나 함정 요소
5. **💡 추가 팁**: 더 나은 결과를 위한 실무 노하우

**답변 스타일 가이드:**
- 한국어로 명확하고 이해하기 쉽게 작성
- 적절한 줄바꿈과 단락 구분으로 가독성 향상
- **굵은 글씨**로 핵심 키워드와 중요 문장 강조
- 이모지(🎯, 📋, ⚡, ⚠️, 💡, ✅, 📝, 🔍 등)를 활용한 시각적 구분
- 번호나 불릿 포인트로 구조화된 정보 제공
- 구체적인 예시와 단계별 가이드 포함
- 전문적이지만 접근하기 쉬운 톤 유지
- AWS MSP 파트너 프로그램 요구사항에 부합하는 내용`;

    const userPrompt = `다음 질문에 대해 전문적이고 실용적인 답변을 제공해 주세요:

**사용자 질문:** "${question}"

**관련 평가 항목:** ${assessmentType === 'prerequisites' ? '사전 요구사항' : '기술 검증'}
${contextInfo}

**답변 요청사항:**
1. 🎯 위 질문에 대한 **직접적이고 명확한 답변**을 제공하세요
2. 📚 제공된 평가 항목 정보, AI 조언, 가상증빙예제를 **적극 활용**하세요
3. ⚡ 실무에서 **바로 적용할 수 있는 구체적인 방법**을 제시하세요
4. ⚠️ 질문자가 놓칠 수 있는 **중요한 포인트를 강조**하세요
5. 📝 가능한 경우 제공된 가상증빙예제의 구체적인 내용을 참고하여 **실제 예시**를 들어주세요

**포맷팅 요구사항:**
- 각 섹션을 이모지와 함께 명확히 구분하세요
- **중요한 키워드와 문장은 굵은 글씨**로 강조하세요
- 적절한 줄바꿈으로 읽기 쉽게 구성하세요
- 번호나 불릿 포인트를 활용해 정보를 체계적으로 정리하세요
- 단락 간 적절한 공백을 두어 가독성을 높이세요

질문의 핵심 의도를 파악하고, 질문자가 원하는 정보를 우선적으로 제공해 주세요.`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    // Generate answer using LLM
    const response = await llmService.generateText(messages, {
      temperature: 0.6, // 질문에 정확하게 답변하기 위해 약간 낮춤
      maxTokens: 2500 // 더 상세한 답변을 위해 토큰 수 증가
    });

    return NextResponse.json({
      answer: response.content,
      usage: response.usage,
      provider: llmService.getProviderName(),
      contextUsed: {
        hasItemDetails: !!itemDetails,
        hasAdvice: !!itemAdvice,
        hasVirtualEvidence: !!itemVirtualEvidence
      }
    });

  } catch (error: any) {
    console.error('Error generating answer:', error);
    return NextResponse.json(
      { error: 'Failed to generate answer', details: error.message },
      { status: 500 }
    );
  }
}