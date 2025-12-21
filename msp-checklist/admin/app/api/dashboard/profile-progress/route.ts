import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';
import { getVersions, getVersionAssessmentData } from '@/lib/version-db';

export interface ProfileAssessmentItem {
  id: string;
  category: string;
  title: string;
  description: string;
  isMandatory: boolean;
  evidenceRequired: string;
  met: boolean | null;
  partnerResponse?: string;
  lastUpdated?: string;
}

export interface ProfileProgress {
  total: number;
  completed: number;
  mandatory: number;
  mandatoryCompleted: number;
  percentage: number;
  mandatoryPercentage: number;
  items: ProfileAssessmentItem[];
}

export interface UserProfileProgress {
  userId: number;
  userName: string;
  email: string;
  organization?: string;
  status: string;
  profileId: number;
  profileName: string;
  isActiveProfile: boolean;
  prerequisites: ProfileProgress;
  technical: ProfileProgress;
  overall: ProfileProgress;
  lastActivity?: string;
  inProgressItems: ProfileAssessmentItem[];
  completedItems: ProfileAssessmentItem[];
  pendingMandatoryItems: ProfileAssessmentItem[];
}

export interface ProfileSummary {
  profileId: number;
  profileName: string;
  description?: string;
  isActive: boolean;
  totalUsers: number;
  activeUsers: number;
  completedUsers: number;
  averageProgress: number;
  averageMandatoryProgress: number;
  userProgress: UserProfileProgress[];
}

export interface ProfileProgressSummary {
  totalProfiles: number;
  totalUsers: number;
  profileSummaries: ProfileSummary[];
}

