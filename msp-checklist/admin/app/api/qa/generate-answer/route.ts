import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 메인 애플리케이션의 API를 프록시하는 함수
async function proxyToMainApp(request: NextRequest, body: any) {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
  const url = `${mainAppUrl}/api/qa/generate-answer`;
  
  try {
    console.log('[Admin Proxy] Forwarding generate-answer request with llmConfig:', body.llmConfig ? 'provided' : 'not provided');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('[Admin Proxy] Error response:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to main application' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // 메인 앱의 API로 프록시 (llmConfig 포함)
    return proxyToMainApp(request, body);

  } catch (error: any) {
    console.error('Error in admin generate answer API:', error);
    return NextResponse.json(
      { error: 'Failed to generate answer', details: error.message },
      { status: 500 }
    );
  }
}