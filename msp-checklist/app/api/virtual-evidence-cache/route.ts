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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, virtualEvidence } = body;

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