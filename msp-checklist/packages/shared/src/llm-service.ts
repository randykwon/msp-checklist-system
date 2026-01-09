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
  inferenceProfileArn?: string;
  autoCreateInferenceProfile?: boolean;
  temperature?: number;
  maxTokens?: number;
}

// LLM 응답 인터페이스
export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Inference Profile이 필요한 모델 목록
const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

const MODEL_TO_SYSTEM_PROFILE_PATTERN: Record<string, string> = {
  'anthropic.claude-opus-4-5-20251101-v1:0': 'claude-opus-4-5-20251101',
  'anthropic.claude-sonnet-4-5-20250929-v1:0': 'claude-sonnet-4-5-20250929',
  'anthropic.claude-haiku-4-5-20251001-v1:0': 'claude-haiku-4-5-20251001',
};

const MODEL_TO_INFERENCE_SOURCE: Record<string, string> = {
  'anthropic.claude-opus-4-5-20251101-v1:0': 'us.anthropic.claude-opus-4-20250514-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0': 'us.anthropic.claude-haiku-4-20250514-v1:0',
};

const inferenceProfileCache: Map<string, string> = new Map();

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
    const command = new CreateInferenceProfileCommand({
      inferenceProfileName: profileName,
      modelSource: { copyFrom: modelSource },
      description: `Inference profile for ${modelSource}`
    });

    const response = await client.send(command);
    return response.inferenceProfileArn || null;
  } catch (error: any) {
    if (error.name === 'ConflictException') {
      const profiles = await listInferenceProfiles(config);
      const existing = profiles.find(p => p.name === profileName);
      if (existing) return existing.arn;
    }
    console.error('[Bedrock] Failed to create inference profile:', error.message);
    return null;
  }
}

export async function getOrCreateInferenceProfile(
  config: LLMConfig,
  modelId: string
): Promise<string | null> {
  const cacheKey = `${config.awsRegion}:${modelId}`;
  if (inferenceProfileCache.has(cacheKey)) {
    return inferenceProfileCache.get(cacheKey)!;
  }

  const systemProfilePattern = MODEL_TO_SYSTEM_PROFILE_PATTERN[modelId];
  const profiles = await listInferenceProfiles(config);
  
  if (systemProfilePattern) {
    const systemProfile = profiles.find(p => 
      p.type === 'SYSTEM_DEFINED' && p.arn.includes(systemProfilePattern)
    );
    if (systemProfile) {
      inferenceProfileCache.set(cacheKey, systemProfile.arn);
      return systemProfile.arn;
    }
  }
  
  const modelSource = MODEL_TO_INFERENCE_SOURCE[modelId];
  if (modelSource) {
    const userProfile = profiles.find(p => 
      p.arn.includes(modelSource) || p.name.includes(modelId.replace(/[:.]/g, '-'))
    );
    if (userProfile) {
      inferenceProfileCache.set(cacheKey, userProfile.arn);
      return userProfile.arn;
    }
  }

  const profileName = `msp-${modelId.replace(/[:.]/g, '-')}`;
  const newArn = await createInferenceProfile(config, profileName, modelSource);
  if (newArn) inferenceProfileCache.set(cacheKey, newArn);
  return newArn;
}

