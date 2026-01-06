// 메인 애플리케이션의 데이터베이스를 참조
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname 대체 (ESM 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin 앱은 msp-checklist/admin/lib에 있으므로, 상위 디렉토리의 msp-assessment.db를 사용
const dbPath = path.resolve(__dirname, '../../msp-assessment.db');
console.log('[Admin DB] Using database at:', dbPath);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

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

export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT id, email, name, role, status, phone, organization, created_at, updated_at FROM users ORDER BY created_at DESC');
  return stmt.all() as User[];
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare('SELECT id, email, name, role, status, phone, organization, created_at, updated_at FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function getUserByEmail(email: string): UserWithPassword | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as UserWithPassword | undefined;
}

export function updateUserRole(userId: number, role: string): void {
  const stmt = db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(role, userId);
}

export function updateUserStatus(id: number, status: string): void {
  const stmt = db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?");
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
  
  fields.push("updated_at = datetime('now')");
  values.push(id);
  
  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function updateUserPassword(id: number, hashedPassword: string): void {
  const stmt = db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(hashedPassword, id);
}

export function deleteUser(id: number): void {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(id);
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

// Q&A management functions
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
  evidenceFiles?: EvidenceFile[];
  evaluation?: EvaluationData;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  base64Data: string;
  uploadedAt: string;
  extractedText?: string;
}

export interface EvaluationData {
  score: number;
  feedback: string;
  evaluatedAt: string;
}

export function getAllQuestions(): QAItem[] {
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
    ORDER BY qa.question_created_at DESC
  `);
  
  const questions = stmt.all() as QAItem[];
  
  // 각 질문에 대해 해당 평가 항목의 증빙 파일 가져오기
  const evidenceStmt = db.prepare(`
    SELECT evidence_files, evaluation_data
    FROM assessment_data
    WHERE user_id = ? AND item_id = ? AND assessment_type = ?
  `);
  
  return questions.map(q => {
    try {
      const assessmentType = q.assessmentType === 'prerequisite' ? 'prerequisites' : 'technical';
      const row = evidenceStmt.get(q.questionUserId, q.itemId, assessmentType) as any;
      
      if (row) {
        if (row.evidence_files) {
          try {
            q.evidenceFiles = JSON.parse(row.evidence_files);
          } catch (e) {
            console.error('Error parsing evidence_files:', e);
          }
        }
        if (row.evaluation_data) {
          try {
            q.evaluation = JSON.parse(row.evaluation_data);
          } catch (e) {
            console.error('Error parsing evaluation_data:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching evidence for question:', q.id, e);
    }
    return q;
  });
}

export function getUnansweredQuestions(): QAItem[] {
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
    WHERE qa.answer IS NULL
    ORDER BY qa.question_created_at DESC
  `);
  
  return stmt.all() as QAItem[];
}

export function answerQuestion(questionId: number, answer: string, userId: number): void {
  const stmt = db.prepare(`
    UPDATE item_qa 
    SET answer = ?, answer_user_id = ?, answer_created_at = datetime('now')
    WHERE id = ?
  `);
  
  stmt.run(answer, userId, questionId);
}

// Statistics functions
export function getUserStats() {
  const totalUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const adminUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?');
  const recentUsersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-7 days')");
  
  const totalUsers = totalUsersStmt.get() as { count: number };
  const adminUsers = adminUsersStmt.get('admin') as { count: number };
  const recentUsers = recentUsersStmt.get() as { count: number };
  
  return {
    totalUsers: totalUsers.count,
    adminUsers: adminUsers.count,
    recentUsers: recentUsers.count
  };
}

export function getQAStats() {
  const totalQuestionsStmt = db.prepare('SELECT COUNT(*) as count FROM item_qa');
  const answeredQuestionsStmt = db.prepare('SELECT COUNT(*) as count FROM item_qa WHERE answer IS NOT NULL');
  const recentQuestionsStmt = db.prepare("SELECT COUNT(*) as count FROM item_qa WHERE question_created_at > datetime('now', '-7 days')");
  
  const totalQuestions = totalQuestionsStmt.get() as { count: number };
  const answeredQuestions = answeredQuestionsStmt.get() as { count: number };
  const recentQuestions = recentQuestionsStmt.get() as { count: number };
  
  return {
    totalQuestions: totalQuestions.count,
    answeredQuestions: answeredQuestions.count,
    unansweredQuestions: totalQuestions.count - answeredQuestions.count,
    recentQuestions: recentQuestions.count
  };
}

export function getCacheStats() {
  const adviceCacheStmt = db.prepare('SELECT COUNT(*) as count FROM advice_cache');
  const virtualEvidenceCacheStmt = db.prepare('SELECT COUNT(*) as count FROM virtual_evidence_cache');
  
  const adviceCache = adviceCacheStmt.get() as { count: number };
  const virtualEvidenceCache = virtualEvidenceCacheStmt.get() as { count: number };
  
  return {
    adviceCache: adviceCache.count,
    virtualEvidenceCache: virtualEvidenceCache.count
  };
}

// Activity monitoring
export function getUserActivity() {
  const stmt = db.prepare(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.phone,
      u.organization,
      COUNT(qa.id) as questionsAsked,
      COUNT(qa2.id) as questionsAnswered,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN item_qa qa ON u.id = qa.question_user_id
    LEFT JOIN item_qa qa2 ON u.id = qa2.answer_user_id
    GROUP BY u.id, u.name, u.email, u.role, u.status, u.phone, u.organization, u.created_at, u.updated_at
    ORDER BY u.created_at DESC
  `);
  
  return stmt.all();
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

export interface AssessmentItem {
  id: string;
  category: string;
  title: string;
  description: string;
  isMandatory: boolean;
  evidenceRequired: string;
  met: boolean | null;
  partnerResponse?: string;
  evidenceFiles?: any;
  evaluation?: any;
  lastUpdated?: Date;
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

// System settings functions
export interface SystemSettings {
  evidenceUploadEnabled: boolean;
  [key: string]: any;
}

export function getSystemSettings(): SystemSettings {
  try {
    const stmt = db.prepare('SELECT setting_key, setting_value FROM system_settings');
    const rows = stmt.all() as { setting_key: string; setting_value: string }[];
    
    const settings: SystemSettings = {
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
    
    return settings;
  } catch (e) {
    console.error('Error getting system settings:', e);
    return { evidenceUploadEnabled: false };
  }
}

export function getSystemSetting(key: string): any {
  try {
    const stmt = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?');
    const row = stmt.get(key) as { setting_value: string } | undefined;
    
    if (!row) return null;
    
    if (row.setting_value === 'true') return true;
    if (row.setting_value === 'false') return false;
    
    try {
      return JSON.parse(row.setting_value);
    } catch {
      return row.setting_value;
    }
  } catch (e) {
    console.error('Error getting system setting:', e);
    return null;
  }
}

export function updateSystemSetting(key: string, value: any): void {
  try {
    const stringValue = typeof value === 'boolean' ? String(value) : 
                        typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    const stmt = db.prepare(`
      INSERT INTO system_settings (setting_key, setting_value, updated_at) 
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')
    `);
    stmt.run(key, stringValue, stringValue);
  } catch (e) {
    console.error('Error updating system setting:', e);
    throw e;
  }
}

// 시스템 설정 테이블 초기화
function initSystemSettings() {
  try {
    // 테이블이 이미 존재하는지 확인 (메인 앱에서 생성됨)
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'").get();
    
    if (!tableExists) {
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
    }
    
    // 기본 설정 삽입 (없으면)
    const insertDefault = db.prepare(`
      INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)
    `);
    insertDefault.run('evidenceUploadEnabled', 'false');
  } catch (e) {
    console.error('Error initializing system_settings table:', e);
  }
}

// 테이블 초기화 실행
initSystemSettings();

// User Activity Log functions
export interface ActivityLog {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  actionType: string;
  actionCategory: string;
  itemId: string | null;
  assessmentType: string | null;
  details: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface ActivityLogInput {
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType: string;
  actionCategory: string;
  itemId?: string | null;
  assessmentType?: string | null;
  details?: string | null;
  sessionId?: string | null;
}

// 활동 로그 기록
export function logActivity(input: ActivityLogInput): number {
  try {
    // 테이블이 존재하는지 확인
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_activity_logs'").get();
    if (!tableExists) {
      // 테이블 생성
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          user_email TEXT,
          user_name TEXT,
          ip_address TEXT,
          user_agent TEXT,
          action_type TEXT NOT NULL,
          action_category TEXT NOT NULL,
          item_id TEXT,
          assessment_type TEXT,
          details TEXT,
          session_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
    }
    
    const stmt = db.prepare(`
      INSERT INTO user_activity_logs 
      (user_id, user_email, user_name, ip_address, user_agent, action_type, action_category, item_id, assessment_type, details, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      input.userId || null,
      input.userEmail || null,
      input.userName || null,
      input.ipAddress || null,
      input.userAgent || null,
      input.actionType,
      input.actionCategory,
      input.itemId || null,
      input.assessmentType || null,
      input.details || null,
      input.sessionId || null
    );
    
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('[DB] Error logging activity:', error);
    return -1;
  }
}

