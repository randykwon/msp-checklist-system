import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// 현재 활성 캐시 버전을 관리하는 API
export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    const db = new Database(dbPath);

    try {
      // 현재 활성 버전 조회
      const result = db.prepare(`
        SELECT version, cache_type, updated_at 
        FROM active_cache_versions 
        ORDER BY updated_at DESC
      `).all() as any[];

      const activeVersions = {
        advice: result.find(r => r.cache_type === 'advice')?.version || null,
        virtualEvidence: result.find(r => r.cache_type === 'virtual_evidence')?.version || null
      };

      return NextResponse.json({ activeVersions });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Error getting active cache versions:', error);
    return NextResponse.json(
      { error: 'Failed to get active cache versions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cacheType, version } = await request.json();

    if (!cacheType || !version) {
      return NextResponse.json(
        { error: 'cacheType and version are required' },
        { status: 400 }
      );
    }

    if (!['advice', 'virtual_evidence'].includes(cacheType)) {
      return NextResponse.json(
        { error: 'cacheType must be "advice" or "virtual_evidence"' },
        { status: 400 }
      );
    }

    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    const db = new Database(dbPath);

    try {
      // active_cache_versions 테이블이 없으면 생성
      db.exec(`
        CREATE TABLE IF NOT EXISTS active_cache_versions (
          cache_type TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 활성 버전 설정 (UPSERT)
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO active_cache_versions (cache_type, version, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(cacheType, version);

      return NextResponse.json({
        success: true,
        message: `Active ${cacheType} cache version set to ${version}`
      });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Error setting active cache version:', error);
    return NextResponse.json(
      { error: 'Failed to set active cache version' },
      { status: 500 }
    );
  }
}