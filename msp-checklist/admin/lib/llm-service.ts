// LLM Service Provider Interface
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export abstract class LLMProvider {
  abstract generateText(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse>;
}

// OpenAI Provider
class OpenAIProvider extends LLMProvider {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.openai.com/v1') {
    super();
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generateText(messages: LLMMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  }
}

// Google Gemini Provider
class GeminiProvider extends LLMProvider {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://generativelanguage.googleapis.com/v1beta') {
    super();
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generateText(messages: LLMMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`${this.baseURL}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }
}

// Claude Provider (Anthropic)
class ClaudeProvider extends LLMProvider {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.anthropic.com/v1') {
    super();
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async generateText(messages: LLMMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    // Separate system message from other messages
    const systemMessage = messages.find(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: systemMessage?.content || '',
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }
}

// Dummy provider for testing without API keys
class DummyProvider extends LLMProvider {
  async generateText(messages: LLMMessage[]): Promise<LLMResponse> {
    const question = messages.find(m => m.role === 'user')?.content || '';
    
    // Generate a more realistic dummy response based on the question
    let dummyResponse = '';
    
    if (question.includes('온보딩') || question.includes('문서')) {
      dummyResponse = `고객 온보딩 프로세스에서 필요한 주요 문서는 다음과 같습니다:

1. **고객 정보 수집 양식**
   - 기본 회사 정보 및 연락처
   - 기술 담당자 정보

2. **서비스 계약서 및 SLA**
   - 서비스 수준 합의서
   - 책임 범위 및 한계

3. **보안 및 규정 준수 체크리스트**
   - 보안 요구사항 확인
   - 규정 준수 사항

4. **기술 요구사항 명세서**
   - 인프라 요구사항
   - 네트워크 구성

이러한 문서들을 통해 체계적인 온보딩을 진행할 수 있습니다.`;
    } else if (question.includes('모니터링') || question.includes('CloudWatch') || question.includes('메트릭')) {
      dummyResponse = `CloudWatch 모니터링에서 권장하는 핵심 메트릭은 다음과 같습니다:

**인프라 메트릭:**
- CPU 사용률 (CPUUtilization)
- 메모리 사용률 (MemoryUtilization)
- 디스크 I/O (DiskReadOps, DiskWriteOps)
- 네트워크 트래픽 (NetworkIn, NetworkOut)

**애플리케이션 메트릭:**
- 응답 시간 (ResponseTime)
- 처리량 (RequestCount)
- 오류율 (ErrorRate)
- 가용성 (Availability)

**비즈니스 메트릭:**
- 사용자 세션 수
- 트랜잭션 성공률
- 비즈니스 KPI 관련 커스텀 메트릭

이러한 메트릭들을 통해 시스템의 성능과 안정성을 효과적으로 모니터링할 수 있습니다.`;
    } else if (question.includes('보안') || question.includes('계정') || question.includes('증적')) {
      dummyResponse = `보안 요구사항에 대한 답변입니다:

**계정 관리:**
- 최소 권한 원칙 적용
- 정기적인 액세스 검토
- 강력한 인증 정책

**증적 자료:**
- 대표적인 샘플 계정으로 충분
- 모든 계정을 다 제시할 필요 없음
- 핵심 보안 통제 사항 중심으로 정리

**권장사항:**
- 정기적인 보안 감사
- 자동화된 모니터링 구현
- 인시던트 대응 절차 수립`;
    } else {
      dummyResponse = `질문에 대한 전문적인 답변을 제공드립니다:

**주요 고려사항:**
- AWS MSP 파트너 프로그램 요구사항 준수
- 모범 사례 적용
- 지속적인 개선 및 최적화

**권장사항:**
- 단계별 접근 방식 채택
- 정기적인 검토 및 업데이트
- 문서화 및 지식 공유

추가적인 세부사항이 필요하시면 언제든 문의해 주세요.`;
    }
    
    return {
      content: `🤖 AI 자동 생성 답변\n\n${dummyResponse}\n\n---\n*이 답변은 AI에 의해 자동 생성되었습니다. 필요에 따라 수정하여 사용하세요.*`,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    };
  }
}

// LLM Service Factory
export class LLMService {
  private static instance: LLMService;
  private provider: LLMProvider;

  private constructor() {
    this.provider = this.createProvider();
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private createProvider(): LLMProvider {
    const providerType = process.env.LLM_PROVIDER || 'openai';
    
    // Check if any API keys are available
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasClaude = !!process.env.CLAUDE_API_KEY;
    
    if (!hasOpenAI && !hasGemini && !hasClaude) {
      console.warn('No LLM API keys found, using dummy provider for testing');
      return new DummyProvider();
    }
    
    switch (providerType.toLowerCase()) {
      case 'openai':
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) return new DummyProvider();
        return new OpenAIProvider(openaiKey);
        
      case 'gemini':
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return new DummyProvider();
        return new GeminiProvider(geminiKey);
        
      case 'claude':
        const claudeKey = process.env.CLAUDE_API_KEY;
        if (!claudeKey) return new DummyProvider();
        return new ClaudeProvider(claudeKey);
        
      default:
        return new DummyProvider();
    }
  }

  public async generateText(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    return this.provider.generateText(messages, options);
  }

  public getProviderName(): string {
    return process.env.LLM_PROVIDER || 'openai';
  }
}

// Create LLM service with fallback to dummy provider
export function createLLMService(): LLMService {
  return LLMService.getInstance();
}