async function callOpenAI(prompt: string, systemPrompt: string, config: LLMConfig): Promise<LLMResponse> {
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
    const error = await response.json() as any;
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json() as any;
  return {
    content: data.choices[0].message.content,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

async function callGemini(prompt: string, systemPrompt: string, config: LLMConfig): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
      generationConfig: {
        maxOutputTokens: config.maxTokens || 8192,
        temperature: config.temperature ?? 0.8,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json() as any;
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

async function callClaude(prompt: string, systemPrompt: string, config: LLMConfig): Promise<LLMResponse> {
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
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(`Claude API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json() as any;
  return {
    content: data.content[0].text,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  };
}

async function callBedrock(prompt: string, systemPrompt: string, config: LLMConfig): Promise<LLMResponse> {
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  
  const client = new BedrockRuntimeClient({
    region: config.awsRegion || 'ap-northeast-2',
    credentials: {
      accessKeyId: config.awsAccessKeyId || '',
      secretAccessKey: config.awsSecretAccessKey || '',
    },
  });

  const modelId = config.model;
  const needsInferenceProfile = INFERENCE_PROFILE_REQUIRED_MODELS.includes(modelId);
  
  let effectiveModelId = modelId;
  
  if (needsInferenceProfile) {
    if (config.inferenceProfileArn) {
      effectiveModelId = config.inferenceProfileArn;
    } else if (config.autoCreateInferenceProfile) {
      const autoArn = await getOrCreateInferenceProfile(config, modelId);
      if (autoArn) {
        effectiveModelId = autoArn;
      } else {
        throw new Error(`모델 ${modelId}에 대한 Inference Profile 자동 생성에 실패했습니다.`);
      }
    } else {
      throw new Error(`모델 ${modelId}은(는) Inference Profile이 필요합니다.`);
    }
  }
  
  let requestBody: any;
  let parseResponse: (body: any) => LLMResponse;

  if (modelId.startsWith('anthropic.claude')) {
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    };
    parseResponse = (body) => ({
      content: body.content[0].text,
      usage: { inputTokens: body.usage?.input_tokens || 0, outputTokens: body.usage?.output_tokens || 0 },
    });
  } else if (modelId.startsWith('amazon.titan')) {
    requestBody = {
      inputText: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`,
      textGenerationConfig: { maxTokenCount: config.maxTokens || 4096, temperature: config.temperature ?? 0.8, topP: 0.9 },
    };
    parseResponse = (body) => ({
      content: body.results?.[0]?.outputText || body.outputText || '',
      usage: { inputTokens: body.inputTextTokenCount || 0, outputTokens: body.results?.[0]?.tokenCount || 0 },
    });
  } else if (modelId.startsWith('meta.llama')) {
    requestBody = {
      prompt: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
      max_gen_len: config.maxTokens || 2048,
      temperature: config.temperature ?? 0.8,
      top_p: 0.9,
    };
    parseResponse = (body) => ({
      content: body.generation || '',
      usage: { inputTokens: body.prompt_token_count || 0, outputTokens: body.generation_token_count || 0 },
    });
  } else if (modelId.startsWith('ai21.')) {
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
      usage: { inputTokens: body.usage?.prompt_tokens || 0, outputTokens: body.usage?.completion_tokens || 0 },
    });
  } else {
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    };
    parseResponse = (body) => ({
      content: body.content?.[0]?.text || JSON.stringify(body),
      usage: { inputTokens: body.usage?.input_tokens || 0, outputTokens: body.usage?.output_tokens || 0 },
    });
  }

  const command = new InvokeModelCommand({
    modelId: effectiveModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return parseResponse(responseBody);
}

export async function callLLM(prompt: string, systemPrompt: string, config: LLMConfig): Promise<LLMResponse> {
  console.log(`[LLM] Calling ${config.provider} with model ${config.model}`);
  
  switch (config.provider) {
    case 'openai': return await callOpenAI(prompt, systemPrompt, config);
    case 'gemini': return await callGemini(prompt, systemPrompt, config);
    case 'claude': return await callClaude(prompt, systemPrompt, config);
    case 'bedrock': return await callBedrock(prompt, systemPrompt, config);
    default: throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

export function getDefaultLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER as LLMConfig['provider']) || 'bedrock';
  
  const config: LLMConfig = { provider, model: '' };

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
      config.model = process.env.BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      config.awsRegion = process.env.AWS_REGION || 'ap-northeast-2';
      config.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
      config.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      break;
  }

  return config;
}

export function validateLLMConfig(config: LLMConfig): { valid: boolean; error?: string } {
  if (!config.provider) return { valid: false, error: 'LLM provider is required' };
  if (!config.model) return { valid: false, error: 'Model is required' };

  switch (config.provider) {
    case 'openai':
    case 'gemini':
    case 'claude':
      if (!config.apiKey) return { valid: false, error: `API key is required for ${config.provider}` };
      break;
    case 'bedrock':
      if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
        return { valid: false, error: 'AWS credentials are required for Bedrock' };
      }
      break;
  }

  return { valid: true };
}
