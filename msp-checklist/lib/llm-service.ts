/**
 * 통합 LLM 서비스
 * OpenAI, Google Gemini, Anthropic Claude, AWS Bedrock 지원
 */

// LLM 설정 인터페이스
export interface LLMConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'bedrock';
  model: string;
  apiKey?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  inferenceProfileArn?: string; // Claude 4.5+ 모델용 inference profile ARN
  autoCreateInferenceProfile?: boolean; // Inference Profile 자동 생성 여부
  // LLM 파라미터
  temperature?: number;
  maxTokens?: number;
}

// Inference Profile이 필요한 모델 목록
const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

// 모델 ID를 Cross-region Inference Profile 소스로 매핑
const MODEL_TO_INFERENCE_SOURCE: Record<string, string> = {
  'anthropic.claude-opus-4-5-20251101-v1:0': 'us.anthropic.claude-opus-4-20250514-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0': 'us.anthropic.claude-haiku-4-20250514-v1:0',
};

// 모델 ID를 시스템 정의 Inference Profile ARN 패턴으로 매핑
const MODEL_TO_SYSTEM_PROFILE_PATTERN: Record<string, string> = {
  'anthropic.claude-opus-4-5-20251101-v1:0': 'claude-opus-4-5-20251101',
  'anthropic.claude-sonnet-4-5-20250929-v1:0': 'claude-sonnet-4-5-20250929',
  'anthropic.claude-haiku-4-5-20251001-v1:0': 'claude-haiku-4-5-20251001',
};

// LLM 응답 인터페이스
export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Inference Profile 캐시 (메모리)
const inferenceProfileCache: Map<string, string> = new Map();

/**
 * Inference Profile 목록 조회
 */
export async function listInferenceProfiles(config: LLMConfig): Promise<Array<{
  name: string;
  arn: string;
  status: string;
  type: string;
}>> {
  const { BedrockClient, ListInferenceProfilesCommand } = await import('@aws-sdk/client-bedrock');
  
  const client = new BedrockClient({
    region: config.awsRegion || 'ap-northeast-2',
    credentials: {
      accessKeyId: config.awsAccessKeyId || '',
      secretAccessKey: config.awsSecretAccessKey || '',
    },
  });

  try {
    const command = new ListInferenceProfilesCommand({});
    const response = await client.send(command);
    
    return (response.inferenceProfileSummaries || []).map(profile => ({
      name: profile.inferenceProfileName || '',
      arn: profile.inferenceProfileArn || '',
      status: profile.status || '',
      type: profile.type || '',
    }));
  } catch (error) {
    console.error('[Bedrock] Failed to list inference profiles:', error);
    return [];
  }
}

/**
 * Inference Profile 생성
 */
export async function createInferenceProfile(
  config: LLMConfig,
  profileName: string,
  modelSource: string
): Promise<string | null> {
  const { BedrockClient, CreateInferenceProfileCommand } = await import('@aws-sdk/client-bedrock');
  
  const client = new BedrockClient({
    region: config.awsRegion || 'ap-northeast-2',
    credentials: {
      accessKeyId: config.awsAccessKeyId || '',
      secretAccessKey: config.awsSecretAccessKey || '',
    },
  });

  try {
    console.log(`[Bedrock] Creating Inference Profile: ${profileName}`);
    console.log(`[Bedrock] Model Source: ${modelSource}`);
    
    const command = new CreateInferenceProfileCommand({
      inferenceProfileName: profileName,
      modelSource: {
        copyFrom: modelSource
      },
      description: `Inference profile for ${modelSource} - Created by MSP Checklist`
    });

    const response = await client.send(command);
    console.log(`[Bedrock] Inference Profile created: ${response.inferenceProfileArn}`);
    return response.inferenceProfileArn || null;
  } catch (error: any) {
    if (error.name === 'ConflictException') {
      console.log(`[Bedrock] Inference Profile already exists, finding existing...`);
      // 기존 프로필 찾기
      const profiles = await listInferenceProfiles(config);
      const existing = profiles.find(p => p.name === profileName);
      if (existing) {
        console.log(`[Bedrock] Found existing profile: ${existing.arn}`);
        return existing.arn;
      }
    }
    console.error('[Bedrock] Failed to create inference profile:', error.message);
    return null;
  }
}

