#!/usr/bin/env node

/**
 * MSP Checklist 캐시 사전 로딩 스크립트
 * 
 * 설치 시 조언 캐시 및 가상증빙예제 캐시를 미리 로딩합니다.
 * SQLite 데이터베이스에 직접 캐시 데이터를 삽입합니다.
 * 
 * 사용법:
 *   node scripts/preload-cache.js
 *   node scripts/preload-cache.js --advice-only
 *   node scripts/preload-cache.js --evidence-only
 *   node scripts/preload-cache.js --advice-file=/path/to/advice.json --evidence-file=/path/to/evidence.json
 */

const path = require('path');
const fs = require('fs');

// 색상 정의
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`)
};

// 기본 캐시 파일 경로
const DEFAULT_ADVICE_CACHE = 'advice_cache_20251218_232330.json';
const DEFAULT_EVIDENCE_CACHE = 'virtual_evidence_cache_2025-12-19T02-58-55.json';

// 캐시 파일 검색 경로
const CACHE_SEARCH_PATHS = [
  '../msp_data/7.x',
  '../../msp_data/7.x',
  './cache',
  '../cache',
  '.'
];

// 데이터베이스 경로
const DB_DIR = path.resolve(__dirname, '../data');
const ADVICE_DB_PATH = path.join(DB_DIR, 'advice-cache.db');
const EVIDENCE_DB_PATH = path.join(DB_DIR, 'virtual-evidence-cache.db');

/**
 * 캐시 파일 찾기
 */
function findCacheFile(filename, searchPaths) {
  for (const searchPath of searchPaths) {
    const fullPath = path.resolve(__dirname, searchPath, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * better-sqlite3 로드 시도
 */
function loadSqlite() {
  try {
    return require('better-sqlite3');
  } catch (error) {
    log.warning('better-sqlite3 모듈을 로드할 수 없습니다. 캐시 파일만 복사합니다.');
    return null;
  }
}

/**
 * 데이터베이스 디렉토리 생성
 */
function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * 조언 캐시 데이터베이스 초기화
 */
function initAdviceDatabase(Database) {
  ensureDbDirectory();
  const db = new Database(ADVICE_DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_versions (
      version TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      total_items INTEGER NOT NULL,
      description TEXT
    );
    
    CREATE TABLE IF NOT EXISTS advice_cache (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      advice TEXT NOT NULL,
      virtual_evidence TEXT,
      language TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      version TEXT NOT NULL,
      FOREIGN KEY (version) REFERENCES cache_versions(version)
    );
    
    CREATE INDEX IF NOT EXISTS idx_advice_item_lang ON advice_cache(item_id, language);
    CREATE INDEX IF NOT EXISTS idx_advice_version ON advice_cache(version);
  `);
  
  return db;
}

/**
 * 가상증빙예제 캐시 데이터베이스 초기화
 */
