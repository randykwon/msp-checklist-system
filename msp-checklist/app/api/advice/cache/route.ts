import { NextRequest, NextResponse } from 'next/server';
import { getAdviceCacheStats, clearAdviceCache } from '@/lib/db';

export async function GET() {
  try {
    const stats = getAdviceCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearAdviceCache();
    return NextResponse.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}