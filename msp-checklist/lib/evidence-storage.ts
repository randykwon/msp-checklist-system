/**
 * 증빙 자료 파일 저장 관리
 * - EC2 로컬 폴더에 파일 저장
 * - S3 업로드 상태 추적
 */

import fs from 'fs';
import path from 'path';

// 저장 경로 설정
const EVIDENCE_BASE_DIR = process.env.EVIDENCE_STORAGE_PATH || '/opt/msp-checklist-system/evidence-files';
const PENDING_DIR = path.join(EVIDENCE_BASE_DIR, 'pending'); // S3 업로드 대기
const UPLOADED_DIR = path.join(EVIDENCE_BASE_DIR, 'uploaded'); // S3 업로드 완료

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
export function initStorageDirectories(): void {
  try {
    if (!fs.existsSync(EVIDENCE_BASE_DIR)) {
      fs.mkdirSync(EVIDENCE_BASE_DIR, { recursive: true });
    }
    if (!fs.existsSync(PENDING_DIR)) {
      fs.mkdirSync(PENDING_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADED_DIR)) {
      fs.mkdirSync(UPLOADED_DIR, { recursive: true });
    }
    console.log('Evidence storage directories initialized:', EVIDENCE_BASE_DIR);
  } catch (error) {
    console.error('Failed to initialize storage directories:', error);
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
    initStorageDirectories();
    
    // 사용자별 디렉토리 생성
    const userDir = path.join(PENDING_DIR, `user_${userId}`, assessmentType);
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
    const fileName = path.basename(filePath);
    const relativePath = path.relative(PENDING_DIR, path.dirname(filePath));
    const uploadedPath = path.join(UPLOADED_DIR, relativePath);
    
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
  
  try {
    if (!fs.existsSync(PENDING_DIR)) {
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
    
    walkDir(PENDING_DIR);
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
  
  countDir(PENDING_DIR, false);
  countDir(UPLOADED_DIR, true);
  
  return { pendingCount, pendingSize, uploadedCount, uploadedSize };
}

export { EVIDENCE_BASE_DIR, PENDING_DIR, UPLOADED_DIR };
