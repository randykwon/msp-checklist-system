/**
 * 공유 데이터베이스 서비스
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DBConfig {
  basePath: string;  // 데이터베이스 파일들이 위치한 기본 경로
}

let dbConfig: DBConfig = {
  basePath: process.cwd(),
};

export function setDBConfig(config: Partial<DBConfig>) {
  dbConfig = { ...dbConfig, ...config };
}

export function getDBConfig(): DBConfig {
  return dbConfig;
}

export function getDBPath(dbName: string): string {
  return path.join(dbConfig.basePath, dbName);
}

// 메인 데이터베이스 (msp-assessment.db)
export function getMainDB(): Database.Database {
  const dbPath = getDBPath('msp-assessment.db');
  return new Database(dbPath);
}

// 조언 캐시 데이터베이스
export function getAdviceCacheDB(): Database.Database {
  const dbPath = getDBPath('advice-cache.db');
  return new Database(dbPath);
}

// 가상증빙예제 캐시 데이터베이스
export function getVirtualEvidenceCacheDB(): Database.Database {
  const dbPath = getDBPath('virtual-evidence-cache.db');
  return new Database(dbPath);
}

// 활성 캐시 버전 조회
export function getActiveCacheVersion(cacheType: 'advice' | 'virtualEvidence'): string | null {
  const db = getMainDB();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS active_cache_versions (
        cache_type TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = db.prepare(`
      SELECT version FROM active_cache_versions WHERE cache_type = ?
    `).get(cacheType) as { version: string } | undefined;
    
    return result?.version || null;
  } finally {
    db.close();
  }
}

// 활성 캐시 버전 설정
export function setActiveCacheVersion(cacheType: 'advice' | 'virtualEvidence', version: string): boolean {
  const db = getMainDB();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS active_cache_versions (
        cache_type TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.prepare(`
      INSERT OR REPLACE INTO active_cache_versions (cache_type, version, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(cacheType, version);
    
    return true;
  } catch (error) {
    console.error('Failed to set active cache version:', error);
    return false;
  } finally {
    db.close();
  }
}

// 요약 캐시 테이블 초기화 (조언)
export function initAdviceSummaryTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS advice_summary_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      language TEXT DEFAULT 'ko',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(version, item_id, language)
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_advice_summary_version ON advice_summary_cache(version);
    CREATE INDEX IF NOT EXISTS idx_advice_summary_item ON advice_summary_cache(item_id);
  `);
}

// 요약 캐시 테이블 초기화 (가상증빙예제)
export function initVirtualEvidenceSummaryTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS virtual_evidence_summary_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      language TEXT DEFAULT 'ko',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(version, item_id, language)
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ve_summary_version ON virtual_evidence_summary_cache(version);
    CREATE INDEX IF NOT EXISTS idx_ve_summary_item ON virtual_evidence_summary_cache(item_id);
  `);
}

// DB 파일 존재 여부 확인
export function dbExists(dbName: string): boolean {
  const dbPath = getDBPath(dbName);
  return fs.existsSync(dbPath);
}

// 활성 요약 버전 테이블 초기화
export function initActiveSummaryVersionTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS active_summary_versions (
      summary_type TEXT NOT NULL,
      language TEXT NOT NULL,
      version TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (summary_type, language)
    )
  `);
}

// 활성 요약 버전 조회
export function getActiveSummaryVersion(
  summaryType: 'advice' | 'virtualEvidence',
  language: 'ko' | 'en'
): string | null {
  const db = getMainDB();
  try {
    initActiveSummaryVersionTable(db);
    
    const result = db.prepare(`
      SELECT version FROM active_summary_versions 
      WHERE summary_type = ? AND language = ?
    `).get(summaryType, language) as { version: string } | undefined;
    
    return result?.version || null;
  } finally {
    db.close();
  }
}

// 활성 요약 버전 설정
export function setActiveSummaryVersion(
  summaryType: 'advice' | 'virtualEvidence',
  language: 'ko' | 'en',
  version: string
): boolean {
  const db = getMainDB();
  try {
    initActiveSummaryVersionTable(db);
    
    db.prepare(`
      INSERT OR REPLACE INTO active_summary_versions (summary_type, language, version, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(summaryType, language, version);
    
    return true;
  } catch (error) {
    console.error('Failed to set active summary version:', error);
    return false;
  } finally {
    db.close();
  }
}

// 모든 활성 요약 버전 조회
export function getAllActiveSummaryVersions(): {
  advice: { ko: string | null; en: string | null };
  virtualEvidence: { ko: string | null; en: string | null };
} {
  const db = getMainDB();
  try {
    initActiveSummaryVersionTable(db);
    
    const results = db.prepare(`
      SELECT summary_type, language, version FROM active_summary_versions
    `).all() as Array<{ summary_type: string; language: string; version: string }>;
    
    const versions = {
      advice: { ko: null as string | null, en: null as string | null },
      virtualEvidence: { ko: null as string | null, en: null as string | null },
    };
    
    for (const row of results) {
      if (row.summary_type === 'advice') {
        if (row.language === 'ko') versions.advice.ko = row.version;
        if (row.language === 'en') versions.advice.en = row.version;
      } else if (row.summary_type === 'virtualEvidence') {
        if (row.language === 'ko') versions.virtualEvidence.ko = row.version;
        if (row.language === 'en') versions.virtualEvidence.en = row.version;
      }
    }
    
    return versions;
  } finally {
    db.close();
  }
}
