import { AssessmentItem } from './csv-parser';
import { getAdviceCacheService, CachedAdvice } from './advice-cache';
import { callLLM, LLMConfig, getDefaultLLMConfig, validateLLMConfig } from './llm-service';

export interface AdviceGenerationOptions {
  language: 'ko' | 'en';
  includeVirtualEvidence: boolean;
  useCache: boolean;
  forceRegenerate: boolean;
  llmConfig?: LLMConfig;
}

export interface GeneratedAdvice {
  itemId: string;
  advice: string;
  virtualEvidence: string;
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

  // 가상 증빙 생성 프롬프트
  private generateVirtualEvidencePrompt(item: AssessmentItem, language: 'ko' | 'en'): string {
    const context = this.getMSPContext(language);
    
    if (language === 'ko') {
      return `${context}

다음 AWS MSP 요구사항에 대한 가상 증빙 예제를 작성해주세요:

항목 ID: ${item.id}
제목: ${item.titleKo || item.title}
증빙 요구사항: ${item.evidenceRequiredKo || item.evidenceRequired}

가상 증빙 예제 작성 요구사항:
- 실제 회사에서 참고할 수 있는 현실적인 예제
- 구체적인 수치, 날짜, AWS 서비스명 포함
- 다양한 규모의 회사 예제 (스타트업, 중견기업, 대기업)
- 개인정보는 [회사명], [담당자명], [이메일] 등으로 마스킹
- 실제 증빙 문서 형식에 맞는 구조

예제는 다음과 같이 구성해주세요:
🏢 예제 1: [소규모 회사 사례]
🏭 예제 2: [중견기업 사례]  
🌐 예제 3: [대기업 사례]

각 예제마다 실제 증빙 문서의 핵심 내용을 포함해주세요.`;
    } else {
      return `${context}

Please create virtual evidence examples for the following AWS MSP requirement:

Item ID: ${item.id}
Title: ${item.title}
Evidence Required: ${item.evidenceRequired}

Virtual Evidence Example Requirements:
- Realistic examples that actual companies can reference
- Include specific numbers, dates, AWS service names
- Examples from various company sizes (startup, mid-size, enterprise)
- Mask personal information with [Company Name], [Contact Name], [Email], etc.
- Structure matching actual evidence document formats

Please structure examples as follows:
🏢 Example 1: [Small Company Case]
🏭 Example 2: [Mid-size Company Case]
🌐 Example 3: [Enterprise Case]

Include key content from actual evidence documents for each example.`;
    }
  }

  // 더미 AI 응답 생성 (실제 LLM 대신 사용)
  private generateDummyAdvice(item: AssessmentItem, language: 'ko' | 'en'): string {
    if (language === 'ko') {
      return `📋 요구사항 이해
${item.titleKo || item.title} 항목은 AWS MSP 프로그램의 ${item.isMandatory ? '필수' : '선택'} 요구사항입니다.

✅ 준비해야 할 증빙 자료
• ${item.evidenceRequiredKo || item.evidenceRequired}
• 관련 문서 및 스크린샷
• 담당자 연락처 정보

📝 단계별 준비 가이드
1. 현재 상태 점검 및 갭 분석
2. 필요한 문서 및 자료 수집
3. 증빙 자료 정리 및 검토
4. 최종 제출 준비

⚠️ 주의사항 및 일반적인 실수
• 증빙 자료의 최신성 확인
• 모든 링크와 연락처 정보 검증
• 요구사항 누락 방지

🔍 최종 검토 체크리스트
□ 모든 필수 정보 포함 확인
□ 문서 품질 및 가독성 검토
□ 제출 형식 요구사항 준수 확인`;
    } else {
      return `📋 Understanding Requirements
The ${item.title} item is a ${item.isMandatory ? 'mandatory' : 'optional'} requirement for the AWS MSP program.

✅ Evidence to Prepare
• ${item.evidenceRequired}
• Related documents and screenshots
• Contact information for responsible parties

📝 Step-by-Step Preparation Guide
1. Current state assessment and gap analysis
2. Collect necessary documents and materials
3. Organize and review evidence materials
4. Prepare for final submission

⚠️ Precautions and Common Mistakes
• Verify currency of evidence materials
• Validate all links and contact information
• Prevent requirement omissions

🔍 Final Review Checklist
□ Confirm all required information included
□ Review document quality and readability
□ Ensure submission format requirements compliance`;
    }
  }

