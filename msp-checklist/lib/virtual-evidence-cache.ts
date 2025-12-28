import Database from 'better-sqlite3';
import path from 'path';
import { prerequisitesData } from '../data/assessment-data';
import { technicalValidationData } from '../data/technical-validation-data';

// Node.js 환경에서만 fs 모듈 사용
let fs: any = null;
if (typeof window === 'undefined') {
  fs = require('fs');
}

export interface CachedVirtualEvidence {
  id: string;
  itemId: string;
  category: string;
  title: string;
  virtualEvidence: string;
  language: 'ko' | 'en';
  createdAt: string;
  version: string;
}

export interface VirtualEvidenceVersion {
  version: string;
  createdAt: string;
  totalItems: number;
  description: string;
}

export class VirtualEvidenceCacheService {
  private db: Database.Database | null = null;
  private cacheDir: string = '';

  constructor() {
    // 서버 환경에서만 실행
    if (typeof window === 'undefined' && fs) {
      this.cacheDir = path.join(process.cwd(), 'cache');
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      
      const dbPath = path.join(process.cwd(), 'virtual-evidence-cache.db');
      this.db = new Database(dbPath);
      this.initializeDatabase();
    }
  }

  private initializeDatabase() {
    if (!this.db) return;
    
    // 캐시 버전 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS virtual_evidence_versions (
        version TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        total_items INTEGER NOT NULL,
        description TEXT NOT NULL
      )
    `);

    // 가상증빙 캐시 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS virtual_evidence_cache (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        virtual_evidence TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TEXT NOT NULL,
        version TEXT NOT NULL,
        FOREIGN KEY (version) REFERENCES virtual_evidence_versions(version)
      )
    `);

    // 인덱스 생성
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_virtual_evidence_cache_item_id ON virtual_evidence_cache(item_id);
      CREATE INDEX IF NOT EXISTS idx_virtual_evidence_cache_version ON virtual_evidence_cache(version);
      CREATE INDEX IF NOT EXISTS idx_virtual_evidence_cache_language ON virtual_evidence_cache(language);
    `);
  }

  // 새 캐시 버전 생성
  generateCacheVersion(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `ve_${dateStr}_${timeStr}`;
  }

  // 모든 평가 항목 가져오기
  getAllAssessmentItems() {
    return [...prerequisitesData, ...technicalValidationData];
  }

  // 캐시된 가상증빙 조회
  getCachedVirtualEvidence(itemId: string, language: 'ko' | 'en' = 'ko', version?: string): CachedVirtualEvidence | null {
    if (!this.db) return null;
    
    let query = `
      SELECT * FROM virtual_evidence_cache 
      WHERE item_id = ? AND language = ?
    `;
    const params: any[] = [itemId, language];
    
    if (version) {
      query += ` AND version = ?`;
      params.push(version);
    } else {
      query += ` ORDER BY created_at DESC LIMIT 1`;
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as any;

    if (!row) return null;

    return {
      id: row.id,
      itemId: row.item_id,
      category: row.category,
      title: row.title,
      virtualEvidence: row.virtual_evidence,
      language: row.language,
      createdAt: row.created_at,
      version: row.version
    };
  }

  // 가상증빙 캐시 저장
  saveCachedVirtualEvidence(evidence: Omit<CachedVirtualEvidence, 'id' | 'createdAt'>) {
    if (!this.db) return;
    
    const id = `${evidence.itemId}_${evidence.language}_${evidence.version}`;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO virtual_evidence_cache 
      (id, item_id, category, title, virtual_evidence, language, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      evidence.itemId,
      evidence.category,
      evidence.title,
      evidence.virtualEvidence,
      evidence.language,
      createdAt,
      evidence.version
    );
  }

  // 캐시 버전 저장
  saveCacheVersion(version: VirtualEvidenceVersion) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO virtual_evidence_versions 
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
  getCacheVersions(): VirtualEvidenceVersion[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM virtual_evidence_versions 
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
  getLatestCacheVersion(): VirtualEvidenceVersion | null {
    const versions = this.getCacheVersions();
    return versions.length > 0 ? versions[0] : null;
  }

  // 캐시 통계 조회
  getCacheStats(version?: string) {
    if (!this.db) return { total: 0, korean: 0, english: 0, unique_items: 0 };
    
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN language = 'ko' THEN 1 ELSE 0 END) as korean,
        SUM(CASE WHEN language = 'en' THEN 1 ELSE 0 END) as english,
        COUNT(DISTINCT item_id) as unique_items
      FROM virtual_evidence_cache
    `;
    
    const params: any[] = [];
    if (version) {
      query += ` WHERE version = ?`;
      params.push(version);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as any;

    return {
      total: result.total || 0,
      korean: result.korean || 0,
      english: result.english || 0,
      unique_items: result.unique_items || 0
    };
  }

  // 특정 버전의 가상증빙 조회
  getCachedVirtualEvidenceByVersion(version: string, language: 'ko' | 'en' = 'ko'): CachedVirtualEvidence[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM virtual_evidence_cache 
      WHERE version = ? AND language = ?
      ORDER BY item_id
    `);

    return stmt.all(version, language).map((row: any) => ({
      id: row.id,
      itemId: row.item_id,
      category: row.category,
      title: row.title,
      virtualEvidence: row.virtual_evidence,
      language: row.language,
      createdAt: row.created_at,
      version: row.version
    }));
  }

  // 캐시를 JSON 파일로 내보내기
  exportCacheToFile(version: string): string {
    if (!this.db || !fs) return '';
    
    const koEvidence = this.getCachedVirtualEvidenceByVersion(version, 'ko');
    const enEvidence = this.getCachedVirtualEvidenceByVersion(version, 'en');
    
    const exportData = {
      version,
      exportedAt: new Date().toISOString(),
      totalItems: koEvidence.length,
      koEvidence,
      enEvidence
    };

    const filename = `virtual_evidence_cache_${version}.json`;
    const filepath = path.join(this.cacheDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');
    
    return filepath;
  }

  // 캐시 데이터 내보내기 (JSON 반환)
  exportCacheData(version: string): { version: string; exportedAt: string; totalItems: number; koEvidence: CachedVirtualEvidence[]; enEvidence: CachedVirtualEvidence[] } {
    const koEvidence = this.getCachedVirtualEvidenceByVersion(version, 'ko');
    const enEvidence = this.getCachedVirtualEvidenceByVersion(version, 'en');
    
    return {
      version,
      exportedAt: new Date().toISOString(),
      totalItems: koEvidence.length,
      koEvidence,
      enEvidence
    };
  }

  // 캐시 데이터 가져오기 (JSON에서)
  importCacheData(cacheData: { version: string; exportedAt: string; totalItems: number; koEvidence: CachedVirtualEvidence[]; enEvidence: CachedVirtualEvidence[] }): { success: boolean; version?: string; totalItems?: number; error?: string } {
    try {
      if (!cacheData.version || !cacheData.koEvidence || !cacheData.enEvidence) {
        return { success: false, error: 'Invalid cache data format' };
      }

      // 버전 정보 저장
      this.saveCacheVersion({
        version: cacheData.version,
        createdAt: cacheData.exportedAt || new Date().toISOString(),
        totalItems: cacheData.koEvidence.length + cacheData.enEvidence.length,
        description: `Imported at ${new Date().toISOString()}`
      });

      // 가상증빙 데이터 저장
      [...cacheData.koEvidence, ...cacheData.enEvidence].forEach((evidence: CachedVirtualEvidence) => {
        this.saveCachedVirtualEvidence({
          itemId: evidence.itemId,
          category: evidence.category,
          title: evidence.title,
          virtualEvidence: evidence.virtualEvidence,
          language: evidence.language,
          version: evidence.version
        });
      });

      return { 
        success: true, 
        version: cacheData.version, 
        totalItems: cacheData.koEvidence.length + cacheData.enEvidence.length 
      };
    } catch (error) {
      console.error('Failed to import cache data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // 캐시 버전 삭제
  deleteCacheVersion(version: string): boolean {
    if (!this.db) return false;
    
    try {
      // 먼저 해당 버전의 모든 가상증빙 삭제
      const deleteEvidenceStmt = this.db.prepare(`
        DELETE FROM virtual_evidence_cache WHERE version = ?
      `);
      deleteEvidenceStmt.run(version);

      // 버전 정보 삭제
      const deleteVersionStmt = this.db.prepare(`
        DELETE FROM virtual_evidence_versions WHERE version = ?
      `);
      const result = deleteVersionStmt.run(version);

      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting cache version:', error);
      return false;
    }
  }

  // JSON 파일에서 캐시 가져오기
  importCacheFromFile(filepath: string): boolean {
    if (!this.db || !fs) return false;
    
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // 버전 정보 저장
      this.saveCacheVersion({
        version: data.version,
        createdAt: data.exportedAt,
        totalItems: data.totalItems,
        description: `Imported from ${path.basename(filepath)}`
      });

      // 가상증빙 데이터 저장
      [...data.koEvidence, ...data.enEvidence].forEach((evidence: CachedVirtualEvidence) => {
        this.saveCachedVirtualEvidence({
          itemId: evidence.itemId,
          category: evidence.category,
          title: evidence.title,
          virtualEvidence: evidence.virtualEvidence,
          language: evidence.language,
          version: evidence.version
        });
      });

      return true;
    } catch (error) {
      console.error('Failed to import cache from file:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
let virtualEvidenceCacheServiceInstance: VirtualEvidenceCacheService | null = null;

export function getVirtualEvidenceCacheService(): VirtualEvidenceCacheService {
  if (!virtualEvidenceCacheServiceInstance) {
    virtualEvidenceCacheServiceInstance = new VirtualEvidenceCacheService();
  }
  return virtualEvidenceCacheServiceInstance;
}