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
    const { backupId } = body;

    if (!backupId) {
      return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });
    }

    const backupService = getBackupService();
    await backupService.restoreFromBackup(backupId, admin.userId);

    return NextResponse.json({ 
      success: true, 
      message: 'System restored successfully from backup' 
    });

  } catch (error: any) {
    console.error('Error restoring from backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore from backup', details: error.message },
      { status: 500 }
    );
  }
}