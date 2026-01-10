#!/usr/bin/env node
/**
 * 가상증빙 캐시 DB에서 JSON 파일로 내보내기
 * 
 * 사용법:
 *   node scripts/export-evidence-cache.mjs [버전명]
 *   node scripts/export-evidence-cache.mjs --all
 *   node scripts/export-evidence-cache.mjs --latest
 * 
 * 예시:
 *   node scripts/export-evidence-cache.mjs 20260110_164500_bedrock_anthropic.claude-sonnet-4-5
 *   node scripts/export-evidence-cache.mjs --all     # 모든 버전 내보내기
 *   node scripts/export-evidence-cache.mjs --latest  # 최신 버전만 내보내기
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB 경로
const DB_PATH = path.join(__dirname, '../msp-checklist/virtual-evidence-cache.db');
const OUTPUT_DIR = path.join(__dirname, '../msp-checklist/cache/virtual-evidence');

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
}

// DB 연결
let db;
try {
  db = new Database(DB_PATH, { readonly: true });
  console.log(`📂 Connected to DB: ${DB_PATH}`);
} catch (error) {
  console.error(`❌ Failed to connect to DB: ${error.message}`);
  process.exit(1);
}

// 버전 목록 조회
function getVersions() {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT version, 
             COUNT(*) as item_count,
             MIN(created_at) as created_at
      FROM virtual_evidence_cache 
      GROUP BY version 
      ORDER BY created_at DESC
    `);
    return stmt.all();
  } catch (error) {
    console.error(`❌ Failed to get versions: ${error.message}`);
    return [];
  }
}

// 특정 버전의 데이터 조회
function getEvidenceByVersion(version) {
  try {
    const stmt = db.prepare(`
      SELECT item_id, category, title, virtual_evidence, language, version, created_at
      FROM virtual_evidence_cache 
      WHERE version = ?
      ORDER BY item_id, language
    `);
    return stmt.all(version);
  } catch (error) {
    console.error(`❌ Failed to get evidence for version ${version}: ${error.message}`);
    return [];
  }
}

// JSON 파일로 내보내기
function exportToJson(version) {
  const evidence = getEvidenceByVersion(version);
  
  if (evidence.length === 0) {
    console.log(`⚠️  No data found for version: ${version}`);
    return false;
  }
  
  // 언어별로 분류
  const koEvidence = evidence.filter(e => e.language === 'ko');
  const enEvidence = evidence.filter(e => e.language === 'en');
  
  const exportData = {
    version,
    exportedAt: new Date().toISOString(),
    totalItems: new Set(evidence.map(e => e.item_id)).size,
    koCount: koEvidence.length,
    enCount: enEvidence.length,
    items: evidence.map(e => ({
      itemId: e.item_id,
      category: e.category,
      title: e.title,
      virtualEvidence: e.virtual_evidence,
      language: e.language,
      createdAt: e.created_at
    }))
  };
  
  // 파일명 생성 (버전명에서 특수문자 제거)
  const safeVersion = version.replace(/[/:]/g, '-').substring(0, 80);
  const filename = `virtual_evidence_cache_${safeVersion}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`✅ Exported: ${filename}`);
  console.log(`   - Total items: ${exportData.totalItems}`);
  console.log(`   - Korean: ${exportData.koCount}, English: ${exportData.enCount}`);
  
  return true;
}

// 메인 실행
function main() {
  const args = process.argv.slice(2);
  const versions = getVersions();
  
  if (versions.length === 0) {
    console.log('❌ No versions found in database');
    process.exit(1);
  }
  
  console.log(`\n📊 Found ${versions.length} version(s) in database:\n`);
  versions.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.version} (${v.item_count} items, ${v.created_at})`);
  });
  console.log('');
  
  if (args.length === 0 || args[0] === '--latest') {
    // 최신 버전만 내보내기
    console.log('📤 Exporting latest version...\n');
    exportToJson(versions[0].version);
  } else if (args[0] === '--all') {
    // 모든 버전 내보내기
    console.log('📤 Exporting all versions...\n');
    versions.forEach(v => exportToJson(v.version));
  } else if (args[0] === '--list') {
    // 버전 목록만 표시
    console.log('Use --latest, --all, or specify a version name to export.');
  } else {
    // 특정 버전 내보내기
    const targetVersion = args[0];
    const found = versions.find(v => v.version.includes(targetVersion));
    if (found) {
      console.log(`📤 Exporting version: ${found.version}\n`);
      exportToJson(found.version);
    } else {
      console.log(`❌ Version not found: ${targetVersion}`);
      console.log('Available versions:');
      versions.forEach(v => console.log(`   - ${v.version}`));
    }
  }
  
  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
}

main();
db.close();
