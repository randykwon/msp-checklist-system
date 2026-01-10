import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

interface UserEvaluation {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  itemId: string;
  assessmentType: string;
  score: number;
  feedback: string;
  evaluatedAt: string;
  llmProvider: string;
  llmModel: string;
  fileCount: number;
  totalFileSize: number;
}

interface UserSummary {
  userId: number;
  userName: string;
  userEmail: string;
  totalEvaluations: number;
  averageScore: number;
  lastEvaluatedAt: string;
  evaluatedItems: string[];
  totalFiles: number;
  totalFileSize: number;
}

function getDbPath(): string {
  const dbPath = path.join(process.cwd(), 'msp-assessment.db');
  if (fs.existsSync(dbPath)) return dbPath;
  return path.join(process.cwd(), '..', 'msp-assessment.db');
}

function ensureEvaluationTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS evidence_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      assessment_type TEXT DEFAULT 'unknown',
      score INTEGER NOT NULL,
      feedback TEXT NOT NULL,
      llm_provider TEXT,
      llm_model TEXT,
      file_count INTEGER DEFAULT 1,
      total_file_size INTEGER DEFAULT 0,
      evaluated_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_id)
    )
  `);
  
  // 인덱스 추가
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_evidence_eval_user ON evidence_evaluations(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_evidence_eval_item ON evidence_evaluations(item_id)`);
  } catch (e) {
    // 인덱스가 이미 존재할 수 있음
  }
}

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'summary'; // 'summary' | 'detail' | 'user'
    const userId = searchParams.get('userId');

    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ evaluations: [], users: [] });
    }

    const db = new Database(dbPath);
    ensureEvaluationTable(db);

    if (view === 'user' && userId) {
      // 특정 사용자의 평가 상세
      const evaluations = db.prepare(`
        SELECT 
          ee.id,
          ee.user_id as userId,
          u.name as userName,
          u.email as userEmail,
          ee.item_id as itemId,
          ee.assessment_type as assessmentType,
          ee.score,
          ee.feedback,
          ee.evaluated_at as evaluatedAt,
          ee.llm_provider as llmProvider,
          ee.llm_model as llmModel,
          ee.file_count as fileCount,
          ee.total_file_size as totalFileSize
        FROM evidence_evaluations ee
        LEFT JOIN users u ON ee.user_id = u.id
        WHERE ee.user_id = ?
        ORDER BY ee.evaluated_at DESC
      `).all(parseInt(userId)) as UserEvaluation[];

      db.close();
      return NextResponse.json({ evaluations });
    }

    if (view === 'detail') {
      // 모든 평가 상세 목록
      const evaluations = db.prepare(`
        SELECT 
          ee.id,
          ee.user_id as userId,
          u.name as userName,
          u.email as userEmail,
          ee.item_id as itemId,
          ee.assessment_type as assessmentType,
          ee.score,
          ee.feedback,
          ee.evaluated_at as evaluatedAt,
          ee.llm_provider as llmProvider,
          ee.llm_model as llmModel,
          ee.file_count as fileCount,
          ee.total_file_size as totalFileSize
        FROM evidence_evaluations ee
        LEFT JOIN users u ON ee.user_id = u.id
        ORDER BY ee.evaluated_at DESC
        LIMIT 100
      `).all() as UserEvaluation[];

      db.close();
      return NextResponse.json({ evaluations });
    }

    // 사용자별 요약
    const users = db.prepare(`
      SELECT 
        ee.user_id as userId,
        u.name as userName,
        u.email as userEmail,
        COUNT(*) as totalEvaluations,
        ROUND(AVG(ee.score), 1) as averageScore,
        MAX(ee.evaluated_at) as lastEvaluatedAt,
        GROUP_CONCAT(DISTINCT ee.item_id) as evaluatedItemsStr,
        SUM(ee.file_count) as totalFiles,
        SUM(ee.total_file_size) as totalFileSize
      FROM evidence_evaluations ee
      LEFT JOIN users u ON ee.user_id = u.id
      GROUP BY ee.user_id
      ORDER BY lastEvaluatedAt DESC
    `).all() as any[];

    const userSummaries: UserSummary[] = users.map(u => ({
      userId: u.userId,
      userName: u.userName || `User ${u.userId}`,
      userEmail: u.userEmail || '',
      totalEvaluations: u.totalEvaluations,
      averageScore: u.averageScore || 0,
      lastEvaluatedAt: u.lastEvaluatedAt,
      evaluatedItems: u.evaluatedItemsStr ? u.evaluatedItemsStr.split(',') : [],
      totalFiles: u.totalFiles || 0,
      totalFileSize: u.totalFileSize || 0
    }));

    // 전체 통계
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalEvaluations,
        COUNT(DISTINCT user_id) as totalUsers,
        ROUND(AVG(score), 1) as averageScore,
        SUM(file_count) as totalFiles
      FROM evidence_evaluations
    `).get() as any;

    db.close();

    return NextResponse.json({ 
      users: userSummaries,
      stats: {
        totalEvaluations: stats?.totalEvaluations || 0,
        totalUsers: stats?.totalUsers || 0,
        averageScore: stats?.averageScore || 0,
        totalFiles: stats?.totalFiles || 0
      }
    });
  } catch (error) {
    console.error('Error fetching user evaluations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
