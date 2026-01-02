import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getAssessmentData } from '@/lib/db';

export interface AssessmentItemDetail {
  id: string;
  category: string;
  title: string;
  description: string;
  isMandatory: boolean;
  evidenceRequired: string;
  met: boolean | null;
  partnerResponse?: string;
  lastUpdated?: string;
  evidenceFiles?: EvidenceFile[];
  evaluation?: EvaluationData;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  base64Data: string;
  uploadedAt: string;
  extractedText?: string;
}

export interface EvaluationData {
  score: number;
  feedback: string;
  evaluatedAt: string;
}

export interface UserAssessmentProgress {
  userId: number;
  userName: string;
  email: string;
  organization?: string;
  status: string;
  prerequisites: {
    total: number;
    completed: number;
    mandatory: number;
    mandatoryCompleted: number;
    percentage: number;
    mandatoryPercentage: number;
    items: AssessmentItemDetail[];
  };
  technical: {
    total: number;
    completed: number;
    mandatory: number;
    mandatoryCompleted: number;
    percentage: number;
    mandatoryPercentage: number;
    items: AssessmentItemDetail[];
  };
  overall: {
    total: number;
    completed: number;
    mandatory: number;
    mandatoryCompleted: number;
    percentage: number;
    mandatoryPercentage: number;
  };
  lastActivity?: string;
  inProgressItems: AssessmentItemDetail[];
  completedItems: AssessmentItemDetail[];
  pendingMandatoryItems: AssessmentItemDetail[];
}

export interface AssessmentProgressSummary {
  totalUsers: number;
  activeUsers: number;
  completedUsers: number;
  averageProgress: number;
  averageMandatoryProgress: number;
  userProgress: UserAssessmentProgress[];
}

function calculateProgress(assessmentData: any[]) {
  const total = assessmentData.length;
  const completed = assessmentData.filter(item => item.met === true).length;
  const mandatory = assessmentData.filter(item => item.isMandatory).length;
  const mandatoryCompleted = assessmentData.filter(item => item.isMandatory && item.met === true).length;
  
  // Convert assessment data to detailed format
  const items: AssessmentItemDetail[] = assessmentData.map(item => ({
    id: item.id,
    category: item.category,
    title: item.title,
    description: item.description,
    isMandatory: item.isMandatory,
    evidenceRequired: item.evidenceRequired,
    met: item.met,
    partnerResponse: item.partnerResponse,
    lastUpdated: item.lastUpdated?.toISOString(),
    evidenceFiles: item.evidenceFiles,
    evaluation: item.evaluation
  }));
  
  return {
    total,
    completed,
    mandatory,
    mandatoryCompleted,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    mandatoryPercentage: mandatory > 0 ? Math.round((mandatoryCompleted / mandatory) * 100) : 0,
    items
  };
}

export async function GET(request: NextRequest) {
  try {
    const users = getAllUsers();
    const userProgress: UserAssessmentProgress[] = [];

    for (const user of users) {
      if (['operator', 'admin', 'superadmin'].includes(user.role)) continue; // Skip admin users

      const prerequisitesData = getAssessmentData(user.id, 'prerequisites');
      const technicalData = getAssessmentData(user.id, 'technical');

      const prerequisites = calculateProgress(prerequisitesData);
      const technical = calculateProgress(technicalData);

      // Calculate overall progress
      const allData = [...prerequisitesData, ...technicalData];
      const overall = calculateProgress(allData);

      // Find last activity
      const lastActivity = allData
        .filter(item => item.lastUpdated)
        .sort((a, b) => new Date(b.lastUpdated!).getTime() - new Date(a.lastUpdated!).getTime())[0]?.lastUpdated;

      // Categorize items for detailed view
      const inProgressItems = allData
        .filter(item => item.met === null || (item.met === false && item.partnerResponse))
        .map(item => ({
          id: item.id,
          category: item.category,
          title: item.title,
          description: item.description,
          isMandatory: item.isMandatory,
          evidenceRequired: item.evidenceRequired,
          met: item.met,
          partnerResponse: item.partnerResponse,
          lastUpdated: item.lastUpdated?.toISOString(),
          evidenceFiles: item.evidenceFiles,
          evaluation: item.evaluation
        }));

      const completedItems = allData
        .filter(item => item.met === true)
        .map(item => ({
          id: item.id,
          category: item.category,
          title: item.title,
          description: item.description,
          isMandatory: item.isMandatory,
          evidenceRequired: item.evidenceRequired,
          met: item.met,
          partnerResponse: item.partnerResponse,
          lastUpdated: item.lastUpdated?.toISOString(),
          evidenceFiles: item.evidenceFiles,
          evaluation: item.evaluation
        }));

      const pendingMandatoryItems = allData
        .filter(item => item.isMandatory && item.met !== true)
        .map(item => ({
          id: item.id,
          category: item.category,
          title: item.title,
          description: item.description,
          isMandatory: item.isMandatory,
          evidenceRequired: item.evidenceRequired,
          met: item.met,
          partnerResponse: item.partnerResponse,
          lastUpdated: item.lastUpdated?.toISOString(),
          evidenceFiles: item.evidenceFiles,
          evaluation: item.evaluation
        }));

      userProgress.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        organization: user.organization,
        status: user.status,
        prerequisites,
        technical,
        overall,
        lastActivity: lastActivity?.toISOString(),
        inProgressItems,
        completedItems,
        pendingMandatoryItems
      });
    }

    // Calculate summary statistics
    const activeUsers = userProgress.filter(u => u.status === 'active').length;
    const completedUsers = userProgress.filter(u => 
      u.overall.mandatoryPercentage === 100
    ).length;

    // Calculate average progress based on total items vs completed items across all users
    const totalItems = userProgress.reduce((sum, u) => sum + u.overall.total, 0);
    const totalCompletedItems = userProgress.reduce((sum, u) => sum + u.overall.completed, 0);
    const totalMandatoryItems = userProgress.reduce((sum, u) => sum + u.overall.mandatory, 0);
    const totalMandatoryCompletedItems = userProgress.reduce((sum, u) => sum + u.overall.mandatoryCompleted, 0);

    const summary: AssessmentProgressSummary = {
      totalUsers: userProgress.length,
      activeUsers,
      completedUsers,
      averageProgress: totalItems > 0 ? Math.round((totalCompletedItems / totalItems) * 100) : 0,
      averageMandatoryProgress: totalMandatoryItems > 0 ? Math.round((totalMandatoryCompletedItems / totalMandatoryItems) * 100) : 0,
      userProgress: userProgress.sort((a, b) => b.overall.percentage - a.overall.percentage)
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to get assessment progress:', error);
    return NextResponse.json(
      { error: 'Failed to get assessment progress' },
      { status: 500 }
    );
  }
}