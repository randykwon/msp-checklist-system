import { NextRequest, NextResponse } from 'next/server';
import { createQuestion, answerQuestion, getQuestionsForItem, getQuestionsForItemByUser, deleteQuestion } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const assessmentType = searchParams.get('assessmentType') as 'prerequisites' | 'technical';

    console.log('[QA API] GET request:', { itemId, assessmentType });

    if (!itemId || !assessmentType) {
      return NextResponse.json(
        { error: 'itemId and assessmentType are required' },
        { status: 400 }
      );
    }

    // 사용자 인증 확인 - 로그인한 사용자만 질문 조회 가능
    const token = request.cookies.get('msp_auth_token')?.value;
    if (!token) {
      // 비로그인 사용자는 빈 배열 반환
      console.log('[QA API] No auth token, returning empty questions');
      return NextResponse.json({ questions: [] });
    }

    const user = verifyToken(token);
    if (!user) {
      console.log('[QA API] Invalid token, returning empty questions');
      return NextResponse.json({ questions: [] });
    }

    // 사용자별 질문 필터링 (질문 작성자 또는 관리자만 볼 수 있음)
    const questions = getQuestionsForItemByUser(itemId, assessmentType, user.userId, user.role);
    console.log('[QA API] Questions found for user:', { userId: user.userId, role: user.role, count: questions.length });
    return NextResponse.json({ questions });

  } catch (error) {
    console.error('[QA API] Error fetching Q&A:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Q&A' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('msp_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Content-Type에 따라 다르게 처리
    const contentType = request.headers.get('content-type') || '';
    let action, itemId, assessmentType, question, questionId, answer;

    if (contentType.includes('multipart/form-data')) {
      // FormData 처리 (파일 첨부가 있는 질문 생성)
      const formData = await request.formData();
      action = formData.get('action') as string;
      itemId = formData.get('itemId') as string;
      assessmentType = formData.get('assessmentType') as string;
      question = formData.get('question') as string;
      questionId = formData.get('questionId') as string;
      answer = formData.get('answer') as string;
      
      // 파일 처리 (향후 구현 예정)
      const files = formData.getAll('files') as File[];
      console.log('Attached files:', files.length);
    } else {
      // JSON 처리 (답변 등록, 질문 삭제)
      const body = await request.json();
      ({ action, itemId, assessmentType, question, questionId, answer } = body);
    }

    if (action === 'create_question') {
      if (!itemId || !assessmentType || !question) {
        return NextResponse.json(
          { error: 'itemId, assessmentType, and question are required' },
          { status: 400 }
        );
      }

      const newQuestionId = createQuestion(itemId, assessmentType, question, user.userId);
      return NextResponse.json({ questionId: newQuestionId, message: 'Question created successfully' });

    } else if (action === 'answer_question') {
      // Only admins can answer questions
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Only administrators can answer questions' }, { status: 403 });
      }

      if (!questionId || !answer) {
        return NextResponse.json(
          { error: 'questionId and answer are required' },
          { status: 400 }
        );
      }

      answerQuestion(questionId, answer, user.userId);
      return NextResponse.json({ message: 'Answer added successfully' });

    } else if (action === 'delete_question') {
      if (!questionId) {
        return NextResponse.json(
          { error: 'questionId is required' },
          { status: 400 }
        );
      }

      const deleted = deleteQuestion(questionId, user.userId);
      if (deleted) {
        return NextResponse.json({ message: 'Question deleted successfully' });
      } else {
        return NextResponse.json({ error: 'Unauthorized to delete this question' }, { status: 403 });
      }

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error handling Q&A request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}