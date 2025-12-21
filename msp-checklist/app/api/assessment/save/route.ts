import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { saveAssessmentItem } from '@/lib/db';
import { AssessmentItem } from '@/lib/csv-parser';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('msp_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { assessmentType, item } = body;

    if (!assessmentType || !item) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['prerequisites', 'technical'].includes(assessmentType)) {
      return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 });
    }

    // Convert date strings back to Date objects if needed
    const assessmentItem: AssessmentItem = {
      ...item,
      lastUpdated: new Date(item.lastUpdated || Date.now())
    };

    // Convert evidence files dates if they exist
    if (assessmentItem.evidenceFiles) {
      assessmentItem.evidenceFiles = assessmentItem.evidenceFiles.map(file => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    }

    // Convert evaluation date if it exists
    if (assessmentItem.evaluation && assessmentItem.evaluation.evaluatedAt) {
      assessmentItem.evaluation.evaluatedAt = new Date(assessmentItem.evaluation.evaluatedAt);
    }

    saveAssessmentItem(user.userId, assessmentType, assessmentItem);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error saving assessment item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save assessment item', details: errorMessage },
      { status: 500 }
    );
  }
}