/**
 * 모델에 대한 Inference Profile ARN 가져오기 (시스템 정의 프로필 우선 사용)
 */
export async function getOrCreateInferenceProfile(
  config: LLMConfig,
  modelId: string
): Promise<string | null> {
  // 캐시 확인
  const cacheKey = `${config.awsRegion}:${modelId}`;
  if (inferenceProfileCache.has(cacheKey)) {
    const cached = inferenceProfileCache.get(cacheKey)!;
    console.log(`[Bedrock] Using cached Inference Profile: ${cached}`);
    return cached;
  }

  // 시스템 정의 프로필 패턴 확인
  const systemProfilePattern = MODEL_TO_SYSTEM_PROFILE_PATTERN[modelId];
  
  // 기존 프로필 검색 (시스템 정의 프로필 포함)
  const profiles = await listInferenceProfiles(config);
  
  // 1. 먼저 시스템 정의 프로필에서 찾기 (global 또는 apac 프로필)
  if (systemProfilePattern) {
    const systemProfile = profiles.find(p => 
      p.type === 'SYSTEM_DEFINED' && 
      p.arn.includes(systemProfilePattern)
    );
    
    if (systemProfile) {
      console.log(`[Bedrock] Found SYSTEM_DEFINED Inference Profile: ${systemProfile.arn}`);
      inferenceProfileCache.set(cacheKey, systemProfile.arn);
      return systemProfile.arn;
    }
  }
  
  // 2. 사용자 정의 프로필에서 찾기
  const modelSource = MODEL_TO_INFERENCE_SOURCE[modelId];
  if (modelSource) {
    const userProfile = profiles.find(p => 
      p.arn.includes(modelSource) || p.name.includes(modelId.replace(/[:.]/g, '-'))
    );

    if (userProfile) {
      console.log(`[Bedrock] Found user-defined Inference Profile: ${userProfile.arn}`);
      inferenceProfileCache.set(cacheKey, userProfile.arn);
      return userProfile.arn;
    }
  }

  // 자동 생성
  const profileName = `msp-${modelId.replace(/[:.]/g, '-')}`;
  const newArn = await createInferenceProfile(config, profileName, modelSource);
  
  if (newArn) {
    inferenceProfileCache.set(cacheKey, newArn);
  }
  
  return newArn;
}

/**
 * OpenAI API 호출
 */
