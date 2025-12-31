import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: '로그아웃되었습니다.' });
    
    // Clear auth cookie
    response.cookies.set('admin_auth_token', '', {
      httpOnly: true,
      secure: false, // HTTP 환경에서도 동작하도록 설정
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}