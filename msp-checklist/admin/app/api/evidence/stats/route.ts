import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const EVIDENCE_BASE_DIR = process.env.EVIDENCE_STORAGE_PATH || '/opt/msp-checklist-system/evidence-files';
const PENDING_DIR = path.join(EVIDENCE_BASE_DIR, 'pending');
const UPLOADED_DIR = path.join(EVIDENCE_BASE_DIR, 'uploaded');

function countFilesInDir(dir: string): { count: number; size: number } {
  let count = 0;
  let size = 0;
  
  if (!fs.existsSync(dir)) {
    return { count, size };
  }
  
  const walkDir = (d: string) => {
    try {
      const items = fs.readdirSync(d);
      for (const item of items) {
        const fullPath = path.join(d, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (!item.endsWith('.meta.json')) {
          count++;
          size += stat.size;
        }
      }
    } catch (e) {
      console.error('Error walking directory:', d, e);
    }
  };
  
  walkDir(dir);
  return { count, size };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const pending = countFilesInDir(PENDING_DIR);
    const uploaded = countFilesInDir(UPLOADED_DIR);
    
    return NextResponse.json({
      storagePath: EVIDENCE_BASE_DIR,
      s3Bucket: process.env.EVIDENCE_S3_BUCKET || 'Not configured',
      s3Prefix: process.env.EVIDENCE_S3_PREFIX || 'evidence-files',
      pending: {
        count: pending.count,
        size: pending.size,
        sizeFormatted: formatBytes(pending.size)
      },
      uploaded: {
        count: uploaded.count,
        size: uploaded.size,
        sizeFormatted: formatBytes(uploaded.size)
      },
      total: {
        count: pending.count + uploaded.count,
        size: pending.size + uploaded.size,
        sizeFormatted: formatBytes(pending.size + uploaded.size)
      }
    });

  } catch (error: any) {
    console.error('Error getting evidence stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats', details: error.message },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
