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
      virtualEvidence,
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

    // 가상증빙예제 섹션 (있는 경우에만)
    const virtualEvidenceSection = virtualEvidence ? 
      (language === 'ko' ? 
        `\n\n**🔍 참고용 가상증빙예제** (이 수준의 증빙이 기대됩니다):\n${virtualEvidence}` :
        `\n\n**🔍 Reference Virtual Evidence Example** (This level of evidence is expected):\n${virtualEvidence}`) : '';

    // 조언 섹션 (있는 경우에만)
    const adviceSection = advice ? 
      (language === 'ko' ? 
        `\n\n**💡 전문가 조언** (이 조언을 기준으로 평가하세요):\n${advice}` :
        `\n\n**💡 Expert Advice** (Evaluate based on this advice):\n${advice}`) : '';

    // 평가 프롬프트 생성 (더 엄격한 버전)
    const evaluationPrompt = language === 'ko' ? 
      `당신은 AWS MSP 프로그램의 **엄격한** 심사관입니다. 제출된 증빙 자료를 아래 기준에 따라 **객관적이고 엄격하게** 평가해주세요.

## 평가 대상 항목
- **항목 ID**: ${itemId}
- **항목명**: ${title}
- **설명**: ${description}
- **증빙 요구사항**: ${evidenceRequired}
${adviceSection}
${virtualEvidenceSection}

## 제출된 증빙 자료
- 이미지 파일: ${imageFiles.length}개
- PDF 문서: ${pdfFiles.length}개${pdfTexts}

## 엄격한 평가 기준 (각 항목 0-100점)

### 1. 요구사항 충족도 (가장 중요)
- 증빙 요구사항에 명시된 모든 항목이 포함되어 있는가?
- 가상증빙예제에서 제시한 수준의 상세함을 갖추고 있는가?
- 누락된 필수 요소가 있으면 **대폭 감점** (각 누락 항목당 -15점)

### 2. 문서 완성도
- 전문가 조언에서 권장한 내용이 반영되어 있는가?
- 구체적인 수치, 날짜, 담당자 정보가 포함되어 있는가?
- 스크린샷이나 문서가 실제 운영 환경의 것인가?
- 모호하거나 일반적인 내용만 있으면 **감점**

### 3. 품질 및 신뢰성
- 문서의 진위성과 신뢰성이 확인되는가?
- 이미지가 선명하고 내용이 읽을 수 있는가?
- 날짜와 버전 정보가 최신인가?

## 평가 시 주의사항
⚠️ **엄격하게 평가하세요**:
- 80점 이상: 요구사항을 완벽히 충족하고 가상증빙예제 수준 이상
- 60-79점: 대부분 충족하나 일부 보완 필요
- 40-59점: 기본 요구사항만 충족, 상당한 보완 필요
- 40점 미만: 요구사항 미충족, 재제출 필요

## 응답 형식
🎯 **종합 평가**: [합격/조건부 합격/보완 필요/재제출 필요] - [한 줄 요약]

📊 **세부 평가**:
• 요구사항 충족도: [점수]점 - [구체적인 평가 내용과 근거]
• 문서 완성도: [점수]점 - [구체적인 평가 내용과 근거]
• 품질 및 신뢰성: [점수]점 - [구체적인 평가 내용과 근거]

❌ **부족한 점** (있는 경우):
• [누락되거나 부족한 구체적인 항목들]

💡 **개선 제안**:
• [구체적이고 실행 가능한 개선 방안]

✅ **결론**: [최종 판정과 다음 단계 권장사항]` :

      `You are a **strict** auditor for the AWS MSP program. Evaluate the submitted evidence **objectively and rigorously** based on the criteria below.

## Assessment Item
- **Item ID**: ${itemId}
- **Title**: ${title}
- **Description**: ${description}
- **Evidence Required**: ${evidenceRequired}
${adviceSection}
${virtualEvidenceSection}

## Submitted Evidence
- Image files: ${imageFiles.length}
- PDF documents: ${pdfFiles.length}${pdfTexts}

## Strict Evaluation Criteria (0-100 points each)

### 1. Requirement Fulfillment (Most Important)
- Are all items specified in the evidence requirements included?
- Does it meet the level of detail shown in the virtual evidence example?
- **Significant deduction** for missing required elements (-15 points per missing item)

### 2. Document Completeness
- Are the recommendations from expert advice reflected?
- Are specific numbers, dates, and responsible parties included?
- Are screenshots/documents from actual production environment?
- **Deduct points** for vague or generic content

### 3. Quality & Reliability
- Can the authenticity and reliability of documents be verified?
- Are images clear and readable?
- Are dates and version information current?

## Evaluation Guidelines
⚠️ **Be strict**:
- 80+ points: Fully meets requirements, exceeds virtual evidence example level
- 60-79 points: Mostly meets requirements, some improvements needed
- 40-59 points: Only basic requirements met, significant improvements needed
- Below 40: Requirements not met, resubmission required

## Response Format
🎯 **Overall Assessment**: [Pass/Conditional Pass/Needs Improvement/Resubmit Required] - [One-line summary]

📊 **Detailed Evaluation**:
• Requirement Fulfillment: [score] points - [Specific evaluation with evidence]
• Document Completeness: [score] points - [Specific evaluation with evidence]
• Quality & Reliability: [score] points - [Specific evaluation with evidence]

❌ **Deficiencies** (if any):
• [Specific missing or insufficient items]

💡 **Improvement Suggestions**:
• [Specific and actionable improvement recommendations]

✅ **Conclusion**: [Final verdict and recommended next steps]`;

    const systemMessage = language === 'ko' ? 
      "당신은 AWS MSP(Managed Service Provider) 프로그램의 엄격한 심사관입니다. 제출된 증빙 자료가 AWS의 높은 기준을 충족하는지 객관적이고 비판적으로 평가합니다. 관대한 평가는 파트너에게 도움이 되지 않습니다. 부족한 점을 명확히 지적하여 실제 심사에서 통과할 수 있도록 도와주세요." :
      "You are a strict auditor for the AWS MSP (Managed Service Provider) program. You objectively and critically evaluate whether submitted evidence meets AWS's high standards. Lenient evaluation does not help partners. Clearly point out deficiencies to help them pass the actual audit.";

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