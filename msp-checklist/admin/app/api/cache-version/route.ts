import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 메인 애플리케이션의 API를 프록시하는 함수
async function proxyToMainApp(request: NextRequest, options?: RequestInit) {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
  const url = `${mainAppUrl}/api/cache-version`;
  
  console.log(`🔗 Proxying cache version request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body,
    });
    
    const data = await response.json();
    console.log(`📊 Cache version response:`, data);
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Cache version proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to connect to main application', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = verifyToken(token);
    if (!user || !['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return proxyToMainApp(request);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin or Superadmin access required' }, { status: 403 });
    }

    const body = await request.text();
    return proxyToMainApp(request, {
      method: 'POST',
      body,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}