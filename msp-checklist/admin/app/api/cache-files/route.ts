import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// cache 디렉토리 경로
const CACHE_BASE_DIR = path.join(process.cwd(), '..', 'cache');
const ADVICE_CACHE_DIR = path.join(CACHE_BASE_DIR, 'advice');
const VIRTUAL_EVIDENCE_CACHE_DIR = path.join(CACHE_BASE_DIR, 'virtual-evidence');

interface CacheFileInfo {
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  provider?: string;
  model?: string;
}

// 파일명에서 provider와 model 추출
function parseFilename(filename: string): { provider?: string; model?: string; date?: string } {
  // advice_cache_20260106_185847_bedrock_anthropic-claude-3-5-sonnet-20.json
  // virtual_evidence_cache_20260106_084943_bedrock_anthropic.claude-3-haiku-20240307-v1-0.json
  const match = filename.match(/cache_(\d{8}_\d{6})_([^_]+)_(.+)\.json$/);
  if (match) {
    return {
      date: match[1],
      provider: match[2],
      model: match[3],
    };
  }
  // 구버전 형식: advice_cache_20251218_112603.json
  const oldMatch = filename.match(/cache_(\d{8}_\d{6})\.json$/);
  if (oldMatch) {
    return { date: oldMatch[1] };
  }
  return {};
}

// 디렉토리의 캐시 파일 목록 가져오기
function getCacheFiles(dir: string): CacheFileInfo[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(filename => {
      const filepath = path.join(dir, filename);
      const stats = fs.statSync(filepath);
      const parsed = parseFilename(filename);
      
      return {
        filename,
        filepath,
        size: stats.size,
        createdAt: stats.mtime.toISOString(),
        provider: parsed.provider,
        model: parsed.model,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return files;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'advice' | 'virtual-evidence'
    const action = searchParams.get('action'); // 'list' | 'read'
    const filename = searchParams.get('filename');
    
    if (action === 'list') {
      // 파일 목록 반환
      let files: CacheFileInfo[] = [];
      
      if (type === 'advice') {
        files = getCacheFiles(ADVICE_CACHE_DIR);
      } else if (type === 'virtual-evidence') {
        files = getCacheFiles(VIRTUAL_EVIDENCE_CACHE_DIR);
      } else {
        // 둘 다 반환
        files = [
          ...getCacheFiles(ADVICE_CACHE_DIR).map(f => ({ ...f, type: 'advice' })),
          ...getCacheFiles(VIRTUAL_EVIDENCE_CACHE_DIR).map(f => ({ ...f, type: 'virtual-evidence' })),
        ];
      }
      
      return NextResponse.json({ success: true, files });
    }
    
    if (action === 'read' && filename && type) {
      // 특정 파일 읽기
      const dir = type === 'advice' ? ADVICE_CACHE_DIR : VIRTUAL_EVIDENCE_CACHE_DIR;
      const filepath = path.join(dir, filename);
      
      // 보안: 경로 탈출 방지
      if (!filepath.startsWith(dir)) {
        return NextResponse.json({ error: '잘못된 파일 경로입니다.' }, { status: 400 });
      }
      
      if (!fs.existsSync(filepath)) {
        return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
      }
      
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);
      
      return NextResponse.json({ success: true, data, filename });
    }
    
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Cache files API error:', error);
    return NextResponse.json({ error: '캐시 파일 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
