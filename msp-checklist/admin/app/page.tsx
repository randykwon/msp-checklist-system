'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  completedAssessments: number;
  averageProgress: number;
  systemUptime: number;
}

export default function AdminHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchStats();
    }
  }, [user, loading, router]);

  useEffect(() => {
    // 클라이언트에서만 시간 설정
    setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
  }, [stats]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}일 ${hours}시간`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="bg-white rounded shadow border border-gray-300 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">관리자 대시보드</h1>
              <p className="text-sm text-gray-600">MSP Checklist 시스템 현황을 확인하세요</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 border border-blue-200"
              >
                <svg className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loadingStats ? '새로고침 중...' : '새로고침'}
              </button>
              <div className="text-right">
                <p className="text-xs text-gray-500">접속자</p>
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              </div>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
          {/* 실시간 상태 표시 */}
          <div className="mt-3 flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">시스템 정상 운영</span>
            </div>
            {lastUpdate && (
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-600">
                  마지막 업데이트: {lastUpdate}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded shadow border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">총 사용자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-10 rounded"></div>
                  ) : (
                    stats?.totalUsers || 0
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">등록된 전체 사용자</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">활성 사용자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-10 rounded"></div>
                  ) : (
                    stats?.activeUsers || 0
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">최근 7일 활동</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">완료된 평가</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-10 rounded"></div>
                  ) : (
                    stats?.completedAssessments || 0
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">총 평가 항목</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-orange-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">평균 진행률</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingStats ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-10 rounded"></div>
                  ) : (
                    `${stats?.averageProgress || 0}%`
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">전체 사용자 평균</p>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded shadow border border-gray-300 p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">시스템 상태</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">서버 상태</span>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  정상 운영
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">포트</span>
                <span className="font-medium text-gray-900">3011</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Next.js 버전</span>
                <span className="font-medium text-gray-900">14.2.18</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">시스템 가동시간</span>
                <span className="font-medium text-gray-900">
                  {loadingStats ? '...' : formatUptime(stats?.systemUptime || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow border border-gray-300 p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
              <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              빠른 작업
            </h3>
            <div className="space-y-2">
              <a
                href="/users"
                className="flex items-center p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">사용자 관리</p>
                  <p className="text-xs text-gray-500">사용자 권한 및 정보 관리</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a
                href="/progress"
                className="flex items-center p-3 rounded border border-gray-200 hover:border-green-400 hover:bg-green-50 group"
              >
                <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">진행 현황</p>
                  <p className="text-xs text-gray-500">사용자별 평가 진행 상황</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a
                href="/system"
                className="flex items-center p-3 rounded border border-gray-200 hover:border-purple-400 hover:bg-purple-50 group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">시스템 관리</p>
                  <p className="text-xs text-gray-500">시스템 설정 및 유지보수</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded shadow border border-gray-300 p-4">
          <h3 className="text-base font-semibold text-gray-800 mb-3">최근 활동</h3>
          <div className="space-y-2">
            {loadingStats ? (
              <div className="text-center py-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-3">
                최근 활동 데이터를 불러오는 중...
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
