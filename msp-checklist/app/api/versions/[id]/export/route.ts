import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getVersion,
  getVersionAssessmentData
} from '@/lib/version-db';

// GET: Export version data
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

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    // Get assessment data
    const prerequisitesData = getVersionAssessmentData(versionId, 'prerequisites');
    const technicalData = getVersionAssessmentData(versionId, 'technical');

    // Calculate progress summary
    const totalItems = prerequisitesData.length + technicalData.length;
    const completedItems = [...prerequisitesData, ...technicalData].filter(item => item.met !== null).length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const exportData = {
      version: '1.0',
      export_date: new Date().toISOString(),
      version_info: {
        id: version.id,
        name: version.versionName,
        description: version.description,
        created_at: version.createdAt,
        updated_at: version.updatedAt
      },
      assessment_data: {
        prerequisites: prerequisitesData,
        technical: technicalData
      },
      metadata: {
        total_items: totalItems,
        completed_items: completedItems,
        completion_percentage: completionPercentage,
        prerequisites_count: prerequisitesData.length,
        technical_count: technicalData.length
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows = [];
      
      // Header
      csvRows.push([
        'Assessment Type',
        'Item ID',
        'Category',
        'Title',
        'Description',
        'Is Mandatory',
        'Evidence Required',
        'Met',
        'Partner Response',
        'Last Updated'
      ].join(','));

      // Prerequisites data
      prerequisitesData.forEach(item => {
        csvRows.push([
          'prerequisites',
          item.id,
          `"${item.category}"`,
          `"${item.title}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          item.isMandatory ? 'Yes' : 'No',
          `"${item.evidenceRequired.replace(/"/g, '""')}"`,
          item.met === null ? 'N/A' : item.met ? 'Yes' : 'No',
          `"${(item.partnerResponse || '').replace(/"/g, '""')}"`,
          item.lastUpdated.toISOString()
        ].join(','));
      });

      // Technical data
      technicalData.forEach(item => {
        csvRows.push([
          'technical',
          item.id,
          `"${item.category}"`,
          `"${item.title}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          item.isMandatory ? 'Yes' : 'No',
          `"${item.evidenceRequired.replace(/"/g, '""')}"`,
          item.met === null ? 'N/A' : item.met ? 'Yes' : 'No',
          `"${(item.partnerResponse || '').replace(/"/g, '""')}"`,
          item.lastUpdated.toISOString()
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const fileName = `${version.versionName.replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      });
    } else {
      // JSON format
      const fileName = `${version.versionName.replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      });
    }
  } catch (error) {
    console.error('Export version error:', error);
    return NextResponse.json(
      { error: 'Failed to export version' },
      { status: 500 }
    );
  }
}