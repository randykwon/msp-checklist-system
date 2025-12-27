import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 디버깅: 모든 쿠키 로깅
    const allCookies = request.cookies.getAll();
    console.log('[Auth/me] All cookies:', allCookies.map(c => c.name));
    
    const token = request.cookies.get('msp_auth_token')?.value;
    console.log('[Auth/me] Token exists:', !!token);
    
    if (!token) {
      console.log('[Auth/me] No token - returning 401');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = verifyToken(token);
    console.log('[Auth/me] Token valid:', !!payload);
    
    if (!payload) {
      console.log('[Auth/me] Invalid token - returning 401');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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