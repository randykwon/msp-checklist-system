import { NextRequest, NextResponse } from 'next/server';
import { createLLMService, LLMMessage, LLMConfig, getOrCreateInferenceProfile } from '@/lib/llm-service';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Inference Profile이 필요한 모델 목록
const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

interface CacheItem {
  item_id: string;
  category: string;
  title: string;
  advice_content?: string;
  virtual_evidence_content?: string;
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    const { type, llmConfig } = await request.json();

    if (!type || !['advice', 'virtual_evidence'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "advice" or "virtual_evidence"' },
        { status: 400 }
      );
    }

    // 활성 버전 조회
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    const db = new Database(dbPath);
    
    let activeVersion: string | null = null;
    try {
      const cacheType = type === 'advice' ? 'advice' : 'virtual_evidence';
      const versionQuery = db.prepare('SELECT version FROM active_cache_versions WHERE cache_type = ?');
      const versionResult = versionQuery.get(cacheType) as { version: string } | undefined;
      activeVersion = versionResult?.version || null;
    } catch (e) {
      console.error('Error getting active version:', e);
    }

    if (!activeVersion) {
      db.close();
      return NextResponse.json(
        { error: `활성화된 ${type === 'advice' ? '조언' : '가상증빙'} 캐시 버전이 없습니다.` },
        { status: 400 }
      );
    }

    // 캐시 데이터 조회
    let cacheItems: CacheItem[] = [];
    try {
      if (type === 'advice') {
        const query = db.prepare(`
          SELECT item_id, category, title, advice_content, language 
          FROM advice_cache 
          WHERE version = ? AND language = 'ko'
          ORDER BY category, item_id
        `);
        cacheItems = query.all(activeVersion) as CacheItem[];
      } else {
        const query = db.prepare(`
          SELECT item_id, category, title, virtual_evidence_content, language 
          FROM virtual_evidence_cache 
          WHERE version = ? AND language = 'ko'
          ORDER BY category, item_id
        `);
        cacheItems = query.all(activeVersion) as CacheItem[];
      }
    } catch (e) {
      console.error('Error getting cache items:', e);
    }
    
    db.close();

    if (cacheItems.length === 0) {
      return NextResponse.json(
        { error: `캐시 데이터가 없습니다. (버전: ${activeVersion})` },
        { status: 400 }
      );
    }

    // LLM 설정 처리
    let finalLLMConfig: LLMConfig | undefined = undefined;
    
    if (llmConfig) {
      console.log('[Generate Summary] Using custom LLM config:', llmConfig.provider, llmConfig.model);
      
      // Inference Profile 자동 찾기 처리
      if (llmConfig.provider === 'bedrock' && 
          INFERENCE_PROFILE_REQUIRED_MODELS.includes(llmConfig.model) &&
          llmConfig.autoCreateInferenceProfile) {
        try {
          console.log('[Generate Summary] Auto-finding inference profile for:', llmConfig.model);
          const inferenceProfileArn = await getOrCreateInferenceProfile(
            llmConfig.model,
            llmConfig.awsRegion || 'ap-northeast-2',
            llmConfig.awsAccessKeyId,
            llmConfig.awsSecretAccessKey
          );
          llmConfig.inferenceProfileArn = inferenceProfileArn;
          console.log('[Generate Summary] Found inference profile:', inferenceProfileArn);
        } catch (error: any) {
          console.error('[Generate Summary] Failed to find inference profile:', error.message);
          return NextResponse.json(
            { error: `Inference Profile 자동 찾기 실패: ${error.message}` },
            { status: 500 }
          );
        }
      }
      
      finalLLMConfig = {
        provider: llmConfig.provider,
        model: llmConfig.model,
        apiKey: llmConfig.apiKey,
        awsRegion: llmConfig.awsRegion,
        awsAccessKeyId: llmConfig.awsAccessKeyId,
        awsSecretAccessKey: llmConfig.awsSecretAccessKey,
        inferenceProfileArn: llmConfig.inferenceProfileArn,
      };
    }

    // LLM 서비스 생성
    const llmService = createLLMService(finalLLMConfig);

    // 카테고리별로 그룹화
    const categorizedItems: Record<string, CacheItem[]> = {};
    for (const item of cacheItems) {
      if (!categorizedItems[item.category]) {
        categorizedItems[item.category] = [];
      }
      categorizedItems[item.category].push(item);
    }

    // 요약 생성을 위한 컨텐츠 준비
    let contentForSummary = '';
    for (const [category, items] of Object.entries(categorizedItems)) {
      contentForSummary += `\n## ${category}\n`;
      for (const item of items) {
        const content = type === 'advice' ? item.advice_content : item.virtual_evidence_content;
        if (content) {
          // 각 항목의 첫 500자만 포함 (토큰 제한)
          const truncatedContent = content.length > 500 ? content.substring(0, 500) + '...' : content;
          contentForSummary += `\n### ${item.item_id}: ${item.title}\n${truncatedContent}\n`;
        }
      }
    }

    // 요약 프롬프트
    const systemPrompt = type === 'advice' 
      ? `당신은 AWS MSP 파트너 프로그램 전문가입니다. 
제공된 증빙 준비 조언 내용을 분석하여 핵심 내용을 15줄 이내로 요약해주세요.

요약 형식:
- 카테고리별 핵심 포인트를 간결하게 정리
- 가장 중요한 준비 사항 강조
- 실무자가 빠르게 파악할 수 있도록 구성
- 이모지를 적절히 사용하여 가독성 향상`
      : `당신은 AWS MSP 파트너 프로그램 전문가입니다.
제공된 가상증빙예제 내용을 분석하여 핵심 내용을 15줄 이내로 요약해주세요.

요약 형식:
- 카테고리별 증빙 유형 정리
- 필수 증빙 자료 목록
- 증빙 작성 시 주의사항
- 이모지를 적절히 사용하여 가독성 향상`;

    const userPrompt = `다음 ${type === 'advice' ? '증빙 준비 조언' : '가상증빙예제'} 내용을 15줄 이내로 요약해주세요:

${contentForSummary}

**요약 작성 규칙:**
1. 반드시 15줄 이내로 작성
2. 핵심 내용만 간결하게 정리
3. 카테고리별로 구분하여 정리
4. 실무자가 바로 활용할 수 있는 형태로 작성
5. 마크다운 형식 사용`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // LLM 호출
    const response = await llmService.generateText(messages, {
      temperature: llmConfig?.temperature || 0.5,
      maxTokens: llmConfig?.maxTokens || 2000
    });

    // 요약 결과 저장 (선택적)
    const summaryDir = path.join(process.cwd(), 'cache', 'summaries');
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryFileName = `${type}_summary_${activeVersion}_${timestamp}.md`;
    const summaryPath = path.join(summaryDir, summaryFileName);
    fs.writeFileSync(summaryPath, response.content);

    return NextResponse.json({
      success: true,
      summary: response.content,
      version: activeVersion,
      itemCount: cacheItems.length,
      provider: llmService.getProviderName(),
      usage: response.usage,
      savedTo: summaryFileName
    });

  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', details: error.message },
      { status: 500 }
    );
  }
}
