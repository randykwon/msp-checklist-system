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

export interface LLMVisionMessage {
  role: 'system' | 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export abstract class LLMProvider {
  abstract generateText(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse>;
  abstract generateVision(messages: LLMVisionMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse>;
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

  async generateVision(messages: LLMVisionMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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

  async generateVision(messages: LLMVisionMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    // Convert messages to Gemini format with vision support
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: msg.content.map(part => {
        if (part.type === 'text') {
          return { text: part.text };
        } else if (part.type === 'image_url') {
          // Extract base64 data from data URL
          const base64Data = part.image_url?.url.split(',')[1];
          const mimeType = part.image_url?.url.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
          return {
            inlineData: {
              mimeType,
              data: base64Data
            }
          };
        }
        return { text: '' };
      })
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

  async generateVision(messages: LLMVisionMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    // Claude supports vision in the same way as text
    const systemMessage = messages.find(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system').map(msg => ({
      role: msg.role,
      content: msg.content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        } else if (part.type === 'image_url') {
          // Extract base64 data and media type
          const [header, base64Data] = part.image_url?.url.split(',') || ['', ''];
          const mediaType = header.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          };
        }
        return { type: 'text', text: '' };
      })
    }));

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
        system: systemMessage?.content[0]?.text || '',
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

// AWS Bedrock Provider
class BedrockProvider extends LLMProvider {
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor(accessKeyId: string, secretAccessKey: string, region = 'us-east-1') {
    super();
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  private async signRequest(method: string, url: string, body: string): Promise<Headers> {
    // AWS Signature V4 implementation would go here
    // For now, we'll use a simplified approach
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/...`);
    return headers;
  }

  async generateText(messages: LLMMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    // Convert messages to Claude format for Bedrock
    const systemMessage = messages.find(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      system: systemMessage?.content || '',
      messages: conversationMessages,
    });

    const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/anthropic.claude-3-5-sonnet-20241022-v2:0/invoke`;
    
    // Note: This is a simplified implementation
    // In production, you would need proper AWS SDK or signature implementation
    throw new Error('AWS Bedrock provider requires AWS SDK implementation');
  }

  async generateVision(messages: LLMVisionMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<LLMResponse> {
    throw new Error('AWS Bedrock vision provider requires AWS SDK implementation');
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
    const hasAWS = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    
    if (!hasOpenAI && !hasGemini && !hasClaude && !hasAWS) {
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
        
      case 'bedrock':
        const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
        const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
        const awsRegion = process.env.AWS_REGION;
        if (!awsAccessKey || !awsSecretKey) {
          return new DummyProvider();
        }
        return new BedrockProvider(awsAccessKey, awsSecretKey, awsRegion);
        
      default:
        return new DummyProvider();
    }
  }

  public async generateText(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    return this.provider.generateText(messages, options);
  }

  public async generateVision(messages: LLMVisionMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    return this.provider.generateVision(messages, options);
  }

  public getProviderName(): string {
    return process.env.LLM_PROVIDER || 'openai';
  }
}

// Dummy provider for testing without API keys
class DummyProvider extends LLMProvider {
  async generateText(messages: LLMMessage[]): Promise<LLMResponse> {
    return {
      content: `🤖 더미 응답 (${process.env.LLM_PROVIDER || 'openai'} 프로바이더)\n\n이것은 API 키가 설정되지 않았을 때의 테스트 응답입니다.\n\n요청된 메시지:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };
  }

  async generateVision(messages: LLMVisionMessage[]): Promise<LLMResponse> {
    return {
      content: `🤖 더미 비전 응답 (${process.env.LLM_PROVIDER || 'openai'} 프로바이더)\n\n이것은 API 키가 설정되지 않았을 때의 테스트 응답입니다.\n\n이미지 분석 결과: 테스트 이미지가 업로드되었습니다.`,
      usage: {
        prompt_tokens: 200,
        completion_tokens: 100,
        total_tokens: 300,
      },
    };
  }
}

// Create LLM service with fallback to dummy provider
export function createLLMService(): LLMService {
  return LLMService.getInstance();
}