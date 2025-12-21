import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateUserStatus } from '@/lib/db';

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

    const { userId, status } = await request.json();

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'userId and status are required' },
        { status: 400 }
      );
    }

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "active", "suspended", or "inactive"' },
        { status: 400 }
      );
    }

    // 자기 자신의 상태는 변경할 수 없음
    if (userId === user.userId) {
      return NextResponse.json(
        { error: '자신의 상태는 변경할 수 없습니다.' },
        { status: 400 }
      );
    }

    updateUserStatus(userId, status);

    return NextResponse.json({ message: 'User status updated successfully' });

  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status', details: error.message },
      { status: 500 }
    );
  }
}