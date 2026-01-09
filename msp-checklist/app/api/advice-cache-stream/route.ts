import { NextRequest } from 'next/server';
import { getAdviceGenerator } from '@/lib/advice-generator';
import { getAdviceCacheService } from '@/lib/advice-cache';
import { getDefaultLLMConfig, validateLLMConfig, LLMConfig } from '@/lib/llm-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { options, llmConfig: inputLlmConfig } = body;

        // LLM 설정 병합
        const defaultConfig = getDefaultLLMConfig();
        const llmConfig: LLMConfig = inputLlmConfig ? {
          provider: inputLlmConfig.provider || defaultConfig.provider,
          model: inputLlmConfig.model || defaultConfig.model,
          apiKey: inputLlmConfig.apiKey || defaultConfig.apiKey,
          awsRegion: inputLlmConfig.awsRegion || defaultConfig.awsRegion,
          awsAccessKeyId: inputLlmConfig.awsAccessKeyId || defaultConfig.awsAccessKeyId,
          awsSecretAccessKey: inputLlmConfig.awsSecretAccessKey || defaultConfig.awsSecretAccessKey,
          inferenceProfileArn: inputLlmConfig.inferenceProfileArn,
          autoCreateInferenceProfile: inputLlmConfig.autoCreateInferenceProfile,
          temperature: inputLlmConfig.temperature ?? defaultConfig.temperature,
          maxTokens: inputLlmConfig.maxTokens ?? defaultConfig.maxTokens,
        } : defaultConfig;

        const validation = validateLLMConfig(llmConfig);
        if (!validation.valid) {
          sendEvent({ type: 'error', message: `LLM 설정 오류: ${validation.error}` });
          controller.close();
          return;
        }

        const cacheService = getAdviceCacheService();
        const allItems = cacheService.getAllAssessmentItems();
        const version = cacheService.generateCacheVersion(llmConfig.provider, llmConfig.model);

        const includeKorean = options?.includeKorean !== false;
        const includeEnglish = options?.includeEnglish !== false;
        
        const totalTasks = allItems.length * ((includeKorean ? 1 : 0) + (includeEnglish ? 1 : 0));
        let completedTasks = 0;

        sendEvent({ 
          type: 'start', 
          version,
          totalItems: allItems.length,
          totalTasks,
          includeKorean,
          includeEnglish,
          provider: llmConfig.provider,
          model: llmConfig.model
        });

        // 버전 정보 저장
        const languages = [];
        if (includeKorean) languages.push('한국어');
        if (includeEnglish) languages.push('영어');
        
        cacheService.saveCacheVersion({
          version,
          createdAt: new Date().toISOString(),
          totalItems: allItems.length,
          description: `Generated with ${llmConfig.provider} (${llmConfig.model}) - ${allItems.length} items - ${languages.join(', ')}`
        });

        const generator = getAdviceGenerator();

        // 한국어 조언 생성
        if (includeKorean) {
          for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            
            sendEvent({
              type: 'progress',
              phase: 'korean',
              current: i + 1,
              total: allItems.length,
              itemId: item.id,
              itemTitle: item.titleKo || item.title,
              completedTasks: completedTasks,
              totalTasks
            });

            try {
              const advice = await generator.generateAdviceForItem(item, {
                language: 'ko',
                useCache: false,
                forceRegenerate: true,
                llmConfig
              });

              cacheService.saveCachedAdvice({
                itemId: item.id,
                category: item.category,
                title: item.titleKo || item.title,
                advice: advice.advice,
                language: 'ko',
                version
              });

              completedTasks++;
              
              sendEvent({
                type: 'item-complete',
                phase: 'korean',
                itemId: item.id,
                completedTasks,
                totalTasks,
                percent: Math.round((completedTasks / totalTasks) * 100)
              });

            } catch (error) {
              sendEvent({
                type: 'item-error',
                phase: 'korean',
                itemId: item.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }

            // Rate limit 방지
            if (i < allItems.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        // 영어 조언 생성
        if (includeEnglish) {
          for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            
            sendEvent({
              type: 'progress',
              phase: 'english',
              current: i + 1,
              total: allItems.length,
              itemId: item.id,
              itemTitle: item.title,
              completedTasks: completedTasks,
              totalTasks
            });

            try {
              const advice = await generator.generateAdviceForItem(item, {
                language: 'en',
                useCache: false,
                forceRegenerate: true,
                llmConfig
              });

              cacheService.saveCachedAdvice({
                itemId: item.id,
                category: item.category,
                title: item.title,
                advice: advice.advice,
                language: 'en',
                version
              });

              completedTasks++;
              
              sendEvent({
                type: 'item-complete',
                phase: 'english',
                itemId: item.id,
                completedTasks,
                totalTasks,
                percent: Math.round((completedTasks / totalTasks) * 100)
              });

            } catch (error) {
              sendEvent({
                type: 'item-error',
                phase: 'english',
                itemId: item.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }

            // Rate limit 방지
            if (i < allItems.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        // 파일 내보내기
        const exportPath = cacheService.exportCacheToFile(version);

        sendEvent({
          type: 'complete',
          version,
          totalItems: allItems.length,
          completedTasks,
          exportPath
        });

      } catch (error) {
        sendEvent({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
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
