# AWS Bedrock 샘플 코드

## 설치

```bash
npm install @aws-sdk/client-bedrock-runtime dotenv
```

## 환경변수 설정

`.env` 파일에 AWS 자격증명 설정:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

## 실행

```bash
# JavaScript 버전
node bedrock-sample.js

# TypeScript 버전
npx ts-node bedrock-sample.ts
```

## 사용 가능한 모델 ID

| 모델 | Model ID |
|------|----------|
| Claude 3.5 Sonnet v2 | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20240620-v1:0` |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229-v1:0` |
| Claude 3 Sonnet | `anthropic.claude-3-sonnet-20240229-v1:0` |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307-v1:0` |

## 함수 설명

- `invokeBedrockClaude(prompt)` - 기본 호출
- `invokeWithSystemPrompt(systemPrompt, userMessage)` - 시스템 프롬프트 포함
- `invokeBedrockStreaming(prompt)` - 스트리밍 응답
- `invokeWithHistory(messages, systemPrompt)` - 대화 히스토리 포함
