import Database from 'better-sqlite3';
import path from 'path';
import { createHash } from 'crypto';

// Node.js 환경에서만 fs 모듈 사용
let fs: any = null;
if (typeof window === 'undefined') {
  fs = require('fs');
}

export interface BackupMetadata {
  version: string;
  createdAt: string;
  totalUsers: number;
  totalAssessments: number;
  totalCacheItems: number;
  backupType: 'full' | 'users' | 'cache' | 'selective';
  selectionCriteria?: any;
}

export interface SystemLog {
  id?: number;
  operationType: 'delete' | 'backup' | 'restore' | 'reset';
  targetType: 'user_data' | 'cache' | 'system' | 'selective';
  targetId?: string;
  performedBy: number;
  details: any;
  affectedRecords: number;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  createdAt?: string;
}

export interface DeletedDataArchive {
  id?: number;
  originalTable: string;
  originalId: string;
  dataContent: any;
  deletedBy: number;
  deletedAt?: string;
  restoreDeadline?: string;
  restoredAt?: string;
  restoredBy?: number;
}

export class BackupService {
  private db: Database.Database | null = null;
  private backupDir: string = '';

  constructor() {
    // 서버 환경에서만 실행
    if (typeof window === 'undefined' && fs) {
      // 관리자 시스템에서 실행될 때는 상위 디렉토리의 DB 참조
      const isAdminSystem = process.cwd().includes('/admin');
      const dbPath = isAdminSystem 
        ? path.join(process.cwd(), '../msp-assessment.db')
        : path.join(process.cwd(), 'msp-assessment.db');
      
      this.db = new Database(dbPath);
      
      this.backupDir = isAdminSystem
        ? path.join(process.cwd(), '../backups')
        : path.join(process.cwd(), 'backups');
      
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    }
  }

  // 전체 시스템 백업
  async createFullBackup(adminUserId: number): Promise<string> {
    if (!this.db || !fs) {
      throw new Error('Backup service not available in client environment');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `full_backup_${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupName}.json`);

    try {
      // 모든 테이블 데이터 수집
      const users = this.db.prepare('SELECT * FROM users').all();
      const assessmentData = this.db.prepare('SELECT * FROM assessment_data').all();
      const adviceCache = this.db.prepare('SELECT * FROM advice_cache').all();
      const virtualEvidenceCache = this.db.prepare('SELECT * FROM virtual_evidence_cache').all();
      const itemQa = this.db.prepare('SELECT * FROM item_qa').all();

      const backupData = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          totalUsers: users.length,
          totalAssessments: assessmentData.length,
          totalCacheItems: adviceCache.length + virtualEvidenceCache.length,
          backupType: 'full' as const
        },
        data: {
          users,
          assessmentData,
          adviceCache,
          virtualEvidenceCache,
          itemQa
        }
      };

      // 파일로 저장
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      const fileSize = fs.statSync(backupPath).size;

