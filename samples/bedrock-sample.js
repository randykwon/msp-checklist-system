/**
 * AWS Bedrock API 호출 샘플 코드 (JavaScript/CommonJS)
 * Claude 3.5 Sonnet 모델 사용
 * 
 * 실행: node bedrock-sample.js
 * 필요 패키지: npm install @aws-sdk/client-bedrock-runtime
 */

const { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');

// 환경변수에서 AWS 자격증명 로드
require('dotenv').config({ path: '../.env' });

// Bedrock 클라이언트 설정
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 모델 ID
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

/**
 * Bedrock Claude 모델 호출 함수
 */
async function invokeBedrockClaude(prompt) {
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
    console.error('Bedrock API 호출 오류:', error.message);
    throw error;
  }
}

/**
 * 시스템 프롬프트와 함께 호출
 */
async function invokeWithSystemPrompt(systemPrompt, userMessage) {
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
 * 스트리밍 응답
 */
async function invokeBedrockStreaming(prompt) {
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
  
  let fullResponse = '';
  
  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk && event.chunk.bytes) {
        const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
        if (chunk.type === 'content_block_delta' && chunk.delta && chunk.delta.text) {
          process.stdout.write(chunk.delta.text);
          fullResponse += chunk.delta.text;
        }
      }
    }
  }
  
  return fullResponse;
}

/**
 * 대화 히스토리 포함 호출
 */
async function invokeWithHistory(messages, systemPrompt) {
  const requestBody = {
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
  
  // AWS 자격증명 확인
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS 자격증명이 설정되지 않았습니다.');
    console.log('   .env 파일에 AWS_ACCESS_KEY_ID와 AWS_SECRET_ACCESS_KEY를 설정하세요.');
    return;
  }
  
  console.log('✅ AWS Region:', process.env.AWS_REGION || 'us-east-1');
  console.log('✅ Model ID:', MODEL_ID);
  console.log('\n---\n');

  try {
    // 1. 기본 호출
    console.log('1. 기본 호출:');
    const response1 = await invokeBedrockClaude('안녕하세요! 한 문장으로 자기소개 해주세요.');
    console.log(response1);
    console.log('\n---\n');

    // 2. 시스템 프롬프트와 함께 호출
    console.log('2. 시스템 프롬프트 사용:');
    const response2 = await invokeWithSystemPrompt(
      '당신은 AWS MSP 전문가입니다. 간결하게 한국어로 답변하세요.',
      'AWS MSP 프로그램이란?'
    );
    console.log(response2);
    console.log('\n---\n');

    // 3. 스트리밍 응답
    console.log('3. 스트리밍 응답:');
    await invokeBedrockStreaming('1부터 5까지 한국어로 세어주세요.');
    console.log('\n');

  } catch (error) {
    console.error('오류 발생:', error.message);
  }
}

// 실행
main();

// 모듈 내보내기
module.exports = {
  invokeBedrockClaude,
  invokeWithSystemPrompt,
  invokeBedrockStreaming,
  invokeWithHistory,
};
