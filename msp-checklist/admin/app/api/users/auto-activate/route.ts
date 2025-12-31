import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

// GET: 자동 활성화 설정 조회
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

    const db = getDatabase();
    try {
      // system_settings 테이블에서 auto_activate_users 설정 조회
      const setting = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?').get('auto_activate_users') as any;
      const enabled = setting?.setting_value === 'true';
      
      return NextResponse.json({ enabled });
    } finally {
      db.close();
    }

  } catch (error: any) {
    console.error('Error fetching auto-activate setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setting', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 자동 활성화 설정 변경
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { enabled } = await request.json();

    const db = getDatabase();
    try {
      // system_settings 테이블 생성 (없으면)
      db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 설정 업데이트 또는 삽입
      db.prepare(`
        INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = datetime('now')
      `).run('auto_activate_users', enabled ? 'true' : 'false', user.userId);

      return NextResponse.json({ 
        success: true, 
        enabled,
        message: `자동 활성화가 ${enabled ? '활성화' : '비활성화'}되었습니다.`
      });
    } finally {
      db.close();
    }

  } catch (error: any) {
    console.error('Error updating auto-activate setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting', details: error.message },
      { status: 500 }
    );
  }
}
