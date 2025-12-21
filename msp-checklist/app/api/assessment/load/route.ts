import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAssessmentData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('msp_auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentType = searchParams.get('type');

    if (!assessmentType || !['prerequisites', 'technical'].includes(assessmentType)) {
      return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 });
    }

    const assessmentData = getAssessmentData(user.userId, assessmentType as 'prerequisites' | 'technical');

    return NextResponse.json({ 
      success: true, 
      data: assessmentData 
    });

  } catch (error: any) {
    console.error('Error loading assessment data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load assessment data', details: errorMessage },
      { status: 500 }
    );
  }
}

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
    const { assessmentType } = body;

    if (!assessmentType || !['prerequisites', 'technical'].includes(assessmentType)) {
      return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 });
    }

    const assessmentData = getAssessmentData(user.userId, assessmentType);

    return NextResponse.json({ 
      success: true, 
      data: assessmentData 
    });

  } catch (error: any) {
    console.error('Error loading assessment data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load assessment data', details: errorMessage },
      { status: 500 }
    );
  }
}