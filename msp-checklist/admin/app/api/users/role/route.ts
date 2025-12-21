import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateUserRole } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      );
    }

    if (!['user', 'operator', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user", "operator", "admin", or "superadmin"' },
        { status: 400 }
      );
    }

    // 자기 자신의 역할은 변경할 수 없음
    if (userId === user.userId) {
      return NextResponse.json(
        { error: '자신의 역할은 변경할 수 없습니다.' },
        { status: 400 }
      );
    }

    updateUserRole(userId, role);

    return NextResponse.json({ message: 'User role updated successfully' });

  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role', details: error.message },
      { status: 500 }
    );
  }
}