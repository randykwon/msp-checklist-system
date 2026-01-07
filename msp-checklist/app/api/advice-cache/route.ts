import { NextRequest, NextResponse } from 'next/server';
import { getAdviceGenerator } from '@/lib/advice-generator';
import { getAdviceCacheService } from '@/lib/advice-cache';
import Database from 'better-sqlite3';
import path from 'path';

// 활성 조언 캐시 버전 가져오기
function getActiveAdviceVersion(): string | null {
  try {
    const dbPath = path.join(process.cwd(), 'msp-assessment.db');
    const db = new Database(dbPath);
    
    try {
      // 테이블이 없으면 생성
      db.exec(`
        CREATE TABLE IF NOT EXISTS active_cache_versions (
          cache_type TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = db.prepare(`
        SELECT version FROM active_cache_versions 
        WHERE cache_type = 'advice'
      `).get() as { version: string } | undefined;
      
      return result?.version || null;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Error getting active advice version:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    let version = searchParams.get('version');
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
        
        // 버전이 지정되지 않으면 활성 버전 사용
        if (!version) {
          version = getActiveAdviceVersion();
          console.log(`[/api/advice-cache] Using active version for advice: ${version}`);
        }
        
        const advice = cacheService.getCachedAdvice(itemId, language, version || undefined);
        return NextResponse.json({ 
          advice,
          activeVersion: version 
        });

      case 'list':
        if (!version) {
          return NextResponse.json({ error: 'version is required for list action' }, { status: 400 });
        }
        console.log('Fetching advice list for version:', version, 'language:', language);
        const adviceList = cacheService.getCachedAdviceByVersion(version, language);
        console.log('Found advice items:', adviceList.length);
        return NextResponse.json({ advice: adviceList });

      case 'export':
        if (!version) {
          return NextResponse.json({ error: 'version is required for export action' }, { status: 400 });
        }
        const exportData = cacheService.exportCacheData(version);
        return NextResponse.json(exportData);
      
      case 'active-version':
        const activeVersion = getActiveAdviceVersion();
        return NextResponse.json({ activeVersion });

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
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    
    const { action, options, llmConfig } = body;

    if (action !== 'generate') {
      console.log('❌ Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('🔧 Getting advice generator...');
    const generator = getAdviceGenerator();
    
    // LLM 설정을 options에 포함
    const generationOptions = {
      ...options,
      llmConfig: llmConfig || undefined,
    };
    
    console.log('🚀 Starting advice generation with options:', generationOptions);
    console.log('🤖 LLM Config:', llmConfig ? `${llmConfig.provider} (${llmConfig.model})` : 'Using default');
    console.log('🔑 Inference Profile ARN:', llmConfig?.inferenceProfileArn || '(not provided)');
    
    // 조언 생성 시작
    const result = await generator.generateAndCacheAllAdvice(generationOptions);

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');

    if (!version) {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    const cacheService = getAdviceCacheService();
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
    console.error('Error deleting cache version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, advice, cacheData } = body;

    // Import 액션 처리
    if (action === 'import') {
      if (!cacheData) {
        return NextResponse.json({ error: 'cacheData is required for import' }, { status: 400 });
      }

      const cacheService = getAdviceCacheService();
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
    if (!id || !advice) {
      return NextResponse.json({ error: 'ID and advice are required' }, { status: 400 });
    }

    const cacheService = getAdviceCacheService();
    const success = cacheService.updateCachedAdvice(id, advice);

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