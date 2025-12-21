import { NextRequest, NextResponse } from 'next/server';
import { getVirtualEvidenceCacheStats, clearVirtualEvidenceCache } from '@/lib/db';

export async function GET() {
  try {
    const stats = getVirtualEvidenceCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting virtual evidence cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearVirtualEvidenceCache();
    return NextResponse.json({ message: 'Virtual evidence cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing virtual evidence cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}