/**
 * AWS Bedrock API 테스트
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// 상위 폴더의 .env 로드
dotenv.config({ path: resolve(__dirname, '../.env') });

async function testBedrock() {
  console.log('🚀 AWS Bedrock API 테스트 시작...\n');
  
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    model: process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0'
  };
  
  console.log('📋 설정:');
  console.log(`   Region: ${config.region}`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Access Key: ${config.accessKeyId ? config.accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log('');
  
  if (!config.accessKeyId || !config.secretAccessKey) {
    console.error('❌ AWS 자격증명이 설정되지 않았습니다.');
    process.exit(1);
  }
  
  const client = new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  
  const command = new InvokeModelCommand({
    modelId: config.model,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 100,
      messages: [{ role: 'user', content: '안녕하세요! 간단히 인사해주세요.' }],
    }),
  });
  
  console.log('📤 요청 전송 중...');
  
  try {
    const start = Date.now();
    const response = await client.send(command);
    const elapsed = Date.now() - start;
    
    const body = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log(`\n✅ 성공! (${elapsed}ms)`);
    console.log('─'.repeat(40));
    console.log(body.content[0].text);
    console.log('─'.repeat(40));
    console.log(`\n📊 토큰: 입력 ${body.usage?.input_tokens}, 출력 ${body.usage?.output_tokens}`);
  } catch (error: any) {
    console.error(`\n❌ 오류: ${error.name}`);
    console.error(`   ${error.message}`);
  }
}

testBedrock();
