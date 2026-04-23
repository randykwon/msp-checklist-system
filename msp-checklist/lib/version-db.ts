import Database from 'better-sqlite3';
import path from 'path';
import db from './db';

// Version management database functions

export interface ChecklistVersion {
  id: number;
  userId: number;
  versionName: string;
  description?: string;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  metadata?: string;
}

export interface VersionAssessmentData {
  id: number;
  versionId: number;
  assessmentType: 'prerequisites' | 'technical';
  itemId: string;
  category: string;
  title: string;
  description: string;
  isMandatory: boolean;
  evidenceRequired: string;
  met: string | null;
  partnerResponse: string;
  evidenceFiles: string | null;
  evaluationData: string | null;
  lastUpdated: string;
}

export interface VersionTemplate {
  id: number;
  templateName: string;
  description?: string;
  templateData: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isSystemTemplate: boolean;
}

export interface VersionBackup {
  id: number;
  userId: number;
  backupName: string;
  backupType: 'single_version' | 'all_versions' | 'selective';
  filePath: string;
  fileSize: number;
  versionCount: number;
  createdAt: string;
  metadata?: string;
}

// Initialize version management schema
export function initializeVersionSchema() {
  console.log('Initializing version schema...');
  
  // Checklist versions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      version_name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT 0,
      is_template BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(user_id, version_name)
    )
  `);
  console.log('Created checklist_versions table');

  // Version-specific assessment data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS version_assessment_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id INTEGER NOT NULL,
      assessment_type TEXT NOT NULL CHECK(assessment_type IN ('prerequisites', 'technical')),
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_mandatory BOOLEAN NOT NULL,
      evidence_required TEXT NOT NULL,
      met TEXT CHECK(met IN ('true', 'false', 'null')),
      partner_response TEXT,
      evidence_files TEXT,
      evaluation_data TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (version_id) REFERENCES checklist_versions(id) ON DELETE CASCADE,
      UNIQUE(version_id, assessment_type, item_id)
    )
  `);

  // Version templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS version_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_name TEXT NOT NULL UNIQUE,
      description TEXT,
      template_data TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_system_template BOOLEAN NOT NULL DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Version backups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS version_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      backup_name TEXT NOT NULL,
      backup_type TEXT NOT NULL CHECK(backup_type IN ('single_version', 'all_versions', 'selective')),
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      version_count INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Add version_id column to existing assessment_data table if it doesn't exist
  try {
    db.exec(`ALTER TABLE assessment_data ADD COLUMN version_id INTEGER`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_assessment_version ON assessment_data(version_id)`);
  } catch (e) {
    // Column already exists
  }

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_checklist_versions_user_active
    ON checklist_versions(user_id, is_active)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_version_assessment_data_version_type
    ON version_assessment_data(version_id, assessment_type)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_version_backups_user
    ON version_backups(user_id, created_at DESC)
  `);
}

// Version CRUD operations
export function createVersion(
  userId: number,
  versionName: string,
  description?: string,
  createdBy?: number
): ChecklistVersion {
  const stmt = db.prepare(`
    INSERT INTO checklist_versions (user_id, version_name, description, created_by)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(userId, versionName, description || null, createdBy || userId);
  
  return getVersion(Number(result.lastInsertRowid))!;
}

export function getVersion(versionId: number): ChecklistVersion | null {
  console.log('getVersion called with ID:', versionId, 'type:', typeof versionId);
  
  // Validate input
  if (!versionId || isNaN(versionId) || versionId <= 0) {
    console.log('Invalid version ID provided:', versionId);
    return null;
  }
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM checklist_versions WHERE id = ?
    `);
    
    const row = stmt.get(versionId) as any;
    console.log('Database query result:', row);
    
    if (!row) {
      console.log('No version found for ID:', versionId);
      return null;
    }
    
    const version = {
      id: row.id,
      userId: row.user_id,
      versionName: row.version_name,
      description: row.description,
      isActive: row.is_active === 1,
      isTemplate: row.is_template === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      metadata: row.metadata
    };
    
    console.log('Returning version:', version);
    return version;
  } catch (error) {
    console.error('Error in getVersion:', error);
    return null;
  }
}

