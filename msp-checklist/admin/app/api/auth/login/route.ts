import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 계정입니다.' },
        { status: 401 }
      );
    }

    // 관리자 시스템 접근 권한 확인 (운영자 이상)
    if (!['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: '관리자 시스템 접근 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 계정 상태 확인
    if (user.status === 'inactive') {
      return NextResponse.json(
        { error: '계정이 비활성화되어 있습니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: '계정이 일시중지되어 있습니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Set auth cookie
    const response = NextResponse.json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

    response.cookies.set('admin_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}