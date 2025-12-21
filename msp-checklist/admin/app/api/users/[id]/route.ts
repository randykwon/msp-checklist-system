import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { deleteUser } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // 자기 자신은 삭제할 수 없음
    if (userId === user.userId) {
      return NextResponse.json(
        { error: '자신의 계정은 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    deleteUser(userId);

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}