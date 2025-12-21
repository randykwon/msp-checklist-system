import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getVersion,
  activateVersion,
  getActiveVersion,
  getVersionAssessmentData
} from '@/lib/version-db';

// POST: Activate specific version
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  console.log('=== ACTIVATE VERSION API START ===');
  
  try {
    // Handle both Promise and direct params more robustly
    let resolvedParams: { id: string };
    
    if (context.params && typeof context.params === 'object' && 'then' in context.params) {
      // It's a Promise
      resolvedParams = await context.params;
    } else {
      // It's a direct object
      resolvedParams = context.params as { id: string };
    }
    
    console.log('1. Resolved params:', resolvedParams);
    
    const user = await getCurrentUser();
    console.log('2. Current user:', user ? { id: user.userId, email: user.email } : 'null');
    
    if (!user) {
      console.log('3. User not authenticated, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('4. Raw version ID from params:', resolvedParams.id);
    console.log('5. Type of params.id:', typeof resolvedParams.id);
    
    // More robust parsing with validation
    const rawId = resolvedParams.id;
    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      console.log('6. Empty or invalid version ID string');
      return NextResponse.json(
        { error: `Invalid version ID: ${rawId}` },
        { status: 400 }
      );
    }
    
    const versionId = parseInt(rawId, 10);
    console.log('6. Parsed version ID:', versionId, 'isNaN:', isNaN(versionId));
    
    if (isNaN(versionId) || versionId <= 0) {
      console.log('7. Invalid version ID after parsing, returning 400');
      return NextResponse.json(
        { error: `Invalid version ID: ${rawId} (parsed as ${versionId})` },
        { status: 400 }
      );
    }

    console.log('8. Getting version from database...');
    const version = getVersion(versionId);
    console.log('9. Found version:', version);
    
    if (!version) {
      console.log('10. Version not found, returning 404');
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Check ownership
    console.log('11. Checking ownership - version.userId:', version.userId, 'user.userId:', user.userId);
    if (version.userId !== user.userId) {
      console.log('12. Access denied, returning 403');
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if already active
    console.log('13. Checking if already active - version.isActive:', version.isActive);
    if (version.isActive) {
      console.log('14. Version already active, returning success');
      return NextResponse.json(
        { message: 'Version is already active', version },
        { status: 200 }
      );
    }

    console.log('15. Activating version...');
    
    // Activate the version
    activateVersion(user.userId, versionId);
    console.log('16. Version activated successfully');

    // Get the updated version with progress summary
    console.log('17. Getting assessment data for progress summary...');
    const prerequisitesData = getVersionAssessmentData(versionId, 'prerequisites');
    const technicalData = getVersionAssessmentData(versionId, 'technical');
    
    const totalItems = prerequisitesData.length + technicalData.length;
    const completedItems = [...prerequisitesData, ...technicalData].filter(item => item.met !== null).length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    console.log('18. Progress summary calculated:', { totalItems, completedItems, completionPercentage });

    const updatedVersionWithProgress = {
      ...getVersion(versionId),
      progressSummary: {
        totalItems,
        completedItems,
        completionPercentage,
        prerequisitesCount: prerequisitesData.length,
        technicalCount: technicalData.length
      }
    };

    console.log('19. Returning success response');
    const response = NextResponse.json(
      { 
        message: 'Version activated successfully',
        version: updatedVersionWithProgress,
        switchedFrom: getActiveVersion(user.userId)
      },
      { status: 200 }
    );
    
    console.log('=== ACTIVATE VERSION API SUCCESS ===');
    return response;

  } catch (error) {
    console.error('=== ACTIVATE VERSION API ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown message');
    
    const errorResponse = NextResponse.json(
      { 
        error: 'Failed to activate version',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
    
    console.log('Returning error response');
    return errorResponse;
  }
}