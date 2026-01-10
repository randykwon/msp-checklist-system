/**
 * 증빙 자료 파일 저장 관리
 * - EC2 로컬 폴더에 파일 저장
 * - S3 업로드 상태 추적
 * - DB에서 설정 읽기
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// DB에서 설정 읽기
function getSettingFromDB(key: string): string | null {
  try {
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    if (!fs.existsSync(dbPath)) {
      return null;
    }
    const db = new Database(dbPath, { readonly: true });
    const stmt = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?');
    const row = stmt.get(key) as { setting_value: string } | undefined;
    db.close();
    return row?.setting_value || null;
  } catch (error) {
    console.error('Failed to read setting from DB:', error);
    return null;
  }
}

// 저장 경로 설정 (DB 우선, 환경변수, 기본값 순)
function getStoragePath(): string {
  const dbPath = getSettingFromDB('evidenceStoragePath');
  if (dbPath && dbPath.trim()) return dbPath;
  
  // 환경변수 확인
  if (process.env.EVIDENCE_STORAGE_PATH) {
    return process.env.EVIDENCE_STORAGE_PATH;
  }
  
  // 로컬 개발 환경인지 확인 (EC2 경로가 존재하지 않으면 로컬로 판단)
  const ec2Path = '/opt/msp-checklist-system/evidence-files';
  const localPath = path.join(process.cwd(), 'evidence-files');
  
  // EC2 경로의 상위 디렉토리가 존재하는지 확인
  try {
    if (fs.existsSync('/opt/msp-checklist-system') || process.env.NODE_ENV === 'production') {
      return ec2Path;
    }
  } catch {
    // 접근 권한이 없으면 로컬 경로 사용
  }
  
  return localPath;
}

function getS3Bucket(): string {
  const dbBucket = getSettingFromDB('evidenceS3Bucket');
  if (dbBucket && dbBucket.trim()) return dbBucket;
  return process.env.EVIDENCE_S3_BUCKET || '';
}

function getS3Prefix(): string {
  const dbPrefix = getSettingFromDB('evidenceS3Prefix');
  if (dbPrefix && dbPrefix.trim()) return dbPrefix;
  return process.env.EVIDENCE_S3_PREFIX || 'evidence/';
}

// 동적으로 경로 가져오기
export function getEvidenceBasePath(): string {
  return getStoragePath();
}

export function getPendingPath(): string {
  return path.join(getStoragePath(), 'pending');
}

export function getUploadedPath(): string {
  return path.join(getStoragePath(), 'uploaded');
}

export function getEvidenceS3Bucket(): string {
  return getS3Bucket();
}

export function getEvidenceS3Prefix(): string {
  return getS3Prefix();
}


export interface EvidenceFileInfo {
  id: string;
  userId: number;
  itemId: string;
  assessmentType: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  localPath: string;
  s3Key?: string;
  s3Uploaded: boolean;
  uploadedAt: string;
}

/**
 * 저장 디렉토리 초기화
 */
export function initStorageDirectories(): boolean {
  try {
    const baseDir = getEvidenceBasePath();
    const pendingDir = getPendingPath();
    const uploadedDir = getUploadedPath();
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(pendingDir)) {
      fs.mkdirSync(pendingDir, { recursive: true });
    }
    if (!fs.existsSync(uploadedDir)) {
      fs.mkdirSync(uploadedDir, { recursive: true });
    }
    console.log('Evidence storage directories initialized:', baseDir);
    return true;
  } catch (error) {
    console.error('Failed to initialize storage directories:', error);
    // 로컬 폴백 시도
    try {
      const fallbackDir = path.join(process.cwd(), 'evidence-files');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      if (!fs.existsSync(path.join(fallbackDir, 'pending'))) {
        fs.mkdirSync(path.join(fallbackDir, 'pending'), { recursive: true });
      }
      if (!fs.existsSync(path.join(fallbackDir, 'uploaded'))) {
        fs.mkdirSync(path.join(fallbackDir, 'uploaded'), { recursive: true });
      }
      console.log('Evidence storage fallback to local:', fallbackDir);
      return true;
    } catch (fallbackError) {
      console.error('Failed to initialize fallback storage:', fallbackError);
      return false;
    }
  }
}

/**
 * Base64 데이터를 파일로 저장
 */
