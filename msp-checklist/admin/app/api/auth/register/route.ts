import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organization, phone } = await request.json();

    // 필수 필드 검증
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '이름, 이메일, 비밀번호는 필수입니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다.' },
        { status: 409 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성 (기본 역할: user, 상태: inactive - 관리자 승인 필요)
    const newUser = createUser(
      email,
      hashedPassword,
      name,
      'user',
      phone || undefined,
      organization || undefined
    );

    return NextResponse.json({
      message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '회원가입 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
