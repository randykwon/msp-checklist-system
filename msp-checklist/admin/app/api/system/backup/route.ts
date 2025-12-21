import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getBackupService } from '@/lib/backup-service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const backupService = getBackupService();
    const backups = backupService.getBackups();

    return NextResponse.json({ backups });

  } catch (error: any) {
    console.error('Error fetching backups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backups', details: error.message },
      { status: 500 }
    );
  }
}

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
    const { backupType, criteria } = body;

    const backupService = getBackupService();
    let backupPath: string;

    switch (backupType) {
      case 'full':
        backupPath = await backupService.createFullBackup(admin.userId);
        break;
      
      case 'selective':
        if (!criteria) {
          return NextResponse.json({ error: 'Criteria required for selective backup' }, { status: 400 });
        }
        backupPath = await backupService.createSelectiveBackup(admin.userId, criteria);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid backup type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Backup created successfully',
      backupPath 
    });

  } catch (error: any) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: error.message },
      { status: 500 }
    );
  }
}