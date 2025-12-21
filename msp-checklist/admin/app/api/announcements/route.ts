import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getAllAnnouncements, createAnnouncement } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const announcements = getAllAnnouncements();

    return NextResponse.json({
      success: true,
      announcements
    });

  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, type, priority, isActive, startDate, endDate } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const announcementId = createAnnouncement(
      title,
      content,
      type || 'info',
      priority || 1,
      isActive !== false,
      admin.userId,
      startDate || undefined,
      endDate || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      announcementId
    });

  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement', details: error.message },
      { status: 500 }
    );
  }
}