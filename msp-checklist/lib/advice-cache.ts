import Database from 'better-sqlite3';
import path from 'path';
import { prerequisitesData } from '../data/assessment-data';
import { technicalValidationData } from '../data/technical-validation-data';

// Node.js 환경에서만 fs 모듈 사용
let fs: any = null;
if (typeof window === 'undefined') {
  fs = require('fs');
}

export interface CachedAdvice {
  id: string;
  itemId: string;
  category: string;
  title: string;
  advice: string;
  virtualEvidence: string;
  language: 'ko' | 'en';
  createdAt: string;
  version: string;
}

export interface CacheVersion {
  version: string;
  createdAt: string;
  totalItems: number;
  description: string;
}

export class AdviceCacheService {
  private db: Database.Database | null = null;
  private cacheDir: string = '';

  constructor() {
    // 서버 환경에서만 실행
    if (typeof window === 'undefined' && fs) {
      this.cacheDir = path.join(process.cwd(), 'cache');
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      
      const dbPath = path.join(process.cwd(), 'advice-cache.db');
      this.db = new Database(dbPath);
      this.initializeDatabase();
    }
  }

  private initializeDatabase() {
    if (!this.db) return;
    
    // 캐시 버전 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_versions (
        version TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        total_items INTEGER NOT NULL,
        description TEXT NOT NULL
      )
    `);

    // 조언 캐시 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS advice_cache (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        advice TEXT NOT NULL,
        virtual_evidence TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TEXT NOT NULL,
        version TEXT NOT NULL,
        FOREIGN KEY (version) REFERENCES cache_versions(version)
      )
    `);

    // 인덱스 생성
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_advice_cache_item_id ON advice_cache(item_id);
      CREATE INDEX IF NOT EXISTS idx_advice_cache_version ON advice_cache(version);
      CREATE INDEX IF NOT EXISTS idx_advice_cache_language ON advice_cache(language);
    `);
  }

  // 새 캐시 버전 생성
  generateCacheVersion(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `${dateStr}_${timeStr}`;
  }

  // 모든 평가 항목 가져오기
  getAllAssessmentItems() {
    return [...prerequisitesData, ...technicalValidationData];
  }

  // 캐시된 조언 조회
  getCachedAdvice(itemId: string, language: 'ko' | 'en' = 'ko', version?: string): CachedAdvice | null {
    if (!this.db) return null;
    
    let query = `
      SELECT * FROM advice_cache 
      WHERE item_id = ? AND language = ?
    `;
    const params: any[] = [itemId, language];

    if (version) {
      query += ` AND version = ?`;
      params.push(version);
    } else {
      // 최신 버전 사용
      query += ` ORDER BY version DESC LIMIT 1`;
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as any;

    if (!result) return null;

    return {
      id: result.id,
      itemId: result.item_id,
      category: result.category,
      title: result.title,
      advice: result.advice,
      virtualEvidence: result.virtual_evidence,
      language: result.language,
      createdAt: result.created_at,
      version: result.version
    };
  }

  // 캐시된 조언 저장
  saveCachedAdvice(advice: Omit<CachedAdvice, 'id' | 'createdAt'>) {
    if (!this.db) return;
    
    const id = `${advice.itemId}_${advice.language}_${advice.version}`;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO advice_cache 
      (id, item_id, category, title, advice, virtual_evidence, language, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      advice.itemId,
      advice.category,
      advice.title,
      advice.advice,
      advice.virtualEvidence,
      advice.language,
      createdAt,
      advice.version
    );
  }

  // 캐시된 조언 업데이트
  updateCachedAdvice(id: string, advice: string, virtualEvidence: string): boolean {
    if (!this.db) return false;
    
    try {
      const stmt = this.db.prepare(`
        UPDATE advice_cache 
        SET advice = ?, virtual_evidence = ?
        WHERE id = ?
      `);

      const result = stmt.run(advice, virtualEvidence, id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating cached advice:', error);
      return false;
    }
  }

  // 캐시 버전 저장
  saveCacheVersion(version: CacheVersion) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cache_versions 
      (version, created_at, total_items, description)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      version.version,
      version.createdAt,
      version.totalItems,
      version.description
    );
  }

  // 모든 캐시 버전 조회
  getCacheVersions(): CacheVersion[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM cache_versions 
      ORDER BY created_at DESC
    `);

    return stmt.all().map((row: any) => ({
      version: row.version,
      createdAt: row.created_at,
      totalItems: row.total_items,
      description: row.description
    }));
  }

  // 최신 캐시 버전 조회
  getLatestCacheVersion(): CacheVersion | null {
    const versions = this.getCacheVersions();
    return versions.length > 0 ? versions[0] : null;
  }

  // 특정 버전의 모든 캐시된 조언 조회
  getCachedAdviceByVersion(version: string, language: 'ko' | 'en' = 'ko'): CachedAdvice[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM advice_cache 
      WHERE version = ? AND language = ?
      ORDER BY item_id
    `);

    return stmt.all(version, language).map((row: any) => ({
      id: row.id,
      itemId: row.item_id,
      category: row.category,
      title: row.title,
      advice: row.advice,
      virtualEvidence: row.virtual_evidence,
      language: row.language,
      createdAt: row.created_at,
      version: row.version
    }));
  }

  // 캐시 파일로 내보내기
  exportCacheToFile(version: string): string {
    if (typeof window !== 'undefined' || !fs) {
      throw new Error('File operations are only available on server side');
    }

    const cacheData = {
      version,
      exportedAt: new Date().toISOString(),
      koAdvice: this.getCachedAdviceByVersion(version, 'ko'),
      enAdvice: this.getCachedAdviceByVersion(version, 'en')
    };

    const fileName = `advice_cache_${version}.json`;
    const filePath = path.join(this.cacheDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    
    return filePath;
  }

  // 캐시 파일에서 가져오기
  importCacheFromFile(filePath: string): boolean {
    if (typeof window !== 'undefined' || !fs) {
      throw new Error('File operations are only available on server side');
    }

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Cache file not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cacheData = JSON.parse(fileContent);

      // 버전 정보 저장
      this.saveCacheVersion({
        version: cacheData.version,
        createdAt: cacheData.exportedAt,
        totalItems: cacheData.koAdvice.length,
        description: `Imported from ${path.basename(filePath)}`
      });

      // 조언 데이터 저장
      [...cacheData.koAdvice, ...cacheData.enAdvice].forEach((advice: CachedAdvice) => {
        this.saveCachedAdvice({
          itemId: advice.itemId,
          category: advice.category,
          title: advice.title,
          advice: advice.advice,
          virtualEvidence: advice.virtualEvidence,
          language: advice.language,
          version: advice.version
        });
      });

      return true;
    } catch (error) {
      console.error('Failed to import cache from file:', error);
      return false;
    }
  }

  // 캐시 통계
  getCacheStats(version?: string) {
    if (!this.db) return { total: 0, korean: 0, english: 0, unique_items: 0 };
    
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN language = 'ko' THEN 1 END) as korean,
        COUNT(CASE WHEN language = 'en' THEN 1 END) as english,
        COUNT(DISTINCT item_id) as unique_items
      FROM advice_cache
    `;

    if (version) {
      query += ` WHERE version = ?`;
      const stmt = this.db.prepare(query);
      return stmt.get(version);
    } else {
      const stmt = this.db.prepare(query);
      return stmt.get();
    }
  }

  // 데이터베이스 연결 종료
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// 싱글톤 인스턴스
let cacheServiceInstance: AdviceCacheService | null = null;

export function getAdviceCacheService(): AdviceCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new AdviceCacheService();
  }
  return cacheServiceInstance;
}