import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { 
  setDBConfig,
  getActiveCacheVersion,
  getVirtualEvidenceItems,
  getVirtualEvidenceSummaryVersions,
  getVirtualEvidenceSummaries,
  saveVirtualEvidenceSummary,
  deleteVirtualEvidenceSummaryVersion,
  generateVESummaryVersion,
  callLLM,
  LLMConfig,
  getOrCreateInferenceProfile
} from '@msp/shared';

// DB 경로 설정 (Admin에서 Main의 DB에 접근)
const mainAppPath = path.join(process.cwd(), '..');
setDBConfig({ basePath: mainAppPath });

const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

// GET: 요약 버전 목록 또는 특정 버전의 요약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const version = searchParams.get('version');
    const language = (searchParams.get('language') || 'ko') as 'ko' | 'en';

    switch (action) {
      case 'versions': {
        const versions = getVirtualEvidenceSummaryVersions();
        return NextResponse.json({ success: true, versions });
      }

      case 'list': {
        if (!version) {
          return NextResponse.json({ error: 'version is required' }, { status: 400 });
        }
        const summaries = getVirtualEvidenceSummaries(version, language);
        return NextResponse.json({ success: true, summaries, version });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: versions, list' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in virtual-evidence-summary GET:', error);
    return NextResponse.json(
      { error: 'Failed to get summaries', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 모든 항목의 요약 생성
export async function POST(request: NextRequest) {
  try {
    const { llmConfig: inputLlmConfig, sourceVersion, language = 'ko' } = await request.json();

    // 활성 버전 확인
    let veVersion = sourceVersion;
    if (!veVersion) {
      veVersion = getActiveCacheVersion('virtualEvidence');
    }

    if (!veVersion) {
      return NextResponse.json(
        { error: '활성화된 가상증빙예제 캐시 버전이 없습니다.' },
        { status: 400 }
      );
    }

    // 가상증빙예제 데이터 조회
    const veItems = getVirtualEvidenceItems(veVersion, language as 'ko' | 'en');

    if (veItems.length === 0) {
      return NextResponse.json(
        { error: `가상증빙예제 데이터가 없습니다. (버전: ${veVersion})` },
        { status: 400 }
      );
    }

    console.log(`[VE Summary] Found ${veItems.length} items for version ${veVersion} (${language})`);

    // LLM 설정 처리
    let finalLLMConfig: LLMConfig;
    
    if (inputLlmConfig) {
      if (inputLlmConfig.provider === 'bedrock' && 
          INFERENCE_PROFILE_REQUIRED_MODELS.includes(inputLlmConfig.model) &&
          inputLlmConfig.autoCreateInferenceProfile) {
        try {
          const tempConfig: LLMConfig = {
            provider: 'bedrock',
            model: inputLlmConfig.model,
            awsRegion: inputLlmConfig.awsRegion || 'ap-northeast-2',
            awsAccessKeyId: inputLlmConfig.awsAccessKeyId,
            awsSecretAccessKey: inputLlmConfig.awsSecretAccessKey,
          };
          const inferenceProfileArn = await getOrCreateInferenceProfile(tempConfig, inputLlmConfig.model);
          if (inferenceProfileArn) {
            inputLlmConfig.inferenceProfileArn = inferenceProfileArn;
          }
        } catch (error: any) {
          console.error('[VE Summary] Failed to find inference profile:', error.message);
        }
      }
      
      finalLLMConfig = {
        provider: inputLlmConfig.provider,
        model: inputLlmConfig.model,
        apiKey: inputLlmConfig.apiKey,
        awsRegion: inputLlmConfig.awsRegion,
        awsAccessKeyId: inputLlmConfig.awsAccessKeyId,
        awsSecretAccessKey: inputLlmConfig.awsSecretAccessKey,
        inferenceProfileArn: inputLlmConfig.inferenceProfileArn,
        temperature: 0.5,
        maxTokens: 1000,
      };
    } else {
      finalLLMConfig = {
        provider: 'bedrock',
        model: process.env.BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        awsRegion: process.env.AWS_REGION || 'ap-northeast-2',
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        temperature: 0.5,
        maxTokens: 1000,
      };
    }

    // 새 요약 버전 생성
    const summaryVersion = generateVESummaryVersion(veVersion, language as 'ko' | 'en', finalLLMConfig.provider);

    console.log(`[VE Summary] Generating summaries with version: ${summaryVersion}`);

    const systemPrompt = language === 'ko' 
      ? `당신은 AWS MSP 파트너 프로그램 전문가입니다.
제공된 가상 증빙 예제를 3-5줄로 핵심만 요약해주세요.

요약 규칙:
- 반드시 3-5줄 이내로 작성
- 핵심 증빙 내용만 간결하게 정리
- 실무자가 바로 참고할 수 있는 형태
- 이모지 사용하여 가독성 향상
- 마크다운 형식 사용`
      : `You are an AWS MSP Partner Program expert.
Please summarize the provided virtual evidence example in 3-5 lines, focusing on key points.

Summary rules:
- Must be within 3-5 lines
- Concisely organize only the key evidence content
- Format that practitioners can immediately reference
- Use emojis to improve readability
- Use markdown format`;

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const item of veItems) {
      try {
        console.log(`[VE Summary] Processing ${item.item_id}: ${item.title}`);
        
        const userPrompt = language === 'ko'
          ? `다음 가상 증빙 예제를 3-5줄로 요약해주세요:

**항목 ID:** ${item.item_id}
**제목:** ${item.title}
**카테고리:** ${item.category}

**가상 증빙 예제:**
${item.virtual_evidence}`
          : `Please summarize the following virtual evidence example in 3-5 lines:

**Item ID:** ${item.item_id}
**Title:** ${item.title}
**Category:** ${item.category}

**Virtual Evidence Example:**
${item.virtual_evidence}`;

        const response = await callLLM(userPrompt, systemPrompt, finalLLMConfig);
        
        saveVirtualEvidenceSummary(
          summaryVersion,
          item.item_id,
          item.category,
          item.title,
          response.content,
          language as 'ko' | 'en'
        );
        
        successCount++;
        console.log(`[VE Summary] ✅ ${item.item_id} completed (${successCount}/${veItems.length})`);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        errorCount++;
        errors.push(`${item.item_id}: ${error.message}`);
        console.error(`[VE Summary] ❌ ${item.item_id} failed:`, error.message);
      }
    }

    return NextResponse.json({
      success: true,
      version: summaryVersion,
      sourceVersion: veVersion,
      language,
      totalItems: veItems.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      provider: finalLLMConfig.provider,
      model: finalLLMConfig.model
    });

  } catch (error: any) {
    console.error('Error generating virtual evidence summaries:', error);
    return NextResponse.json(
      { error: 'Failed to generate summaries', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 요약 버전 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');

    if (!version) {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    const result = deleteVirtualEvidenceSummaryVersion(version);

    if (result.success && result.deletedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `버전 ${version}이 삭제되었습니다. (${result.deletedCount}개 항목)` 
      });
    } else {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Error deleting summary version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version', details: error.message },
      { status: 500 }
    );
  }
}