// 활동 로그 조회 (필터링 지원)
export interface ActivityLogFilter {
  userId?: number;
  ipAddress?: string;
  actionType?: string;
  actionCategory?: string;
  itemId?: string;
  assessmentType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function getActivityLogs(filter: ActivityLogFilter = {}): ActivityLog[] {
  let query = `
    SELECT 
      id, user_id as userId, user_email as userEmail, user_name as userName,
      ip_address as ipAddress, user_agent as userAgent, action_type as actionType,
      action_category as actionCategory, item_id as itemId, assessment_type as assessmentType,
      details, session_id as sessionId, created_at as createdAt
    FROM user_activity_logs
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (filter.userId) {
    query += ' AND user_id = ?';
    params.push(filter.userId);
  }
  
  if (filter.ipAddress) {
    query += ' AND ip_address = ?';
    params.push(filter.ipAddress);
  }
  
  if (filter.actionType) {
    query += ' AND action_type = ?';
    params.push(filter.actionType);
  }
  
  if (filter.actionCategory) {
    query += ' AND action_category = ?';
    params.push(filter.actionCategory);
  }
  
  if (filter.itemId) {
    query += ' AND item_id = ?';
    params.push(filter.itemId);
  }
  
  if (filter.assessmentType) {
    query += ' AND assessment_type = ?';
    params.push(filter.assessmentType);
  }
  
  if (filter.startDate) {
    query += ' AND created_at >= ?';
    params.push(filter.startDate);
  }
  
  if (filter.endDate) {
    query += ' AND created_at <= ?';
    params.push(filter.endDate);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (filter.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
    
    if (filter.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }
  }
  
  try {
    const stmt = db.prepare(query);
    return stmt.all(...params) as ActivityLog[];
  } catch (error) {
    console.error('[DB] Error getting activity logs:', error);
    return [];
  }
}

// 활동 로그 통계
export interface ActivityStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueIPs: number;
  actionTypeCounts: Record<string, number>;
  actionCategoryCounts: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  dailyDistribution: Record<string, number>;
}

export function getActivityStats(filter: ActivityLogFilter = {}): ActivityStats {
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (filter.startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(filter.startDate);
    }
    
    if (filter.endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(filter.endDate);
    }
    
    if (filter.userId) {
      whereClause += ' AND user_id = ?';
      params.push(filter.userId);
    }
    
    // 총 로그 수
    const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM user_activity_logs ${whereClause}`);
    const totalLogs = (totalStmt.get(...params) as { count: number })?.count || 0;
    
