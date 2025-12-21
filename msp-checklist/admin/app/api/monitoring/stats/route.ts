import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserActivity, getCacheStats, getQAStats, getUserStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userActivity = getUserActivity();
    const cacheStats = getCacheStats();
    const qaStats = getQAStats();
    const userStats = getUserStats();

    return NextResponse.json({
      userActivity,
      cacheStats,
      systemInfo: {
        totalQuestions: qaStats.totalQuestions,
        totalUsers: userStats.totalUsers,
        adminUsers: userStats.adminUsers,
      }
    });

  } catch (error: any) {
    console.error('Error fetching monitoring stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring stats', details: error.message },
      { status: 500 }
    );
  }
}