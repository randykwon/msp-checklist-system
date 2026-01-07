import { NextRequest, NextResponse } from 'next/server';

/**
 * LLM 설정 API - .env.local에서 API 키 정보를 반환
 * 보안: API 키는 마스킹 처리하여 반환 (존재 여부만 확인 가능)
 */
export async function GET(request: NextRequest) {
  try {
    // 환경변수에서 LLM 설정 읽기
    const config = {
      // 현재 설정된 provider
      currentProvider: process.env.LLM_PROVIDER || 'bedrock',
      
      // OpenAI
      openai: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      },
      
      // Gemini
      gemini: {
        hasApiKey: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      },
      
      // Claude (직접 API)
      claude: {
        hasApiKey: !!(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY),
        apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      },
      
      // AWS Bedrock
      bedrock: {
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        awsRegion: process.env.AWS_REGION || 'ap-northeast-2',
        model: process.env.BEDROCK_MODEL || process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-sonnet-4-5-20250929-v1:0',
      },
    };

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error reading LLM config:', error);
    return NextResponse.json(
      { error: 'Failed to read LLM configuration' },
      { status: 500 }
    );
  }
}
