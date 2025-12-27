import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword, generateToken, setAuthCookieOnResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check user status
    if (user.status === 'inactive') {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact administrator for activation.' },
        { status: 403 }
      );
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: 'Account is suspended. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Create response and set cookie
    const response = NextResponse.json(
      {
        user: {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        message: 'Login successful'
      },
      { status: 200 }
    );

    // Set auth cookie on response
    console.log('[Login] Setting cookie for user:', user.email);
    const finalResponse = setAuthCookieOnResponse(response, token);
    
    // 디버깅: Set-Cookie 헤더 확인
    const setCookieHeader = finalResponse.headers.get('Set-Cookie');
    console.log('[Login] Set-Cookie header:', setCookieHeader);
    
    return finalResponse;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
