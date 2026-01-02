import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { AssessmentItem } from './csv-parser';

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main 앱은 msp-checklist/lib에 있으므로, 상위 디렉토리의 msp-assessment.db를 사용
const dbPath = path.resolve(__dirname, '../msp-assessment.db');
console.log('[Main DB] Using database at:', dbPath);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'operator', 'admin', 'superadmin')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'inactive')),
      phone TEXT,
      organization TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assessment data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessment_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      assessment_type TEXT NOT NULL CHECK(assessment_type IN ('prerequisites', 'technical')),
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_mandatory BOOLEAN NOT NULL,
      evidence_required TEXT NOT NULL,
      met TEXT CHECK(met IN ('true', 'false', 'null')),
      partner_response TEXT,
      evidence_files TEXT, -- JSON string for evidence files
      evaluation_data TEXT, -- JSON string for evaluation results
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, assessment_type, item_id)
    )
  `);

  // Advice cache table (shared across all users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS advice_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      language TEXT NOT NULL,
      advice_content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, language)
    )
  `);

  // Virtual evidence cache table (shared across all users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS virtual_evidence_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      language TEXT NOT NULL,
      virtual_evidence_content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, language)
    )
  `);

  // Q&A table for item-specific questions and answers
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_qa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      assessment_type TEXT NOT NULL CHECK(assessment_type IN ('prerequisites', 'technical')),
      question TEXT NOT NULL,
      answer TEXT,
      question_user_id INTEGER NOT NULL,
      answer_user_id INTEGER,
      question_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answer_created_at DATETIME,
      FOREIGN KEY (question_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (answer_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // System backups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_name TEXT NOT NULL,
      backup_type TEXT NOT NULL, -- 'full', 'users', 'cache', 'selective'
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT, -- JSON metadata about backup
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // System operation logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL, -- 'delete', 'backup', 'restore', 'reset'
      target_type TEXT NOT NULL, -- 'user_data', 'cache', 'system', 'selective'
      target_id TEXT, -- user_id, cache_type, or other identifier
      performed_by INTEGER NOT NULL,
      details TEXT, -- JSON details about the operation
      affected_records INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'partial'
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (performed_by) REFERENCES users (id)
    )
  `);

  // Deleted data archive table (for recovery)
  db.exec(`
    CREATE TABLE IF NOT EXISTS deleted_data_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_table TEXT NOT NULL,
      original_id TEXT NOT NULL,
      data_content TEXT NOT NULL, -- JSON of original data
      deleted_by INTEGER NOT NULL,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      restore_deadline DATETIME, -- when this archive expires
      restored_at DATETIME,
      restored_by INTEGER,
      FOREIGN KEY (deleted_by) REFERENCES users (id),
      FOREIGN KEY (restored_by) REFERENCES users (id)
    )
  `);

  // Admin announcements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'error')),
      priority INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high
      is_active BOOLEAN NOT NULL DEFAULT 1,
      start_date DATETIME,
      end_date DATETIME,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // System settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users (id)
    )
  `);

  // Insert default settings if not exists
  const autoActivateSetting = db.prepare('SELECT * FROM system_settings WHERE setting_key = ?').get('auto_activate_users');
  if (!autoActivateSetting) {
    db.prepare('INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)').run(
      'auto_activate_users',
      'false',
      '신규 가입 사용자 자동 활성화 설정'
    );
  }

  // Create default test user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const testPassword = bcrypt.hashSync('test1234', 10);
    db.prepare('INSERT INTO users (email, password, name, role, status, organization) VALUES (?, ?, ?, ?, ?, ?)').run(
      'test@example.com',
      testPassword,
      '테스트 사용자',
      'user',
      'active',
      '테스트 조직'
    );
    console.log('[DB] Default test user created: test@example.com / test1234');
  }

  // Add columns to existing table if they don't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.exec(`ALTER TABLE users ADD COLUMN organization TEXT`);
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.exec(`ALTER TABLE assessment_data ADD COLUMN evidence_files TEXT`);
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.exec(`ALTER TABLE assessment_data ADD COLUMN evaluation_data TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assessment_user_type
    ON assessment_data(user_id, assessment_type)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email)
  `);
}

// User management functions
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  organization?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password: string;
}

export function createUser(email: string, hashedPassword: string, name: string, role: string = 'user', phone?: string, organization?: string): User {
  const stmt = db.prepare('INSERT INTO users (email, password, name, role, status, phone, organization) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(email, hashedPassword, name, role, 'inactive', phone || null, organization || null);

  const now = new Date().toISOString();
  return {
    id: Number(result.lastInsertRowid),
    email,
    name,
    role,
    status: 'inactive',
    phone,
    organization,
    created_at: now,
    updated_at: now
  };
}

export function getUserByEmail(email: string): UserWithPassword | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as UserWithPassword | undefined;
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare('SELECT id, email, name, role, status, phone, organization, created_at, updated_at FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function updateUserPassword(id: number, hashedPassword: string): void {
  const stmt = db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(hashedPassword, id);
}

export function deleteUser(id: number): void {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(id);
}

export function updateUserRole(id: number, role: string): void {
  const stmt = db.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?');
  stmt.run(role, id);
}

export function updateUserStatus(id: number, status: string): void {
  const stmt = db.prepare('UPDATE users SET status = ?, updated_at = datetime("now") WHERE id = ?');
  stmt.run(status, id);
}

export function updateUserInfo(id: number, updates: { name?: string; email?: string; phone?: string; organization?: string }): void {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.organization !== undefined) {
    fields.push('organization = ?');
    values.push(updates.organization);
  }
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = datetime("now")');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT id, email, name, role, status, phone, organization, created_at, updated_at FROM users ORDER BY created_at DESC');
  return stmt.all() as User[];
}

// Assessment data functions
export interface AssessmentDataRow {
  id: number;
  user_id: number;
  assessment_type: 'prerequisites' | 'technical';
  item_id: string;
  category: string;
  title: string;
  description: string;
  is_mandatory: number;
  evidence_required: string;
  met: string | null;
  partner_response: string;
  evidence_files: string | null;
  evaluation_data: string | null;
  last_updated: string;
}

export function saveAssessmentItem(
  userId: number,
  assessmentType: 'prerequisites' | 'technical',
  item: AssessmentItem
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO assessment_data
    (user_id, assessment_type, item_id, category, title, description, is_mandatory,
     evidence_required, met, partner_response, evidence_files, evaluation_data, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const metValue = item.met === null ? 'null' : item.met ? 'true' : 'false';
  const evidenceFilesJson = item.evidenceFiles ? JSON.stringify(item.evidenceFiles) : null;
  const evaluationDataJson = item.evaluation ? JSON.stringify(item.evaluation) : null;

  stmt.run(
    userId,
    assessmentType,
    item.id,
    item.category,
    item.title,
    item.description,
    item.isMandatory ? 1 : 0,
    item.evidenceRequired,
    metValue,
    item.partnerResponse || '',
    evidenceFilesJson,
    evaluationDataJson
  );
}

export function getAssessmentData(
  userId: number,
  assessmentType: 'prerequisites' | 'technical'
): AssessmentItem[] {
  const stmt = db.prepare(`
    SELECT * FROM assessment_data
    WHERE user_id = ? AND assessment_type = ?
    ORDER BY category, item_id
  `);

  const rows = stmt.all(userId, assessmentType) as AssessmentDataRow[];

  return rows.map(row => {
    let evidenceFiles = undefined;
    let evaluation = undefined;

    // Parse JSON data safely
    try {
      if (row.evidence_files) {
        evidenceFiles = JSON.parse(row.evidence_files);
      }
    } catch (e) {
      console.error('Error parsing evidence_files JSON:', e);
    }

    try {
      if (row.evaluation_data) {
        evaluation = JSON.parse(row.evaluation_data);
        // Convert date strings back to Date objects
        if (evaluation.evaluatedAt) {
          evaluation.evaluatedAt = new Date(evaluation.evaluatedAt);
        }
      }
    } catch (e) {
      console.error('Error parsing evaluation_data JSON:', e);
    }

    return {
      id: row.item_id,
      category: row.category,
      title: row.title,
      description: row.description,
      isMandatory: row.is_mandatory === 1,
      evidenceRequired: row.evidence_required,
      met: row.met === 'null' ? null : row.met === 'true',
      partnerResponse: row.partner_response,
      evidenceFiles,
      evaluation,
      lastUpdated: new Date(row.last_updated)
    };
  });
}

export function deleteAssessmentData(
  userId: number,
  assessmentType: 'prerequisites' | 'technical'
): void {
  const stmt = db.prepare('DELETE FROM assessment_data WHERE user_id = ? AND assessment_type = ?');
  stmt.run(userId, assessmentType);
}

export function deleteAllUserData(userId: number): void {
  const stmt = db.prepare('DELETE FROM assessment_data WHERE user_id = ?');
  stmt.run(userId);
}

// Advice cache functions (shared across all users)
export function getCachedAdvice(itemId: string, language: string): string | null {
  const stmt = db.prepare(`
    SELECT advice_content FROM advice_cache
    WHERE item_id = ? AND language = ?
  `);
  
  const row = stmt.get(itemId, language) as { advice_content: string } | undefined;
  return row ? row.advice_content : null;
}

export function setCachedAdvice(itemId: string, language: string, adviceContent: string): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO advice_cache (item_id, language, advice_content)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(itemId, language, adviceContent);
}

export function clearAdviceCache(): void {
  const stmt = db.prepare('DELETE FROM advice_cache');
  stmt.run();
}

export function getAdviceCacheStats(): { totalItems: number, languages: string[] } {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM advice_cache');
  const languagesStmt = db.prepare('SELECT DISTINCT language FROM advice_cache');
  
  const totalResult = totalStmt.get() as { count: number };
  const languageResults = languagesStmt.all() as { language: string }[];
  
  return {
    totalItems: totalResult.count,
    languages: languageResults.map(r => r.language)
  };
}

// Virtual evidence cache functions (shared across all users)
export function getCachedVirtualEvidence(itemId: string, language: string): string | null {
  const stmt = db.prepare(`
    SELECT virtual_evidence_content FROM virtual_evidence_cache
    WHERE item_id = ? AND language = ?
  `);
  
  const row = stmt.get(itemId, language) as { virtual_evidence_content: string } | undefined;
  return row ? row.virtual_evidence_content : null;
}

export function setCachedVirtualEvidence(itemId: string, language: string, virtualEvidenceContent: string): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO virtual_evidence_cache (item_id, language, virtual_evidence_content)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(itemId, language, virtualEvidenceContent);
}

export function clearVirtualEvidenceCache(): void {
  const stmt = db.prepare('DELETE FROM virtual_evidence_cache');
  stmt.run();
}

export function getVirtualEvidenceCacheStats(): { totalItems: number, languages: string[] } {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM virtual_evidence_cache');
  const languagesStmt = db.prepare('SELECT DISTINCT language FROM virtual_evidence_cache');
  
  const totalResult = totalStmt.get() as { count: number };
  const languageResults = languagesStmt.all() as { language: string }[];
  
  return {
    totalItems: totalResult.count,
    languages: languageResults.map(r => r.language)
  };
}

// Q&A functions
export interface QAItem {
  id: number;
  itemId: string;
  assessmentType: string;
  question: string;
  answer?: string;
  questionUserId: number;
  answerUserId?: number;
  questionCreatedAt: string;
  answerCreatedAt?: string;
  questionUserName: string;
  answerUserName?: string;
}

export function createQuestion(
  itemId: string,
  assessmentType: 'prerequisites' | 'technical',
  question: string,
  userId: number
): number {
  const stmt = db.prepare(`
    INSERT INTO item_qa (item_id, assessment_type, question, question_user_id)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(itemId, assessmentType, question, userId);
  return result.lastInsertRowid as number;
}

