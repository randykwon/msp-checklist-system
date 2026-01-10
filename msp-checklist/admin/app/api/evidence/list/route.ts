import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// 증빙 파일 저장 경로 (메인 앱과 동일한 로직)
function getEvidenceBasePath(): string {
  // 환경변수 확인
  if (process.env.EVIDENCE_STORAGE_PATH) {
    return process.env.EVIDENCE_STORAGE_PATH;
  }
  
  // 로컬 개발 환경인지 확인
  const ec2Path = '/opt/msp-checklist-system/evidence-files';
  
  try {
    if (fs.existsSync('/opt/msp-checklist-system') || process.env.NODE_ENV === 'production') {
      return ec2Path;
    }
  } catch {
    // 접근 권한이 없으면 로컬 경로 사용
  }
  
  // 로컬 개발 환경: msp-checklist 디렉토리 내 evidence-files
  return path.join(process.cwd(), '..', 'evidence-files');
}

interface EvidenceFileInfo {
  id: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  itemId: string;
  assessmentType: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  localPath: string;
  s3Key?: string;
  s3Uploaded: boolean;
  uploadedAt: string;
  evaluation?: {
    score: number;
    feedback: string;
    evaluatedAt: string;
    llmProvider?: string;
    llmModel?: string;
  };
}

// 사용자 정보 조회
function getUserInfo(userId: number): { name?: string; email?: string } {
  try {
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    if (!fs.existsSync(dbPath)) {
      // Admin 디렉토리에서 실행 시 상위 디렉토리 확인
      const parentDbPath = path.join(process.cwd(), '..', 'msp-assessment.db');
      if (fs.existsSync(parentDbPath)) {
        const db = new Database(parentDbPath, { readonly: true });
        const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as any;
        db.close();
        return user || {};
      }
      return {};
    }
    const db = new Database(dbPath, { readonly: true });
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as any;
    db.close();
    return user || {};
  } catch (error) {
    console.error('Failed to get user info:', error);
    return {};
  }
}

// 평가 결과 조회
function getEvaluation(fileId: string): EvidenceFileInfo['evaluation'] | undefined {
  try {
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    const actualPath = fs.existsSync(dbPath) ? dbPath : path.join(process.cwd(), '..', 'msp-assessment.db');
    
    if (!fs.existsSync(actualPath)) return undefined;
    
    const db = new Database(actualPath, { readonly: true });
    
    // evidence_evaluations 테이블이 있는지 확인
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='evidence_evaluations'
    `).get();
    
    if (!tableExists) {
      db.close();
      return undefined;
    }
    
    const evaluation = db.prepare(`
      SELECT score, feedback, evaluated_at, llm_provider, llm_model 
      FROM evidence_evaluations 
      WHERE file_id = ?
    `).get(fileId) as any;
    
    db.close();
    
    if (evaluation) {
      return {
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluatedAt: evaluation.evaluated_at,
        llmProvider: evaluation.llm_provider,
        llmModel: evaluation.llm_model
      };
    }
    return undefined;
  } catch (error) {
    console.error('Failed to get evaluation:', error);
    return undefined;
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
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const files: EvidenceFileInfo[] = [];
    const baseDir = getEvidenceBasePath();
    const pendingDir = path.join(baseDir, 'pending');
    const uploadedDir = path.join(baseDir, 'uploaded');

    // 디렉토리 순회 함수
    const walkDir = (dir: string, isUploaded: boolean) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath, isUploaded);
        } else if (item.endsWith('.meta.json')) {
          try {
            const meta = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as EvidenceFileInfo;
            const userInfo = getUserInfo(meta.userId);
            const evaluation = getEvaluation(meta.id);
            
            files.push({
              ...meta,
              userName: userInfo.name,
              userEmail: userInfo.email,
              s3Uploaded: isUploaded,
              evaluation
            });
          } catch (e) {
            console.error('Failed to read meta file:', fullPath, e);
          }
        }
      }
    };

    walkDir(pendingDir, false);
    walkDir(uploadedDir, true);

    // 최신순 정렬
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing evidence files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