      // 백업 레코드 저장
      const stmt = this.db.prepare(`
        INSERT INTO system_backups (backup_name, backup_type, file_path, file_size, created_by, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        backupName,
        'full',
        backupPath,
        fileSize,
        adminUserId,
        JSON.stringify(backupData.metadata)
      );

      // 로그 기록
      await this.logOperation({
        operationType: 'backup',
        targetType: 'system',
        performedBy: adminUserId,
        details: { backupName, backupType: 'full', fileSize },
        affectedRecords: users.length + assessmentData.length,
        status: 'success'
      });

      return backupPath;
    } catch (error) {
      await this.logOperation({
        operationType: 'backup',
        targetType: 'system',
        performedBy: adminUserId,
        details: { backupName, backupType: 'full' },
        affectedRecords: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // 선택적 백업 (특정 기간, 사용자 그룹)
  async createSelectiveBackup(
    adminUserId: number,
    criteria: {
      dateFrom?: string;
      dateTo?: string;
      userIds?: number[];
      assessmentTypes?: string[];
      includeCache?: boolean;
    }
  ): Promise<string> {
    if (!this.db || !fs) {
      throw new Error('Backup service not available in client environment');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `selective_backup_${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupName}.json`);

    try {
      let whereConditions: string[] = [];
      let params: any[] = [];

      // 날짜 조건
      if (criteria.dateFrom) {
        whereConditions.push('created_at >= ?');
        params.push(criteria.dateFrom);
      }
      if (criteria.dateTo) {
        whereConditions.push('created_at <= ?');
        params.push(criteria.dateTo);
      }

      // 사용자 조건
      if (criteria.userIds && criteria.userIds.length > 0) {
        whereConditions.push(`user_id IN (${criteria.userIds.map(() => '?').join(',')})`);
        params.push(...criteria.userIds);
      }

      // 평가 타입 조건
      if (criteria.assessmentTypes && criteria.assessmentTypes.length > 0) {
        whereConditions.push(`assessment_type IN (${criteria.assessmentTypes.map(() => '?').join(',')})`);
        params.push(...criteria.assessmentTypes);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 선택적 데이터 수집
      const users = criteria.userIds 
        ? this.db.prepare(`SELECT * FROM users WHERE id IN (${criteria.userIds.map(() => '?').join(',')})`).all(...criteria.userIds)
        : [];

      const assessmentData = this.db.prepare(`SELECT * FROM assessment_data ${whereClause}`).all(...params);
      
      const itemQa = this.db.prepare(`SELECT * FROM item_qa ${whereClause.replace('created_at', 'question_created_at')}`).all(...params);

      let adviceCache: any[] = [];
      let virtualEvidenceCache: any[] = [];
      
      if (criteria.includeCache) {
        adviceCache = this.db.prepare('SELECT * FROM advice_cache').all();
        virtualEvidenceCache = this.db.prepare('SELECT * FROM virtual_evidence_cache').all();
      }

      const backupData = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          totalUsers: users.length,
          totalAssessments: assessmentData.length,
          totalCacheItems: adviceCache.length + virtualEvidenceCache.length,
          backupType: 'selective' as const,
          selectionCriteria: criteria
        },
        data: {
          users,
          assessmentData,
          adviceCache,
          virtualEvidenceCache,
          itemQa
        }
      };

      // 파일로 저장
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      const fileSize = fs.statSync(backupPath).size;

      // 백업 레코드 저장
      const stmt = this.db.prepare(`
        INSERT INTO system_backups (backup_name, backup_type, file_path, file_size, created_by, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        backupName,
        'selective',
        backupPath,
        fileSize,
        adminUserId,
        JSON.stringify(backupData.metadata)
      );

      // 로그 기록
      await this.logOperation({
        operationType: 'backup',
        targetType: 'selective',
        performedBy: adminUserId,
        details: { backupName, criteria, fileSize },
        affectedRecords: assessmentData.length,
        status: 'success'
      });

      return backupPath;
    } catch (error) {
      await this.logOperation({
        operationType: 'backup',
        targetType: 'selective',
        performedBy: adminUserId,
        details: { backupName, criteria },
        affectedRecords: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // 전체 시스템 초기화 (백업 후 삭제)
  async resetFullSystem(adminUserId: number, createBackup: boolean = true): Promise<void> {
    if (!this.db) {
      throw new Error('Backup service not available in client environment');
    }
    
    let backupPath: string | null = null;

    try {
      // 백업 생성
      if (createBackup) {
        backupPath = await this.createFullBackup(adminUserId);
      }

      // 데이터 아카이브 (복구용)
      await this.archiveAllData(adminUserId);

      // 모든 데이터 삭제 (순서 중요 - 외래키 제약조건)
      const deleteCounts = {
        itemQa: this.db.prepare('DELETE FROM item_qa').run().changes,
        assessmentData: this.db.prepare('DELETE FROM assessment_data').run().changes,
        adviceCache: this.db.prepare('DELETE FROM advice_cache').run().changes,
        virtualEvidenceCache: this.db.prepare('DELETE FROM virtual_evidence_cache').run().changes,
        users: this.db.prepare('DELETE FROM users WHERE role != "admin"').run().changes // 관리자 계정 보존
      };

      const totalDeleted = Object.values(deleteCounts).reduce((sum, count) => sum + count, 0);

      // 로그 기록
      await this.logOperation({
        operationType: 'reset',
        targetType: 'system',
        performedBy: adminUserId,
        details: { 
          backupCreated: createBackup,
          backupPath,
          deleteCounts 
        },
        affectedRecords: totalDeleted,
        status: 'success'
      });

    } catch (error) {
      await this.logOperation({
        operationType: 'reset',
        targetType: 'system',
        performedBy: adminUserId,
        details: { backupCreated: createBackup, backupPath },
        affectedRecords: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // 선택적 삭제 (특정 기간, 사용자 그룹)
  async deleteSelective(
    adminUserId: number,
    criteria: {
      dateFrom?: string;
      dateTo?: string;
      userIds?: number[];
      assessmentTypes?: string[];
      deleteUsers?: boolean;
    },
    createBackup: boolean = true
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Backup service not available in client environment');
    }
    
    try {
      // 백업 생성
      if (createBackup) {
        await this.createSelectiveBackup(adminUserId, criteria);
      }

      let deleteCounts = { users: 0, assessmentData: 0, itemQa: 0 };

      // 평가 데이터 삭제
      if (criteria.userIds || criteria.dateFrom || criteria.dateTo || criteria.assessmentTypes) {
        let whereConditions: string[] = [];
        let params: any[] = [];

        if (criteria.dateFrom) {
          whereConditions.push('last_updated >= ?');
          params.push(criteria.dateFrom);
        }
        if (criteria.dateTo) {
          whereConditions.push('last_updated <= ?');
          params.push(criteria.dateTo);
        }
        if (criteria.userIds && criteria.userIds.length > 0) {
          whereConditions.push(`user_id IN (${criteria.userIds.map(() => '?').join(',')})`);
          params.push(...criteria.userIds);
        }
        if (criteria.assessmentTypes && criteria.assessmentTypes.length > 0) {
          whereConditions.push(`assessment_type IN (${criteria.assessmentTypes.map(() => '?').join(',')})`);
          params.push(...criteria.assessmentTypes);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // 데이터 아카이브 후 삭제
        await this.archiveDataBeforeDelete('assessment_data', whereClause, params, adminUserId);
        deleteCounts.assessmentData = this.db!.prepare(`DELETE FROM assessment_data ${whereClause}`).run(...params).changes;

        // Q&A 데이터도 삭제
        const qaWhereClause = whereClause.replace('last_updated', 'question_created_at').replace('user_id', 'question_user_id');
        await this.archiveDataBeforeDelete('item_qa', qaWhereClause, params, adminUserId);
        deleteCounts.itemQa = this.db!.prepare(`DELETE FROM item_qa ${qaWhereClause}`).run(...params).changes;
      }

      // 사용자 삭제 (선택적)
      if (criteria.deleteUsers && criteria.userIds && criteria.userIds.length > 0) {
        const userWhereClause = `WHERE id IN (${criteria.userIds.map(() => '?').join(',')}) AND role != 'admin'`;
        await this.archiveDataBeforeDelete('users', userWhereClause, criteria.userIds, adminUserId);
        deleteCounts.users = this.db!.prepare(`DELETE FROM users ${userWhereClause}`).run(...criteria.userIds).changes;
      }

      const totalDeleted = Object.values(deleteCounts).reduce((sum, count) => sum + count, 0);

      // 로그 기록
      await this.logOperation({
        operationType: 'delete',
        targetType: 'selective',
        performedBy: adminUserId,
        details: { 
          criteria,
          backupCreated: createBackup,
          deleteCounts 
        },
        affectedRecords: totalDeleted,
        status: 'success'
      });

    } catch (error) {
      await this.logOperation({
        operationType: 'delete',
        targetType: 'selective',
        performedBy: adminUserId,
        details: { criteria, backupCreated: createBackup },
        affectedRecords: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // 데이터 복구
  async restoreFromBackup(backupId: number, adminUserId: number): Promise<void> {
    if (!this.db || !fs) {
      throw new Error('Backup service not available in client environment');
    }
    
    try {
      // 백업 정보 조회
      const backup = this.db.prepare('SELECT * FROM system_backups WHERE id = ?').get(backupId) as any;
      if (!backup) {
        throw new Error('Backup not found');
      }

      // 백업 파일 읽기
      if (!fs.existsSync(backup.file_path)) {
        throw new Error('Backup file not found');
      }

      const backupData = JSON.parse(fs.readFileSync(backup.file_path, 'utf-8'));

      // 현재 데이터 백업 (복구 전)
      await this.createFullBackup(adminUserId);

      // 데이터 복원
      const transaction = this.db.transaction(() => {
        // 기존 데이터 삭제 (관리자 제외)
        this.db!.prepare('DELETE FROM item_qa').run();
        this.db!.prepare('DELETE FROM assessment_data').run();
        this.db!.prepare('DELETE FROM users WHERE role != "admin"').run();

        if (backup.backup_type === 'full' || backup.backup_type === 'selective') {
          // 사용자 복원
          if (backupData.data.users && backupData.data.users.length > 0) {
            const insertUser = this.db!.prepare(`
              INSERT OR REPLACE INTO users (id, email, password, name, role, status, phone, organization, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const user of backupData.data.users) {
              insertUser.run(
                user.id, user.email, user.password, user.name, user.role, user.status,
                user.phone, user.organization, user.created_at, user.updated_at
              );
            }
          }

          // 평가 데이터 복원
          if (backupData.data.assessmentData && backupData.data.assessmentData.length > 0) {
            const insertAssessment = this.db!.prepare(`
              INSERT OR REPLACE INTO assessment_data 
              (id, user_id, assessment_type, item_id, category, title, description, is_mandatory, evidence_required, met, partner_response, evidence_files, evaluation_data, last_updated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const assessment of backupData.data.assessmentData) {
              insertAssessment.run(
                assessment.id, assessment.user_id, assessment.assessment_type, assessment.item_id,
                assessment.category, assessment.title, assessment.description, assessment.is_mandatory,
                assessment.evidence_required, assessment.met, assessment.partner_response,
                assessment.evidence_files, assessment.evaluation_data, assessment.last_updated
              );
            }
          }

          // 캐시 데이터 복원
          if (backupData.data.adviceCache && backupData.data.adviceCache.length > 0) {
            this.db!.prepare('DELETE FROM advice_cache').run();
            const insertAdvice = this.db!.prepare(`
              INSERT OR REPLACE INTO advice_cache (id, item_id, language, advice_content, created_at)
              VALUES (?, ?, ?, ?, ?)
            `);
            
            for (const advice of backupData.data.adviceCache) {
              insertAdvice.run(advice.id, advice.item_id, advice.language, advice.advice_content, advice.created_at);
            }
          }

          if (backupData.data.virtualEvidenceCache && backupData.data.virtualEvidenceCache.length > 0) {
            this.db!.prepare('DELETE FROM virtual_evidence_cache').run();
            const insertVirtualEvidence = this.db!.prepare(`
              INSERT OR REPLACE INTO virtual_evidence_cache (id, item_id, language, virtual_evidence_content, created_at)
              VALUES (?, ?, ?, ?, ?)
            `);
            
            for (const evidence of backupData.data.virtualEvidenceCache) {
              insertVirtualEvidence.run(evidence.id, evidence.item_id, evidence.language, evidence.virtual_evidence_content, evidence.created_at);
            }
          }

          // Q&A 데이터 복원
          if (backupData.data.itemQa && backupData.data.itemQa.length > 0) {
            const insertQa = this.db!.prepare(`
              INSERT OR REPLACE INTO item_qa 
              (id, item_id, assessment_type, question, answer, question_user_id, answer_user_id, question_created_at, answer_created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            for (const qa of backupData.data.itemQa) {
              insertQa.run(
                qa.id, qa.item_id, qa.assessment_type, qa.question, qa.answer,
                qa.question_user_id, qa.answer_user_id, qa.question_created_at, qa.answer_created_at
              );
            }
          }
        }
      });

      transaction();

      // 로그 기록
      await this.logOperation({
        operationType: 'restore',
        targetType: 'system',
        performedBy: adminUserId,
        details: { 
          backupId,
          backupName: backup.backup_name,
          backupType: backup.backup_type,
          restoredRecords: {
            users: backupData.data.users?.length || 0,
            assessmentData: backupData.data.assessmentData?.length || 0,
            adviceCache: backupData.data.adviceCache?.length || 0,
            virtualEvidenceCache: backupData.data.virtualEvidenceCache?.length || 0,
            itemQa: backupData.data.itemQa?.length || 0
          }
        },
        affectedRecords: (backupData.data.users?.length || 0) + (backupData.data.assessmentData?.length || 0),
        status: 'success'
      });

    } catch (error) {
      await this.logOperation({
        operationType: 'restore',
        targetType: 'system',
        performedBy: adminUserId,
        details: { backupId },
        affectedRecords: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // 삭제된 데이터 아카이브 (복구용)
  private async archiveAllData(adminUserId: number): Promise<void> {
    if (!this.db) return;
    
    const tables = ['users', 'assessment_data', 'item_qa'];
    
    for (const table of tables) {
      const data = this.db.prepare(`SELECT * FROM ${table}`).all() as any[];
      
      for (const row of data) {
        await this.archiveDeletedData({
          originalTable: table,
          originalId: row.id.toString(),
          dataContent: row,
          deletedBy: adminUserId,
          restoreDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후 만료
        });
      }
    }
  }

  // 특정 데이터 삭제 전 아카이브
  private async archiveDataBeforeDelete(table: string, whereClause: string, params: any[], adminUserId: number): Promise<void> {
    if (!this.db) return;
    
    const data = this.db.prepare(`SELECT * FROM ${table} ${whereClause}`).all(...params) as any[];
    
    for (const row of data) {
      await this.archiveDeletedData({
        originalTable: table,
        originalId: row.id.toString(),
        dataContent: row,
        deletedBy: adminUserId,
        restoreDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }

  // 삭제된 데이터 아카이브 저장
  private async archiveDeletedData(archive: Omit<DeletedDataArchive, 'id' | 'deletedAt'>): Promise<void> {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO deleted_data_archive (original_table, original_id, data_content, deleted_by, restore_deadline)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      archive.originalTable,
      archive.originalId,
      JSON.stringify(archive.dataContent),
      archive.deletedBy,
      archive.restoreDeadline
    );
  }

  // 로그 기록
  async logOperation(log: Omit<SystemLog, 'id' | 'createdAt'>): Promise<void> {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO system_logs (operation_type, target_type, target_id, performed_by, details, affected_records, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      log.operationType,
      log.targetType,
      log.targetId || null,
      log.performedBy,
      JSON.stringify(log.details),
      log.affectedRecords,
      log.status,
      log.errorMessage || null
    );
  }

  // 백업 목록 조회
  getBackups(): any[] {
    if (!this.db) return [];
    
    return this.db.prepare(`
      SELECT b.*, u.name as created_by_name 
      FROM system_backups b 
      JOIN users u ON b.created_by = u.id 
      ORDER BY b.created_at DESC
    `).all();
  }

  // 시스템 로그 조회
  getSystemLogs(limit: number = 100): any[] {
    if (!this.db) return [];
    
    return this.db.prepare(`
      SELECT l.*, u.name as performed_by_name 
      FROM system_logs l 
      JOIN users u ON l.performed_by = u.id 
      ORDER BY l.created_at DESC 
      LIMIT ?
    `).all(limit);
  }

  // 삭제된 데이터 아카이브 조회 (복구 가능한 것들)
  getRecoverableData(): any[] {
    if (!this.db) return [];
    
    return this.db.prepare(`
      SELECT a.*, u.name as deleted_by_name 
      FROM deleted_data_archive a 
      JOIN users u ON a.deleted_by = u.id 
      WHERE a.restored_at IS NULL AND a.restore_deadline > datetime('now')
      ORDER BY a.deleted_at DESC
    `).all();
  }

  // 데이터베이스 연결 종료
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// 싱글톤 인스턴스
let backupServiceInstance: BackupService | null = null;

export function getBackupService(): BackupService {
  if (!backupServiceInstance) {
    backupServiceInstance = new BackupService();
  }
  return backupServiceInstance;
}