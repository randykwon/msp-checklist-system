import { AssessmentItem } from './csv-parser';
import { getAdviceCacheService } from './advice-cache';
import { callLLM, LLMConfig, getDefaultLLMConfig, validateLLMConfig } from './llm-service';

export interface AdviceGenerationOptions {
  language: 'ko' | 'en';
  useCache: boolean;
  forceRegenerate: boolean;
  llmConfig?: LLMConfig;
}

export interface GeneratedAdvice {
  itemId: string;
  advice: string;
  language: 'ko' | 'en';
  cached: boolean;
}

export class AdviceGenerator {
  private cacheService = getAdviceCacheService();

  // MSP 전문 컨텍스트
  private getMSPContext(language: 'ko' | 'en'): string {
    if (language === 'ko') {
      return `
당신은 AWS MSP(Managed Service Provider) 프로그램 전문가입니다.
AWS MSP 파트너가 되기 위한 요구사항과 증빙 준비에 대해 실무적이고 구체적인 조언을 제공합니다.

조언 작성 가이드라인:
- 실무진이 바로 실행할 수 있는 구체적인 단계 제시
- AWS MSP 프로그램 요구사항에 정확히 부합하는 내용
- 일반적인 실수와 주의사항 포함
- 증빙 자료 준비 시 체크포인트 제공
- 이모지를 활용한 가독성 높은 구조화

가상 증빙 예제 작성 가이드라인:
- 실제 회사에서 사용할 수 있는 현실적인 예제
- 구체적인 수치와 데이터 포함
- AWS 서비스명과 기술 용어 정확히 사용
- 다양한 산업군과 규모의 예제 제공
- 개인정보는 [회사명], [담당자명] 등으로 마스킹
`;
    } else {
      return `
You are an AWS MSP (Managed Service Provider) program expert.
You provide practical and specific advice on requirements and evidence preparation for becoming an AWS MSP Partner.

Advice Writing Guidelines:
- Provide specific steps that practitioners can execute immediately
- Content that accurately meets AWS MSP program requirements
- Include common mistakes and precautions
- Provide checkpoints for evidence preparation
- Use emojis for high readability and structure

Virtual Evidence Example Guidelines:
- Realistic examples that actual companies can use
- Include specific numbers and data
- Use AWS service names and technical terms accurately
- Provide examples from various industries and scales
- Mask personal information with [Company Name], [Contact Name], etc.
`;
    }
  }

  // 조언 생성 프롬프트
  private generateAdvicePrompt(item: AssessmentItem, language: 'ko' | 'en'): string {
    const context = this.getMSPContext(language);
    
    if (language === 'ko') {
      return `${context}

다음 AWS MSP 요구사항에 대한 실무적인 조언을 작성해주세요:

항목 ID: ${item.id}
카테고리: ${item.categoryKo || item.category}
제목: ${item.titleKo || item.title}
설명: ${item.descriptionKo || item.description}
필수 여부: ${item.isMandatory ? '필수' : '선택'}
증빙 요구사항: ${item.evidenceRequiredKo || item.evidenceRequired}

다음 구조로 조언을 작성해주세요:
1. 📋 요구사항 이해 (핵심 포인트 요약)
2. ✅ 준비해야 할 증빙 자료
3. 📝 단계별 준비 가이드
4. ⚠️ 주의사항 및 일반적인 실수
5. 🔍 최종 검토 체크리스트

각 섹션은 실무진이 바로 활용할 수 있도록 구체적이고 실행 가능한 내용으로 작성해주세요.`;
    } else {
      return `${context}

Please write practical advice for the following AWS MSP requirement:

Item ID: ${item.id}
Category: ${item.category}
Title: ${item.title}
Description: ${item.description}
Mandatory: ${item.isMandatory ? 'Yes' : 'No'}
Evidence Required: ${item.evidenceRequired}

Please structure the advice as follows:
1. 📋 Understanding Requirements (key points summary)
2. ✅ Evidence to Prepare
3. 📝 Step-by-Step Preparation Guide
4. ⚠️ Precautions and Common Mistakes
5. 🔍 Final Review Checklist

Each section should be specific and actionable for practitioners to use immediately.`;
    }
  }

