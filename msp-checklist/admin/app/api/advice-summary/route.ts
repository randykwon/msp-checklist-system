import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 메인 앱의 API를 프록시 - GET (요약 목록/조회)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // 메인 앱의 API로 프록시
    const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
    const url = `${mainAppUrl}/api/advice-summary?${searchParams.toString()}`;
    
    console.log('[Admin Proxy] Forwarding advice-summary GET request:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in admin advice-summary GET API:', error);
    return NextResponse.json(
      { error: 'Failed to get summaries', details: error.message },
      { status: 500 }
    );
  }
}

// 메인 앱의 API를 프록시 - POST (요약 생성)
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

    // 메인 앱의 API로 프록시
    const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
    const url = `${mainAppUrl}/api/advice-summary`;
    
    console.log('[Admin Proxy] Forwarding advice-summary POST request');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in admin advice-summary POST API:', error);
    return NextResponse.json(
      { error: 'Failed to generate summaries', details: error.message },
      { status: 500 }
    );
  }
}

// 메인 앱의 API를 프록시 - DELETE (요약 삭제)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // 메인 앱의 API로 프록시
    const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
    const url = `${mainAppUrl}/api/advice-summary?${searchParams.toString()}`;
    
    console.log('[Admin Proxy] Forwarding advice-summary DELETE request');
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in admin advice-summary DELETE API:', error);
    return NextResponse.json(
      { error: 'Failed to delete summaries', details: error.message },
      { status: 500 }
    );
  }
}
