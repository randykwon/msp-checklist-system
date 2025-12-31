import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    console.log('[/api/auth/login] Login attempt for:', email);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDatabase();
    
    try {
      // 사용자 조회
      const user = db.prepare(`
        SELECT id, email, name, role, password 
        FROM users 
        WHERE email = ?
      `).get(email) as any;

      if (!user) {
        console.log('[/api/auth/login] User not found:', email);
        return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
      }

      // 비밀번호 확인
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('[/api/auth/login] Invalid password for:', email);
        return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
      }

      // 관리자 권한 확인
      if (!['operator', 'admin', 'superadmin'].includes(user.role)) {
        console.log('[/api/auth/login] Insufficient role:', user.role);
        return NextResponse.json({ error: '관리자 시스템 접근 권한이 필요합니다.' }, { status: 403 });
      }

      // 마지막 로그인 시간 업데이트
      db.prepare(`
        UPDATE users 
        SET updated_at = datetime('now') 
        WHERE id = ?
      `).run(user.id);

      // JWT 토큰 생성 (auth.ts의 generateToken 사용)
      const token = generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
      
      console.log('[/api/auth/login] Token generated, length:', token.length);

      // 쿠키 설정
      const cookieStore = await cookies();
      cookieStore.set('admin_auth_token', token, {
        httpOnly: true,
        secure: false, // HTTP 환경에서도 동작하도록 설정 (Nginx 프록시 환경)
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });
      
      console.log('[/api/auth/login] Cookie set for user:', user.email);

      // 비밀번호 제거 후 응답
      const { password: _, ...userWithoutPassword } = user;

      return NextResponse.json({ 
        user: userWithoutPassword,
        message: '로그인 성공'
      });

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('[/api/auth/login] Login error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}