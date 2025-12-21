import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateUserInfo, getUserByEmail, getUserById } from '@/lib/db';

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

    const { userId, name, email, phone, organization } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = getUserById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If email is being changed, check if it's already taken
    if (email && email !== existingUser.email) {
      const emailUser = getUserByEmail(email);
      if (emailUser && emailUser.id !== userId) {
        return NextResponse.json(
          { error: 'Email is already taken by another user' },
          { status: 400 }
        );
      }
    }

    // Prepare updates object
    const updates: { name?: string; email?: string; phone?: string; organization?: string } = {};
    
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (organization !== undefined) updates.organization = organization;

    updateUserInfo(userId, updates);

    return NextResponse.json({ message: 'User information updated successfully' });

  } catch (error: any) {
    console.error('Error updating user info:', error);
    return NextResponse.json(
      { error: 'Failed to update user information', details: error.message },
      { status: 500 }
    );
  }
}