/**
 * 캐시 서비스 - 조언 및 가상증빙예제 캐시 관리
 */
import { 
  getAdviceCacheDB, 
  getVirtualEvidenceCacheDB, 
  getActiveCacheVersion,
  initAdviceSummaryTable,
  initVirtualEvidenceSummaryTable,
  dbExists
} from './db-service';

// 조언 항목 인터페이스
export interface AdviceItem {
  item_id: string;
  category: string;
  title: string;
  advice: string;
  language: string;
}

// 가상증빙예제 항목 인터페이스
export interface VirtualEvidenceItem {
  item_id: string;
  category: string;
  title: string;
  virtual_evidence: string;
  language: string;
}

// 요약 항목 인터페이스
export interface SummaryItem {
  id: number;
  version: string;
  item_id: string;
  category: string;
  title: string;
  summary: string;
  language: string;
  created_at: string;
}

// 버전 정보 인터페이스
export interface VersionInfo {
  version: string;
  created_at: string;
  item_count: number;
}

// ============ 조언 캐시 서비스 ============

export function getAdviceItems(version: string, language: 'ko' | 'en'): AdviceItem[] {
  if (!dbExists('advice-cache.db')) return [];
  
  const db = getAdviceCacheDB();
  try {
    return db.prepare(`
      SELECT item_id, category, title, advice, language 
      FROM advice_cache 
      WHERE version = ? AND language = ?
      ORDER BY category, item_id
    `).all(version, language) as AdviceItem[];
  } finally {
    db.close();
  }
}

export function getAdviceSummaryVersions(): VersionInfo[] {
  if (!dbExists('advice-cache.db')) return [];
  
  const db = getAdviceCacheDB();
  try {
    initAdviceSummaryTable(db);
    return db.prepare(`
      SELECT 
        version,
        MIN(created_at) as created_at,
        COUNT(DISTINCT item_id) as item_count
      FROM advice_summary_cache
      GROUP BY version
      ORDER BY created_at DESC
    `).all() as VersionInfo[];
  } finally {
    db.close();
  }
}

export function getAdviceSummaries(version: string, language: 'ko' | 'en'): SummaryItem[] {
  if (!dbExists('advice-cache.db')) return [];
  
  const db = getAdviceCacheDB();
  try {
    initAdviceSummaryTable(db);
    return db.prepare(`
      SELECT id, version, item_id, category, title, summary, language, created_at
      FROM advice_summary_cache
      WHERE version = ? AND language = ?
      ORDER BY category, item_id
    `).all(version, language) as SummaryItem[];
  } finally {
    db.close();
  }
}

export function saveAdviceSummary(
  version: string,
  itemId: string,
  category: string,
  title: string,
  summary: string,
  language: 'ko' | 'en'
): boolean {
  const db = getAdviceCacheDB();
  try {
    initAdviceSummaryTable(db);
    db.prepare(`
      INSERT OR REPLACE INTO advice_summary_cache 
      (version, item_id, category, title, summary, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(version, itemId, category, title, summary, language);
    return true;
  } catch (error) {
    console.error('Failed to save advice summary:', error);
    return false;
  } finally {
    db.close();
  }
}

export function deleteAdviceSummaryVersion(version: string): { success: boolean; deletedCount: number } {
  if (!dbExists('advice-cache.db')) return { success: false, deletedCount: 0 };
  
  const db = getAdviceCacheDB();
  try {
    const result = db.prepare('DELETE FROM advice_summary_cache WHERE version = ?').run(version);
    return { success: true, deletedCount: result.changes };
  } catch (error) {
    console.error('Failed to delete advice summary version:', error);
    return { success: false, deletedCount: 0 };
  } finally {
    db.close();
  }
}

// ============ 가상증빙예제 캐시 서비스 ============

export function getVirtualEvidenceItems(version: string, language: 'ko' | 'en'): VirtualEvidenceItem[] {
  if (!dbExists('virtual-evidence-cache.db')) return [];
  
  const db = getVirtualEvidenceCacheDB();
  try {
    return db.prepare(`
      SELECT item_id, category, title, virtual_evidence, language 
      FROM virtual_evidence_cache 
      WHERE version = ? AND language = ?
      ORDER BY category, item_id
    `).all(version, language) as VirtualEvidenceItem[];
  } finally {
    db.close();
  }
}

export function getVirtualEvidenceSummaryVersions(): VersionInfo[] {
  if (!dbExists('virtual-evidence-cache.db')) return [];
  
  const db = getVirtualEvidenceCacheDB();
  try {
    initVirtualEvidenceSummaryTable(db);
    return db.prepare(`
      SELECT 
        version,
        MIN(created_at) as created_at,
        COUNT(DISTINCT item_id) as item_count
      FROM virtual_evidence_summary_cache
      GROUP BY version
      ORDER BY created_at DESC
    `).all() as VersionInfo[];
  } finally {
    db.close();
  }
}

export function getVirtualEvidenceSummaries(version: string, language: 'ko' | 'en'): SummaryItem[] {
  if (!dbExists('virtual-evidence-cache.db')) return [];
  
  const db = getVirtualEvidenceCacheDB();
  try {
    initVirtualEvidenceSummaryTable(db);
    return db.prepare(`
      SELECT id, version, item_id, category, title, summary, language, created_at
      FROM virtual_evidence_summary_cache
      WHERE version = ? AND language = ?
      ORDER BY category, item_id
    `).all(version, language) as SummaryItem[];
  } finally {
    db.close();
  }
}

export function saveVirtualEvidenceSummary(
  version: string,
  itemId: string,
  category: string,
  title: string,
  summary: string,
  language: 'ko' | 'en'
): boolean {
  const db = getVirtualEvidenceCacheDB();
  try {
    initVirtualEvidenceSummaryTable(db);
    db.prepare(`
      INSERT OR REPLACE INTO virtual_evidence_summary_cache 
      (version, item_id, category, title, summary, language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(version, itemId, category, title, summary, language);
    return true;
  } catch (error) {
    console.error('Failed to save virtual evidence summary:', error);
    return false;
  } finally {
    db.close();
  }
}

export function deleteVirtualEvidenceSummaryVersion(version: string): { success: boolean; deletedCount: number } {
  if (!dbExists('virtual-evidence-cache.db')) return { success: false, deletedCount: 0 };
  
  const db = getVirtualEvidenceCacheDB();
  try {
    const result = db.prepare('DELETE FROM virtual_evidence_summary_cache WHERE version = ?').run(version);
    return { success: true, deletedCount: result.changes };
  } catch (error) {
    console.error('Failed to delete virtual evidence summary version:', error);
    return { success: false, deletedCount: 0 };
  } finally {
    db.close();
  }
}

// ============ 유틸리티 ============

export function generateSummaryVersion(
  sourceVersion: string,
  language: 'ko' | 'en',
  provider: string
): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  return `summary_${sourceVersion}_${language}_${timestamp}_${provider}`;
}

export function generateVESummaryVersion(
  sourceVersion: string,
  language: 'ko' | 'en',
  provider: string
): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  return `ve_summary_${sourceVersion}_${language}_${timestamp}_${provider}`;
}
