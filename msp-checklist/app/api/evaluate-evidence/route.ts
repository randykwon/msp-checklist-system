import { NextRequest, NextResponse } from 'next/server';
import { createLLMService, LLMVisionMessage } from '@/lib/llm-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      itemId, 
      title, 
      description, 
      evidenceRequired, 
      advice,
      files, 
      language = 'en' 
    } = body;

    // LLM 서비스 초기화
    const llmService = createLLMService();

    // 더미 응답 처리 (API 키가 없을 때)
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.CLAUDE_API_KEY && !process.env.AWS_ACCESS_KEY_ID) {
      console.log('No LLM API key found, using dummy response');
      return NextResponse.json({
        evaluation: {
          score: 85,
          feedback: language === 'ko' ? 
            '🎯 **종합 평가**: 제출된 증빙 자료가 요구사항을 잘 충족하고 있습니다.\n\n📊 **세부 평가**:\n• 문서 완성도: 90점 - 필요한 정보가 모두 포함되어 있음\n• 품질 및 명확성: 85점 - 내용이 명확하고 이해하기 쉬움\n• 요구사항 충족도: 80점 - 대부분의 요구사항을 만족함\n\n💡 **개선 제안**:\n• 일부 세부 사항을 더 구체적으로 기술하면 좋겠습니다\n• 추가 메트릭이나 데이터가 있다면 더욱 강력한 증빙이 될 것입니다\n\n✅ **결론**: 현재 수준으로도 충분히 요구사항을 만족하며, 제안된 개선사항을 반영하면 더욱 완벽한 증빙이 될 것입니다.' :
            '🎯 **Overall Assessment**: The submitted evidence documents meet the requirements well.\n\n📊 **Detailed Evaluation**:\n• Document Completeness: 90 points - All necessary information is included\n• Quality & Clarity: 85 points - Content is clear and easy to understand\n• Requirement Fulfillment: 80 points - Most requirements are satisfied\n\n💡 **Improvement Suggestions**:\n• Some details could be described more specifically\n• Additional metrics or data would make the evidence even stronger\n\n✅ **Conclusion**: The current level sufficiently meets the requirements, and implementing the suggested improvements would make the evidence even more comprehensive.',
          evaluatedAt: new Date(),
          criteria: [
            {
              name: 'Document Completeness',
              nameKo: '문서 완성도',
              score: 90,
              comment: language === 'ko' ? '필요한 모든 정보가 포함되어 있습니다.' : 'All necessary information is included.',
              commentKo: '필요한 모든 정보가 포함되어 있습니다.'
            },
            {
              name: 'Quality & Clarity',
              nameKo: '품질 및 명확성',
              score: 85,
              comment: language === 'ko' ? '내용이 명확하고 이해하기 쉽습니다.' : 'Content is clear and easy to understand.',
              commentKo: '내용이 명확하고 이해하기 쉽습니다.'
            },
            {
              name: 'Requirement Fulfillment',
              nameKo: '요구사항 충족도',
              score: 80,
              comment: language === 'ko' ? '대부분의 요구사항을 만족합니다.' : 'Most requirements are satisfied.',
              commentKo: '대부분의 요구사항을 만족합니다.'
            }
          ]
        },
        provider: llmService.getProviderName(),
        isDummy: true
      });
    }

    // 파일 데이터 준비 (이미지와 PDF 모두 처리)
    const contentParts: any[] = [];
    
    // 이미지 파일들 처리
    const imageFiles = files.filter((file: any) => file.fileType === 'image');
    imageFiles.forEach((img: any) => {
      contentParts.push({
        type: "image_url" as const,
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64Data}`
        }
      });
    });
    
    // PDF 파일들 처리 (텍스트로 변환)
    const pdfFiles = files.filter((file: any) => file.fileType === 'pdf');
    let pdfTexts = '';
    if (pdfFiles.length > 0) {
      pdfTexts = pdfFiles.map((pdf: any, index: number) => 
        `\n\n--- PDF 문서 ${index + 1}: ${pdf.fileName} ---\n${pdf.extractedText || '텍스트 추출 실패'}`
      ).join('');
    }

    // 평가 프롬프트 생성
    const evaluationPrompt = language === 'ko' ? 
      `다음 AWS MSP 요구사항에 대한 증빙 자료를 평가해주세요:

**평가 항목**: ${title}
**설명**: ${description}
**증빙 요구사항**: ${evidenceRequired}
**조언**: ${advice}

**제출된 증빙 자료**:
- 이미지 파일: ${imageFiles.length}개
- PDF 문서: ${pdfFiles.length}개${pdfTexts}

**평가 기준**:
1. 문서 완성도 (0-100점): 필요한 정보가 모두 포함되어 있는가?
2. 품질 및 명확성 (0-100점): 내용이 명확하고 이해하기 쉬운가?
3. 요구사항 충족도 (0-100점): 명시된 요구사항을 얼마나 잘 충족하는가?

**응답 형식**:
🎯 **종합 평가**: [전체적인 평가 요약]

📊 **세부 평가**:
• 문서 완성도: [점수]점 - [평가 내용]
• 품질 및 명확성: [점수]점 - [평가 내용]  
• 요구사항 충족도: [점수]점 - [평가 내용]

💡 **개선 제안**:
• [구체적인 개선 방안들]

✅ **결론**: [최종 결론 및 권장사항]

종합 점수는 세 기준의 평균으로 계산하고, 객관적이고 건설적인 피드백을 제공해주세요.` :
      `Please evaluate the evidence documents for the following AWS MSP requirement:

**Assessment Item**: ${title}
**Description**: ${description}
**Evidence Required**: ${evidenceRequired}
**Advice**: ${advice}

**Submitted Evidence**:
- Image files: ${imageFiles.length}
- PDF documents: ${pdfFiles.length}${pdfTexts}

**Evaluation Criteria**:
1. Document Completeness (0-100 points): Are all necessary information included?
2. Quality & Clarity (0-100 points): Is the content clear and easy to understand?
3. Requirement Fulfillment (0-100 points): How well does it meet the specified requirements?

**Response Format**:
🎯 **Overall Assessment**: [Overall evaluation summary]

📊 **Detailed Evaluation**:
• Document Completeness: [score] points - [evaluation content]
• Quality & Clarity: [score] points - [evaluation content]
• Requirement Fulfillment: [score] points - [evaluation content]

💡 **Improvement Suggestions**:
• [Specific improvement recommendations]

✅ **Conclusion**: [Final conclusion and recommendations]

Calculate the overall score as the average of the three criteria and provide objective, constructive feedback.`;

    const systemMessage = language === 'ko' ? 
      "당신은 AWS MSP(Managed Service Provider) 프로그램의 전문 평가자입니다. 제출된 증빙 자료를 객관적이고 건설적으로 평가하여 파트너가 요구사항을 더 잘 충족할 수 있도록 도움을 제공합니다." :
      "You are an expert evaluator for the AWS MSP (Managed Service Provider) program. You objectively and constructively evaluate submitted evidence documents to help partners better meet the requirements.";

    // 메시지 구성
    const messages: LLMVisionMessage[] = [
      {
        role: 'system',
        content: [{ type: 'text', text: systemMessage }]
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: evaluationPrompt },
          ...contentParts
        ]
      }
    ];

    // LLM 서비스를 통해 평가 생성
    const result = await llmService.generateVision(messages, {
      temperature: 0.3,
      maxTokens: 1500
    });

    const evaluationText = result.content;
    
    // 점수 추출 (정규식으로 점수들을 찾아서 평균 계산)
    const scoreMatches = evaluationText.match(/(\d+)점/g) || [];
    const scores = scoreMatches.map(match => parseInt(match.replace('점', '')));
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 75;

    // 평가 기준별 점수 파싱 (간단한 파싱)
    const criteria = [
      {
        name: 'Document Completeness',
        nameKo: '문서 완성도',
        score: scores[0] || 75,
        comment: language === 'ko' ? '문서 완성도 평가 결과입니다.' : 'Document completeness evaluation result.',
        commentKo: '문서 완성도 평가 결과입니다.'
      },
      {
        name: 'Quality & Clarity',
        nameKo: '품질 및 명확성',
        score: scores[1] || 75,
        comment: language === 'ko' ? '품질 및 명확성 평가 결과입니다.' : 'Quality and clarity evaluation result.',
        commentKo: '품질 및 명확성 평가 결과입니다.'
      },
      {
        name: 'Requirement Fulfillment',
        nameKo: '요구사항 충족도',
        score: scores[2] || 75,
        comment: language === 'ko' ? '요구사항 충족도 평가 결과입니다.' : 'Requirement fulfillment evaluation result.',
        commentKo: '요구사항 충족도 평가 결과입니다.'
      }
    ];

    return NextResponse.json({
      evaluation: {
        score: averageScore,
        feedback: evaluationText,
        feedbackKo: language === 'ko' ? evaluationText : undefined,
        evaluatedAt: new Date(),
        criteria
      },
      provider: llmService.getProviderName(),
      usage: result.usage,
      isDummy: false
    });

  } catch (error: any) {
    console.error('Error evaluating evidence:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to evaluate evidence',
        details: error.message 
      },
      { status: 500 }
    );
  }
}