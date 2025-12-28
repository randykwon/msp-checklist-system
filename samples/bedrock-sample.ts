/**
 * AWS Bedrock API 호출 샘플 코드
 * Claude 3.5 Sonnet 모델 사용
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Bedrock 클라이언트 설정
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// 모델 ID
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

/**
 * Bedrock Claude 모델 호출 함수
 */
async function invokeBedrockClaude(prompt: string): Promise<string> {
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  try {
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Bedrock API 호출 오류:', error);
    throw error;
  }
}

/**
 * 시스템 프롬프트와 함께 호출
 */
async function invokeWithSystemPrompt(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.content[0].text;
}

/**
 * 스트리밍 응답 (InvokeModelWithResponseStream 사용)
 */
import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

async function invokeBedrockStreaming(prompt: string): Promise<void> {
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await bedrockClient.send(command);
  
  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          process.stdout.write(chunk.delta.text);
        }
      }
    }
  }
}

/**
 * 대화 히스토리 포함 호출
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function invokeWithHistory(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  const requestBody: any = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: messages,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.content[0].text;
}

// =============================================================================
// 사용 예제
// =============================================================================

async function main() {
  console.log('=== Bedrock Claude API 샘플 ===\n');

  // 1. 기본 호출
  console.log('1. 기본 호출:');
  const response1 = await invokeBedrockClaude('안녕하세요! 간단히 자기소개 해주세요.');
  console.log(response1);
  console.log('\n---\n');

  // 2. 시스템 프롬프트와 함께 호출
  console.log('2. 시스템 프롬프트 사용:');
  const response2 = await invokeWithSystemPrompt(
    '당신은 AWS MSP 전문가입니다. 한국어로 답변하세요.',
    'AWS MSP 프로그램의 장점을 3가지 알려주세요.'
  );
  console.log(response2);
  console.log('\n---\n');

  // 3. 대화 히스토리 포함
  console.log('3. 대화 히스토리 사용:');
  const conversationHistory: Message[] = [
    { role: 'user', content: 'AWS란 무엇인가요?' },
    { role: 'assistant', content: 'AWS(Amazon Web Services)는 아마존에서 제공하는 클라우드 컴퓨팅 플랫폼입니다.' },
    { role: 'user', content: '주요 서비스 3가지만 알려주세요.' },
  ];
  const response3 = await invokeWithHistory(conversationHistory);
  console.log(response3);
  console.log('\n---\n');

  // 4. 스트리밍 응답
  console.log('4. 스트리밍 응답:');
  await invokeBedrockStreaming('1부터 5까지 세어주세요.');
  console.log('\n');
}

// 실행
main().catch(console.error);
