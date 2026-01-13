import { NextResponse } from 'next/server';
import { getHomepageAnnouncements } from '@/lib/db';

export async function GET() {
  try {
    const announcements = getHomepageAnnouncements();
    
    return NextResponse.json({
      success: true,
      announcements
    });
  } catch (error: any) {
    console.error('Error fetching homepage announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage announcements', details: error.message },
      { status: 500 }
    );
  }
}