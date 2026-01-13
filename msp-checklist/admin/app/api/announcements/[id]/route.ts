import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const announcementId = parseInt(resolvedParams.id);
    
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    const announcement = getAnnouncement(announcementId);
    
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      announcement
    });

  } catch (error: any) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcement', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const announcementId = parseInt(resolvedParams.id);
    
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, type, priority, isActive, showOnHomepage, startDate, endDate } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // 공지사항 존재 확인
    const existingAnnouncement = getAnnouncement(announcementId);
    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    updateAnnouncement(
      announcementId,
      title,
      content,
      type || 'info',
      priority || 1,
      isActive !== false,
      showOnHomepage === true,
      startDate || undefined,
      endDate || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Announcement updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }

    const resolvedParams = await params;
    const announcementId = parseInt(resolvedParams.id);
    
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    // 공지사항 존재 확인
    const existingAnnouncement = getAnnouncement(announcementId);
    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    deleteAnnouncement(announcementId);

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement', details: error.message },
      { status: 500 }
    );
  }
}