    // 고유 사용자 수
    const usersStmt = db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM user_activity_logs ${whereClause} AND user_id IS NOT NULL`);
    const uniqueUsers = (usersStmt.get(...params) as { count: number })?.count || 0;
    
    // 고유 IP 수
    const ipsStmt = db.prepare(`SELECT COUNT(DISTINCT ip_address) as count FROM user_activity_logs ${whereClause} AND ip_address IS NOT NULL`);
    const uniqueIPs = (ipsStmt.get(...params) as { count: number })?.count || 0;
    
    // 액션 타입별 카운트
    const actionTypeStmt = db.prepare(`
      SELECT action_type, COUNT(*) as count 
      FROM user_activity_logs ${whereClause}
      GROUP BY action_type
    `);
    const actionTypeCounts: Record<string, number> = {};
    (actionTypeStmt.all(...params) as { action_type: string; count: number }[]).forEach(row => {
      actionTypeCounts[row.action_type] = row.count;
    });
    
    // 액션 카테고리별 카운트
    const actionCategoryStmt = db.prepare(`
      SELECT action_category, COUNT(*) as count 
      FROM user_activity_logs ${whereClause}
      GROUP BY action_category
    `);
    const actionCategoryCounts: Record<string, number> = {};
    (actionCategoryStmt.all(...params) as { action_category: string; count: number }[]).forEach(row => {
      actionCategoryCounts[row.action_category] = row.count;
    });
    
    // 시간별 분포
    const hourlyStmt = db.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as count 
      FROM user_activity_logs ${whereClause}
      GROUP BY hour
      ORDER BY hour
    `);
    const hourlyDistribution: Record<string, number> = {};
    (hourlyStmt.all(...params) as { hour: string; count: number }[]).forEach(row => {
      hourlyDistribution[row.hour] = row.count;
    });
    
    // 일별 분포
    const dailyStmt = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count 
      FROM user_activity_logs ${whereClause}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `);
    const dailyDistribution: Record<string, number> = {};
    (dailyStmt.all(...params) as { date: string; count: number }[]).forEach(row => {
      dailyDistribution[row.date] = row.count;
    });
    
    return {
      totalLogs,
      uniqueUsers,
      uniqueIPs,
      actionTypeCounts,
      actionCategoryCounts,
      hourlyDistribution,
      dailyDistribution
    };
  } catch (error) {
    console.error('[DB] Error getting activity stats:', error);
    return {
      totalLogs: 0,
      uniqueUsers: 0,
      uniqueIPs: 0,
      actionTypeCounts: {},
      actionCategoryCounts: {},
      hourlyDistribution: {},
      dailyDistribution: {}
    };
  }
}

// 사용자별 활동 요약
export interface UserActivitySummary {
  userId: number;
  userEmail: string;
  userName: string;
  totalActions: number;
  lastActivity: string;
  ipAddresses: string[];
  actionTypes: Record<string, number>;
}

export function getUserActivitySummaries(limit: number = 50): UserActivitySummary[] {
  try {
    const stmt = db.prepare(`
      SELECT 
        user_id,
        user_email,
        user_name,
        COUNT(*) as total_actions,
        MAX(created_at) as last_activity,
        GROUP_CONCAT(DISTINCT ip_address) as ip_addresses
      FROM user_activity_logs
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      ORDER BY last_activity DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => {
      // 사용자별 액션 타입 카운트
      const actionStmt = db.prepare(`
        SELECT action_type, COUNT(*) as count 
        FROM user_activity_logs 
        WHERE user_id = ?
        GROUP BY action_type
      `);
      const actionTypes: Record<string, number> = {};
      (actionStmt.all(row.user_id) as { action_type: string; count: number }[]).forEach(a => {
        actionTypes[a.action_type] = a.count;
      });
      
      return {
        userId: row.user_id,
        userEmail: row.user_email || '',
        userName: row.user_name || '',
        totalActions: row.total_actions,
        lastActivity: row.last_activity,
        ipAddresses: row.ip_addresses ? row.ip_addresses.split(',') : [],
        actionTypes
      };
    });
  } catch (error) {
    console.error('[DB] Error getting user activity summaries:', error);
    return [];
  }
}

