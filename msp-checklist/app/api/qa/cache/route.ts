import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('msp_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Q&A statistics
    const totalQuestionsStmt = db.prepare('SELECT COUNT(*) as count FROM item_qa');
    const answeredQuestionsStmt = db.prepare('SELECT COUNT(*) as count FROM item_qa WHERE answer IS NOT NULL');
    const unansweredQuestionsStmt = db.prepare('SELECT COUNT(*) as count FROM item_qa WHERE answer IS NULL');

    const totalQuestions = totalQuestionsStmt.get() as { count: number };
    const answeredQuestions = answeredQuestionsStmt.get() as { count: number };
    const unansweredQuestions = unansweredQuestionsStmt.get() as { count: number };

    return NextResponse.json({
      totalQuestions: totalQuestions.count,
      answeredQuestions: answeredQuestions.count,
      unansweredQuestions: unansweredQuestions.count
    });

  } catch (error) {
    console.error('Error fetching Q&A stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Q&A statistics' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('msp_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'all') {
      // Clear all Q&A data
      const stmt = db.prepare('DELETE FROM item_qa');
      stmt.run();
      
      return NextResponse.json({ 
        message: 'All Q&A data cleared successfully' 
      });
    } else if (type === 'unanswered') {
      // Clear only unanswered questions
      const stmt = db.prepare('DELETE FROM item_qa WHERE answer IS NULL');
      stmt.run();
      
      return NextResponse.json({ 
        message: 'Unanswered questions cleared successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid type. Use "all" or "unanswered"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error clearing Q&A data:', error);
    return NextResponse.json(
      { error: 'Failed to clear Q&A data' },
      { status: 500 }
    );
  }
}