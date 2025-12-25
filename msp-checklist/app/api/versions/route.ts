import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getVersions,
  createVersion,
  migrateExistingUserData,
  getActiveVersion
} from '@/lib/version-db';

// GET: List all versions for current user
export async function GET(request: NextRequest) {
  console.log('=== GET /api/versions START ===');
  try {
    console.log('GET /api/versions called');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.userId, user.email);

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const sortBy = searchParams.get('sort_by') || 'updated_at';

    console.log('Query params:', { includeInactive, sortBy });

    // Check if user has any versions, if not migrate existing data
    let versions = getVersions(user.userId, includeInactive);
    console.log('Initial versions found:', versions.length);

    if (versions.length === 0) {
      console.log('No versions found, attempting migration...');
      const defaultVersion = migrateExistingUserData(user.userId);
      if (defaultVersion) {
        console.log('Migration successful, created default version:', defaultVersion.versionName);
        versions = [defaultVersion];
      } else {
        console.log('Migration failed or no data to migrate');
      }
    }

    // Sort versions
    versions.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.versionName.localeCompare(b.versionName);
        case 'created_at':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated_at':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    // Get progress summary for each version
    const versionsWithProgress = versions.map(version => {
      try {
        // Get assessment data for this version to calculate progress
        const { getVersionAssessmentData } = require('@/lib/version-db');
        const prerequisitesData = getVersionAssessmentData(version.id, 'prerequisites');
        const technicalData = getVersionAssessmentData(version.id, 'technical');
        
        const totalItems = prerequisitesData.length + technicalData.length;
        const completedItems = [...prerequisitesData, ...technicalData].filter(item => item.met !== null).length;
        const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        return {
          ...version,
          progressSummary: {
            totalItems,
            completedItems,
            completionPercentage,
            prerequisitesCount: prerequisitesData.length,
            technicalCount: technicalData.length
          }
        };
      } catch (error) {
        console.error(`Error calculating progress for version ${version.id}:`, error);
        return {
          ...version,
          progressSummary: {
            totalItems: 0,
            completedItems: 0,
            completionPercentage: 0,
            prerequisitesCount: 0,
            technicalCount: 0
          }
        };
      }
    });

    const activeVersion = getActiveVersion(user.userId);
    console.log('Active version:', activeVersion?.versionName || 'None');
    console.log('Returning versions:', versionsWithProgress.length);
    console.log('=== GET /api/versions END ===');

    return NextResponse.json({ 
      versions: versionsWithProgress,
      activeVersion: activeVersion
    }, { status: 200 });
  } catch (error) {
    console.error('Get versions error:', error);
    console.log('=== GET /api/versions ERROR ===');
    return NextResponse.json(
      { error: 'Failed to get versions' },
      { status: 500 }
    );
  }
}

// POST: Create new version
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { name, description, templateId, copyFromVersionId } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Version name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate names
    const existingVersions = getVersions(user.userId);
    if (existingVersions.some(v => v.versionName.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'Version name already exists' },
        { status: 409 }
      );
    }

    let newVersion;

    if (copyFromVersionId) {
      // Duplicate existing version
      const { duplicateVersion } = await import('@/lib/version-db');
      newVersion = duplicateVersion(copyFromVersionId, name.trim(), user.userId);
    } else if (templateId) {
      // Create from template (TODO: implement template functionality)
      newVersion = createVersion(user.userId, name.trim(), description);
    } else {
      // Create empty version
      newVersion = createVersion(user.userId, name.trim(), description);
    }

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (error: any) {
    console.error('Create version error:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Version name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}