async function callOpenAI(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Google Gemini API 호출
 */
async function callGemini(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${prompt}` }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: config.maxTokens || 8192,
        temperature: config.temperature ?? 0.8,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

/**
 * Anthropic Claude API 호출 (직접 API)
 */
async function callClaude(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    content: data.content[0].text,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

/**
 * AWS Bedrock API 호출 (다양한 모델 지원)
 */
async function callBedrock(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  // AWS SDK 동적 import (서버 사이드에서만)
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  
  const client = new BedrockRuntimeClient({
    region: config.awsRegion || 'ap-northeast-2',
    credentials: {
      accessKeyId: config.awsAccessKeyId || '',
      secretAccessKey: config.awsSecretAccessKey || '',
    },
  });

  const modelId = config.model;
  
  // Inference Profile이 필요한 모델인지 확인
  const needsInferenceProfile = INFERENCE_PROFILE_REQUIRED_MODELS.includes(modelId);
  
  console.log(`[Bedrock] Model: ${modelId}`);
  console.log(`[Bedrock] Needs Inference Profile: ${needsInferenceProfile}`);
  console.log(`[Bedrock] Inference Profile ARN (provided): ${config.inferenceProfileArn || '(not provided)'}`);
  
  // Inference Profile ARN 결정
  let effectiveModelId = modelId;
  
  if (needsInferenceProfile) {
    if (config.inferenceProfileArn) {
      // 사용자가 제공한 ARN 사용
      effectiveModelId = config.inferenceProfileArn;
      console.log(`[Bedrock] Using provided Inference Profile ARN`);
    } else if (config.autoCreateInferenceProfile) {
      // 자동 생성 시도
      console.log(`[Bedrock] Auto-creating Inference Profile...`);
      const autoArn = await getOrCreateInferenceProfile(config, modelId);
      if (autoArn) {
        effectiveModelId = autoArn;
        console.log(`[Bedrock] Using auto-created Inference Profile: ${autoArn}`);
      } else {
        throw new Error(`모델 ${modelId}에 대한 Inference Profile 자동 생성에 실패했습니다. AWS Bedrock 콘솔에서 직접 생성하세요.`);
      }
    } else {
      console.error(`[Bedrock] ERROR: Model ${modelId} requires Inference Profile but none provided`);
      console.error(`[Bedrock] Full config received:`, JSON.stringify(config, null, 2));
      throw new Error(`모델 ${modelId}은(는) Inference Profile이 필요합니다. AWS Bedrock 콘솔에서 Inference Profile을 생성하고 ARN을 입력하세요.`);
    }
  }
  
  console.log(`[Bedrock] Effective Model ID: ${effectiveModelId}`);
  
  let requestBody: any;
  let parseResponse: (body: any) => LLMResponse;

  // 모델별 요청 형식 설정
  if (modelId.startsWith('anthropic.claude')) {
    // Claude 모델
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    };
    parseResponse = (body) => ({
      content: body.content[0].text,
      usage: {
        inputTokens: body.usage?.input_tokens || 0,
        outputTokens: body.usage?.output_tokens || 0,
      },
    });
  } else if (modelId.startsWith('amazon.titan')) {
    // Amazon Titan 모델
    requestBody = {
      inputText: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
      textGenerationConfig: {
        maxTokenCount: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.8,
        topP: 0.9,
      },
    };
    parseResponse = (body) => ({
      content: body.results?.[0]?.outputText || body.outputText || '',
      usage: {
        inputTokens: body.inputTextTokenCount || 0,
        outputTokens: body.results?.[0]?.tokenCount || 0,
      },
    });
  } else if (modelId.startsWith('meta.llama')) {
    // Meta Llama 모델
    requestBody = {
      prompt: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
      max_gen_len: config.maxTokens || 2048,
      temperature: config.temperature ?? 0.8,
      top_p: 0.9,
    };
    parseResponse = (body) => ({
      content: body.generation || '',
      usage: {
        inputTokens: body.prompt_token_count || 0,
        outputTokens: body.generation_token_count || 0,
      },
    });
  } else if (modelId.startsWith('mistral.')) {
    // Mistral 모델
    requestBody = {
      prompt: `<s>[INST] ${systemPrompt}\n\n${prompt} [/INST]`,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.8,
      top_p: 0.9,
    };
    parseResponse = (body) => ({
      content: body.outputs?.[0]?.text || '',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
    });
  } else if (modelId.startsWith('cohere.')) {
    // Cohere 모델
    requestBody = {
      message: prompt,
      preamble: systemPrompt,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.8,
    };
    parseResponse = (body) => ({
      content: body.text || '',
      usage: {
        inputTokens: body.meta?.tokens?.input_tokens || 0,
        outputTokens: body.meta?.tokens?.output_tokens || 0,
      },
    });
  } else if (modelId.startsWith('ai21.')) {
    // AI21 Jamba 모델
    requestBody = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.8,
    };
    parseResponse = (body) => ({
      content: body.choices?.[0]?.message?.content || '',
      usage: {
        inputTokens: body.usage?.prompt_tokens || 0,
        outputTokens: body.usage?.completion_tokens || 0,
      },
    });
  } else {
    // 기본값: Claude 형식 사용
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    };
    parseResponse = (body) => ({
      content: body.content?.[0]?.text || JSON.stringify(body),
      usage: {
        inputTokens: body.usage?.input_tokens || 0,
        outputTokens: body.usage?.output_tokens || 0,
      },
    });
  }

  const command = new InvokeModelCommand({
    modelId: effectiveModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  console.log(`[Bedrock] Calling model: ${modelId}${needsInferenceProfile ? ` (via inference profile: ${effectiveModelId})` : ''}`);
  console.log(`[Bedrock] Effective Model ID being used: "${effectiveModelId}"`);
  console.log(`[Bedrock] Effective Model ID length: ${effectiveModelId?.length || 0}`);
  
  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return parseResponse(responseBody);
  } catch (error: any) {
    console.error(`[Bedrock] API Error:`, error.message);
    console.error(`[Bedrock] Model ID used: "${effectiveModelId}"`);
    console.error(`[Bedrock] Original Model: "${modelId}"`);
    console.error(`[Bedrock] Inference Profile ARN: "${config.inferenceProfileArn}"`);
    throw error;
  }
}

/**
 * 통합 LLM 호출 함수
 */
export async function callLLM(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  console.log(`[LLM] Calling ${config.provider} with model ${config.model}`);
  
  try {
    switch (config.provider) {
      case 'openai':
        return await callOpenAI(prompt, systemPrompt, config);
      
      case 'gemini':
        return await callGemini(prompt, systemPrompt, config);
      
      case 'claude':
        return await callClaude(prompt, systemPrompt, config);
      
      case 'bedrock':
        return await callBedrock(prompt, systemPrompt, config);
      
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  } catch (error) {
    console.error(`[LLM] Error calling ${config.provider}:`, error);
    throw error;
  }
}

/**
 * 기본 LLM 설정 (환경변수에서 로드)
 */
export function getDefaultLLMConfig(): LLMConfig {
  // 환경변수에서 기본 설정 로드
  const provider = (process.env.LLM_PROVIDER as LLMConfig['provider']) || 'bedrock';
  
  const config: LLMConfig = {
    provider,
    model: '',
  };

  switch (provider) {
    case 'openai':
      config.model = process.env.OPENAI_MODEL || 'gpt-4o';
      config.apiKey = process.env.OPENAI_API_KEY;
      break;
    
    case 'gemini':
      config.model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
      config.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      break;
    
    case 'claude':
      config.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
      config.apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
      break;
    
    case 'bedrock':
    default:
      config.model = process.env.BEDROCK_MODEL || process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      config.awsRegion = process.env.AWS_REGION || 'us-east-1';
      config.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
      config.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      break;
  }

  return config;
}

/**
 * LLM 설정 유효성 검사
 */
export function validateLLMConfig(config: LLMConfig): { valid: boolean; error?: string } {
  if (!config.provider) {
    return { valid: false, error: 'LLM provider is required' };
  }

  if (!config.model) {
    return { valid: false, error: 'Model is required' };
  }

  switch (config.provider) {
    case 'openai':
    case 'gemini':
    case 'claude':
      if (!config.apiKey) {
        return { valid: false, error: `API key is required for ${config.provider}` };
      }
      break;
    
    case 'bedrock':
      if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
        return { valid: false, error: 'AWS credentials are required for Bedrock' };
      }
      break;
  }

  return { valid: true };
}


// LLM 서비스 클래스
export class LLMService {
  private config: LLMConfig;

  constructor(config?: LLMConfig) {
    this.config = config || getDefaultLLMConfig();
  }

  getProviderName(): string {
    return `${this.config.provider}/${this.config.model}`;
  }

  async generateText(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');
    
    const systemPrompt = systemMessage?.content || '';
    const prompt = userMessage?.content || '';

    const configWithOptions: LLMConfig = {
      ...this.config,
      temperature: options?.temperature ?? this.config.temperature,
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
    };

    return callLLM(prompt, systemPrompt, configWithOptions);
  }

  async generateVision(
    messages: LLMVisionMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    // Vision은 현재 텍스트만 추출하여 처리
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');
    
    const systemPrompt = systemMessage?.content
      .filter(c => c.type === 'text')
      .map(c => (c as any).text)
      .join('\n') || '';
    
    const prompt = userMessage?.content
      .filter(c => c.type === 'text')
      .map(c => (c as any).text)
      .join('\n') || '';

    const configWithOptions: LLMConfig = {
      ...this.config,
      temperature: options?.temperature ?? this.config.temperature,
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
    };

    return callLLM(prompt, systemPrompt, configWithOptions);
  }
}

// LLM 메시지 인터페이스
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Vision 메시지 인터페이스
export interface LLMVisionMessage {
  role: 'system' | 'user' | 'assistant';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
}

/**
 * LLM 서비스 인스턴스 생성
 */
export function createLLMService(config?: LLMConfig): LLMService {
  return new LLMService(config);
}
