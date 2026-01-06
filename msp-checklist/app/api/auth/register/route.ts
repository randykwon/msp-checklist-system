import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, isAutoActivateEnabled, updateUserStatus } from '@/lib/db';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { logRegisterActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  let user = null;
  
  try {
    const { email, password, name } = await request.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    user = createUser(email, hashedPassword, name);

    // Check if auto-activate is enabled (with error handling)
    let autoActivate = false;
    try {
      autoActivate = isAutoActivateEnabled();
      console.log('[Register] Auto-activate setting:', autoActivate);
    } catch (settingError) {
      console.error('[Register] Error checking auto-activate setting:', settingError);
      // Default to false if setting check fails
      autoActivate = false;
    }

    // Update user status if auto-activate is enabled
    if (autoActivate) {
      try {
        updateUserStatus(user.id, 'active');
        user.status = 'active';
        console.log('[Register] User auto-activated:', user.id);
      } catch (statusError) {
        console.error('[Register] Error updating user status:', statusError);
        // User is created but not activated - continue with inactive status
      }
    }

    if (autoActivate && user.status === 'active') {
      // 회원가입 활동 기록
      try {
        logRegisterActivity(request, user.id, user.email, user.name);
      } catch (logError) {
        console.error('[Register] Failed to log activity:', logError);
      }
      
      return NextResponse.json(
        {
          user: {
            userId: user.id,
            email: user.email,
            name: user.name,
            status: user.status
          },
          message: 'Registration successful. Your account has been automatically activated.',
          requiresActivation: false
        },
        { status: 201 }
      );
    }

    // 회원가입 활동 기록
    try {
      logRegisterActivity(request, user.id, user.email, user.name);
    } catch (logError) {
      console.error('[Register] Failed to log activity:', logError);
    }

    return NextResponse.json(
      {
        user: {
          userId: user.id,
          email: user.email,
          name: user.name,
          status: user.status
        },
        message: 'Registration successful. Your account is pending activation by an administrator. Please contact support to activate your account.',
        requiresActivation: true
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    // If user was created but error occurred later, still return success
    if (user) {
      console.log('[Register] User was created despite error, returning success');
      return NextResponse.json(
        {
          user: {
            userId: user.id,
            email: user.email,
            name: user.name,
            status: user.status
          },
          message: 'Registration successful. Your account is pending activation by an administrator.',
          requiresActivation: true
        },
        { status: 201 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
