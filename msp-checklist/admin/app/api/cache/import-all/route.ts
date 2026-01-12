import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { saveAdviceSummary, saveVirtualEvidenceSummary } from '@msp/shared';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { adviceCache, virtualEvidenceCache, adviceSummary, virtualEvidenceSummary } = body;

    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3010';
    
    const results: {
      adviceCache?: { success: boolean; message: string; version?: string };
      virtualEvidenceCache?: { success: boolean; message: string; version?: string };
      adviceSummary?: { success: boolean; message: string; count?: number };
      virtualEvidenceSummary?: { success: boolean; message: string; count?: number };
    } = {};

    // 조언 캐시 가져오기
    if (adviceCache) {
      try {
        const adviceResponse = await fetch(`${mainAppUrl}/api/advice-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import',
            data: adviceCache,
          }),
        });
        
        if (adviceResponse.ok) {
          const result = await adviceResponse.json();
          results.adviceCache = {
            success: true,
            message: `조언 캐시 가져오기 완료: ${result.importedCount || 0}개 항목`,
            version: result.version,
          };
        } else {
          const error = await adviceResponse.json();
          results.adviceCache = {
            success: false,
            message: `조언 캐시 가져오기 실패: ${error.error}`,
          };
        }
      } catch (error: any) {
        results.adviceCache = {
          success: false,
          message: `조언 캐시 가져오기 오류: ${error.message}`,
        };
      }
    }

    // 가상증빙예제 캐시 가져오기
    if (virtualEvidenceCache) {
      try {
        const veResponse = await fetch(`${mainAppUrl}/api/virtual-evidence-cache`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import',
            data: virtualEvidenceCache,
          }),
        });
        
        if (veResponse.ok) {
          const result = await veResponse.json();
          results.virtualEvidenceCache = {
            success: true,
            message: `가상증빙예제 캐시 가져오기 완료: ${result.importedCount || 0}개 항목`,
            version: result.version,
          };
        } else {
          const error = await veResponse.json();
          results.virtualEvidenceCache = {
            success: false,
            message: `가상증빙예제 캐시 가져오기 실패: ${error.error}`,
          };
        }
      } catch (error: any) {
        results.virtualEvidenceCache = {
          success: false,
          message: `가상증빙예제 캐시 가져오기 오류: ${error.message}`,
        };
      }
    }

    // 조언 요약 가져오기
    if (adviceSummary && adviceSummary.version) {
      try {
        let importedCount = 0;
        const summaryVersion = adviceSummary.version;
        
        // 한국어 요약 가져오기
        if (adviceSummary.ko && Array.isArray(adviceSummary.ko)) {
          for (const item of adviceSummary.ko) {
            const saved = saveAdviceSummary(
              summaryVersion,
              item.item_id,
              item.category,
              item.title,
              item.summary,
              'ko'
            );
            if (saved) importedCount++;
          }
        }
        
        // 영어 요약 가져오기
        if (adviceSummary.en && Array.isArray(adviceSummary.en)) {
          for (const item of adviceSummary.en) {
            const saved = saveAdviceSummary(
              summaryVersion,
              item.item_id,
              item.category,
              item.title,
              item.summary,
              'en'
            );
            if (saved) importedCount++;
          }
        }
        
        results.adviceSummary = {
          success: true,
          message: `조언 요약 가져오기 완료: ${importedCount}개 항목`,
          count: importedCount,
        };
      } catch (error: any) {
        results.adviceSummary = {
          success: false,
          message: `조언 요약 가져오기 오류: ${error.message}`,
        };
      }
    }

    // 가상증빙 요약 가져오기
    if (virtualEvidenceSummary && virtualEvidenceSummary.version) {
      try {
        let importedCount = 0;
        const summaryVersion = virtualEvidenceSummary.version;
        
        // 한국어 요약 가져오기
        if (virtualEvidenceSummary.ko && Array.isArray(virtualEvidenceSummary.ko)) {
          for (const item of virtualEvidenceSummary.ko) {
            const saved = saveVirtualEvidenceSummary(
              summaryVersion,
              item.item_id,
              item.category,
              item.title,
              item.summary,
              'ko'
            );
            if (saved) importedCount++;
          }
        }
        
        // 영어 요약 가져오기
        if (virtualEvidenceSummary.en && Array.isArray(virtualEvidenceSummary.en)) {
          for (const item of virtualEvidenceSummary.en) {
            const saved = saveVirtualEvidenceSummary(
              summaryVersion,
              item.item_id,
              item.category,
              item.title,
              item.summary,
              'en'
            );
            if (saved) importedCount++;
          }
        }
        
        results.virtualEvidenceSummary = {
          success: true,
          message: `가상증빙 요약 가져오기 완료: ${importedCount}개 항목`,
          count: importedCount,
        };
      } catch (error: any) {
        results.virtualEvidenceSummary = {
          success: false,
          message: `가상증빙 요약 가져오기 오류: ${error.message}`,
        };
      }
    }

    const allSuccess = 
      (!adviceCache || results.adviceCache?.success) && 
      (!virtualEvidenceCache || results.virtualEvidenceCache?.success) &&
      (!adviceSummary || results.adviceSummary?.success) &&
      (!virtualEvidenceSummary || results.virtualEvidenceSummary?.success);

    return NextResponse.json({
      success: allSuccess,
      results,
    });

  } catch (error) {
    console.error('Error importing all caches:', error);
    return NextResponse.json(
      { error: 'Failed to import caches' },
      { status: 500 }
    );
  }
}
