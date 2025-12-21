import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || !['operator', 'admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const cacheType = resolvedParams.type;

    if (cacheType === 'advice') {
      const stmt = db.prepare('DELETE FROM advice_cache');
      stmt.run();
      return NextResponse.json({ message: 'Advice cache cleared successfully' });
    } else if (cacheType === 'virtual-evidence') {
      const stmt = db.prepare('DELETE FROM virtual_evidence_cache');
      stmt.run();
      return NextResponse.json({ message: 'Virtual evidence cache cleared successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid cache type. Must be "advice" or "virtual-evidence"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache', details: error.message },
      { status: 500 }
    );
  }
}