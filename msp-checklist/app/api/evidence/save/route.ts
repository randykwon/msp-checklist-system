import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { saveEvidenceFile } from '@/lib/evidence-storage';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const cookieStore = await cookies();
    const token = cookieStore.get('msp_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, assessmentType, fileId, fileName, fileType, base64Data } = body;

    if (!itemId || !fileId || !fileName || !fileType || !base64Data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 파일 저장
    const fileInfo = saveEvidenceFile(
      user.id,
      itemId,
      assessmentType || 'unknown',
      fileId,
      fileName,
      fileType,
      base64Data
    );

    if (!fileInfo) {
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileInfo: {
        id: fileInfo.id,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        localPath: fileInfo.localPath
      }
    });

  } catch (error) {
    console.error('Error saving evidence file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