// IP별 활동 요약
export interface IPActivitySummary {
  ipAddress: string;
  totalActions: number;
  uniqueUsers: number;
  lastActivity: string;
  userNames: string[];
  actionTypes: Record<string, number>;
}

export function getIPActivitySummaries(limit: number = 50): IPActivitySummary[] {
  try {
    const stmt = db.prepare(`
      SELECT 
        ip_address,
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(created_at) as last_activity,
        GROUP_CONCAT(DISTINCT user_name) as user_names
      FROM user_activity_logs
      WHERE ip_address IS NOT NULL
      GROUP BY ip_address
      ORDER BY total_actions DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(limit) as any[];
    
    return rows.map(row => {
      // IP별 액션 타입 카운트
      const actionStmt = db.prepare(`
        SELECT action_type, COUNT(*) as count 
        FROM user_activity_logs 
        WHERE ip_address = ?
        GROUP BY action_type
      `);
      const actionTypes: Record<string, number> = {};
      (actionStmt.all(row.ip_address) as { action_type: string; count: number }[]).forEach(a => {
        actionTypes[a.action_type] = a.count;
      });
      
      return {
        ipAddress: row.ip_address,
        totalActions: row.total_actions,
        uniqueUsers: row.unique_users,
        lastActivity: row.last_activity,
        userNames: row.user_names ? row.user_names.split(',') : [],
        actionTypes
      };
    });
  } catch (error) {
    console.error('[DB] Error getting IP activity summaries:', error);
    return [];
  }
}

// 오래된 로그 정리
export function cleanupOldActivityLogs(daysToKeep: number = 90): number {
  try {
    const stmt = db.prepare(`
      DELETE FROM user_activity_logs 
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    const result = stmt.run(daysToKeep);
    return result.changes;
  } catch (error) {
    console.error('[DB] Error cleaning up activity logs:', error);
    return 0;
  }
}

export default db;