export function saveEvidenceFile(
  userId: number,
  itemId: string,
  assessmentType: string,
  fileId: string,
  fileName: string,
  fileType: 'image' | 'pdf',
  base64Data: string
): EvidenceFileInfo | null {
  try {
    const initialized = initStorageDirectories();
    if (!initialized) {
      console.error('Failed to initialize storage directories');
      return null;
    }
    
    const pendingDir = getPendingPath();
    
    // 사용자별 디렉토리 생성
    const userDir = path.join(pendingDir, `user_${userId}`, assessmentType);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // 파일명 생성 (itemId_fileId_originalName)
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${itemId}_${fileId}_${safeFileName}`;
    const filePath = path.join(userDir, storedFileName);
    
    // Base64 데이터에서 실제 데이터 추출
    const base64Content = base64Data.split(',')[1] || base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    
    // 파일 저장
    fs.writeFileSync(filePath, buffer);
    
    const fileInfo: EvidenceFileInfo = {
      id: fileId,
      userId,
      itemId,
      assessmentType,
      fileName,
      fileType,
      fileSize: buffer.length,
      localPath: filePath,
      s3Uploaded: false,
      uploadedAt: new Date().toISOString()
    };
    
    // 메타데이터 파일 저장
    const metaPath = filePath + '.meta.json';
    fs.writeFileSync(metaPath, JSON.stringify(fileInfo, null, 2));
    
    console.log(`Evidence file saved: ${filePath} (${buffer.length} bytes)`);
    return fileInfo;
    
  } catch (error) {
    console.error('Failed to save evidence file:', error);
    return null;
  }
}

/**
 * 저장된 파일 삭제
 */
export function deleteEvidenceFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      // 메타데이터 파일도 삭제
      const metaPath = filePath + '.meta.json';
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
      console.log(`Evidence file deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete evidence file:', error);
    return false;
  }
}

/**
 * 파일을 uploaded 폴더로 이동 (S3 업로드 완료 후)
 */
export function markAsUploaded(filePath: string, s3Key: string): boolean {
  try {
    const pendingDir = getPendingPath();
    const uploadedDir = getUploadedPath();
    
    const fileName = path.basename(filePath);
    const relativePath = path.relative(pendingDir, path.dirname(filePath));
    const uploadedPath = path.join(uploadedDir, relativePath);
    
    if (!fs.existsSync(uploadedPath)) {
      fs.mkdirSync(uploadedPath, { recursive: true });
    }
    
    const newFilePath = path.join(uploadedPath, fileName);
    fs.renameSync(filePath, newFilePath);
    
    // 메타데이터 업데이트
    const metaPath = filePath + '.meta.json';
    const newMetaPath = newFilePath + '.meta.json';
    
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      meta.s3Uploaded = true;
      meta.s3Key = s3Key;
      meta.s3UploadedAt = new Date().toISOString();
      fs.writeFileSync(newMetaPath, JSON.stringify(meta, null, 2));
      fs.unlinkSync(metaPath);
    }
    
    console.log(`Evidence file marked as uploaded: ${newFilePath}`);
    return true;
  } catch (error) {
    console.error('Failed to mark file as uploaded:', error);
    return false;
  }
}

/**
 * 업로드 대기 중인 파일 목록 조회
 */
export function getPendingFiles(): EvidenceFileInfo[] {
  const files: EvidenceFileInfo[] = [];
  const pendingDir = getPendingPath();
  
  try {
    if (!fs.existsSync(pendingDir)) {
      return files;
    }
    
    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item.endsWith('.meta.json')) {
          try {
            const meta = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            if (!meta.s3Uploaded) {
              files.push(meta);
            }
          } catch (e) {
            console.error('Failed to read meta file:', fullPath, e);
          }
        }
      }
    };
    
    walkDir(pendingDir);
  } catch (error) {
    console.error('Failed to get pending files:', error);
  }
  
  return files;
}

/**
 * 저장소 통계 조회
 */
export function getStorageStats(): {
  pendingCount: number;
  pendingSize: number;
  uploadedCount: number;
  uploadedSize: number;
} {
  let pendingCount = 0, pendingSize = 0;
  let uploadedCount = 0, uploadedSize = 0;
  
  const pendingDir = getPendingPath();
  const uploadedDir = getUploadedPath();
  
  const countDir = (dir: string, isUploaded: boolean) => {
    if (!fs.existsSync(dir)) return;
    
    const walkDir = (d: string) => {
      const items = fs.readdirSync(d);
      for (const item of items) {
        const fullPath = path.join(d, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (!item.endsWith('.meta.json')) {
          if (isUploaded) {
            uploadedCount++;
            uploadedSize += stat.size;
          } else {
            pendingCount++;
            pendingSize += stat.size;
          }
        }
      }
    };
    
    walkDir(dir);
  };
  
  countDir(pendingDir, false);
  countDir(uploadedDir, true);
  
  return { pendingCount, pendingSize, uploadedCount, uploadedSize };
}
