import { AssessmentItem } from './csv-parser';
import { getAdviceCacheService } from './advice-cache';
import { callLLM, LLMConfig, getDefaultLLMConfig, validateLLMConfig } from './llm-service';

export interface AdviceGenerationOptions {
  language: 'ko' | 'en';
  useCache: boolean;
  forceRegenerate: boolean;
  llmConfig?: LLMConfig;
  // 언어별 생성 옵션
  includeKorean?: boolean;
  includeEnglish?: boolean;
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

당신의 역할:
- AWS MSP 감사 프로세스에 대한 깊은 이해를 바탕으로 조언 제공
- 실제 감사에서 통과한 증빙 자료의 특성을 알고 있음
- 각 요구사항 항목별로 고유하고 구체적인 가이드 제공

조언 작성 가이드라인:
- **각 항목에 대해 고유하고 구체적인 내용 작성** (일반적인 템플릿 형식 금지)
- 실무진이 바로 실행할 수 있는 구체적인 단계 제시
- AWS MSP 프로그램 요구사항에 정확히 부합하는 내용
- 실제 감사에서 자주 지적되는 문제점과 해결책 포함
- 증빙 자료 준비 시 구체적인 체크포인트 제공
- 이모지를 활용한 가독성 높은 구조화
- AWS 서비스명, 도구명, 프로세스명을 정확히 사용

금지사항:
- 모든 항목에 동일하게 적용되는 일반적인 조언 금지
- "현재 상태 점검", "문서 수집", "검토" 같은 추상적인 단계 금지
- 구체적인 예시 없이 원칙만 나열하는 것 금지
`;
    } else {
      return `
You are an AWS MSP (Managed Service Provider) program expert.
You provide practical and specific advice on requirements and evidence preparation for becoming an AWS MSP Partner.

Your Role:
- Provide advice based on deep understanding of AWS MSP audit process
- Know the characteristics of evidence that passed actual audits
- Provide unique and specific guides for each requirement item

Advice Writing Guidelines:
- **Write unique and specific content for each item** (no generic template format)
- Provide specific steps that practitioners can execute immediately
- Content that accurately meets AWS MSP program requirements
- Include frequently pointed out issues in actual audits and solutions
- Provide specific checkpoints for evidence preparation
- Use emojis for high readability and structure
- Use AWS service names, tool names, and process names accurately

Prohibited:
- Generic advice that applies equally to all items
- Abstract steps like "check current status", "collect documents", "review"
- Listing only principles without specific examples
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

**중요: 이 특정 항목(${item.titleKo || item.title})에 대해 고유하고 구체적인 조언을 작성해야 합니다.**
**일반적인 템플릿 형식의 답변은 피하고, 이 항목의 특성에 맞는 실질적인 내용을 포함해주세요.**

다음 구조로 조언을 작성해주세요:

1. 📋 요구사항 이해
   - 이 항목이 AWS MSP 프로그램에서 왜 중요한지 설명
   - 감사관이 이 항목에서 확인하고자 하는 핵심 포인트 3-5개
   - 이 항목과 관련된 AWS 서비스나 기능 언급

2. ✅ 준비해야 할 증빙 자료
   - 필수 증빙 자료 목록 (구체적인 문서명과 형식 포함)
   - 각 증빙 자료에 포함되어야 할 핵심 내용
   - 증빙 자료 예시 (실제 파일명이나 문서 제목 예시)

3. 📝 단계별 준비 가이드
   - 이 항목을 준비하기 위한 구체적인 단계 (5-7단계)
   - 각 단계에서 사용할 수 있는 AWS 도구나 서비스
   - 예상 소요 시간과 담당자 역할

4. ⚠️ 주의사항 및 일반적인 실수
   - 이 항목에서 자주 발생하는 구체적인 실수 3-5개
   - 감사에서 탈락하는 주요 원인
   - 피해야 할 안티패턴

5. 🔍 최종 검토 체크리스트
   - 제출 전 확인해야 할 구체적인 항목 5-7개
   - 각 체크 항목에 대한 검증 방법
   - 품질 기준 및 합격 조건

각 섹션은 이 특정 항목(${item.titleKo || item.title})에 맞는 고유한 내용으로 작성해주세요.
다른 항목과 동일한 일반적인 내용은 피해주세요.`;
    } else {
      return `${context}

Please write practical advice for the following AWS MSP requirement:

Item ID: ${item.id}
Category: ${item.category}
Title: ${item.title}
Description: ${item.description}
Mandatory: ${item.isMandatory ? 'Yes' : 'No'}
Evidence Required: ${item.evidenceRequired}

**IMPORTANT: You must write unique and specific advice for this particular item (${item.title}).**
**Avoid generic template-style responses. Include practical content tailored to this item's characteristics.**

Please structure the advice as follows:

1. 📋 Understanding Requirements
   - Explain why this item is important in the AWS MSP program
   - 3-5 key points that auditors look for in this item
   - Mention relevant AWS services or features

2. ✅ Evidence to Prepare
   - List of required evidence (with specific document names and formats)
   - Key content that should be included in each evidence
   - Examples of evidence (actual file names or document title examples)

3. 📝 Step-by-Step Preparation Guide
   - Specific steps to prepare for this item (5-7 steps)
   - AWS tools or services that can be used at each step
   - Estimated time and responsible roles

4. ⚠️ Precautions and Common Mistakes
   - 3-5 specific mistakes commonly made for this item
   - Main reasons for audit failure
   - Anti-patterns to avoid

5. 🔍 Final Review Checklist
   - 5-7 specific items to check before submission
   - Verification method for each check item
   - Quality criteria and passing conditions

Each section should contain unique content specific to this item (${item.title}).
Avoid generic content that would be the same for other items.`;
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

    // LLM 설정: 전달된 설정과 기본 설정을 병합
    const defaultConfig = getDefaultLLMConfig();
    let llmConfig: LLMConfig;
    
    if (options.llmConfig) {
      // 전달된 설정이 있으면 병합 (빈 값은 기본값으로 대체)
      llmConfig = {
        provider: options.llmConfig.provider || defaultConfig.provider,
        model: options.llmConfig.model || defaultConfig.model,
        apiKey: options.llmConfig.apiKey || defaultConfig.apiKey,
        awsRegion: options.llmConfig.awsRegion || defaultConfig.awsRegion,
        awsAccessKeyId: options.llmConfig.awsAccessKeyId || defaultConfig.awsAccessKeyId,
        awsSecretAccessKey: options.llmConfig.awsSecretAccessKey || defaultConfig.awsSecretAccessKey,
        inferenceProfileArn: options.llmConfig.inferenceProfileArn,
        autoCreateInferenceProfile: options.llmConfig.autoCreateInferenceProfile,
        temperature: options.llmConfig.temperature ?? defaultConfig.temperature,
        maxTokens: options.llmConfig.maxTokens ?? defaultConfig.maxTokens,
      };
    } else {
      llmConfig = defaultConfig;
    }
    
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
    // LLM 설정: 전달된 설정과 기본 설정을 병합
    const defaultConfig = getDefaultLLMConfig();
    let llmConfig: LLMConfig;
    
    if (options.llmConfig) {
      // 전달된 설정이 있으면 병합 (빈 값은 기본값으로 대체)
      llmConfig = {
        provider: options.llmConfig.provider || defaultConfig.provider,
        model: options.llmConfig.model || defaultConfig.model,
        apiKey: options.llmConfig.apiKey || defaultConfig.apiKey,
        awsRegion: options.llmConfig.awsRegion || defaultConfig.awsRegion,
        awsAccessKeyId: options.llmConfig.awsAccessKeyId || defaultConfig.awsAccessKeyId,
        awsSecretAccessKey: options.llmConfig.awsSecretAccessKey || defaultConfig.awsSecretAccessKey,
        inferenceProfileArn: options.llmConfig.inferenceProfileArn,
        autoCreateInferenceProfile: options.llmConfig.autoCreateInferenceProfile,
        temperature: options.llmConfig.temperature ?? defaultConfig.temperature,
        maxTokens: options.llmConfig.maxTokens ?? defaultConfig.maxTokens,
      };
    } else {
      llmConfig = defaultConfig;
    }
    
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
    const version = this.cacheService.generateCacheVersion(llmConfig.provider, llmConfig.model);

    // 언어 옵션 확인 (기본값: 둘 다 생성)
    const includeKorean = options.includeKorean !== false;
    const includeEnglish = options.includeEnglish !== false;
    
    const languages = [];
    if (includeKorean) languages.push('한국어');
    if (includeEnglish) languages.push('영어');

    console.log(`🚀 Starting advice generation for ${allItems.length} items...`);
    console.log(`📅 Cache version: ${version}`);
    console.log(`🤖 LLM Provider: ${llmConfig.provider} (${llmConfig.model})`);
    console.log(`🌐 Languages: ${languages.join(', ')}`);
    console.log(`⚙️ Temperature: ${llmConfig.temperature ?? 0.8}, Max Tokens: ${llmConfig.maxTokens ?? 8192}`);
    console.log(`✅ LLM Config Valid: ${validation.valid}`);

    // 버전 정보를 먼저 저장 (FOREIGN KEY 제약 조건 때문에)
    this.cacheService.saveCacheVersion({
      version,
      createdAt: new Date().toISOString(),
      totalItems: allItems.length,
      description: `Generated with ${llmConfig.provider} (${llmConfig.model}) - ${allItems.length} items - ${languages.join(', ')}`
    });

    const koAdvice: GeneratedAdvice[] = [];
    const enAdvice: GeneratedAdvice[] = [];

    // 한국어 조언 생성
    if (includeKorean) {
      console.log('🇰🇷 Generating Korean advice...');
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
    } else {
      console.log('⏭️ Skipping Korean advice generation');
    }

    // 영어 조언 생성
    if (includeEnglish) {
      console.log('🇺🇸 Generating English advice...');
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
    } else {
      console.log('⏭️ Skipping English advice generation');
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