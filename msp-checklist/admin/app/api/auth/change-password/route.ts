import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Admin 앱의 토큰 확인
    const cookieStore = cookies();
    const token = cookieStore.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    const db = getDatabase();
    
    try {
      // Get user from database
      const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;

      if (!dbUser) {
        return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?")
        .run(hashedPassword, decoded.userId);

      return NextResponse.json({ 
        message: '비밀번호가 성공적으로 변경되었습니다.'
      });

    } finally {
      db.close();
    }

  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: '비밀번호 변경에 실패했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
