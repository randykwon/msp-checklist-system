/**
 * AWS Bedrock Inference Profile을 사용한 Claude 4.5 호출 테스트
 */

import { BedrockClient, ListInferenceProfilesCommand } from '@aws-sdk/client-bedrock';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS 자격 증명이 설정되지 않았습니다.');
  process.exit(1);
}

const credentials = {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
};

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Claude 4.5 Sonnet Inference Profile 호출 테스트');
  console.log('='.repeat(60));
  console.log(`\n📍 Region: ${AWS_REGION}`);

  const bedrockClient = new BedrockClient({ region: AWS_REGION, credentials });
  const runtimeClient = new BedrockRuntimeClient({ region: AWS_REGION, credentials });

  try {
    // 1. Claude 4.5 Sonnet용 시스템 정의 Inference Profile 찾기
    console.log('\n1️⃣ Claude 4.5 Sonnet Inference Profile 검색...');
    
    const listCommand = new ListInferenceProfilesCommand({});
    const listResponse = await bedrockClient.send(listCommand);
    
    const claude45SonnetProfile = listResponse.inferenceProfileSummaries?.find(p => 
      p.inferenceProfileArn?.includes('claude-sonnet-4-5-20250929') ||
      p.inferenceProfileArn?.includes('claude-sonnet-4-5')
    );

    if (!claude45SonnetProfile) {
      console.error('❌ Claude 4.5 Sonnet Inference Profile을 찾을 수 없습니다.');
      console.log('\n사용 가능한 프로필:');
      listResponse.inferenceProfileSummaries?.forEach(p => {
        console.log(`  - ${p.inferenceProfileName}: ${p.inferenceProfileArn}`);
      });
      return;
    }

    console.log(`✅ 프로필 발견: ${claude45SonnetProfile.inferenceProfileName}`);
    console.log(`   ARN: ${claude45SonnetProfile.inferenceProfileArn}`);

    // 2. 모델 호출 테스트
    console.log('\n2️⃣ Claude 4.5 Sonnet 호출 테스트...');
    
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 512,
      temperature: 0.7,
      system: "당신은 친절한 AI 어시스턴트입니다. 한국어로 간결하게 답변하세요.",
      messages: [{
        role: "user",
        content: "안녕하세요! 간단히 자기소개 해주세요. (3문장 이내)"
      }]
    };

    const invokeCommand = new InvokeModelCommand({
      modelId: claude45SonnetProfile.inferenceProfileArn,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    console.log('   요청 전송 중...');
    const startTime = Date.now();
    const response = await runtimeClient.send(invokeCommand);
    const endTime = Date.now();
    
    const result = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log(`\n✅ 응답 수신 완료! (${endTime - startTime}ms)`);
    console.log(`   Input tokens: ${result.usage?.input_tokens || 'N/A'}`);
    console.log(`   Output tokens: ${result.usage?.output_tokens || 'N/A'}`);
    
    console.log('\n📝 Claude 4.5 Sonnet 응답:');
    console.log('-'.repeat(40));
    console.log(result.content[0].text);
    console.log('-'.repeat(40));

    console.log('\n✅ 테스트 성공! Claude 4.5 Sonnet이 정상적으로 작동합니다.');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    if (error.$metadata) {
      console.error('   HTTP Status:', error.$metadata.httpStatusCode);
      console.error('   Request ID:', error.$metadata.requestId);
    }
  }
}

main();
