import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserActivity } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/users called');
    const token = request.cookies.get('admin_auth_token')?.value;
    console.log('Token exists:', !!token);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    console.log('Verified user:', user?.email, user?.role);
    
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Fetching users from DB...');
    const users = getUserActivity();
    console.log('Users fetched:', users?.length);

    return NextResponse.json({ users });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}