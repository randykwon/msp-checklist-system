import { NextRequest, NextResponse } from 'next/server';

/**
 * 메인 앱의 LLM 설정을 프록시하는 API
 */
export async function GET(request: NextRequest) {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
  
  try {
    const response = await fetch(`${mainAppUrl}/api/llm-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch LLM config from main app' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying LLM config:', error);
    return NextResponse.json(
      { error: 'Failed to connect to main application' },
      { status: 500 }
    );
  }
}
