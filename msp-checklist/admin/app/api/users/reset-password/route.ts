import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateUserPassword, getUserById } from '@/lib/db';
import bcrypt from 'bcryptjs';

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

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId and newPassword are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = getUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    updateUserPassword(userId, hashedPassword);

    return NextResponse.json({
      message: 'Password reset successfully',
      userEmail: targetUser.email
    });

  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password', details: error.message },
      { status: 500 }
    );
  }
}