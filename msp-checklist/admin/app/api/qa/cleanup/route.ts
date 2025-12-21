import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findInvalidQAItems } from '@/lib/assessment-validator';
import db from '@/lib/db';

export async function DELETE(request: NextRequest) {
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
    const allQuestionsStmt = db.prepare(`
      SELECT id, item_id as itemId, assessment_type as assessmentType 
      FROM item_qa
    `);
    const allQuestions = allQuestionsStmt.all() as Array<{id: number, itemId: string, assessmentType: string}>;
    
    // 유효하지 않은 항목들 찾기
    const invalidItems = findInvalidQAItems(allQuestions);
    
    if (invalidItems.length === 0) {
      return NextResponse.json({
        message: 'No invalid Q&A items found',
        deletedCount: 0
      });
    }

    // 유효하지 않은 항목들의 ID 목록
    const invalidQAIds = allQuestions
      .filter(qa => invalidItems.some(invalid => 
        invalid.itemId === qa.itemId && invalid.assessmentType === qa.assessmentType
      ))
      .map(qa => qa.id);

    // 유효하지 않은 Q&A 항목들 삭제
    const deleteStmt = db.prepare('DELETE FROM item_qa WHERE id = ?');
    const deleteTransaction = db.transaction((ids: number[]) => {
      for (const id of ids) {
        deleteStmt.run(id);
      }
    });

    deleteTransaction(invalidQAIds);

    return NextResponse.json({
      message: `Successfully deleted ${invalidQAIds.length} invalid Q&A items`,
      deletedCount: invalidQAIds.length,
      deletedItems: invalidItems
    });

  } catch (error: any) {
    console.error('Error cleaning up invalid Q&A items:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup invalid Q&A items', details: error.message },
      { status: 500 }
    );
  }
}