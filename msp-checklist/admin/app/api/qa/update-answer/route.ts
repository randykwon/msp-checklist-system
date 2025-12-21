import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { answerQuestion } from '@/lib/db';

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

    const { questionId, answer } = await request.json();

    if (!questionId || !answer) {
      return NextResponse.json(
        { error: 'Question ID and answer are required' },
        { status: 400 }
      );
    }

    // Update the answer (this will overwrite the existing answer)
    answerQuestion(questionId, answer.trim(), user.userId);

    return NextResponse.json({
      message: 'Answer updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating answer:', error);
    return NextResponse.json(
      { error: 'Failed to update answer', details: error.message },
      { status: 500 }
    );
  }
}