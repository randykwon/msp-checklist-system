import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getAnnouncement, updateAnnouncement } from '@/lib/db';

export async function PATCH(
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

    const { id } = await params;
    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    // 기존 공지사항 정보 가져오기
    const existingAnnouncement = getAnnouncement(announcementId);
    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // 활성 상태만 업데이트
    updateAnnouncement(
      announcementId,
      existingAnnouncement.title,
      existingAnnouncement.content,
      existingAnnouncement.type,
      existingAnnouncement.priority,
      isActive,
      existingAnnouncement.startDate,
      existingAnnouncement.endDate
    );

    return NextResponse.json({
      success: true,
      message: `Announcement ${isActive ? 'activated' : 'deactivated'} successfully`,
      isActive
    });

  } catch (error: any) {
    console.error('Error toggling announcement status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle announcement status', details: error.message },
      { status: 500 }
    );
  }
}