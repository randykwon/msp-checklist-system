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
    if (!user || !['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3010';
    
    // 조언 캐시 버전
    let adviceVersions: any[] = [];
    try {
      const adviceRes = await fetch(`${mainAppUrl}/api/advice-cache?action=versions`);
      if (adviceRes.ok) {
        const data = await adviceRes.json();
        adviceVersions = data.versions || [];
      }
    } catch (error) {
      console.error('Failed to fetch advice versions:', error);
    }
    
    // 가상증빙 캐시 버전
    let virtualEvidenceVersions: any[] = [];
    try {
      const veRes = await fetch(`${mainAppUrl}/api/virtual-evidence-cache?action=versions`);
      if (veRes.ok) {
        const data = await veRes.json();
        virtualEvidenceVersions = data.versions || [];
      }
    } catch (error) {
      console.error('Failed to fetch virtual evidence versions:', error);
    }
    
    // 활성 버전
    let activeAdvice: string | null = null;
    let activeVirtualEvidence: string | null = null;
    try {
      const activeRes = await fetch(`${mainAppUrl}/api/cache-version`);
      if (activeRes.ok) {
        const data = await activeRes.json();
        activeAdvice = data.activeVersions?.advice || null;
        activeVirtualEvidence = data.activeVersions?.virtualEvidence || null;
      }
    } catch (error) {
      console.error('Failed to fetch active versions:', error);
    }

    return NextResponse.json({
      success: true,
      advice: adviceVersions,
      virtualEvidence: virtualEvidenceVersions,
      activeAdvice,
      activeVirtualEvidence,
    });

  } catch (error) {
    console.error('Error fetching cache versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache versions' },
      { status: 500 }
    );
  }
}