export function answerQuestion(questionId: number, answer: string, userId: number): void {
  const stmt = db.prepare(`
    UPDATE item_qa 
    SET answer = ?, answer_user_id = ?, answer_created_at = datetime('now')
    WHERE id = ?
  `);
  
  stmt.run(answer, userId, questionId);
}

export function getQuestionsForItem(
  itemId: string,
  assessmentType: 'prerequisites' | 'technical'
): QAItem[] {
  const stmt = db.prepare(`
    SELECT 
      qa.id,
      qa.item_id as itemId,
      qa.assessment_type as assessmentType,
      qa.question,
      qa.answer,
      qa.question_user_id as questionUserId,
      qa.answer_user_id as answerUserId,
      qa.question_created_at as questionCreatedAt,
      qa.answer_created_at as answerCreatedAt,
      qu.name as questionUserName,
      au.name as answerUserName
    FROM item_qa qa
    LEFT JOIN users qu ON qa.question_user_id = qu.id
    LEFT JOIN users au ON qa.answer_user_id = au.id
    WHERE qa.item_id = ? AND qa.assessment_type = ?
    ORDER BY qa.question_created_at DESC
  `);
  
  return stmt.all(itemId, assessmentType) as QAItem[];
}

export function deleteQuestion(questionId: number, userId: number): boolean {
  // Only allow deletion by the question author or admin
  const checkStmt = db.prepare(`
    SELECT qa.question_user_id, u.role 
    FROM item_qa qa
    LEFT JOIN users u ON u.id = ?
    WHERE qa.id = ?
  `);
  
  const result = checkStmt.get(userId, questionId) as { question_user_id: number, role: string } | undefined;
  
  if (!result) return false;
  
  const canDelete = result.question_user_id === userId || result.role === 'admin';
  
  if (canDelete) {
    const deleteStmt = db.prepare('DELETE FROM item_qa WHERE id = ?');
    deleteStmt.run(questionId);
    return true;
  }
  
  return false;
}