function initEvidenceDatabase(Database) {
  ensureDbDirectory();
  const db = new Database(EVIDENCE_DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_versions (
      version TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      total_items INTEGER NOT NULL,
      description TEXT
    );
    
    CREATE TABLE IF NOT EXISTS virtual_evidence_cache (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      virtual_evidence TEXT NOT NULL,
      language TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      version TEXT NOT NULL,
      FOREIGN KEY (version) REFERENCES cache_versions(version)
    );
    
    CREATE INDEX IF NOT EXISTS idx_evidence_item_lang ON virtual_evidence_cache(item_id, language);
    CREATE INDEX IF NOT EXISTS idx_evidence_version ON virtual_evidence_cache(version);
  `);
  
  return db;
}

/**
 * 조언 캐시 로딩
 */
async function loadAdviceCache(filePath, Database) {
  log.step('조언 캐시 로딩 중...');
  
  try {
    if (!fs.existsSync(filePath)) {
      log.error(`조언 캐시 파일을 찾을 수 없습니다: ${filePath}`);
      return false;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const cacheData = JSON.parse(fileContent);
    
    if (!Database) {
      // SQLite 없이 캐시 디렉토리에 파일만 복사
      const cacheDir = path.resolve(__dirname, '../cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.copyFileSync(filePath, path.join(cacheDir, path.basename(filePath)));
      log.success(`조언 캐시 파일 복사 완료: ${path.basename(filePath)}`);
      return true;
    }
    
    const db = initAdviceDatabase(Database);
    
    // 트랜잭션으로 데이터 삽입
    const insertVersion = db.prepare(`
      INSERT OR REPLACE INTO cache_versions (version, created_at, total_items, description)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertAdvice = db.prepare(`
      INSERT OR REPLACE INTO advice_cache (id, item_id, category, title, advice, virtual_evidence, language, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      // 버전 정보 저장
      insertVersion.run(
        cacheData.version,
        cacheData.exportedAt,
        cacheData.koAdvice.length,
        `Imported from ${path.basename(filePath)}`
      );
      
      // 한국어 조언 저장
      for (const advice of cacheData.koAdvice) {
        insertAdvice.run(
          advice.id,
          advice.itemId,
          advice.category,
          advice.title,
          advice.advice,
          advice.virtualEvidence || '',
          advice.language,
          advice.createdAt,
          advice.version
        );
      }
      
      // 영어 조언 저장
      for (const advice of cacheData.enAdvice) {
        insertAdvice.run(
          advice.id,
          advice.itemId,
          advice.category,
          advice.title,
          advice.advice,
          advice.virtualEvidence || '',
          advice.language,
          advice.createdAt,
          advice.version
        );
      }
    });
    
    transaction();
    db.close();
    
    log.success(`조언 캐시 로딩 완료!`);
    log.info(`  - 버전: ${cacheData.version}`);
    log.info(`  - 한국어 항목: ${cacheData.koAdvice.length}`);
    log.info(`  - 영어 항목: ${cacheData.enAdvice.length}`);
    
    return true;
  } catch (error) {
    log.error(`조언 캐시 로딩 중 오류: ${error.message}`);
    return false;
  }
}

/**
 * 가상증빙예제 캐시 로딩
 */
async function loadVirtualEvidenceCache(filePath, Database) {
  log.step('가상증빙예제 캐시 로딩 중...');
  
  try {
    if (!fs.existsSync(filePath)) {
      log.error(`가상증빙예제 캐시 파일을 찾을 수 없습니다: ${filePath}`);
      return false;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const cacheData = JSON.parse(fileContent);
    
    if (!Database) {
      // SQLite 없이 캐시 디렉토리에 파일만 복사
      const cacheDir = path.resolve(__dirname, '../cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.copyFileSync(filePath, path.join(cacheDir, path.basename(filePath)));
      log.success(`가상증빙예제 캐시 파일 복사 완료: ${path.basename(filePath)}`);
      return true;
    }
    
    const db = initEvidenceDatabase(Database);
    
    // 트랜잭션으로 데이터 삽입
    const insertVersion = db.prepare(`
      INSERT OR REPLACE INTO cache_versions (version, created_at, total_items, description)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertEvidence = db.prepare(`
      INSERT OR REPLACE INTO virtual_evidence_cache (id, item_id, category, title, virtual_evidence, language, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      // 버전 정보 저장
      insertVersion.run(
        cacheData.version,
        cacheData.exportedAt,
        cacheData.totalItems,
        `Imported from ${path.basename(filePath)}`
      );
      
      // 한국어 가상증빙 저장
      for (const evidence of cacheData.koEvidence) {
        insertEvidence.run(
          evidence.id,
          evidence.itemId,
          evidence.category,
          evidence.title,
          evidence.virtualEvidence,
          evidence.language,
          evidence.createdAt,
          evidence.version
        );
      }
      
      // 영어 가상증빙 저장
      for (const evidence of cacheData.enEvidence) {
        insertEvidence.run(
          evidence.id,
          evidence.itemId,
          evidence.category,
          evidence.title,
          evidence.virtualEvidence,
          evidence.language,
          evidence.createdAt,
          evidence.version
        );
      }
    });
    
    transaction();
    db.close();
    
    log.success(`가상증빙예제 캐시 로딩 완료!`);
    log.info(`  - 버전: ${cacheData.version}`);
    log.info(`  - 한국어 항목: ${cacheData.koEvidence.length}`);
    log.info(`  - 영어 항목: ${cacheData.enEvidence.length}`);
    
    return true;
  } catch (error) {
    log.error(`가상증빙예제 캐시 로딩 중 오류: ${error.message}`);
    return false;
  }
}

/**
 * 명령줄 인자 파싱
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    adviceOnly: false,
    evidenceOnly: false,
    adviceFile: null,
    evidenceFile: null
  };
  
  for (const arg of args) {
    if (arg === '--advice-only') {
      options.adviceOnly = true;
    } else if (arg === '--evidence-only') {
      options.evidenceOnly = true;
    } else if (arg.startsWith('--advice-file=')) {
      options.adviceFile = arg.split('=')[1];
    } else if (arg.startsWith('--evidence-file=')) {
      options.evidenceFile = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
MSP Checklist 캐시 사전 로딩 스크립트

사용법:
  node scripts/preload-cache.js [옵션]

옵션:
  --advice-only              조언 캐시만 로딩
  --evidence-only            가상증빙예제 캐시만 로딩
  --advice-file=<경로>       조언 캐시 파일 경로 지정
  --evidence-file=<경로>     가상증빙예제 캐시 파일 경로 지정
  --help, -h                 도움말 표시

예제:
  node scripts/preload-cache.js
  node scripts/preload-cache.js --advice-only
  node scripts/preload-cache.js --advice-file=./my-advice-cache.json
`);
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * 메인 함수
 */
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       MSP Checklist 캐시 사전 로딩 스크립트               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const options = parseArgs();
  const Database = loadSqlite();
  
  let adviceSuccess = true;
  let evidenceSuccess = true;
  
  // 조언 캐시 로딩
  if (!options.evidenceOnly) {
    const adviceFile = options.adviceFile || findCacheFile(DEFAULT_ADVICE_CACHE, CACHE_SEARCH_PATHS);
    
    if (adviceFile) {
      log.info(`조언 캐시 파일: ${adviceFile}`);
      adviceSuccess = await loadAdviceCache(adviceFile, Database);
    } else {
      log.warning(`기본 조언 캐시 파일을 찾을 수 없습니다: ${DEFAULT_ADVICE_CACHE}`);
      log.info('--advice-file 옵션으로 파일 경로를 지정하세요.');
      adviceSuccess = false;
    }
  }
  
  console.log('');
  
  // 가상증빙예제 캐시 로딩
  if (!options.adviceOnly) {
    const evidenceFile = options.evidenceFile || findCacheFile(DEFAULT_EVIDENCE_CACHE, CACHE_SEARCH_PATHS);
    
    if (evidenceFile) {
      log.info(`가상증빙예제 캐시 파일: ${evidenceFile}`);
      evidenceSuccess = await loadVirtualEvidenceCache(evidenceFile, Database);
    } else {
      log.warning(`기본 가상증빙예제 캐시 파일을 찾을 수 없습니다: ${DEFAULT_EVIDENCE_CACHE}`);
      log.info('--evidence-file 옵션으로 파일 경로를 지정하세요.');
      evidenceSuccess = false;
    }
  }
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  
  if (adviceSuccess && evidenceSuccess) {
    log.success('모든 캐시 로딩이 완료되었습니다!');
    process.exit(0);
  } else if (adviceSuccess || evidenceSuccess) {
    log.warning('일부 캐시 로딩이 실패했습니다.');
    process.exit(1);
  } else {
    log.error('캐시 로딩에 실패했습니다.');
    process.exit(2);
  }
}

// 스크립트 실행
main().catch(error => {
  log.error(`예상치 못한 오류: ${error.message}`);
  process.exit(1);
});
