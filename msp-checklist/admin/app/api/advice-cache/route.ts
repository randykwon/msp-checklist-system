import { NextRequest, NextResponse } from 'next/server';

// 메인 애플리케이션의 API를 프록시하는 함수
async function proxyToMainApp(request: NextRequest, endpoint: string, options?: RequestInit) {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
  const url = `${mainAppUrl}${endpoint}`;
  
  console.log(`[Admin Proxy] Forwarding ${request.method} request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body,
    });
    
    console.log(`[Admin Proxy] Response status: ${response.status}`);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[Admin Proxy] Error response:`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Admin Proxy] Connection error:', error);
    console.error('[Admin Proxy] Target URL was:', url);
    return NextResponse.json(
      { error: 'Failed to connect to main application', details: error instanceof Error ? error.message : 'Unknown error', targetUrl: url },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const endpoint = `/api/advice-cache${queryString ? `?${queryString}` : ''}`;
  
  return proxyToMainApp(request, endpoint);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const endpoint = '/api/advice-cache';
  
  return proxyToMainApp(request, endpoint, {
    method: 'POST',
    body,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  const endpoint = '/api/advice-cache';
  
  return proxyToMainApp(request, endpoint, {
    method: 'PUT',
    body,
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const endpoint = `/api/advice-cache${queryString ? `?${queryString}` : ''}`;
  
  return proxyToMainApp(request, endpoint, {
    method: 'DELETE',
  });
}