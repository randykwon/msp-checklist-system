import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { 
  getActivityLogs, 
  getActivityStats, 
  getUserActivitySummaries, 
  getIPActivitySummaries,
  cleanupOldActivityLogs,
  ActivityLogFilter 
} from '@/lib/db';

// GET: 활동 로그 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const token = request.cookies.get('admin_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'logs'; // logs, stats, users, ips
    
    // 필터 파라미터
    const filter: ActivityLogFilter = {};
    
    if (searchParams.get('userId')) {
      filter.userId = parseInt(searchParams.get('userId')!);
    }
    if (searchParams.get('ipAddress')) {
      filter.ipAddress = searchParams.get('ipAddress')!;
    }
    if (searchParams.get('actionType')) {
      filter.actionType = searchParams.get('actionType')!;
    }
    if (searchParams.get('actionCategory')) {
      filter.actionCategory = searchParams.get('actionCategory')!;
    }
    if (searchParams.get('itemId')) {
      filter.itemId = searchParams.get('itemId')!;
    }
    if (searchParams.get('assessmentType')) {
      filter.assessmentType = searchParams.get('assessmentType')!;
    }
    if (searchParams.get('startDate')) {
      filter.startDate = searchParams.get('startDate')!;
    }
    if (searchParams.get('endDate')) {
      filter.endDate = searchParams.get('endDate')!;
    }
    if (searchParams.get('limit')) {
      filter.limit = parseInt(searchParams.get('limit')!);
    }
    if (searchParams.get('offset')) {
      filter.offset = parseInt(searchParams.get('offset')!);
    }

    let data: any;

    switch (view) {
      case 'stats':
        data = getActivityStats(filter);
        break;
      
      case 'users':
        const userLimit = filter.limit || 50;
        data = getUserActivitySummaries(userLimit);
        break;
      
      case 'ips':
        const ipLimit = filter.limit || 50;
        data = getIPActivitySummaries(ipLimit);
        break;
      
      case 'logs':
      default:
        // 기본 limit 설정
        if (!filter.limit) {
          filter.limit = 100;
        }
        data = getActivityLogs(filter);
        break;
    }

    return NextResponse.json({ 
      success: true, 
      view,
      data,
      filter
    });

  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 오래된 로그 정리
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인 (superadmin만)
    const token = request.cookies.get('admin_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '90');

    const deletedCount = cleanupOldActivityLogs(daysToKeep);

    return NextResponse.json({ 
      success: true, 
      message: `${deletedCount} old logs deleted`,
      deletedCount,
      daysKept: daysToKeep
    });

  } catch (error: any) {
    console.error('Error cleaning up activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup activity logs', details: error.message },
      { status: 500 }
    );
  }
}
