import { NextRequest, NextResponse } from 'next/server';
import { getActiveAnnouncements } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const announcements = getActiveAnnouncements();
    
    return NextResponse.json({
      success: true,
      announcements
    });
  } catch (error: any) {
    console.error('Error fetching active announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements', details: error.message },
      { status: 500 }
    );
  }
}