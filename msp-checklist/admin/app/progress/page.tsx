'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { UserAssessmentProgress, AssessmentProgressSummary } from '@/app/api/dashboard/assessment-progress/route';
import { ProfileProgressSummary, ProfileSummary, UserProfileProgress } from '@/app/api/dashboard/profile-progress/route';

type ViewMode = 'overall' | 'profile';

export default function ProgressPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overall');
  const [progressData, setProgressData] = useState<AssessmentProgressSummary | null>(null);
  const [profileProgressData, setProfileProgressData] = useState<ProfileProgressSummary | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed' | 'incomplete'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'lastActivity'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UserAssessmentProgress | UserProfileProgress | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'inprogress' | 'completed' | 'all'>('pending');

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setIsLoading(true);
      
      // Load overall progress
      const overallResponse = await fetch('/api/dashboard/assessment-progress');
      if (overallResponse.ok) {
        const overallData = await overallResponse.json();
        setProgressData(overallData);
      }

      // Load profile progress
      const profileResponse = await fetch('/api/dashboard/profile-progress');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfileProgressData(profileData);
      }
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileDetails = async (profileId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/profile-progress?profileId=${profileId}`);
      if (response.ok) {
        const profileData = await response.json();
        setSelectedProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to load profile details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredUsers = () => {
    let users: (UserAssessmentProgress | UserProfileProgress)[] = [];
    
    if (viewMode === 'overall' && progressData) {
      users = progressData.userProgress;
    } else if (viewMode === 'profile' && selectedProfile) {
      users = selectedProfile.userProgress;
    }
    
    let filtered = users;
    
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(user => user.status === 'active');
        break;
      case 'completed':
        filtered = filtered.filter(user => user.overall.mandatoryPercentage === 100);
        break;
      case 'incomplete':
        filtered = filtered.filter(user => user.overall.mandatoryPercentage < 100);
        break;
    }

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.userName.toLowerCase();
          bValue = b.userName.toLowerCase();
          break;
        case 'progress':
          aValue = a.overall.mandatoryPercentage;
          bValue = b.overall.mandatoryPercentage;
          break;
        case 'lastActivity':
          aValue = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          bValue = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '활동 없음';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '오늘';
    if (diffDays === 2) return '어제';
    if (diffDays <= 7) return `${diffDays}일 전`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}주 전`;
    return `${Math.ceil(diffDays / 30)}개월 전`;
  };

  const handleViewDetails = (user: UserAssessmentProgress | UserProfileProgress) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const getItemStatusIcon = (item: any) => {
    if (item.met === true) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (item.met === false) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const getItemStatusText = (item: any) => {
    if (item.met === true) return '완료';
    if (item.met === false) return '미완료';
    return '진행중';
  };

  const getItemStatusColor = (item: any) => {
    if (item.met === true) return 'bg-green-100 text-green-800';
    if (item.met === false) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  // Type guards
  const isOverallData = (data: AssessmentProgressSummary | ProfileSummary | null): data is AssessmentProgressSummary => {
    return data !== null && 'totalUsers' in data && 'userProgress' in data && 'activeUsers' in data;
  };

  const isProfileData = (data: AssessmentProgressSummary | ProfileSummary | null): data is ProfileSummary => {
    return data !== null && 'profileId' in data && 'userProgress' in data && 'profileName' in data;
  };

  const getCurrentTabItems = () => {
    if (!selectedUser) return [];
    
    switch (activeTab) {
      case 'pending':
        return selectedUser.pendingMandatoryItems;
      case 'inprogress':
        return selectedUser.inProgressItems;
      case 'completed':
        return selectedUser.completedItems;
      case 'all':
        return [...selectedUser.prerequisites.items, ...selectedUser.technical.items];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!progressData && !profileProgressData) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">진행 상황 데이터를 불러올 수 없습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  const filteredUsers = getFilteredUsers();
  const currentData: AssessmentProgressSummary | ProfileSummary | null = viewMode === 'overall' ? progressData : selectedProfile;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment 진행 현황</h1>
              <p className="text-gray-600">
                사용자별 MSP 평가 진행 상황을 모니터링합니다
              </p>
            </div>
            <button
              onClick={loadProgressData}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로고침
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">보기 모드</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setViewMode('overall');
                  setSelectedProfile(null);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'overall'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                전체 진행상황
              </button>
              <button
                onClick={() => setViewMode('profile')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'profile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                프로파일별 진행상황
              </button>
            </div>
          </div>

          {/* Profile Selection */}
          {viewMode === 'profile' && profileProgressData && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">프로파일 선택</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileProgressData.profileSummaries.map((profile) => (
                  <button
                    key={profile.profileId}
                    onClick={() => loadProfileDetails(profile.profileId)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedProfile?.profileId === profile.profileId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{profile.profileName}</h3>
                      {profile.isActive && (
                        <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
                          활성
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>사용자: {profile.totalUsers}명</div>
                      <div>평균 진행률: {profile.averageMandatoryProgress}%</div>
                      <div>완료 사용자: {profile.completedUsers}명</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {currentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">
                      {viewMode === 'profile' && selectedProfile ? `${selectedProfile.profileName} 사용자` : '총 사용자'}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        if (!currentData) return 0;
                        if (isOverallData(currentData)) {
                          return (currentData as AssessmentProgressSummary).totalUsers;
                        }
                        if (isProfileData(currentData)) {
                          return (currentData as ProfileSummary).userProgress.length;
                        }
                        return 0;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">활성 사용자</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        if (!currentData) return 0;
                        if (isOverallData(currentData)) {
                          return (currentData as AssessmentProgressSummary).activeUsers;
                        }
                        if (isProfileData(currentData)) {
                          return (currentData as ProfileSummary).userProgress.filter(u => u.status === 'active').length;
                        }
                        return 0;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">완료 사용자</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        if (!currentData) return 0;
                        if (isOverallData(currentData)) {
                          return (currentData as AssessmentProgressSummary).completedUsers;
                        }
                        if (isProfileData(currentData)) {
                          return (currentData as ProfileSummary).userProgress.filter(u => u.overall.mandatoryPercentage === 100).length;
                        }
                        return 0;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">전체 완료율</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {(() => {
                        if (!currentData) return 0;
                        if (isOverallData(currentData)) {
                          return (currentData as AssessmentProgressSummary).averageMandatoryProgress;
                        }
                        if (isProfileData(currentData)) {
                          const profileData = currentData as ProfileSummary;
                          return profileData.userProgress.length > 0 
                            ? Math.round(profileData.userProgress.reduce((sum, u) => sum + u.overall.mandatoryPercentage, 0) / profileData.userProgress.length) 
                            : 0;
                        }
                        return 0;
                      })()}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">필터</label>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">전체 사용자</option>
                  <option value="active">활성 사용자</option>
                  <option value="completed">완료 사용자</option>
                  <option value="incomplete">미완료 사용자</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-');
                    setSortBy(by as any);
                    setSortOrder(order as any);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="progress-desc">진행률 높은순</option>
                  <option value="progress-asc">진행률 낮은순</option>
                  <option value="name-asc">이름 순</option>
                  <option value="lastActivity-desc">최근 활동순</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredUsers.length}명의 사용자 표시
            </div>
          </div>
        </div>

        {/* User Progress Table */}
        {(viewMode === 'overall' || selectedProfile) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewMode === 'profile' && selectedProfile 
                    ? `${selectedProfile.profileName} - 사용자별 진행 현황`
                    : '사용자별 진행 현황'
                  }
                </h2>
                {viewMode === 'profile' && selectedProfile && (
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    selectedProfile.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedProfile.isActive ? '활성 프로파일' : '비활성 프로파일'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    {viewMode === 'profile' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        프로파일 상태
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전체 진행률
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      필수 항목
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사전요구사항
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      기술검증
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최근 활동
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={`${user.userId}-${viewMode === 'profile' && 'profileId' in user ? user.profileId : 'overall'}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.organization && (
                            <div className="text-xs text-gray-400">{user.organization}</div>
                          )}
                        </div>
                      </td>
                      {viewMode === 'profile' && 'isActiveProfile' in user && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActiveProfile 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isActiveProfile ? '활성 프로파일' : '비활성 프로파일'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {user.status === 'active' ? '활성' : user.status === 'suspended' ? '일시중지' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(user.overall.percentage)}`}
                              style={{ width: `${user.overall.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.overall.percentage}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {user.overall.completed}/{user.overall.total} 완료
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(user.overall.mandatoryPercentage)}`}
                              style={{ width: `${user.overall.mandatoryPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.overall.mandatoryPercentage}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {user.overall.mandatoryCompleted}/{user.overall.mandatory} 완료
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.prerequisites.percentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.prerequisites.completed}/{user.prerequisites.total}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.technical.percentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.technical.completed}/{user.technical.total}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.lastActivity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 상세 보기 모달 */}
        {showDetailModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white min-h-[90vh]">
              <div className="flex flex-col h-full">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser.userName} 상세 진행 현황</h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-600">{selectedUser.email}</span>
                      {selectedUser.organization && (
                        <span className="text-sm text-gray-600">• {selectedUser.organization}</span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status === 'active' ? '활성' : selectedUser.status === 'suspended' ? '일시중지' : '비활성'}
                      </span>
                      {viewMode === 'profile' && 'profileName' in selectedUser && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          📋 {selectedUser.profileName}
                        </span>
                      )}
                      {viewMode === 'profile' && 'isActiveProfile' in selectedUser && selectedUser.isActiveProfile && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          활성 프로파일
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedUser(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 진행률 요약 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-blue-900">전체 진행률</h4>
                      <div className="text-3xl font-bold text-blue-700">{selectedUser.overall.mandatoryPercentage}%</div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedUser.overall.mandatoryPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-blue-700">
                      필수 항목: {selectedUser.overall.mandatoryCompleted}/{selectedUser.overall.mandatory}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-green-900">사전요구사항</h4>
                      <div className="text-3xl font-bold text-green-700">{selectedUser.prerequisites.mandatoryPercentage}%</div>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedUser.prerequisites.mandatoryPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-green-700">
                      완료: {selectedUser.prerequisites.completed}/{selectedUser.prerequisites.total}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-purple-900">기술검증</h4>
                      <div className="text-3xl font-bold text-purple-700">{selectedUser.technical.mandatoryPercentage}%</div>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedUser.technical.mandatoryPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-purple-700">
                      완료: {selectedUser.technical.completed}/{selectedUser.technical.total}
                    </p>
                  </div>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'pending'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    미완료 필수 항목 ({selectedUser.pendingMandatoryItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('inprogress')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'inprogress'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    진행 중 ({selectedUser.inProgressItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'completed'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    완료됨 ({selectedUser.completedItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    전체 항목
                  </button>
                </div>

                {/* 항목 목록 */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    {getCurrentTabItems().map((item, index) => (
                      <div key={item.id} className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-mono text-sm bg-gray-800 text-white px-3 py-1 rounded-md font-bold">
                                {item.id}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-semibold">
                                {item.category}
                              </span>
                              {item.isMandatory && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-md font-semibold">
                                  필수
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getItemStatusColor(item)}`}>
                                {getItemStatusText(item)}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">{item.description}</p>
                            <div className="text-sm text-gray-700">
                              <strong>필요 증빙:</strong> {item.evidenceRequired}
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            {getItemStatusIcon(item)}
                          </div>
                        </div>
                        
                        {item.partnerResponse && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-800 mb-2">파트너 응답:</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.partnerResponse}</p>
                          </div>
                        )}
                        
                        {item.lastUpdated && (
                          <div className="mt-3 text-xs text-gray-500">
                            마지막 업데이트: {formatDate(item.lastUpdated)}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {getCurrentTabItems().length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">📋</div>
                        <p className="text-gray-600 text-lg">해당 카테고리에 항목이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}