import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getBackupService } from '@/lib/backup-service';

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
    const { resetType, criteria, createBackup = true } = body;

    const backupService = getBackupService();

    switch (resetType) {
      case 'full':
        await backupService.resetFullSystem(admin.userId, createBackup);
        break;
      
      case 'selective':
        if (!criteria) {
          return NextResponse.json({ error: 'Criteria required for selective reset' }, { status: 400 });
        }
        await backupService.deleteSelective(admin.userId, criteria, createBackup);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid reset type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${resetType} system reset completed successfully` 
    });

  } catch (error: any) {
    console.error('Error resetting system:', error);
    return NextResponse.json(
      { error: 'Failed to reset system', details: error.message },
      { status: 500 }
    );
  }
}