function calculateProfileProgress(assessmentData: any[]): ProfileProgress {
  const total = assessmentData.length;
  const completed = assessmentData.filter(item => item.met === true).length;
  const mandatory = assessmentData.filter(item => item.isMandatory).length;
  const mandatoryCompleted = assessmentData.filter(item => item.isMandatory && item.met === true).length;
  
  const items: ProfileAssessmentItem[] = assessmentData.map(item => ({
    id: item.id,
    category: item.category,
    title: item.title,
    description: item.description,
    isMandatory: item.isMandatory,
    evidenceRequired: item.evidenceRequired,
    met: item.met,
    partnerResponse: item.partnerResponse,
    lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
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
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    const users = getAllUsers();
    const profileSummaries: ProfileSummary[] = [];

    // Get all users (excluding admin roles)
    const regularUsers = users.filter(user => !['operator', 'admin', 'superadmin'].includes(user.role));

    if (profileId) {
      // Get progress for specific profile
      const numericProfileId = parseInt(profileId, 10);
      if (isNaN(numericProfileId)) {
        return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
      }

      const userProgress: UserProfileProgress[] = [];

      for (const user of regularUsers) {
        const userProfiles = getVersions(user.id, true); // Include inactive profiles
        const targetProfile = userProfiles.find(p => p.id === numericProfileId);
        
        if (!targetProfile) continue; // Skip users who don't have this profile

        const prerequisitesData = getVersionAssessmentData(numericProfileId, 'prerequisites');
        const technicalData = getVersionAssessmentData(numericProfileId, 'technical');

        const prerequisites = calculateProfileProgress(prerequisitesData);
        const technical = calculateProfileProgress(technicalData);

        // Calculate overall progress
        const allData = [...prerequisitesData, ...technicalData];
        const overall = calculateProfileProgress(allData);

        // Find last activity
        const lastActivity = allData
          .filter(item => item.lastUpdated)
          .sort((a, b) => {
            const aTime = new Date(a.lastUpdated!).getTime();
            const bTime = new Date(b.lastUpdated!).getTime();
            return bTime - aTime;
          })[0]?.lastUpdated;

        // Categorize items
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
            lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
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
            lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
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
            lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
          }));

        userProgress.push({
          userId: user.id,
          userName: user.name,
          email: user.email,
          organization: user.organization,
          status: user.status,
          profileId: targetProfile.id,
          profileName: targetProfile.versionName,
          isActiveProfile: targetProfile.isActive,
          prerequisites,
          technical,
          overall,
          lastActivity: lastActivity?.toISOString ? lastActivity.toISOString() : lastActivity,
          inProgressItems,
          completedItems,
          pendingMandatoryItems
        });
      }

      // Calculate summary for this profile
      const activeUsers = userProgress.filter(u => u.status === 'active').length;
      const completedUsers = userProgress.filter(u => u.overall.mandatoryPercentage === 100).length;
      
      // Calculate average progress based on total items vs completed items across all users
      const totalItems = userProgress.reduce((sum, u) => sum + u.overall.total, 0);
      const totalCompletedItems = userProgress.reduce((sum, u) => sum + u.overall.completed, 0);
      const totalMandatoryItems = userProgress.reduce((sum, u) => sum + u.overall.mandatory, 0);
      const totalMandatoryCompletedItems = userProgress.reduce((sum, u) => sum + u.overall.mandatoryCompleted, 0);

      // Get profile info
      const sampleProfile = userProgress[0];
      if (!sampleProfile) {
        return NextResponse.json({ error: 'No users found for this profile' }, { status: 404 });
      }

      const profileSummary: ProfileSummary = {
        profileId: numericProfileId,
        profileName: sampleProfile.profileName,
        description: undefined, // Could be added later
        isActive: sampleProfile.isActiveProfile,
        totalUsers: userProgress.length,
        activeUsers,
        completedUsers,
        averageProgress: totalItems > 0 ? Math.round((totalCompletedItems / totalItems) * 100) : 0,
        averageMandatoryProgress: totalMandatoryItems > 0 ? Math.round((totalMandatoryCompletedItems / totalMandatoryItems) * 100) : 0,
        userProgress: userProgress.sort((a, b) => b.overall.percentage - a.overall.percentage)
      };

      return NextResponse.json(profileSummary);
    } else {
      // Get progress for all profiles
      const allProfileIds = new Set<number>();
      
      // Collect all profile IDs from all users
      for (const user of regularUsers) {
        const userProfiles = getVersions(user.id, true);
        userProfiles.forEach(profile => allProfileIds.add(profile.id));
      }

      // Process each profile
      for (const profileId of allProfileIds) {
        const userProgress: UserProfileProgress[] = [];

        for (const user of regularUsers) {
          const userProfiles = getVersions(user.id, true);
          const targetProfile = userProfiles.find(p => p.id === profileId);
          
          if (!targetProfile) continue;

          const prerequisitesData = getVersionAssessmentData(profileId, 'prerequisites');
          const technicalData = getVersionAssessmentData(profileId, 'technical');

          const prerequisites = calculateProfileProgress(prerequisitesData);
          const technical = calculateProfileProgress(technicalData);
          const allData = [...prerequisitesData, ...technicalData];
          const overall = calculateProfileProgress(allData);

          const lastActivity = allData
            .filter(item => item.lastUpdated)
            .sort((a, b) => {
              const aTime = new Date(a.lastUpdated!).getTime();
              const bTime = new Date(b.lastUpdated!).getTime();
              return bTime - aTime;
            })[0]?.lastUpdated;

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
              lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
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
              lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
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
              lastUpdated: item.lastUpdated?.toISOString ? item.lastUpdated.toISOString() : item.lastUpdated
            }));

          userProgress.push({
            userId: user.id,
            userName: user.name,
            email: user.email,
            organization: user.organization,
            status: user.status,
            profileId: targetProfile.id,
            profileName: targetProfile.versionName,
            isActiveProfile: targetProfile.isActive,
            prerequisites,
            technical,
            overall,
            lastActivity: lastActivity?.toISOString ? lastActivity.toISOString() : lastActivity,
            inProgressItems,
            completedItems,
            pendingMandatoryItems
          });
        }

        if (userProgress.length > 0) {
          const activeUsers = userProgress.filter(u => u.status === 'active').length;
          const completedUsers = userProgress.filter(u => u.overall.mandatoryPercentage === 100).length;
          // Calculate average progress based on total items vs completed items across all users
          const totalItems = userProgress.reduce((sum, u) => sum + u.overall.total, 0);
          const totalCompletedItems = userProgress.reduce((sum, u) => sum + u.overall.completed, 0);
          const totalMandatoryItems = userProgress.reduce((sum, u) => sum + u.overall.mandatory, 0);
          const totalMandatoryCompletedItems = userProgress.reduce((sum, u) => sum + u.overall.mandatoryCompleted, 0);

          const sampleProfile = userProgress[0];
          
          profileSummaries.push({
            profileId,
            profileName: sampleProfile.profileName,
            description: undefined,
            isActive: sampleProfile.isActiveProfile,
            totalUsers: userProgress.length,
            activeUsers,
            completedUsers,
            averageProgress: totalItems > 0 ? Math.round((totalCompletedItems / totalItems) * 100) : 0,
            averageMandatoryProgress: totalMandatoryItems > 0 ? Math.round((totalMandatoryCompletedItems / totalMandatoryItems) * 100) : 0,
            userProgress: userProgress.sort((a, b) => b.overall.percentage - a.overall.percentage)
          });
        }
      }

      const summary: ProfileProgressSummary = {
        totalProfiles: profileSummaries.length,
        totalUsers: regularUsers.length,
        profileSummaries: profileSummaries.sort((a, b) => b.averageMandatoryProgress - a.averageMandatoryProgress)
      };

      return NextResponse.json(summary);
    }
  } catch (error) {
    console.error('Failed to get profile progress:', error);
    return NextResponse.json(
      { error: 'Failed to get profile progress' },
      { status: 500 }
    );
  }
}