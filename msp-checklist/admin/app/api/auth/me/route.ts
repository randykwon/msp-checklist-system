import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const db = getDatabase();
    let user;
    try {
      user = db.prepare(`
        SELECT id, email, name, role, status, phone, organization, created_at, updated_at
        FROM users 
        WHERE id = ?
      `).get(decoded.userId) as any;
    } finally {
      db.close();
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 관리자 권한 확인
    if (!['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}