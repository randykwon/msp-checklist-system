import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { createUser, getUserByEmail } from '@/lib/db';
import bcrypt from 'bcryptjs';

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

    const { email, password, name, role, organization, phone } = await request.json();

    // 필수 필드 검증
    if (!email || !password || !name) {
      return NextResponse.json({ error: '이메일, 비밀번호, 이름은 필수입니다.' }, { status: 400 });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식이 아닙니다.' }, { status: 400 });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // 이메일 중복 확인
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }

    // 역할 검증 (superadmin만 superadmin 생성 가능)
    const allowedRoles = ['user', 'operator', 'admin'];
    if (user.role === 'superadmin') {
      allowedRoles.push('superadmin');
    }
    
    const userRole = role && allowedRoles.includes(role) ? role : 'user';

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const newUser = createUser(email, hashedPassword, name, userRole, phone, organization);

    return NextResponse.json({
      success: true,
      message: '사용자가 생성되었습니다.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: '사용자 생성에 실패했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
