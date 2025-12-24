import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getProgressStats, getSystemStats } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    
    if (!['operator', 'admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get stats from database
    const progressStats = getProgressStats();
    const systemStats = getSystemStats();

    return NextResponse.json({
      totalUsers: progressStats.totalUsers,
      activeUsers: progressStats.activeUsers,
      completedAssessments: progressStats.completedAssessments,
      averageProgress: progressStats.averageProgress,
      systemUptime: systemStats.systemUptime,
      recentActivity: progressStats.recentActivity
    });

  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats', details: error.message },
      { status: 500 }
    );
  }
}