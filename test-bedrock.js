/**
 * AWS Bedrock API 테스트 스크립트
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

async function testBedrock() {
  console.log('🚀 AWS Bedrock API 테스트 시작...\n');
  
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    model: process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0'
  };
  
  console.log('📋 설정 정보:');
  console.log(`   Region: ${config.region}`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Access Key ID: ${config.accessKeyId?.substring(0, 8)}...`);
  console.log('');
  
  if (!config.accessKeyId || !config.secretAccessKey) {
    console.error('❌ AWS 자격증명이 설정되지 않았습니다.');
    console.error('   .env 파일에 AWS_ACCESS_KEY_ID와 AWS_SECRET_ACCESS_KEY를 설정하세요.');
    process.exit(1);
  }
  
  const client = new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 256,
    system: 'You are a helpful assistant. Respond briefly.',
    messages: [
      {
        role: 'user',
        content: 'Hello! Please respond with a short greeting in Korean.',
      },
    ],
  };
  
  console.log('📤 요청 전송 중...');
  
  try {
    const command = new InvokeModelCommand({
      modelId: config.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });
    
    const startTime = Date.now();
    const response = await client.send(command);
    const endTime = Date.now();
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('\n✅ 응답 성공!');
    console.log(`⏱️  응답 시간: ${endTime - startTime}ms`);
    console.log('\n📥 응답 내용:');
    console.log('─'.repeat(50));
    console.log(responseBody.content[0].text);
    console.log('─'.repeat(50));
    console.log('\n📊 토큰 사용량:');
    console.log(`   입력 토큰: ${responseBody.usage?.input_tokens || 'N/A'}`);
    console.log(`   출력 토큰: ${responseBody.usage?.output_tokens || 'N/A'}`);
    console.log('\n🎉 Bedrock API 테스트 완료!');
    
  } catch (error) {
    console.error('\n❌ 오류 발생:');
    console.error(`   ${error.name}: ${error.message}`);
    
    if (error.name === 'AccessDeniedException') {
      console.error('\n💡 해결 방법:');
      console.error('   1. AWS IAM 사용자에게 bedrock:InvokeModel 권한이 있는지 확인하세요.');
      console.error('   2. 해당 리전에서 모델이 활성화되어 있는지 확인하세요.');
      console.error('   3. AWS Bedrock 콘솔에서 모델 액세스를 요청했는지 확인하세요.');
    } else if (error.name === 'ValidationException') {
      console.error('\n💡 해결 방법:');
      console.error('   1. 모델 ID가 올바른지 확인하세요.');
      console.error('   2. 요청 형식이 올바른지 확인하세요.');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('\n💡 해결 방법:');
      console.error('   1. 모델 ID가 올바른지 확인하세요.');
      console.error('   2. 해당 리전에서 모델을 사용할 수 있는지 확인하세요.');
    }
    
    process.exit(1);
  }
}

testBedrock();
