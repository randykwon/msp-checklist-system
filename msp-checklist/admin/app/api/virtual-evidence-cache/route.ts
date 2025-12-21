import { NextRequest, NextResponse } from 'next/server';

// 메인 애플리케이션의 API를 프록시하는 함수
async function proxyToMainApp(request: NextRequest, endpoint: string, options?: RequestInit) {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
  const url = `${mainAppUrl}${endpoint}`;
  
  console.log(`🔗 Proxying to: ${url}`);
  console.log(`📋 Method: ${request.method}`);
  console.log(`📦 Body: ${options?.body || 'none'}`);
  
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body,
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    const data = await response.json();
    console.log(`📄 Response data:`, data);
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('🔍 Error details:', {
      message: errorMessage,
      stack: errorStack,
      url,
      method: request.method
    });
    return NextResponse.json(
      { error: 'Failed to connect to main application', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const endpoint = `/api/virtual-evidence-cache${queryString ? `?${queryString}` : ''}`;
  
  return proxyToMainApp(request, endpoint);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const endpoint = '/api/virtual-evidence-cache';
  
  return proxyToMainApp(request, endpoint, {
    method: 'POST',
    body,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  const endpoint = '/api/virtual-evidence-cache';
  
  return proxyToMainApp(request, endpoint, {
    method: 'PUT',
    body,
  });
}