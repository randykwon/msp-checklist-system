import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// 증빙 파일 저장 경로
function getEvidenceBasePath(): string {
  if (process.env.EVIDENCE_STORAGE_PATH) {
    return process.env.EVIDENCE_STORAGE_PATH;
  }
  
  const ec2Path = '/opt/msp-checklist-system/evidence-files';
  
  try {
    if (fs.existsSync('/opt/msp-checklist-system') || process.env.NODE_ENV === 'production') {
      return ec2Path;
    }
  } catch {}
  
  return path.join(process.cwd(), '..', 'evidence-files');
}

// 평가 결과 저장 테이블 생성
function ensureEvaluationTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS evidence_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT UNIQUE NOT NULL,
      item_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      feedback TEXT NOT NULL,
      llm_provider TEXT,
      llm_model TEXT,
      evaluated_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// 메인 앱의 LLM 서비스 호출 (프록시)
async function callMainAppEvaluate(
  fileId: string,
  itemId: string,
  llmConfig: { provider: string; model: string }
): Promise<{ score: number; feedback: string }> {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
  
  // 파일 메타데이터 읽기
  const baseDir = getEvidenceBasePath();
  let metaPath = '';
  let fileData: any = null;
  
  // pending과 uploaded 디렉토리에서 파일 찾기
  const searchDirs = [
    path.join(baseDir, 'pending'),
    path.join(baseDir, 'uploaded')
  ];
  
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const walkDir = (d: string): boolean => {
      const items = fs.readdirSync(d);
      for (const item of items) {
        const fullPath = path.join(d, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (walkDir(fullPath)) return true;
        } else if (item.endsWith('.meta.json')) {
          try {
            const meta = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            if (meta.id === fileId) {
              metaPath = fullPath;
              fileData = meta;
              return true;
            }
          } catch {}
        }
      }
      return false;
    };
    
    if (walkDir(dir)) break;
  }
  
  if (!fileData) {
    throw new Error('파일을 찾을 수 없습니다');
  }
  
  // 실제 파일 읽기
  const filePath = fileData.localPath;
  if (!fs.existsSync(filePath)) {
    throw new Error('파일이 존재하지 않습니다');
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  const mimeType = fileData.fileType === 'pdf' ? 'application/pdf' : 'image/png';
  
  // 메인 앱의 평가 API 호출
  const response = await fetch(`${mainAppUrl}/api/evaluate-evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId,
      title: fileData.itemId,
      description: '',
      evidenceRequired: '',
      advice: '',
      files: [{
        id: fileId,
        name: fileData.fileName,
        type: fileData.fileType,
        data: `data:${mimeType};base64,${base64Data}`
      }],
      language: 'ko',
      llmConfig
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '평가 API 호출 실패');
  }
  
  const result = await response.json();
  return {
    score: result.evaluation?.score || 0,
    feedback: result.evaluation?.feedback || '평가 결과를 가져올 수 없습니다.'
  };
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileId, itemId, llmConfig } = body;

    if (!fileId || !itemId) {
      return NextResponse.json({ error: 'fileId and itemId are required' }, { status: 400 });
    }

    // LLM 평가 호출
    const evaluation = await callMainAppEvaluate(fileId, itemId, llmConfig || {
      provider: 'bedrock',
      model: 'anthropic.claude-3-haiku-20240307-v1:0'
    });

    // 평가 결과 저장
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    const actualPath = fs.existsSync(dbPath) ? dbPath : path.join(process.cwd(), '..', 'msp-assessment.db');
    
    const db = new Database(actualPath);
    ensureEvaluationTable(db);
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO evidence_evaluations 
      (file_id, item_id, score, feedback, llm_provider, llm_model, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      fileId,
      itemId,
      evaluation.score,
      evaluation.feedback,
      llmConfig?.provider || 'bedrock',
      llmConfig?.model || 'anthropic.claude-3-haiku-20240307-v1:0',
      new Date().toISOString()
    );
    
    db.close();

    return NextResponse.json({
      success: true,
      evaluation: {
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluatedAt: new Date().toISOString(),
        llmProvider: llmConfig?.provider,
        llmModel: llmConfig?.model
      }
    });
  } catch (error: any) {
    console.error('Error evaluating evidence:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
