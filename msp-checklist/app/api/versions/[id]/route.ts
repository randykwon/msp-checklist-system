import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getVersion,
  updateVersion,
  deleteVersion,
  getVersionAssessmentData
} from '@/lib/version-db';

// GET: Get specific version details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const versionId = parseInt(resolvedParams.id, 10);
    if (isNaN(versionId) || versionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const version = getVersion(versionId);
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (version.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get progress summary
    const prerequisitesData = getVersionAssessmentData(versionId, 'prerequisites');
    const technicalData = getVersionAssessmentData(versionId, 'technical');
    
    const totalItems = prerequisitesData.length + technicalData.length;
    const completedItems = [...prerequisitesData, ...technicalData].filter(item => item.met !== null).length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const versionWithProgress = {
      ...version,
      progressSummary: {
        totalItems,
        completedItems,
        completionPercentage,
        prerequisitesCount: prerequisitesData.length,
        technicalCount: technicalData.length
      }
    };

    return NextResponse.json({ version: versionWithProgress }, { status: 200 });
  } catch (error) {
    console.error('Get version error:', error);
    return NextResponse.json(
      { error: 'Failed to get version' },
      { status: 500 }
    );
  }
}

// PUT: Update version metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const versionId = parseInt(resolvedParams.id, 10);
    if (isNaN(versionId) || versionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const version = getVersion(versionId);
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (version.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { name, description, isActive } = await request.json();
    const updates: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid version name' },
          { status: 400 }
        );
      }
      
      // Check for duplicate names (excluding current version)
      const { getVersions } = await import('@/lib/version-db');
      const existingVersions = getVersions(user.userId);
      if (existingVersions.some(v => v.id !== versionId && v.versionName.toLowerCase() === name.trim().toLowerCase())) {
        return NextResponse.json(
          { error: 'Version name already exists' },
          { status: 409 }
        );
      }
      
      updates.versionName = name.trim();
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    updateVersion(versionId, updates);

    const updatedVersion = getVersion(versionId);
    return NextResponse.json({ version: updatedVersion }, { status: 200 });
  } catch (error: any) {
    console.error('Update version error:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Version name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    );
  }
}

// DELETE: Delete version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const versionId = parseInt(resolvedParams.id, 10);
    if (isNaN(versionId) || versionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const version = getVersion(versionId);
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (version.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // If deleting the active version and there are other versions, activate another one first
    if (version.isActive) {
      const { getVersions } = await import('@/lib/version-db');
      const allVersions = getVersions(user.userId);
      
      if (allVersions.length > 1) {
        const otherVersion = allVersions.find(v => v.id !== versionId);
        if (otherVersion) {
          console.log('Auto-activating another version before deletion:', otherVersion.versionName);
          const { activateVersion } = await import('@/lib/version-db');
          activateVersion(user.userId, otherVersion.id);
        }
      }
    }

    deleteVersion(versionId);

    return NextResponse.json(
      { message: 'Version deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete version error:', error);
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}