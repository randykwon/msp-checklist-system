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
  // LLM 파라미터
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
 * AWS Bedrock API 호출 (Claude)
 */
async function callBedrock(
  prompt: string,
  systemPrompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  // AWS SDK 동적 import (서버 사이드에서만)
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  
  const client = new BedrockRuntimeClient({
    region: config.awsRegion || 'us-east-1',
    credentials: {
      accessKeyId: config.awsAccessKeyId || '',
      secretAccessKey: config.awsSecretAccessKey || '',
    },
  });

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: config.maxTokens || 8192,
    temperature: config.temperature ?? 0.8,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: config.model,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.content[0].text,
    usage: {
      inputTokens: responseBody.usage?.input_tokens || 0,
      outputTokens: responseBody.usage?.output_tokens || 0,
    },
  };
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
      config.apiKey = process.env.GOOGLE_API_KEY;
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
