import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const cookieStore = cookies();
    const token = cookieStore.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const adviceVersion = searchParams.get('adviceVersion');
    const virtualEvidenceVersion = searchParams.get('virtualEvidenceVersion');

    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3010';
    
    const exportData: {
      exportedAt: string;
      exportedBy: string;
      adviceCache?: any;
      virtualEvidenceCache?: any;
      adviceSummary?: any;
      virtualEvidenceSummary?: any;
    } = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
    };

    const adminAppUrl = process.env.ADMIN_APP_URL || 'http://localhost:3011';

    // 조언 캐시 내보내기
    if (adviceVersion) {
      try {
        const adviceResponse = await fetch(
          `${mainAppUrl}/api/advice-cache?action=export&version=${encodeURIComponent(adviceVersion)}`
        );
        if (adviceResponse.ok) {
          const adviceData = await adviceResponse.json();
          exportData.adviceCache = adviceData;
        }
        
        // 조언 요약도 내보내기 (list action 사용)
        // 먼저 해당 버전에 맞는 요약 버전 찾기
        const adviceSummaryVersionsResponse = await fetch(
          `${adminAppUrl}/api/advice-summary?action=versions`,
          { headers: { Cookie: `admin_auth_token=${token}` } }
        );
        if (adviceSummaryVersionsResponse.ok) {
          const versionsData = await adviceSummaryVersionsResponse.json();
          // 해당 캐시 버전으로 시작하는 요약 버전 찾기
          const matchingSummaryVersion = versionsData.versions?.find((v: string) => v.startsWith(adviceVersion));
          if (matchingSummaryVersion) {
            // 한국어와 영어 요약 모두 내보내기
            const summaries: any = { version: matchingSummaryVersion, ko: [], en: [] };
            
            for (const lang of ['ko', 'en']) {
              const summaryResponse = await fetch(
                `${adminAppUrl}/api/advice-summary?action=list&version=${encodeURIComponent(matchingSummaryVersion)}&language=${lang}`,
                { headers: { Cookie: `admin_auth_token=${token}` } }
              );
              if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                if (summaryData.summaries && summaryData.summaries.length > 0) {
                  summaries[lang] = summaryData.summaries;
                }
              }
            }
            
            if (summaries.ko.length > 0 || summaries.en.length > 0) {
              exportData.adviceSummary = summaries;
            }
          }
        }
      } catch (error) {
        console.error('Failed to export advice cache:', error);
      }
    }

    // 가상증빙예제 캐시 내보내기
    if (virtualEvidenceVersion) {
      try {
        const veResponse = await fetch(
          `${mainAppUrl}/api/virtual-evidence-cache?action=export&version=${encodeURIComponent(virtualEvidenceVersion)}`
        );
        if (veResponse.ok) {
          const veData = await veResponse.json();
          exportData.virtualEvidenceCache = veData;
        }
        
        // 가상증빙 요약도 내보내기 (list action 사용)
        const veSummaryVersionsResponse = await fetch(
          `${adminAppUrl}/api/virtual-evidence-summary?action=versions`,
          { headers: { Cookie: `admin_auth_token=${token}` } }
        );
        if (veSummaryVersionsResponse.ok) {
          const versionsData = await veSummaryVersionsResponse.json();
          const matchingSummaryVersion = versionsData.versions?.find((v: string) => v.startsWith(virtualEvidenceVersion));
          if (matchingSummaryVersion) {
            const summaries: any = { version: matchingSummaryVersion, ko: [], en: [] };
            
            for (const lang of ['ko', 'en']) {
              const summaryResponse = await fetch(
                `${adminAppUrl}/api/virtual-evidence-summary?action=list&version=${encodeURIComponent(matchingSummaryVersion)}&language=${lang}`,
                { headers: { Cookie: `admin_auth_token=${token}` } }
              );
              if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                if (summaryData.summaries && summaryData.summaries.length > 0) {
                  summaries[lang] = summaryData.summaries;
                }
              }
            }
            
            if (summaries.ko.length > 0 || summaries.en.length > 0) {
              exportData.virtualEvidenceSummary = summaries;
            }
          }
        }
      } catch (error) {
        console.error('Failed to export virtual evidence cache:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: exportData,
    });

  } catch (error) {
    console.error('Error exporting all caches:', error);
    return NextResponse.json(
      { error: 'Failed to export caches' },
      { status: 500 }
    );
  }
}
