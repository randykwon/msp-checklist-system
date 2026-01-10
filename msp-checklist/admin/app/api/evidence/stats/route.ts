import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

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
  } catch {
    // 접근 권한이 없으면 로컬 경로 사용
  }
  
  return path.join(process.cwd(), '..', 'evidence-files');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    let pendingCount = 0, pendingSize = 0;
    let uploadedCount = 0, uploadedSize = 0;

    const baseDir = getEvidenceBasePath();
    const pendingDir = path.join(baseDir, 'pending');
    const uploadedDir = path.join(baseDir, 'uploaded');

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

    return NextResponse.json({
      pending: {
        count: pendingCount,
        size: pendingSize,
        sizeFormatted: formatSize(pendingSize)
      },
      uploaded: {
        count: uploadedCount,
        size: uploadedSize,
        sizeFormatted: formatSize(uploadedSize)
      }
    });
  } catch (error) {
    console.error('Error getting evidence stats:', error);
    return NextResponse.json({
      pending: { count: 0, size: 0, sizeFormatted: '0 B' },
      uploaded: { count: 0, size: 0, sizeFormatted: '0 B' }
    });
  }
}
