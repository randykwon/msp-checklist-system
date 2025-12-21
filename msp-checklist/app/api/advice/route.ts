import { NextRequest, NextResponse } from 'next/server';
import { createLLMService, LLMMessage } from '@/lib/llm-service';
import { getCachedAdvice, setCachedAdvice } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { itemId, title, description, evidenceRequired, language } = await request.json();

    // 먼저 서버 사이드 캐시에서 확인 (모든 사용자 공통)
    const cachedAdvice = getCachedAdvice(itemId, language);
    if (cachedAdvice) {
      return NextResponse.json({ 
        advice: cachedAdvice,
        provider: 'cached',
        isDummy: false,
        fromCache: true
      });
    }

    // 언어 설정
    const isKorean = language === 'ko';

    // LLM 서비스 초기화
    const llmService = createLLMService();

    // 더미 응답 처리 (API 키가 없을 때)
    const providerName = llmService.getProviderName();
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.CLAUDE_API_KEY && !process.env.AWS_ACCESS_KEY_ID) {
      const dummyAdvice = isKorean ? 
        `🎯 핵심 포인트:
• 공개 웹사이트에 AWS MSP 전용 랜딩 페이지 필요
• 최소 2개의 공개 사례 연구 링크 포함
• AWS 워크로드 관리 전문성 명시
• 차별화된 서비스 역량 강조

📝 증빙 준비 가이드:
• 회사 주요 웹사이트에 전용 페이지 생성
• 고객 사례 연구를 PDF 또는 웹페이지로 준비
• AWS 인증 및 파트너십 정보 포함
• 연락처 및 서비스 문의 방법 명시
• 서비스 차별화 요소 구체적으로 설명

⚠️ 주의사항:
• 일반적인 클라우드 서비스 페이지가 아닌 AWS 전용 페이지
• 사례 연구는 실제 고객 프로젝트여야 함
• 모든 링크가 정상 작동하는지 확인
• 고객 정보는 적절히 마스킹 처리

🔍 품질 확인 체크리스트:
• URL이 공개적으로 접근 가능한지 확인
• 모바일에서도 정상 표시되는지 테스트
• 사례 연구 링크가 모두 작동하는지 검증
• 페이지 로딩 속도 최적화 확인

💡 추가 팁:
• SEO 최적화로 검색 노출도 향상
• 정기적인 콘텐츠 업데이트로 최신성 유지
• 고객 추천사나 인증서 이미지 추가로 신뢰도 향상` :
        `🎯 Key Points:
• Public landing page dedicated to AWS MSP practice required
• Include links to at least 2 public case studies
• Clearly state expertise in AWS workload management
• Emphasize differentiated service capabilities

📝 Evidence Preparation Guide:
• Create dedicated page on company's main website
• Prepare customer case studies as PDFs or web pages
• Include AWS certifications and partnership information
• Provide contact information and service inquiry methods
• Describe service differentiators specifically

⚠️ Precautions:
• Must be AWS-specific page, not generic cloud services
• Case studies must be from actual customer projects
• Verify all links are working properly
• Properly mask customer information

🔍 Quality Check Checklist:
• Confirm URL is publicly accessible
• Test proper display on mobile devices
• Verify all case study links are functional
• Check page loading speed optimization

💡 Additional Tips:
• Improve search visibility with SEO optimization
• Maintain freshness with regular content updates
• Add customer testimonials or certification images for credibility`;

      return NextResponse.json({ 
        advice: dummyAdvice,
        provider: providerName,
        isDummy: true 
      });
    }

    // 언어에 따른 프롬프트 설정
    const systemMessage = isKorean ? 
      '당신은 AWS MSP 파트너 프로그램 전문가입니다. 파트너들이 검증 요구사항을 충족하기 위한 증빙을 준비할 때 실용적이고 구체적인 조언을 제공합니다.' :
      'You are an AWS MSP Partner Program expert. You provide practical and specific advice to help partners prepare evidence to meet validation requirements.';

    const userPrompt = isKorean ? 
      `AWS MSP 파트너 프로그램 검증 항목에 대한 증빙 준비 조언을 제공해주세요.

항목 ID: ${itemId}
제목: ${title}
설명: ${description}
필요한 증빙: ${evidenceRequired}

다음 형식으로 한국어로 답변해주세요:

🎯 핵심 포인트:
• (요구사항의 핵심 내용 3-4개)

📝 증빙 준비 가이드:
• (구체적인 준비 방법 4-5개)

⚠️ 주의사항:
• (피해야 할 실수들 3-4개)

🔍 품질 확인 체크리스트:
• (최종 확인 사항 3-4개)

💡 추가 팁:
• (실무적인 조언 2-3개)

답변은 실무진이 실제로 증빙을 준비할 때 도움이 되도록 구체적이고 실용적으로 작성해주세요.` :
      `Please provide evidence preparation advice for this AWS MSP Partner Program validation item.

Item ID: ${itemId}
Title: ${title}
Description: ${description}
Evidence Required: ${evidenceRequired}

Please respond in the following format:

🎯 Key Points:
• (3-4 core requirement points)

📝 Evidence Preparation Guide:
• (4-5 specific preparation methods)

⚠️ Precautions:
• (3-4 mistakes to avoid)

🔍 Quality Check Checklist:
• (3-4 final verification items)

💡 Additional Tips:
• (2-3 practical advice points)

Please make your response specific and practical to help practitioners actually prepare the evidence.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt }
    ];

    // LLM 서비스를 통해 조언 생성
    const result = await llmService.generateText(messages, {
      temperature: 0.7,
      maxTokens: 1500
    });

    // 생성된 조언을 서버 사이드 캐시에 저장 (모든 사용자 공통)
    setCachedAdvice(itemId, language, result.content);

    return NextResponse.json({ 
      advice: result.content,
      provider: providerName,
      usage: result.usage,
      isDummy: false,
      fromCache: false
    });

  } catch (error) {
    console.error('Error generating advice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}