export function getVersions(userId: number, includeInactive: boolean = true): ChecklistVersion[] {
  console.log('getVersions called for user:', userId, 'includeInactive:', includeInactive);
  
  const whereClause = includeInactive ? 
    'WHERE user_id = ?' : 
    'WHERE user_id = ? AND is_active = 1';
    
  const stmt = db.prepare(`
    SELECT * FROM checklist_versions 
    ${whereClause}
    ORDER BY is_active DESC, updated_at DESC
  `);
  
  const rows = stmt.all(userId) as any[];
  console.log('Raw database rows:', rows.length);
  
  const versions = rows.map(row => {
    console.log('Mapping database row:', row);
    const version = {
      id: row.id,
      userId: row.user_id,
      versionName: row.version_name,
      description: row.description,
      isActive: row.is_active === 1,
      isTemplate: row.is_template === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      metadata: row.metadata
    };
    console.log('Mapped version:', version, 'ID type:', typeof version.id);
    return version;
  });
  
  console.log('Mapped versions:', versions);
  return versions;
}

export function getActiveVersion(userId: number): ChecklistVersion | null {
  const stmt = db.prepare(`
    SELECT * FROM checklist_versions 
    WHERE user_id = ? AND is_active = 1
    LIMIT 1
  `);
  
  const row = stmt.get(userId) as any;
  if (!row) return null;
  
  return {
    id: row.id,
    userId: row.user_id,
    versionName: row.version_name,
    description: row.description,
    isActive: row.is_active === 1,
    isTemplate: row.is_template === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    metadata: row.metadata
  };
}

export function updateVersion(
  versionId: number,
  updates: {
    versionName?: string;
    description?: string;
    isActive?: boolean;
    metadata?: string;
  }
): void {
  const fields = [];
  const values = [];
  
  if (updates.versionName !== undefined) {
    fields.push('version_name = ?');
    values.push(updates.versionName);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.metadata !== undefined) {
    fields.push('metadata = ?');
    values.push(updates.metadata);
  }
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = datetime("now")');
  values.push(versionId);
  
  const stmt = db.prepare(`
    UPDATE checklist_versions 
    SET ${fields.join(', ')} 
    WHERE id = ?
  `);
  
  stmt.run(...values);
}

export function deleteVersion(versionId: number): void {
  // First delete associated assessment data
  const deleteAssessmentStmt = db.prepare('DELETE FROM version_assessment_data WHERE version_id = ?');
  deleteAssessmentStmt.run(versionId);
  
  // Then delete the version
  const deleteVersionStmt = db.prepare('DELETE FROM checklist_versions WHERE id = ?');
  deleteVersionStmt.run(versionId);
}

