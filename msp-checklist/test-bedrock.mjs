/**
 * AWS Bedrock API 테스트
 * 실행: node test-bedrock.mjs
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 파일 수동 파싱
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  } catch (e) {
    console.log('⚠️ .env 파일을 찾을 수 없습니다.');
  }
}

loadEnv();

async function testBedrock() {
  console.log('🚀 AWS Bedrock API 테스트\n');
  
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    model: process.env.AWS_BEDROCK_MODEL || 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0'
  };
  
  console.log('📋 설정:');
  console.log(`   Region: ${config.region}`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Access Key: ${config.accessKeyId ? config.accessKeyId.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log('');
  
  if (!config.accessKeyId || !config.secretAccessKey) {
    console.error('❌ AWS 자격증명이 없습니다. .env 파일을 확인하세요.');
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
      messages: [{ role: 'user', content: 'Say hello in Korean briefly.' }],
    }),
  });
  
  console.log('📤 요청 전송 중...\n');
  
  try {
    const start = Date.now();
    const response = await client.send(command);
    const elapsed = Date.now() - start;
    
    const body = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log(`✅ 성공! (${elapsed}ms)`);
    console.log('─'.repeat(40));
    console.log(body.content[0].text);
    console.log('─'.repeat(40));
    console.log(`📊 토큰: 입력 ${body.usage?.input_tokens}, 출력 ${body.usage?.output_tokens}`);
  } catch (error) {
    console.error(`❌ 오류: ${error.name}`);
    console.error(`   ${error.message}`);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n💡 IAM에 bedrock:InvokeModel 권한이 필요합니다.');
    }
  }
}

testBedrock();
