import { NextRequest } from 'next/server';
import { callLLM, LLMConfig, getOrCreateInferenceProfile } from '@/lib/llm-service';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

interface VirtualEvidenceItem {
  item_id: string;
  category: string;
  title: string;
  virtual_evidence: string;
  language: string;
}

function initSummaryTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS virtual_evidence_summary_cache (
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
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { llmConfig: inputLlmConfig, sourceVersion, language = 'ko' } = await request.json();

        // 활성 버전 확인
        const mainDbPath = path.join(process.cwd(), 'msp-assessment.db');
        const mainDb = new Database(mainDbPath);
        
        let veVersion = sourceVersion;
        if (!veVersion) {
          try {
            const versionResult = mainDb.prepare('SELECT version FROM active_cache_versions WHERE cache_type = ?').get('virtualEvidence') as { version: string } | undefined;
            veVersion = versionResult?.version;
          } catch (e) {
            console.error('Error getting active version:', e);
          }
        }
        mainDb.close();

        if (!veVersion) {
          sendEvent({ type: 'error', message: '활성화된 가상증빙예제 캐시 버전이 없습니다.' });
          controller.close();
          return;
        }

        // 가상증빙예제 데이터 조회
        const cacheDbPath = path.join(process.cwd(), 'virtual-evidence-cache.db');
        if (!fs.existsSync(cacheDbPath)) {
          sendEvent({ type: 'error', message: '캐시 데이터베이스가 없습니다.' });
          controller.close();
          return;
        }
        
        const cacheDb = new Database(cacheDbPath);
        initSummaryTable(cacheDb);
        
        const veItems = cacheDb.prepare(`
          SELECT item_id, category, title, virtual_evidence, language 
          FROM virtual_evidence_cache 
          WHERE version = ? AND language = ?
          ORDER BY category, item_id
        `).all(veVersion, language) as VirtualEvidenceItem[];

        if (veItems.length === 0) {
          cacheDb.close();
          sendEvent({ type: 'error', message: `가상증빙예제 데이터가 없습니다. (버전: ${veVersion})` });
          controller.close();
          return;
        }

        // LLM 설정
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
              console.error('Failed to find inference profile:', error.message);
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

        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
        const summaryVersion = `ve_summary_${veVersion}_${language}_${timestamp}_${finalLLMConfig.provider}`;

        sendEvent({ 
          type: 'start', 
          version: summaryVersion,
          sourceVersion: veVersion,
          totalItems: veItems.length,
          language,
          provider: finalLLMConfig.provider,
          model: finalLLMConfig.model
        });

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

        const insertStmt = cacheDb.prepare(`
          INSERT OR REPLACE INTO virtual_evidence_summary_cache 
          (version, item_id, category, title, summary, language, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < veItems.length; i++) {
          const item = veItems[i];
          
          sendEvent({
            type: 'progress',
            current: i + 1,
            total: veItems.length,
            itemId: item.item_id,
            itemTitle: item.title,
            percent: Math.round(((i + 1) / veItems.length) * 100)
          });

          try {
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
            
            insertStmt.run(
              summaryVersion,
              item.item_id,
              item.category,
              item.title,
              response.content,
              language
            );
            
            successCount++;
            
            sendEvent({
              type: 'item-complete',
              itemId: item.item_id,
              current: i + 1,
              total: veItems.length,
              percent: Math.round(((i + 1) / veItems.length) * 100)
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error: any) {
            errors.push(`${item.item_id}: ${error.message}`);
            sendEvent({
              type: 'item-error',
              itemId: item.item_id,
              error: error.message
            });
          }
        }

        cacheDb.close();

        // 파일로 저장
        const summaryDir = path.join(process.cwd(), 'cache', 'item-summaries');
        if (!fs.existsSync(summaryDir)) {
          fs.mkdirSync(summaryDir, { recursive: true });
        }
        
        const finalDb = new Database(cacheDbPath);
        const savedSummaries = finalDb.prepare(`
          SELECT item_id, category, title, summary 
          FROM virtual_evidence_summary_cache 
          WHERE version = ? AND language = ?
          ORDER BY category, item_id
        `).all(summaryVersion, language);
        finalDb.close();
        
        const summaryFilePath = path.join(summaryDir, `${summaryVersion}.json`);
        fs.writeFileSync(summaryFilePath, JSON.stringify({
          version: summaryVersion,
          sourceVersion: veVersion,
          language,
          provider: finalLLMConfig.provider,
          model: finalLLMConfig.model,
          createdAt: new Date().toISOString(),
          totalItems: veItems.length,
          successCount,
          errorCount: errors.length,
          summaries: savedSummaries
        }, null, 2));

        sendEvent({
          type: 'complete',
          version: summaryVersion,
          sourceVersion: veVersion,
          totalItems: veItems.length,
          successCount,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors : undefined
        });

      } catch (error: any) {
        sendEvent({ type: 'error', message: error.message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
