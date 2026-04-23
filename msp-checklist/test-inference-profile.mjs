/**
 * AWS Bedrock Inference Profile 테스트 스크립트
 * 
 * 사용법:
 * 1. .env.local에 AWS 자격 증명 설정
 * 2. node test-inference-profile.mjs
 */

import { BedrockClient, CreateInferenceProfileCommand, ListInferenceProfilesCommand, GetInferenceProfileCommand } from '@aws-sdk/client-bedrock';
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
  console.error('   .env.local 파일에 AWS_ACCESS_KEY_ID와 AWS_SECRET_ACCESS_KEY를 설정하세요.');
  process.exit(1);
}

const credentials = {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
};

class ClaudeInferenceProfileManager {
  constructor(region = 'ap-northeast-2') {
    this.region = region;
    this.bedrockClient = new BedrockClient({ region, credentials });
    this.runtimeClient = new BedrockRuntimeClient({ region, credentials });
  }

  /**
   * 기존 Inference Profile 목록 조회
   */
  async listProfiles() {
    try {
      const command = new ListInferenceProfilesCommand({});
      const response = await this.bedrockClient.send(command);
      
      console.log('\n📋 기존 Inference Profiles:');
      if (response.inferenceProfileSummaries && response.inferenceProfileSummaries.length > 0) {
        response.inferenceProfileSummaries.forEach((profile, index) => {
          console.log(`  ${index + 1}. ${profile.inferenceProfileName}`);
          console.log(`     ARN: ${profile.inferenceProfileArn}`);
          console.log(`     Status: ${profile.status}`);
          console.log(`     Type: ${profile.type}`);
          console.log('');
        });
        return response.inferenceProfileSummaries;
      } else {
        console.log('  (없음)');
        return [];
      }
    } catch (error) {
      console.error('❌ Profile 목록 조회 실패:', error.message);
      throw error;
    }
  }

  /**
   * 특정 모델에 대한 Inference Profile 찾기
   */
  async findProfileForModel(modelId) {
    try {
      const profiles = await this.listProfiles();
      
      // 모델 ID에 해당하는 프로필 찾기
      const matchingProfile = profiles.find(p => 
        p.inferenceProfileArn?.includes(modelId) || 
        p.inferenceProfileName?.includes(modelId)
      );
      
      return matchingProfile;
    } catch (error) {
      console.error('❌ Profile 검색 실패:', error.message);
      return null;
    }
  }

  /**
   * Inference Profile 생성
   */
  async createProfile(profileName, modelSource) {
    try {
      console.log(`\n🔧 Inference Profile 생성 중...`);
      console.log(`   이름: ${profileName}`);
      console.log(`   모델 소스: ${modelSource}`);
      
      const command = new CreateInferenceProfileCommand({
        inferenceProfileName: profileName,
        modelSource: {
          copyFrom: modelSource
        },
        description: `Inference profile for ${modelSource} - Created by MSP Checklist`
      });

      const response = await this.bedrockClient.send(command);
      console.log(`✅ Profile 생성 완료!`);
      console.log(`   ARN: ${response.inferenceProfileArn}`);
      return response.inferenceProfileArn;
    } catch (error) {
      if (error.name === 'ConflictException') {
        console.log(`⚠️ 이미 존재하는 Profile입니다. 기존 Profile을 사용합니다.`);
        // 기존 프로필 찾기
        const profiles = await this.listProfiles();
        const existing = profiles.find(p => p.inferenceProfileName === profileName);
        if (existing) {
          return existing.inferenceProfileArn;
        }
      }
      console.error('❌ Profile 생성 실패:', error.message);
      throw error;
    }
  }

  /**
   * Inference Profile을 사용하여 모델 호출
   */
  async invokeModel(inferenceProfileArn, userMessage, systemMessage = '') {
    try {
      console.log(`\n🚀 모델 호출 중...`);
      console.log(`   Profile ARN: ${inferenceProfileArn}`);
      
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0.7,
        system: systemMessage || "You are a helpful assistant.",
        messages: [{
          role: "user",
          content: userMessage
        }]
      };

      const command = new InvokeModelCommand({
        modelId: inferenceProfileArn,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      });

      const response = await this.runtimeClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log(`✅ 응답 수신 완료!`);
      console.log(`   Input tokens: ${result.usage?.input_tokens || 'N/A'}`);
      console.log(`   Output tokens: ${result.usage?.output_tokens || 'N/A'}`);
      
      return result.content[0].text;
    } catch (error) {
      console.error('❌ 모델 호출 실패:', error.message);
      throw error;
    }
  }

  /**
   * Profile 가져오기 또는 생성
   */
  async getOrCreateProfile(modelId, profileName) {
    // 먼저 기존 프로필 확인
    const existing = await this.findProfileForModel(modelId);
    if (existing) {
      console.log(`✅ 기존 Profile 발견: ${existing.inferenceProfileArn}`);
      return existing.inferenceProfileArn;
    }
    
    // 없으면 새로 생성
    return await this.createProfile(profileName, modelId);
  }
}

// Claude 4.5 모델 ID 목록
const CLAUDE_45_MODELS = {
  'sonnet': 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  'opus': 'us.anthropic.claude-opus-4-20250514-v1:0',
  // 기존 모델 ID도 시도
  'sonnet-alt': 'anthropic.claude-sonnet-4-5-20250929-v1:0',
};

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 AWS Bedrock Inference Profile 테스트');
  console.log('='.repeat(60));
  console.log(`\n📍 Region: ${AWS_REGION}`);
  
  const manager = new ClaudeInferenceProfileManager(AWS_REGION);

  try {
    // 1. 기존 Inference Profile 목록 조회
    console.log('\n' + '-'.repeat(60));
    console.log('1️⃣ 기존 Inference Profile 목록 조회');
    console.log('-'.repeat(60));
    await manager.listProfiles();

    // 2. Claude 4.5 Sonnet용 Profile 생성 시도
    console.log('\n' + '-'.repeat(60));
    console.log('2️⃣ Claude 4.5 Sonnet Inference Profile 생성/조회');
    console.log('-'.repeat(60));
    
    let profileArn;
    try {
      profileArn = await manager.createProfile(
        'msp-claude-sonnet-4-profile',
        CLAUDE_45_MODELS.sonnet
      );
    } catch (error) {
      console.log('⚠️ 첫 번째 모델 ID 실패, 대체 ID 시도...');
      try {
        profileArn = await manager.createProfile(
          'msp-claude-sonnet-4-profile-alt',
          CLAUDE_45_MODELS['sonnet-alt']
        );
      } catch (error2) {
        console.error('❌ 모든 모델 ID 시도 실패');
        console.log('\n💡 시스템 정의 Inference Profile 사용을 권장합니다.');
        console.log('   AWS Bedrock 콘솔에서 직접 Inference Profile을 생성하세요.');
        return;
      }
    }

    // 3. 모델 호출 테스트
    if (profileArn) {
      console.log('\n' + '-'.repeat(60));
      console.log('3️⃣ 모델 호출 테스트');
      console.log('-'.repeat(60));
      
      const response = await manager.invokeModel(
        profileArn,
        '안녕하세요! 간단히 자기소개 해주세요.',
        '당신은 친절한 AI 어시스턴트입니다. 한국어로 답변하세요.'
      );
      
      console.log('\n📝 Claude 응답:');
      console.log('-'.repeat(40));
      console.log(response);
      console.log('-'.repeat(40));
    }

    console.log('\n✅ 테스트 완료!');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('\n📋 상세 오류:');
    console.error(error);
  }
}

main();
