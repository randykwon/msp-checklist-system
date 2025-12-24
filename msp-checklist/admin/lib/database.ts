// 데이터베이스 유틸리티 함수들
import Database from 'better-sqlite3';
import path from 'path';

// 데이터베이스 연결
export function getDatabase() {
  const dbPath = path.join(process.cwd(), 'msp-assessment.db');
  return new Database(dbPath);
}

// 사용자 관련 함수들
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

export function getAllUsers(): User[] {
  const db = getDatabase();
  try {
    const users = db.prepare(`
      SELECT id, email, name, role, status, phone, organization, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `).all() as User[];
    return users;
  } finally {
    db.close();
  }
}

export function getUserById(userId: number): User | null {
  const db = getDatabase();
  try {
    const user = db.prepare(`
      SELECT id, email, name, role, status, phone, organization, created_at, updated_at
      FROM users 
      WHERE id = ?
    `).get(userId) as User | undefined;
    return user || null;
  } finally {
    db.close();
  }
}

export function updateUserRole(userId: number, role: string): boolean {
  const db = getDatabase();
  try {
    const result = db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(role, userId);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

export function deleteUser(userId: number): boolean {
  const db = getDatabase();
  try {
    const result = db.prepare(`
      DELETE FROM users 
      WHERE id = ?
    `).run(userId);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

// 진행 현황 관련 함수들
export interface ProgressStats {
  totalUsers: number;
  activeUsers: number;
  completedAssessments: number;
  averageProgress: number;
  recentActivity: Array<{
    userId: number;
    userName: string;
    action: string;
    timestamp: string;
  }>;
}

export function getProgressStats(): ProgressStats {
  const db = getDatabase();
  try {
    // 총 사용자 수
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    // 활성 사용자 수 (최근 7일 내 업데이트된 평가 데이터가 있는 사용자)
    const activeUsers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM assessment_data 
      WHERE last_updated > datetime('now', '-7 days')
    `).get() as { count: number };
    
    // 완료된 평가 수 (met이 true 또는 false로 설정된 항목들)
    const completedAssessments = db.prepare(`
      SELECT COUNT(*) as count 
      FROM assessment_data 
      WHERE met != 'null'
    `).get() as { count: number };
    
    // 평균 진행률 계산 (각 사용자별로 완료된 항목 비율의 평균)
    const progressData = db.prepare(`
      SELECT 
        user_id,
        COUNT(*) as total_items,
        SUM(CASE WHEN met != 'null' THEN 1 ELSE 0 END) as completed_items
      FROM assessment_data 
      GROUP BY user_id
    `).all() as Array<{ user_id: number; total_items: number; completed_items: number }>;
    
    let totalProgress = 0;
    let userCount = 0;
    
    progressData.forEach(user => {
      if (user.total_items > 0) {
        totalProgress += (user.completed_items / user.total_items) * 100;
        userCount++;
      }
    });
    
    const averageProgress = userCount > 0 ? Math.round(totalProgress / userCount) : 0;
    
    // 최근 활동 (최근 업데이트된 평가 데이터)
    const recentActivity = db.prepare(`
      SELECT 
        u.id as userId, 
        u.name as userName, 
        'assessment_update' as action, 
        ad.last_updated as timestamp
      FROM assessment_data ad
      JOIN users u ON ad.user_id = u.id
      ORDER BY ad.last_updated DESC
      LIMIT 10
    `).all() as Array<{
      userId: number;
      userName: string;
      action: string;
      timestamp: string;
    }>;

    return {
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      completedAssessments: completedAssessments.count,
      averageProgress,
      recentActivity
    };
  } finally {
    db.close();
  }
}

// 시스템 통계
export interface SystemStats {
  dbSize: number;
  cacheSize: number;
  totalQuestions: number;
  totalAdviceCache: number;
  systemUptime: number;
}

export function getSystemStats(): SystemStats {
  const db = getDatabase();
  try {
    // 데이터베이스 크기 (페이지 수 * 페이지 크기)
    const dbInfo = db.prepare('PRAGMA page_count').get() as { page_count: number };
    const pageSize = db.prepare('PRAGMA page_size').get() as { page_size: number };
    const dbSize = (dbInfo.page_count || 0) * (pageSize.page_size || 0);
    
    // 총 질문 수 (Q&A 테이블)
    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM item_qa').get() as { count: number };
    
    // 조언 캐시 수
    const totalAdviceCache = db.prepare('SELECT COUNT(*) as count FROM advice_cache').get() as { count: number };
    
    return {
      dbSize,
      cacheSize: 0, // 파일 시스템 캐시는 별도 계산 필요
      totalQuestions: totalQuestions.count,
      totalAdviceCache: totalAdviceCache.count,
      systemUptime: process.uptime()
    };
  } finally {
    db.close();
  }
}