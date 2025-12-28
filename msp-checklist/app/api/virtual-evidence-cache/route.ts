import { NextRequest, NextResponse } from 'next/server';
import { getVirtualEvidenceGenerator } from '@/lib/virtual-evidence-generator';
import { getVirtualEvidenceCacheService } from '@/lib/virtual-evidence-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const version = searchParams.get('version');
    const language = searchParams.get('language') as 'ko' | 'en' || 'ko';
    const itemId = searchParams.get('itemId');

    const cacheService = getVirtualEvidenceCacheService();

    switch (action) {
      case 'versions':
        const versions = cacheService.getCacheVersions();
        return NextResponse.json({ versions });

      case 'stats':
        const stats = cacheService.getCacheStats(version || undefined);
        return NextResponse.json({ stats });

      case 'evidence':
        if (!itemId) {
          return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
        }
        const evidence = cacheService.getCachedVirtualEvidence(itemId, language, version || undefined);
        return NextResponse.json({ evidence });

      case 'list':
        if (!version) {
          return NextResponse.json({ error: 'version is required for list action' }, { status: 400 });
        }
        const evidenceList = cacheService.getCachedVirtualEvidenceByVersion(version, language);
        return NextResponse.json({ evidence: evidenceList });

      case 'export':
        if (!version) {
          return NextResponse.json({ error: 'version is required for export action' }, { status: 400 });
        }
        const exportData = cacheService.exportCacheData(version);
        return NextResponse.json(exportData);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in virtual evidence cache API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/virtual-evidence-cache - Starting request processing...');
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    const { action, options } = body;

    if (action !== 'generate') {
      console.log('❌ Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('🔧 Getting virtual evidence generator...');
    const generator = getVirtualEvidenceGenerator();
    
    console.log('🚀 Starting virtual evidence generation with options:', options);
    // 가상증빙예제 생성 시작
    const result = await generator.generateAndCacheAllVirtualEvidence(options || {});

    console.log('✅ Virtual evidence generation completed:', result);
    return NextResponse.json({
      success: true,
      version: result.version,
      totalItems: result.totalItems,
      koEvidence: result.koEvidence.length,
      enEvidence: result.enEvidence.length,
      message: `Successfully generated virtual evidence for ${result.totalItems} items`
    });
  } catch (error) {
    console.error('❌ Error generating virtual evidence cache:', error);
    console.error('📍 Error stack:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to generate virtual evidence cache: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');

    if (!version) {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    const cacheService = getVirtualEvidenceCacheService();
    const success = cacheService.deleteCacheVersion(version);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `버전 ${version}이 성공적으로 삭제되었습니다.` 
      });
    } else {
      return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting virtual evidence cache version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, virtualEvidence, cacheData } = body;

    // Import 액션 처리
    if (action === 'import') {
      if (!cacheData) {
        return NextResponse.json({ error: 'cacheData is required for import' }, { status: 400 });
      }

      const cacheService = getVirtualEvidenceCacheService();
      const result = cacheService.importCacheData(cacheData);

      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          message: `캐시 가져오기 완료: ${result.totalItems}개 항목`,
          version: result.version,
          totalItems: result.totalItems
        });
      } else {
        return NextResponse.json({ error: result.error || 'Failed to import cache' }, { status: 500 });
      }
    }

    // 기존 업데이트 로직
    if (!id || !virtualEvidence) {
      return NextResponse.json({ error: 'ID and virtualEvidence are required' }, { status: 400 });
    }

    const cacheService = getVirtualEvidenceCacheService();
    
    // For updating, we need to save with the same version but new content
    const existingEvidence = cacheService.getCachedVirtualEvidence(id);
    if (!existingEvidence) {
      return NextResponse.json({ error: 'Virtual evidence not found' }, { status: 404 });
    }
    
    cacheService.saveCachedVirtualEvidence({
      itemId: id,
      category: existingEvidence.category,
      title: existingEvidence.title,
      virtualEvidence: virtualEvidence,
      language: existingEvidence.language,
      version: existingEvidence.version
    });

    return NextResponse.json({ success: true, message: 'Virtual evidence updated successfully' });
  } catch (error) {
    console.error('Error updating virtual evidence cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}