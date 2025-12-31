import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('[/api/auth/me] Request received');
    console.log('[/api/auth/me] All cookies:', request.cookies.getAll().map(c => c.name));
    
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_auth_token')?.value;
    
    console.log('[/api/auth/me] Token exists:', !!token);
    console.log('[/api/auth/me] Token length:', token?.length);

    if (!token) {
      console.log('[/api/auth/me] No token found');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    console.log('[/api/auth/me] Decoded token:', decoded ? { userId: decoded.userId, email: decoded.email, role: decoded.role } : null);
    
    if (!decoded) {
      console.log('[/api/auth/me] Token verification failed');
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
      console.log('[/api/auth/me] User not found in DB for userId:', decoded.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 관리자 권한 확인
    if (!['operator', 'admin', 'superadmin'].includes(user.role)) {
      console.log('[/api/auth/me] Insufficient permissions, role:', user.role);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    console.log('[/api/auth/me] Success, returning user:', user.email);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[/api/auth/me] Auth verification error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}