// Admin announcements functions
export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export function createAnnouncement(
  title: string,
  content: string,
  type: 'info' | 'warning' | 'success' | 'error',
  priority: number,
  isActive: boolean,
  createdBy: number,
  startDate?: string,
  endDate?: string
): number {
  const stmt = db.prepare(`
    INSERT INTO admin_announcements 
    (title, content, type, priority, is_active, start_date, end_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(title, content, type, priority, isActive ? 1 : 0, startDate || null, endDate || null, createdBy);
  return result.lastInsertRowid as number;
}

export function updateAnnouncement(
  id: number,
  title: string,
  content: string,
  type: 'info' | 'warning' | 'success' | 'error',
  priority: number,
  isActive: boolean,
  startDate?: string,
  endDate?: string
): void {
  const stmt = db.prepare(`
    UPDATE admin_announcements 
    SET title = ?, content = ?, type = ?, priority = ?, is_active = ?, 
        start_date = ?, end_date = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  
  stmt.run(title, content, type, priority, isActive ? 1 : 0, startDate || null, endDate || null, id);
}

export function deleteAnnouncement(id: number): void {
  const stmt = db.prepare('DELETE FROM admin_announcements WHERE id = ?');
  stmt.run(id);
}

export function getAnnouncement(id: number): AdminAnnouncement | undefined {
  const stmt = db.prepare(`
    SELECT a.*, u.name as createdByName
    FROM admin_announcements a
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `);
  
  const row = stmt.get(id) as any;
  if (!row) return undefined;
  
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    priority: row.priority,
    isActive: row.is_active === 1,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.createdByName
  };
}

