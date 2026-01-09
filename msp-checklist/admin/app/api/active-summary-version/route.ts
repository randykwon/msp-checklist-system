import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { 
  setDBConfig,
  getActiveSummaryVersion,
  setActiveSummaryVersion,
  getAllActiveSummaryVersions
} from '@msp/shared';

// DB 경로 설정 (Admin에서 Main의 DB에 접근)
const mainAppPath = path.join(process.cwd(), '..');
setDBConfig({ basePath: mainAppPath });

// GET: 활성 요약 버전 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summaryType = searchParams.get('type') as 'advice' | 'virtualEvidence' | null;
    const language = searchParams.get('language') as 'ko' | 'en' | null;

    // 특정 타입/언어 조회
    if (summaryType && language) {
      const version = getActiveSummaryVersion(summaryType, language);
      return NextResponse.json({ 
        success: true, 
        summaryType,
        language,
        version 
      });
    }

    // 전체 조회
    const versions = getAllActiveSummaryVersions();
    return NextResponse.json({ 
      success: true, 
      versions 
    });

  } catch (error: any) {
    console.error('Error getting active summary version:', error);
    return NextResponse.json(
      { error: 'Failed to get active summary version', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 활성 요약 버전 설정
export async function POST(request: NextRequest) {
  try {
    const { summaryType, language, version } = await request.json();

    if (!summaryType || !language || !version) {
      return NextResponse.json(
        { error: 'summaryType, language, and version are required' },
        { status: 400 }
      );
    }

    if (!['advice', 'virtualEvidence'].includes(summaryType)) {
      return NextResponse.json(
        { error: 'Invalid summaryType. Use: advice, virtualEvidence' },
        { status: 400 }
      );
    }

    if (!['ko', 'en'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Use: ko, en' },
        { status: 400 }
      );
    }

    const success = setActiveSummaryVersion(summaryType, language, version);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `${summaryType} ${language} 활성 버전이 설정되었습니다.`,
        summaryType,
        language,
        version
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to set active summary version' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error setting active summary version:', error);
    return NextResponse.json(
      { error: 'Failed to set active summary version', details: error.message },
      { status: 500 }
    );
  }
}
