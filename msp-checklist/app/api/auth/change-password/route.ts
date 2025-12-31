import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Next.js 14에서는 cookies()가 async
    const cookieStore = await cookies();
    const token = cookieStore.get('msp_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // Get user from database (verifyToken returns userId, not id)
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const dbUser = stmt.get(user.userId) as any;

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
    const updateStmt = db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?");
    updateStmt.run(hashedPassword, user.userId);

    return NextResponse.json({ 
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: '비밀번호 변경에 실패했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
