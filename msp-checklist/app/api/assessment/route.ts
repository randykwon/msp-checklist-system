import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getAssessmentData,
  saveAssessmentItem,
  deleteAssessmentData
} from '@/lib/db';
import {
  getActiveVersion,
  getVersionAssessmentData,
  saveVersionAssessmentItem,
  deleteVersionAssessmentData,
  migrateExistingUserData
} from '@/lib/version-db';
import { AssessmentItem } from '@/lib/csv-parser';

// GET: 사용자의 Assessment 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const assessmentType = searchParams.get('type') as 'prerequisites' | 'technical';

    if (!assessmentType || !['prerequisites', 'technical'].includes(assessmentType)) {
      return NextResponse.json(
        { error: 'Invalid assessment type' },
        { status: 400 }
      );
    }

    console.log('=== ASSESSMENT API GET START ===');
    console.log('User ID:', user.userId, 'Assessment Type:', assessmentType);

    // Get or create active version
    let activeVersion = getActiveVersion(user.userId);
    console.log('Active version from DB:', activeVersion);
    
    if (!activeVersion) {
      console.log('No active version found, migrating existing data...');
      activeVersion = migrateExistingUserData(user.userId);
      console.log('Migration result:', activeVersion);
    }

    if (!activeVersion) {
      console.log('Still no active version after migration');
      return NextResponse.json(
        { error: 'No active version found and migration failed' },
        { status: 404 }
      );
    }

    console.log('Loading assessment data for version:', activeVersion.id, 'type:', assessmentType);

    // Get data ONLY from version-specific table
    const data = getVersionAssessmentData(activeVersion.id, assessmentType);
    console.log('Loaded', data.length, 'items for version', activeVersion.versionName);

    console.log('=== ASSESSMENT API GET SUCCESS ===');
    return NextResponse.json({ 
      data,
      activeVersion: {
        id: activeVersion.id,
        name: activeVersion.versionName,
        description: activeVersion.description
      }
    }, { status: 200 });
  } catch (error) {
    console.error('=== ASSESSMENT API GET ERROR ===');
    console.error('Get assessment data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get assessment data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Assessment 데이터 저장
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { assessmentType, item } = await request.json() as {
      assessmentType: 'prerequisites' | 'technical';
      item: AssessmentItem;
    };

    if (!assessmentType || !['prerequisites', 'technical'].includes(assessmentType)) {
      return NextResponse.json(
        { error: 'Invalid assessment type' },
        { status: 400 }
      );
    }

    if (!item || !item.id) {
      return NextResponse.json(
        { error: 'Invalid assessment item' },
        { status: 400 }
      );
    }

    console.log('=== ASSESSMENT API POST START ===');
    console.log('User ID:', user.userId, 'Assessment Type:', assessmentType, 'Item ID:', item.id);

    // Get or create active version
    let activeVersion = getActiveVersion(user.userId);
    console.log('Active version from DB:', activeVersion);
    
    if (!activeVersion) {
      console.log('No active version found, migrating existing data...');
      activeVersion = migrateExistingUserData(user.userId);
      console.log('Migration result:', activeVersion);
    }

    if (!activeVersion) {
      console.log('Still no active version after migration');
      return NextResponse.json(
        { error: 'No active version found and migration failed' },
        { status: 404 }
      );
    }

    console.log('Saving assessment item to version:', activeVersion.id);

    // Save to version-specific table
    saveVersionAssessmentItem(activeVersion.id, assessmentType, item);
    console.log('Saved to version-specific table');

    // Also save to legacy table for backward compatibility
    saveAssessmentItem(user.userId, assessmentType, item);
    console.log('Saved to legacy table for compatibility');

    console.log('=== ASSESSMENT API POST SUCCESS ===');
    return NextResponse.json(
      { 
        message: 'Assessment item saved successfully',
        activeVersion: {
          id: activeVersion.id,
          name: activeVersion.versionName
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== ASSESSMENT API POST ERROR ===');
    console.error('Save assessment data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save assessment data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Assessment 데이터 초기화
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const assessmentType = searchParams.get('type') as 'prerequisites' | 'technical';

    if (!assessmentType || !['prerequisites', 'technical'].includes(assessmentType)) {
      return NextResponse.json(
        { error: 'Invalid assessment type' },
        { status: 400 }
      );
    }

    console.log('=== ASSESSMENT API DELETE START ===');
    console.log('User ID:', user.userId, 'Assessment Type:', assessmentType);

    // Get active version
    const activeVersion = getActiveVersion(user.userId);
    if (!activeVersion) {
      console.log('No active version found');
      return NextResponse.json(
        { error: 'No active version found' },
        { status: 404 }
      );
    }

    console.log('Deleting assessment data for version:', activeVersion.id);

    // Delete from version-specific table
    deleteVersionAssessmentData(activeVersion.id, assessmentType);
    console.log('Deleted from version-specific table');

    // Also delete from legacy table for backward compatibility
    deleteAssessmentData(user.userId, assessmentType);
    console.log('Deleted from legacy table for compatibility');

    console.log('=== ASSESSMENT API DELETE SUCCESS ===');
    return NextResponse.json(
      { 
        message: 'Assessment data reset successfully',
        activeVersion: {
          id: activeVersion.id,
          name: activeVersion.versionName
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== ASSESSMENT API DELETE ERROR ===');
    console.error('Delete assessment data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset assessment data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
