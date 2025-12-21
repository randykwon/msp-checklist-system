import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getVersion,
  duplicateVersion,
  getVersions
} from '@/lib/version-db';

// POST: Duplicate existing version
export async function POST(
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

    const sourceVersionId = parseInt(resolvedParams.id, 10);
    if (isNaN(sourceVersionId) || sourceVersionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const sourceVersion = getVersion(sourceVersionId);
    if (!sourceVersion) {
      return NextResponse.json(
        { error: 'Source version not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (sourceVersion.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { newName, description } = await request.json();

    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return NextResponse.json(
        { error: 'New version name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate names
    const existingVersions = getVersions(user.userId);
    if (existingVersions.some(v => v.versionName.toLowerCase() === newName.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'Version name already exists' },
        { status: 409 }
      );
    }

    // Duplicate the version
    const newVersion = duplicateVersion(sourceVersionId, newName.trim(), user.userId);

    // Update description if provided
    if (description) {
      const { updateVersion } = await import('@/lib/version-db');
      updateVersion(newVersion.id, { description });
    }

    // Get the updated version with description
    const finalVersion = getVersion(newVersion.id);

    return NextResponse.json(
      { 
        message: 'Version duplicated successfully',
        version: finalVersion,
        sourceVersion: sourceVersion
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Duplicate version error:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Version name already exists' },
        { status: 409 }
      );
    }
    
    if (error.message.includes('Source version not found')) {
      return NextResponse.json(
        { error: 'Source version not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to duplicate version' },
      { status: 500 }
    );
  }
}