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
      const stmt = db.prepare('SELECT key, value FROM system_settings');
      const rows = stmt.all() as { key: string; value: string }[];
      
      const settings: Record<string, any> = {
        evidenceUploadEnabled: false
      };
      
      for (const row of rows) {
        if (row.value === 'true') {
          settings[row.key] = true;
        } else if (row.value === 'false') {
          settings[row.key] = false;
        } else {
          try {
            settings[row.key] = JSON.parse(row.value);
          } catch {
            settings[row.key] = row.value;
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
