import { NextResponse } from 'next/server';
import { getCurrentUser, removeAuthCookie } from '@/lib/auth';
import { deleteUser } from '@/lib/db';

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Delete user (CASCADE will delete all assessment data)
    deleteUser(user.userId);

    // Remove auth cookie
    await removeAuthCookie();

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
