import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { 
  setDBConfig,
  getDBConfig,
  getActiveCacheVersion,
  getAdviceItems,
  getAdviceSummaryVersions,
  getAdviceSummaries,
  saveAdviceSummary,
  deleteAdviceSummaryVersion,
  generateSummaryVersion,
  callLLM,
  LLMConfig,
  getOrCreateInferenceProfile
} from '@msp/shared';

// DB 경로 설정 함수 - Admin에서 Main의 DB에 접근
function ensureDBConfig() {
  // 현재 작업 디렉토리 확인
  const cwd = process.cwd();
  
  // Admin 앱 디렉토리인지 확인 (admin 폴더 안에서 실행 중인 경우)
  if (cwd.endsWith('/admin') || cwd.endsWith('\\admin')) {
    const mainAppPath = path.join(cwd, '..');
    setDBConfig({ basePath: mainAppPath });
    console.log('[Advice Summary] Running from admin dir, using parent path:', mainAppPath);
  } else {
    // msp-checklist 루트에서 실행 중인 경우
    // DB 파일이 현재 디렉토리에 있는지 확인
    const dbPath = path.join(cwd, 'msp-assessment.db');
    if (fs.existsSync(dbPath)) {
      setDBConfig({ basePath: cwd });
      console.log('[Advice Summary] DB found in cwd:', cwd);
    } else {
      // msp-checklist 디렉토리 찾기
      const mspPath = path.join(cwd, 'msp-checklist');
      if (fs.existsSync(path.join(mspPath, 'msp-assessment.db'))) {
        setDBConfig({ basePath: mspPath });
        console.log('[Advice Summary] Using msp-checklist path:', mspPath);
      } else {
        console.error('[Advice Summary] Could not find DB files! cwd:', cwd);
      }
    }
  }
  
  console.log('[Advice Summary] Final DB Config:', getDBConfig());
}

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
        const versions = getAdviceSummaryVersions();
        return NextResponse.json({ success: true, versions });
      }

      case 'list': {
        if (!version) {
          return NextResponse.json({ error: 'version is required' }, { status: 400 });
        }
        const summaries = getAdviceSummaries(version, language);
        return NextResponse.json({ success: true, summaries, version });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: versions, list' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in advice-summary GET:', error);
    return NextResponse.json(
      { error: 'Failed to get summaries', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 모든 항목의 요약 생성
export async function POST(request: NextRequest) {
  try {
    // 매 요청마다 DB 경로 설정 확인
    ensureDBConfig();
    
    const { llmConfig: inputLlmConfig, sourceVersion, language = 'ko' } = await request.json();

    // 활성 버전 확인
    let adviceVersion = sourceVersion;
    if (!adviceVersion) {
      adviceVersion = getActiveCacheVersion('advice');
      console.log('[Advice Summary] Active version from DB:', adviceVersion);
    }

    if (!adviceVersion) {
      return NextResponse.json(
        { error: '활성화된 조언 캐시 버전이 없습니다.' },
        { status: 400 }
      );
    }

    // 조언 데이터 조회
    const adviceItems = getAdviceItems(adviceVersion, language as 'ko' | 'en');
    console.log(`[Advice Summary] Found ${adviceItems.length} advice items for version ${adviceVersion} (${language})`);

    if (adviceItems.length === 0) {
      return NextResponse.json(
        { error: `조언 데이터가 없습니다. (버전: ${adviceVersion})` },
        { status: 400 }
      );
    }

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
          console.error('[Advice Summary] Failed to find inference profile:', error.message);
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
    const summaryVersion = generateSummaryVersion(adviceVersion, language as 'ko' | 'en', finalLLMConfig.provider);

    console.log(`[Advice Summary] Generating summaries with version: ${summaryVersion}`);

    const systemPrompt = language === 'ko' 
      ? `당신은 AWS MSP 파트너 프로그램 전문가입니다.
제공된 증빙 준비 조언을 3-5줄로 핵심만 요약해주세요.

요약 규칙:
- 반드시 3-5줄 이내로 작성
- 핵심 준비 사항만 간결하게 정리
- 실무자가 바로 활용할 수 있는 형태
- 이모지 사용하여 가독성 향상
- 마크다운 형식 사용`
      : `You are an AWS MSP Partner Program expert.
Please summarize the provided evidence preparation advice in 3-5 lines, focusing on key points.

Summary rules:
- Must be within 3-5 lines
- Concisely organize only the key preparation items
- Format that practitioners can immediately use
- Use emojis to improve readability
- Use markdown format`;

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const item of adviceItems) {
      try {
        console.log(`[Advice Summary] Processing ${item.item_id}: ${item.title}`);
        
        const userPrompt = language === 'ko'
          ? `다음 조언을 3-5줄로 요약해주세요:

**항목 ID:** ${item.item_id}
**제목:** ${item.title}
**카테고리:** ${item.category}

**조언 내용:**
${item.advice}`
          : `Please summarize the following advice in 3-5 lines:

**Item ID:** ${item.item_id}
**Title:** ${item.title}
**Category:** ${item.category}

**Advice Content:**
${item.advice}`;

        const response = await callLLM(userPrompt, systemPrompt, finalLLMConfig);
        
        saveAdviceSummary(
          summaryVersion,
          item.item_id,
          item.category,
          item.title,
          response.content,
          language as 'ko' | 'en'
        );
        
        successCount++;
        console.log(`[Advice Summary] ✅ ${item.item_id} completed (${successCount}/${adviceItems.length})`);
        
        // Rate limiting - OpenAI는 TPM 제한이 있으므로 더 긴 대기 시간 필요
        const delayMs = finalLLMConfig.provider === 'openai' ? 2000 : 500;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
      } catch (error: any) {
        errorCount++;
        errors.push(`${item.item_id}: ${error.message}`);
        console.error(`[Advice Summary] ❌ ${item.item_id} failed:`, error.message);
      }
    }

    // 생성된 요약을 JSON 파일로 저장
    if (successCount > 0) {
      try {
        const cwd = process.cwd();
        const basePath = cwd.endsWith('/admin') || cwd.endsWith('\\admin') 
          ? path.join(cwd, '..') 
          : cwd;
        const summaryDir = path.join(basePath, 'cache', 'advice-summaries');
        
        if (!fs.existsSync(summaryDir)) {
          fs.mkdirSync(summaryDir, { recursive: true });
        }
        
        // 생성된 요약 데이터 조회
        const summaries = getAdviceSummaries(summaryVersion, language as 'ko' | 'en');
        
        const fileData = {
          version: summaryVersion,
          sourceVersion: adviceVersion,
          language,
          provider: finalLLMConfig.provider,
          model: finalLLMConfig.model,
          createdAt: new Date().toISOString(),
          totalItems: summaries.length,
          summaries: summaries.map(s => ({
            item_id: s.item_id,
            category: s.category,
            title: s.title,
            summary: s.summary,
          })),
        };
        
        const filename = `${summaryVersion}.json`;
        const filePath = path.join(summaryDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf-8');
        console.log(`[Advice Summary] Saved to file: ${filePath}`);
      } catch (fileError: any) {
        console.error('[Advice Summary] Failed to save file:', fileError.message);
      }
    }

    return NextResponse.json({
      success: true,
      version: summaryVersion,
      sourceVersion: adviceVersion,
      language,
      totalItems: adviceItems.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      provider: finalLLMConfig.provider,
      model: finalLLMConfig.model
    });

  } catch (error: any) {
    console.error('Error generating advice summaries:', error);
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

    const result = deleteAdviceSummaryVersion(version);

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

// PUT: 요약 데이터 가져오기 (cache 파일에서)
export async function PUT(request: NextRequest) {
  try {
    ensureDBConfig();
    
    const { action, summaryData } = await request.json();
    
    if (action !== 'import') {
      return NextResponse.json({ error: 'Invalid action. Use: import' }, { status: 400 });
    }
    
    if (!summaryData) {
      return NextResponse.json({ error: 'summaryData is required' }, { status: 400 });
    }
    
    // summaryData 구조 확인
    // { version: string, summaries: Array<{item_id, category, title, summary, language}> }
    // 또는 { version: string, ko: [...], en: [...] }
    
    let importedCount = 0;
    const version = summaryData.version;
    
    if (!version) {
      return NextResponse.json({ error: 'version is required in summaryData' }, { status: 400 });
    }
    
    // 형식 1: summaries 배열
    if (summaryData.summaries && Array.isArray(summaryData.summaries)) {
      for (const item of summaryData.summaries) {
        const saved = saveAdviceSummary(
          version,
          item.item_id,
          item.category,
          item.title,
          item.summary,
          item.language || 'ko'
        );
        if (saved) importedCount++;
      }
    }
    
    // 형식 2: ko/en 분리
    if (summaryData.ko && Array.isArray(summaryData.ko)) {
      for (const item of summaryData.ko) {
        const saved = saveAdviceSummary(
          version,
          item.item_id,
          item.category,
          item.title,
          item.summary,
          'ko'
        );
        if (saved) importedCount++;
      }
    }
    
    if (summaryData.en && Array.isArray(summaryData.en)) {
      for (const item of summaryData.en) {
        const saved = saveAdviceSummary(
          version,
          item.item_id,
          item.category,
          item.title,
          item.summary,
          'en'
        );
        if (saved) importedCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      version,
      importedCount,
      message: `${importedCount}개 요약 항목을 가져왔습니다.`
    });
    
  } catch (error: any) {
    console.error('Error importing advice summaries:', error);
    return NextResponse.json(
      { error: 'Failed to import summaries', details: error.message },
      { status: 500 }
    );
  }
}
