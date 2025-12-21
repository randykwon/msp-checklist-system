import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 관리자 시스템 접근 권한 재확인 (운영자 이상)
    if (!['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin system access required' }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Failed to get current user', details: error.message },
      { status: 500 }
    );
  }
}