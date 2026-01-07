import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// 데이터베이스 연결
const dbPath = path.join(process.cwd(), 'msp-assessment.db');

export async function GET(request: NextRequest) {
  try {
    const db = new Database(dbPath);
    
    // 시스템 설정 테이블이 없으면 기본값 반환
    try {
      // Admin에서 사용하는 컬럼명: setting_key, setting_value
      const stmt = db.prepare('SELECT setting_key, setting_value FROM system_settings');
      const rows = stmt.all() as { setting_key: string; setting_value: string }[];
      
      const settings: Record<string, any> = {
        evidenceUploadEnabled: false
      };
      
      for (const row of rows) {
        if (row.setting_value === 'true') {
          settings[row.setting_key] = true;
        } else if (row.setting_value === 'false') {
          settings[row.setting_key] = false;
        } else {
          try {
            settings[row.setting_key] = JSON.parse(row.setting_value);
          } catch {
            settings[row.setting_key] = row.setting_value;
          }
        }
      }
      
      db.close();
      return NextResponse.json(settings);
    } catch (e) {
      // 테이블이 없으면 기본값 반환
      db.close();
      return NextResponse.json({ evidenceUploadEnabled: false });
    }
  } catch (error: any) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { evidenceUploadEnabled: false },
      { status: 200 }
    );
  }
}
