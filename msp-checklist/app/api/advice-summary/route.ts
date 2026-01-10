import { NextRequest, NextResponse } from 'next/server';
import { callLLM, LLMConfig, getOrCreateInferenceProfile } from '@/lib/llm-service';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Inference Profile이 필요한 모델 목록
const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

interface AdviceItem {
  item_id: string;
  category: string;
  title: string;
  advice: string;
  language: string;
}

interface SummaryItem {
  id: number;
  version: string;
  item_id: string;
  category: string;
  title: string;
  summary: string;
  language: string;
  created_at: string;
}

// 요약 캐시 테이블 초기화
function initSummaryTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS advice_summary_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      language TEXT DEFAULT 'ko',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(version, item_id, language)
    )
  `);
  
  // 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_summary_version ON advice_summary_cache(version);
    CREATE INDEX IF NOT EXISTS idx_summary_item ON advice_summary_cache(item_id);
  `);
}

// GET: 요약 버전 목록 또는 특정 버전의 요약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const version = searchParams.get('version');
    const language = searchParams.get('language') || 'ko';
    const itemId = searchParams.get('itemId');

    const cacheDbPath = path.join(process.cwd(), 'advice-cache.db');
    
    if (!fs.existsSync(cacheDbPath)) {
      return NextResponse.json({ summaries: [], versions: [] });
    }
    
    const db = new Database(cacheDbPath);
    initSummaryTable(db);

    try {
      switch (action) {
        case 'versions': {
          // 요약 버전 목록 조회
          const versions = db.prepare(`
            SELECT 
              version,
              MIN(created_at) as created_at,
              COUNT(DISTINCT item_id) as item_count
            FROM advice_summary_cache
            GROUP BY version
            ORDER BY created_at DESC
          `).all() as Array<{version: string; created_at: string; item_count: number}>;
          
          return NextResponse.json({ success: true, versions });
        }

        case 'list': {
          // 특정 버전의 모든 요약 조회
          if (!version) {
            return NextResponse.json({ error: 'version is required' }, { status: 400 });
          }
          
          const summaries = db.prepare(`
            SELECT id, version, item_id, category, title, summary, language, created_at
            FROM advice_summary_cache
            WHERE version = ? AND language = ?
            ORDER BY category, item_id
          `).all(version, language) as SummaryItem[];
          
          return NextResponse.json({ success: true, summaries, version });
        }

        case 'item': {
          // 특정 항목의 요약 조회
          if (!itemId) {
            return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
          }
          
          let query = `
            SELECT id, version, item_id, category, title, summary, language, created_at
            FROM advice_summary_cache
            WHERE item_id = ? AND language = ?
          `;
          const params: any[] = [itemId, language];
          
          if (version) {
            query += ' AND version = ?';
            params.push(version);
          }
          
          query += ' ORDER BY created_at DESC';
          
          const summaries = db.prepare(query).all(...params) as SummaryItem[];
          
          return NextResponse.json({ success: true, summaries });
        }

        default:
          return NextResponse.json({ error: 'Invalid action. Use: versions, list, item' }, { status: 400 });
      }
    } finally {
      db.close();
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
    const { llmConfig, sourceVersion, language = 'ko' } = await request.json();

    // 활성 버전 또는 지정된 버전에서 조언 데이터 가져오기
    const mainDbPath = path.join(process.cwd(), 'msp-assessment.db');
    const mainDb = new Database(mainDbPath);
    
    let adviceVersion = sourceVersion;
    if (!adviceVersion) {
      try {
        const versionResult = mainDb.prepare('SELECT version FROM active_cache_versions WHERE cache_type = ?').get('advice') as { version: string } | undefined;
        adviceVersion = versionResult?.version;
      } catch (e) {
        console.error('Error getting active version:', e);
      }
    }
    mainDb.close();

    if (!adviceVersion) {
      return NextResponse.json(
        { error: '활성화된 조언 캐시 버전이 없습니다.' },
        { status: 400 }
      );
    }

    // 조언 데이터 조회
    const cacheDbPath = path.join(process.cwd(), 'advice-cache.db');
    if (!fs.existsSync(cacheDbPath)) {
      return NextResponse.json(
        { error: '캐시 데이터베이스가 없습니다.' },
        { status: 400 }
      );
    }
    
    const cacheDb = new Database(cacheDbPath);
    initSummaryTable(cacheDb);
    
    const adviceItems = cacheDb.prepare(`
      SELECT item_id, category, title, advice, language 
      FROM advice_cache 
      WHERE version = ? AND language = ?
      ORDER BY category, item_id
    `).all(adviceVersion, language) as AdviceItem[];

    if (adviceItems.length === 0) {
      cacheDb.close();
      return NextResponse.json(
        { error: language === 'ko' ? `조언 데이터가 없습니다. (버전: ${adviceVersion})` : `No advice data found. (version: ${adviceVersion})` },
        { status: 400 }
      );
    }

    console.log(`[Advice Summary] Found ${adviceItems.length} advice items for version ${adviceVersion} (${language})`);

    // LLM 설정 처리
    let finalLLMConfig: LLMConfig;
    
    if (llmConfig) {
      // Inference Profile 자동 찾기 처리
      if (llmConfig.provider === 'bedrock' && 
          INFERENCE_PROFILE_REQUIRED_MODELS.includes(llmConfig.model) &&
          llmConfig.autoCreateInferenceProfile) {
        try {
          const tempConfig: LLMConfig = {
            provider: 'bedrock',
            model: llmConfig.model,
            awsRegion: llmConfig.awsRegion || 'ap-northeast-2',
            awsAccessKeyId: llmConfig.awsAccessKeyId,
            awsSecretAccessKey: llmConfig.awsSecretAccessKey,
          };
          const inferenceProfileArn = await getOrCreateInferenceProfile(tempConfig, llmConfig.model);
          if (inferenceProfileArn) {
            llmConfig.inferenceProfileArn = inferenceProfileArn;
          }
        } catch (error: any) {
          console.error('[Advice Summary] Failed to find inference profile:', error.message);
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
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const summaryVersion = `summary_${adviceVersion}_${language}_${timestamp}_${finalLLMConfig.provider}`;

    console.log(`[Advice Summary] Generating summaries with version: ${summaryVersion}`);

    // 각 항목별 요약 생성 (언어별 프롬프트)
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

    const insertStmt = cacheDb.prepare(`
      INSERT OR REPLACE INTO advice_summary_cache 
      (version, item_id, category, title, summary, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

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
        
        insertStmt.run(
          summaryVersion,
          item.item_id,
          item.category,
          item.title,
          response.content,
          language
        );
        
        successCount++;
        console.log(`[Advice Summary] ✅ ${item.item_id} completed (${successCount}/${adviceItems.length})`);
        
        // Rate limiting - 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        errorCount++;
        errors.push(`${item.item_id}: ${error.message}`);
        console.error(`[Advice Summary] ❌ ${item.item_id} failed:`, error.message);
      }
    }

    cacheDb.close();

    // 결과를 파일로도 저장
    const summaryDir = path.join(process.cwd(), 'cache', 'advice-summaries');
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }
    
    const summaryFilePath = path.join(summaryDir, `${summaryVersion}.json`);
    
    // 저장된 요약 다시 조회
    const finalDb = new Database(cacheDbPath);
    const savedSummaries = finalDb.prepare(`
      SELECT item_id, category, title, summary 
      FROM advice_summary_cache 
      WHERE version = ? AND language = ?
      ORDER BY category, item_id
    `).all(summaryVersion, language);
    finalDb.close();
    
    fs.writeFileSync(summaryFilePath, JSON.stringify({
      version: summaryVersion,
      sourceVersion: adviceVersion,
      language,
      provider: finalLLMConfig.provider,
      model: finalLLMConfig.model,
      createdAt: new Date().toISOString(),
      totalItems: adviceItems.length,
      successCount,
      errorCount,
      summaries: savedSummaries
    }, null, 2));

    return NextResponse.json({
      success: true,
      version: summaryVersion,
      sourceVersion: adviceVersion,
      language,
      totalItems: adviceItems.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      savedTo: `${summaryVersion}.json`,
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

    const cacheDbPath = path.join(process.cwd(), 'advice-cache.db');
    if (!fs.existsSync(cacheDbPath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }
    
    const db = new Database(cacheDbPath);
    
    try {
      const result = db.prepare('DELETE FROM advice_summary_cache WHERE version = ?').run(version);
      
      if (result.changes > 0) {
        return NextResponse.json({ 
          success: true, 
          message: `버전 ${version}이 삭제되었습니다. (${result.changes}개 항목)` 
        });
      } else {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      }
    } finally {
      db.close();
    }

  } catch (error: any) {
    console.error('Error deleting summary version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version', details: error.message },
      { status: 500 }
    );
  }
}
