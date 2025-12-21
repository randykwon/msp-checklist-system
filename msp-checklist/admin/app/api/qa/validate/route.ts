import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAllQuestions } from '@/lib/db';
import { findInvalidQAItems, getValidItemIds } from '@/lib/assessment-validator';

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

    // 모든 Q&A 항목 가져오기
    const allQuestions = getAllQuestions();
    
    // 유효하지 않은 항목들 찾기
    const invalidItems = findInvalidQAItems(allQuestions.map(q => ({
      itemId: q.itemId,
      assessmentType: q.assessmentType
    })));

    // 유효한 ID 목록
    const validIds = getValidItemIds();

    // 통계 정보
    const stats = {
      totalQuestions: allQuestions.length,
      validQuestions: allQuestions.length - invalidItems.length,
      invalidQuestions: invalidItems.length,
      validItemIds: validIds
    };

    // 유효하지 않은 Q&A 항목들의 상세 정보
    const invalidQADetails = allQuestions.filter(qa => 
      invalidItems.some(invalid => 
        invalid.itemId === qa.itemId && invalid.assessmentType === qa.assessmentType
      )
    );

    return NextResponse.json({
      stats,
      invalidItems: invalidQADetails
    });

  } catch (error: any) {
    console.error('Error validating Q&A items:', error);
    return NextResponse.json(
      { error: 'Failed to validate Q&A items', details: error.message },
      { status: 500 }
    );
  }
}