export function getAllAnnouncements(): AdminAnnouncement[] {
  const stmt = db.prepare(`
    SELECT a.*, u.name as createdByName
    FROM admin_announcements a
    LEFT JOIN users u ON a.created_by = u.id
    ORDER BY a.priority DESC, a.created_at DESC
  `);
  
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    priority: row.priority,
    isActive: row.is_active === 1,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.createdByName
  }));
}

export function getActiveAnnouncements(): AdminAnnouncement[] {
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    SELECT a.*, u.name as createdByName
    FROM admin_announcements a
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.is_active = 1 
      AND (a.start_date IS NULL OR a.start_date <= ?)
      AND (a.end_date IS NULL OR a.end_date >= ?)
    ORDER BY a.priority DESC, a.created_at DESC
  `);
  
  const rows = stmt.all(now, now) as any[];
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    priority: row.priority,
    isActive: row.is_active === 1,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.createdByName
  }));
}

// System settings functions
export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedBy?: number;
  updatedAt: string;
}

export function getSystemSetting(key: string): string | null {
  try {
    const stmt = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?');
    const row = stmt.get(key) as { setting_value: string } | undefined;
    return row ? row.setting_value : null;
  } catch (error) {
    console.error(`[DB] Error getting system setting '${key}':`, error);
    return null;
  }
}

export function setSystemSetting(key: string, value: string, userId?: number): void {
  const stmt = db.prepare(`
    INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      updated_by = excluded.updated_by,
      updated_at = datetime('now')
  `);
  stmt.run(key, value, userId || null);
}

export function getAllSystemSettings(): SystemSetting[] {
  const stmt = db.prepare('SELECT * FROM system_settings ORDER BY setting_key');
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    id: row.id,
    settingKey: row.setting_key,
    settingValue: row.setting_value,
    description: row.description,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at
  }));
}

export function isAutoActivateEnabled(): boolean {
  try {
    const value = getSystemSetting('auto_activate_users');
    console.log('[DB] isAutoActivateEnabled - setting value:', value);
    return value === 'true';
  } catch (error) {
    console.error('[DB] Error checking auto_activate_users setting:', error);
    return false;
  }
}

// Initialize the database when the module is loaded
initializeDatabase();

export default db;
