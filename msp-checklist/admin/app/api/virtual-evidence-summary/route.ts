import { NextRequest, NextResponse } from 'next/server';

const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://localhost:3010';

// GET: 요약 버전 목록 또는 특정 버전의 요약 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${MAIN_APP_URL}/api/virtual-evidence-summary?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying virtual-evidence-summary GET:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 모든 항목의 요약 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${MAIN_APP_URL}/api/virtual-evidence-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 응답이 JSON인지 확인
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[Admin Proxy] Non-JSON response from main app:', text.substring(0, 200));
      return NextResponse.json(
        { error: '메인 앱에서 잘못된 응답을 받았습니다. 메인 앱을 재시작해주세요.', details: 'Non-JSON response' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying virtual-evidence-summary POST:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 요약 버전 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${MAIN_APP_URL}/api/virtual-evidence-summary?${queryString}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying virtual-evidence-summary DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error.message },
      { status: 500 }
    );
  }
}
