import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const authToken = request.cookies.get('msp_auth_token');
  
  // 요청 헤더 정보
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'authorization') {
      headers[key] = value;
    }
  });
  
  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      USE_HTTPS: process.env.USE_HTTPS || 'not set'
    },
    cookies: {
      all: allCookies.map(c => ({ name: c.name, valueLength: c.value?.length || 0 })),
      authTokenExists: !!authToken,
      authTokenLength: authToken?.value?.length || 0
    },
    headers: {
      host: headers['host'],
      origin: headers['origin'],
      referer: headers['referer'],
      'x-forwarded-proto': headers['x-forwarded-proto'],
      'x-forwarded-for': headers['x-forwarded-for']
    }
  });
}
