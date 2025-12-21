import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAllQuestions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const questions = getAllQuestions();

    return NextResponse.json({ questions });

  } catch (error: any) {
    console.error('Error fetching all questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions', details: error.message },
      { status: 500 }
    );
  }
}