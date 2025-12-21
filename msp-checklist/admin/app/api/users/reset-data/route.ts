import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { deleteAssessmentData, deleteAllUserData } from '@/lib/db';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, dataType } = body;

    if (!userId || !dataType) {
      return NextResponse.json({ error: 'User ID and data type are required' }, { status: 400 });
    }

    if (!['all', 'prerequisites', 'technical'].includes(dataType)) {
      return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

    let deletedRecords = 0;

    if (dataType === 'all') {
      // 모든 평가 데이터 삭제
      deleteAllUserData(userId);
      
      // 삭제된 레코드 수 계산 (대략적)
      const stmt = db.prepare('SELECT COUNT(*) as count FROM assessment_data WHERE user_id = ?');
      const result = stmt.get(userId) as { count: number };
      deletedRecords = result.count;
      
      deleteAllUserData(userId);
    } else {
      // 특정 타입만 삭제
      const stmt = db.prepare('SELECT COUNT(*) as count FROM assessment_data WHERE user_id = ? AND assessment_type = ?');
      const result = stmt.get(userId, dataType) as { count: number };
      deletedRecords = result.count;
      
      deleteAssessmentData(userId, dataType as 'prerequisites' | 'technical');
    }

    // 로그 기록 (선택사항 - 필요시 구현)
    console.log(`Admin ${admin.userId} reset ${dataType} data for user ${userId}. Deleted ${deletedRecords} records.`);

    return NextResponse.json({
      success: true,
      message: `User data reset successfully`,
      deletedRecords
    });

  } catch (error: any) {
    console.error('Error resetting user data:', error);
    return NextResponse.json(
      { error: 'Failed to reset user data', details: error.message },
      { status: 500 }
    );
  }
}