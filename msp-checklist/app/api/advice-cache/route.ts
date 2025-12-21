import { NextRequest, NextResponse } from 'next/server';
import { getAdviceGenerator } from '@/lib/advice-generator';
import { getAdviceCacheService } from '@/lib/advice-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const version = searchParams.get('version');
    const language = searchParams.get('language') as 'ko' | 'en' || 'ko';
    const itemId = searchParams.get('itemId');

    const cacheService = getAdviceCacheService();

    switch (action) {
      case 'versions':
        const versions = cacheService.getCacheVersions();
        return NextResponse.json({ versions });

      case 'stats':
        const stats = cacheService.getCacheStats(version || undefined);
        return NextResponse.json({ stats });

      case 'advice':
        if (!itemId) {
          return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
        }
        const advice = cacheService.getCachedAdvice(itemId, language, version || undefined);
        return NextResponse.json({ advice });

      case 'list':
        if (!version) {
          return NextResponse.json({ error: 'version is required for list action' }, { status: 400 });
        }
        const adviceList = cacheService.getCachedAdviceByVersion(version, language);
        return NextResponse.json({ advice: adviceList });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in advice cache API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/advice-cache - Starting request processing...');
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    const { action, options } = body;

    if (action !== 'generate') {
      console.log('❌ Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('🔧 Getting advice generator...');
    const generator = getAdviceGenerator();
    
    console.log('🚀 Starting advice generation with options:', options);
    // 조언 생성 시작
    const result = await generator.generateAndCacheAllAdvice(options || {});

    console.log('✅ Advice generation completed:', result);
    return NextResponse.json({
      success: true,
      version: result.version,
      totalItems: result.totalItems,
      koAdvice: result.koAdvice.length,
      enAdvice: result.enAdvice.length,
      message: `Successfully generated advice for ${result.totalItems} items`
    });
  } catch (error) {
    console.error('❌ Error generating advice cache:', error);
    console.error('📍 Error stack:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to generate advice cache: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, advice, virtualEvidence } = body;

    if (!id || !advice) {
      return NextResponse.json({ error: 'ID and advice are required' }, { status: 400 });
    }

    const cacheService = getAdviceCacheService();
    const success = cacheService.updateCachedAdvice(id, advice, virtualEvidence || '');

    if (success) {
      return NextResponse.json({ success: true, message: 'Advice updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update advice' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating advice cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}