import { NextResponse } from 'next/server';
import { removeAuthCookieOnResponse } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    return removeAuthCookieOnResponse(response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
