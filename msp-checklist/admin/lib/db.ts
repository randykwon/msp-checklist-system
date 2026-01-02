// 메인 애플리케이션의 데이터베이스를 참조
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '../msp-assessment.db');
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

export default db;