export function activateVersion(userId: number, versionId: number): void {
  console.log('activateVersion called with userId:', userId, 'versionId:', versionId);
  
  // Validate inputs
  if (!userId || !versionId || isNaN(userId) || isNaN(versionId) || userId <= 0 || versionId <= 0) {
    throw new Error(`Invalid parameters: userId=${userId}, versionId=${versionId}`);
  }
  
  // Check if version exists and belongs to user
  const version = getVersion(versionId);
  if (!version) {
    throw new Error(`Version ${versionId} not found`);
  }
  
  if (version.userId !== userId) {
    throw new Error(`Version ${versionId} does not belong to user ${userId}`);
  }
  
  const transaction = db.transaction(() => {
    // Deactivate all versions for the user
    const deactivateStmt = db.prepare(`
      UPDATE checklist_versions 
      SET is_active = 0, updated_at = datetime('now')
      WHERE user_id = ?
    `);
    const deactivateResult = deactivateStmt.run(userId);
    console.log('Deactivated versions for user:', userId, 'affected rows:', deactivateResult.changes);
    
    // Activate the specified version
    const activateStmt = db.prepare(`
      UPDATE checklist_versions 
      SET is_active = 1, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    const activateResult = activateStmt.run(versionId, userId);
    console.log('Activated version:', versionId, 'affected rows:', activateResult.changes);
    
    if (activateResult.changes === 0) {
      throw new Error(`Failed to activate version ${versionId} - no rows affected`);
    }
  });
  
  try {
    transaction();
    console.log('Transaction completed successfully');
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

// Version assessment data operations
export function saveVersionAssessmentItem(
  versionId: number,
  assessmentType: 'prerequisites' | 'technical',
  item: any
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO version_assessment_data
    (version_id, assessment_type, item_id, category, title, description, is_mandatory,
     evidence_required, met, partner_response, evidence_files, evaluation_data, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const metValue = item.met === null ? 'null' : item.met ? 'true' : 'false';
  const evidenceFilesJson = item.evidenceFiles ? JSON.stringify(item.evidenceFiles) : null;
  const evaluationDataJson = item.evaluation ? JSON.stringify(item.evaluation) : null;

  stmt.run(
    versionId,
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

export function getVersionAssessmentData(
  versionId: number,
  assessmentType: 'prerequisites' | 'technical'
): any[] {
  const stmt = db.prepare(`
    SELECT * FROM version_assessment_data
    WHERE version_id = ? AND assessment_type = ?
    ORDER BY category, item_id
  `);

  const rows = stmt.all(versionId, assessmentType) as any[];

  return rows.map(row => {
    let evidenceFiles = undefined;
    let evaluation = undefined;

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

export function deleteVersionAssessmentData(versionId: number, assessmentType?: 'prerequisites' | 'technical'): void {
  if (assessmentType) {
    const stmt = db.prepare('DELETE FROM version_assessment_data WHERE version_id = ? AND assessment_type = ?');
    stmt.run(versionId, assessmentType);
  } else {
    const stmt = db.prepare('DELETE FROM version_assessment_data WHERE version_id = ?');
    stmt.run(versionId);
  }
}

// Data migration functions
export function migrateExistingUserData(userId: number): ChecklistVersion | null {
  console.log('migrateExistingUserData called for user:', userId);
  
  // Check if user already has versions
  const existingVersions = getVersions(userId);
  if (existingVersions.length > 0) {
    console.log('User already has versions:', existingVersions.length);
    return existingVersions.find(v => v.isActive) || existingVersions[0];
  }

  console.log('Creating default version for user:', userId);
  
  // Create default version
  const defaultVersion = createVersion(userId, 'Default Profile', 'Migrated from existing data');
  console.log('Created default version:', defaultVersion);
  
  // Migrate existing assessment data
  const transaction = db.transaction(() => {
    // Get existing assessment data
    const getExistingStmt = db.prepare(`
      SELECT * FROM assessment_data WHERE user_id = ?
    `);
    const existingData = getExistingStmt.all(userId) as any[];
    console.log('Found existing assessment data:', existingData.length, 'items');
    
    // Copy to version-specific table
    for (const item of existingData) {
      const insertStmt = db.prepare(`
        INSERT INTO version_assessment_data
        (version_id, assessment_type, item_id, category, title, description, is_mandatory,
         evidence_required, met, partner_response, evidence_files, evaluation_data, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        defaultVersion.id,
        item.assessment_type,
        item.item_id,
        item.category,
        item.title,
        item.description,
        item.is_mandatory,
        item.evidence_required,
        item.met,
        item.partner_response,
        item.evidence_files,
        item.evaluation_data,
        item.last_updated
      );
    }
    
    // Update existing assessment_data with version reference
    const updateStmt = db.prepare(`
      UPDATE assessment_data SET version_id = ? WHERE user_id = ?
    `);
    updateStmt.run(defaultVersion.id, userId);
    
    console.log('Migration completed, migrated', existingData.length, 'items');
  });
  
  transaction();
  
  // Activate the default version
  activateVersion(userId, defaultVersion.id);
  console.log('Activated default version');
  
  return defaultVersion;
}

export function duplicateVersion(sourceVersionId: number, newName: string, userId: number): ChecklistVersion {
  const sourceVersion = getVersion(sourceVersionId);
  if (!sourceVersion) {
    throw new Error('Source version not found');
  }
  
  // Create new version
  const newVersion = createVersion(userId, newName, `Duplicated from ${sourceVersion.versionName}`);
  
  // Copy assessment data
  const transaction = db.transaction(() => {
    const copyStmt = db.prepare(`
      INSERT INTO version_assessment_data
      (version_id, assessment_type, item_id, category, title, description, is_mandatory,
       evidence_required, met, partner_response, evidence_files, evaluation_data, last_updated)
      SELECT ?, assessment_type, item_id, category, title, description, is_mandatory,
             evidence_required, met, partner_response, evidence_files, evaluation_data, datetime('now')
      FROM version_assessment_data
      WHERE version_id = ?
    `);
    
    copyStmt.run(newVersion.id, sourceVersionId);
  });
  
  transaction();
  
  return newVersion;
}

// Initialize the version schema when this module is loaded
initializeVersionSchema();

export default db;