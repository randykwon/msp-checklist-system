import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 메인 앱의 API를 프록시
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
    const { type, llmConfig } = body; // type: 'advice' | 'virtual_evidence'

    if (!type || !['advice', 'virtual_evidence'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "advice" or "virtual_evidence"' },
        { status: 400 }
      );
    }

    // 메인 앱의 API로 프록시
    const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
    const url = `${mainAppUrl}/api/generate-summary`;
    
    console.log('[Admin Proxy] Forwarding generate-summary request:', type);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, llmConfig }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log('[Admin Proxy] Error response:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in admin generate-summary API:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', details: error.message },
      { status: 500 }
    );
  }
}