  // 실제 LLM을 사용하여 조언 생성
  private async generateAdviceWithLLM(
    item: AssessmentItem, 
    language: 'ko' | 'en',
    llmConfig: LLMConfig
  ): Promise<string> {
    const systemPrompt = this.getMSPContext(language);
    const userPrompt = this.generateAdvicePrompt(item, language);
    
    try {
      const response = await callLLM(userPrompt, systemPrompt, llmConfig);
      return response.content;
    } catch (error) {
      console.error(`[AdviceGenerator] LLM call failed for ${item.id}:`, error);
      // LLM 호출 실패 시 에러 발생 (더미 데이터 생성 방지)
      throw new Error(`LLM 호출 실패 (${item.id}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 단일 항목에 대한 조언 생성
  async generateAdviceForItem(
    item: AssessmentItem, 
    options: AdviceGenerationOptions
  ): Promise<GeneratedAdvice> {
    // 캐시 확인
    if (options.useCache && !options.forceRegenerate) {
      const cached = this.cacheService.getCachedAdvice(item.id, options.language);
      if (cached) {
        return {
          itemId: item.id,
          advice: cached.advice,
          language: options.language,
          cached: true
        };
      }
    }

    // LLM 설정 확인
    const llmConfig = options.llmConfig || getDefaultLLMConfig();
    const validation = validateLLMConfig(llmConfig);
    
    let advice: string;

    if (validation.valid) {
      // 실제 LLM 사용
      console.log(`[AdviceGenerator] Using ${llmConfig.provider} for ${item.id}`);
      advice = await this.generateAdviceWithLLM(item, options.language, llmConfig);
    } else {
      // LLM 설정이 유효하지 않으면 에러 발생 (더미 데이터 생성 방지)
      console.error(`[AdviceGenerator] LLM config invalid for ${item.id}: ${validation.error}`);
      throw new Error(`LLM 설정이 유효하지 않습니다: ${validation.error}`);
    }

    return {
      itemId: item.id,
      advice,
      language: options.language,
      cached: false
    };
  }

  // 모든 항목에 대한 조언 생성 및 캐싱
  async generateAndCacheAllAdvice(
    options: Partial<AdviceGenerationOptions> = {}
  ): Promise<{
    version: string;
    totalItems: number;
    koAdvice: GeneratedAdvice[];
    enAdvice: GeneratedAdvice[];
  }> {
    const llmConfig = options.llmConfig || getDefaultLLMConfig();
    const validation = validateLLMConfig(llmConfig);
    
    // LLM 설정이 유효하지 않으면 에러 발생 (더미 데이터 생성 방지)
    if (!validation.valid) {
      console.error(`❌ LLM Config Invalid: ${validation.error}`);
      throw new Error(`LLM 설정이 유효하지 않습니다: ${validation.error}. 유효한 API 키 또는 AWS 자격 증명을 설정해주세요.`);
    }
    
    const defaultOptions: AdviceGenerationOptions = {
      language: 'ko',
      useCache: false,
      forceRegenerate: true,
      llmConfig,
      ...options
    };

    const allItems = this.cacheService.getAllAssessmentItems();
    const version = this.cacheService.generateCacheVersion();

    console.log(`🚀 Starting advice generation for ${allItems.length} items...`);
    console.log(`📅 Cache version: ${version}`);
    console.log(`🤖 LLM Provider: ${llmConfig.provider} (${llmConfig.model})`);
    console.log(`✅ LLM Config Valid: ${validation.valid}`);

    // 버전 정보를 먼저 저장 (FOREIGN KEY 제약 조건 때문에)
    this.cacheService.saveCacheVersion({
      version,
      createdAt: new Date().toISOString(),
      totalItems: allItems.length,
      description: `Generated with ${llmConfig.provider} (${llmConfig.model}) - ${allItems.length} items`
    });

    // 한국어 조언 생성
    console.log('🇰🇷 Generating Korean advice...');
    const koAdvice: GeneratedAdvice[] = [];
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      console.log(`  Processing ${item.id} (${i + 1}/${allItems.length})`);
      
      const advice = await this.generateAdviceForItem(item, {
        ...defaultOptions,
        language: 'ko'
      });
      
      koAdvice.push(advice);

      // 캐시에 저장 (virtualEvidence는 별도 캐시에서 관리)
      this.cacheService.saveCachedAdvice({
        itemId: item.id,
        category: item.category,
        title: item.titleKo || item.title,
        advice: advice.advice,
        language: 'ko',
        version
      });

      // API 호출 간 딜레이 (Rate Limit 방지)
      if (i < allItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 영어 조언 생성
    console.log('🇺🇸 Generating English advice...');
    const enAdvice: GeneratedAdvice[] = [];
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      console.log(`  Processing ${item.id} (${i + 1}/${allItems.length})`);
      
      const advice = await this.generateAdviceForItem(item, {
        ...defaultOptions,
        language: 'en'
      });
      
      enAdvice.push(advice);

      // 캐시에 저장 (virtualEvidence는 별도 캐시에서 관리)
      this.cacheService.saveCachedAdvice({
        itemId: item.id,
        category: item.category,
        title: item.title,
        advice: advice.advice,
        language: 'en',
        version
      });

      // API 호출 간 딜레이 (Rate Limit 방지)
      if (i < allItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 파일로 내보내기
    const exportPath = this.cacheService.exportCacheToFile(version);
    console.log(`💾 Cache exported to: ${exportPath}`);

    console.log('✅ Advice generation completed!');

    return {
      version,
      totalItems: allItems.length,
      koAdvice,
      enAdvice
    };
  }
}

// 싱글톤 인스턴스
let adviceGeneratorInstance: AdviceGenerator | null = null;

export function getAdviceGenerator(): AdviceGenerator {
  if (!adviceGeneratorInstance) {
    adviceGeneratorInstance = new AdviceGenerator();
  }
  return adviceGeneratorInstance;
}