  // 더미 가상 증빙 생성
  private generateDummyVirtualEvidence(item: AssessmentItem, language: 'ko' | 'en'): string {
    if (language === 'ko') {
      return `🏢 예제 1: 소규모 IT 서비스 회사
회사명: [테크솔루션 코리아]
담당자: [김철수] ([kim@techsol.co.kr])
증빙 내용: ${item.titleKo || item.title} 관련 구체적인 예제
- AWS 서비스: EC2, RDS, S3
- 고객 수: 15개 기업
- 관리 워크로드: 50+ 인스턴스

🏭 예제 2: 중견 클라우드 서비스 기업  
회사명: [클라우드마스터]
담당자: [박영희] ([park@cloudmaster.com])
증빙 내용: 확장된 MSP 서비스 포트폴리오
- AWS 서비스: 전체 서비스 포트폴리오
- 고객 수: 100+ 기업
- 관리 워크로드: 500+ 인스턴스

🌐 예제 3: 대기업 IT 서비스 제공업체
회사명: [글로벌테크]
담당자: [이민수] ([lee@globaltech.co.kr])  
증빙 내용: 엔터프라이즈급 MSP 서비스
- AWS 서비스: 모든 AWS 서비스
- 고객 수: 500+ 기업
- 관리 워크로드: 10,000+ 인스턴스`;
    } else {
      return `🏢 Example 1: Small IT Services Company
Company: [TechSolution Korea]
Contact: [John Kim] ([kim@techsol.co.kr])
Evidence: Specific example for ${item.title}
- AWS Services: EC2, RDS, S3
- Customers: 15 enterprises
- Managed Workloads: 50+ instances

🏭 Example 2: Mid-size Cloud Service Company
Company: [CloudMaster]
Contact: [Sarah Park] ([park@cloudmaster.com])
Evidence: Extended MSP service portfolio
- AWS Services: Full service portfolio
- Customers: 100+ enterprises  
- Managed Workloads: 500+ instances

🌐 Example 3: Enterprise IT Service Provider
Company: [GlobalTech]
Contact: [Mike Lee] ([lee@globaltech.co.kr])
Evidence: Enterprise-grade MSP services
- AWS Services: All AWS services
- Customers: 500+ enterprises
- Managed Workloads: 10,000+ instances`;
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

  // 실제 LLM을 사용하여 가상 증빙 생성
  private async generateVirtualEvidenceWithLLM(
    item: AssessmentItem, 
    language: 'ko' | 'en',
    llmConfig: LLMConfig
  ): Promise<string> {
    const systemPrompt = this.getMSPContext(language);
    const userPrompt = this.generateVirtualEvidencePrompt(item, language);
    
    try {
      const response = await callLLM(userPrompt, systemPrompt, llmConfig);
      return response.content;
    } catch (error) {
      console.error(`[AdviceGenerator] LLM call failed for virtual evidence ${item.id}:`, error);
      // LLM 호출 실패 시 에러 발생 (더미 데이터 생성 방지)
      throw new Error(`가상증빙예제 LLM 호출 실패 (${item.id}): ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          virtualEvidence: cached.virtualEvidence,
          language: options.language,
          cached: true
        };
      }
    }

    // LLM 설정 확인
    const llmConfig = options.llmConfig || getDefaultLLMConfig();
    const validation = validateLLMConfig(llmConfig);
    
    let advice: string;
    let virtualEvidence: string = '';

    if (validation.valid) {
      // 실제 LLM 사용
      console.log(`[AdviceGenerator] Using ${llmConfig.provider} for ${item.id}`);
      advice = await this.generateAdviceWithLLM(item, options.language, llmConfig);
      
      if (options.includeVirtualEvidence) {
        virtualEvidence = await this.generateVirtualEvidenceWithLLM(item, options.language, llmConfig);
      }
    } else {
      // LLM 설정이 유효하지 않으면 에러 발생 (더미 데이터 생성 방지)
      console.error(`[AdviceGenerator] LLM config invalid for ${item.id}: ${validation.error}`);
      throw new Error(`LLM 설정이 유효하지 않습니다: ${validation.error}`);
    }

    return {
      itemId: item.id,
      advice,
      virtualEvidence,
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
      includeVirtualEvidence: true,
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

      // 캐시에 저장
      this.cacheService.saveCachedAdvice({
        itemId: item.id,
        category: item.category,
        title: item.titleKo || item.title,
        advice: advice.advice,
        virtualEvidence: advice.virtualEvidence,
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

      // 캐시에 저장
      this.cacheService.saveCachedAdvice({
        itemId: item.id,
        category: item.category,
        title: item.title,
        advice: advice.advice,
        virtualEvidence: advice.virtualEvidence,
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