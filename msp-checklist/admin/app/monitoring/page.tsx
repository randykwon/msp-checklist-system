'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';

interface SystemStats {
  userActivity: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    questionsAsked: number;
    questionsAnswered: number;
    created_at: string;
  }>;
  cacheStats: {
    adviceCache: number;
    virtualEvidenceCache: number;
  };
  systemInfo: {
    totalQuestions: number;
    totalUsers: number;
    adminUsers: number;
  };
}

export default function MonitoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/monitoring/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch monitoring stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const clearCache = async (cacheType: 'advice' | 'virtual-evidence') => {
    if (!confirm(`정말로 ${cacheType === 'advice' ? '조언' : '가상증빙'} 캐시를 모두 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/monitoring/cache/${cacheType}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStats();
        alert('캐시가 성공적으로 삭제되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '캐시 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('캐시 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">시스템 모니터링</h1>
            <button
              onClick={fetchStats}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              🔄 새로고침
            </button>
          </div>

          {statsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">모니터링 데이터 로딩 중...</p>
            </div>
          ) : stats ? (
            <div className="space-y-8">
              {/* 시스템 개요 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">시스템 개요</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">👥</span>
                      <div>
                        <p className="text-sm text-gray-600">전체 사용자</p>
                        <p className="text-xl font-semibold">{stats.systemInfo.totalUsers}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">🔒</span>
                      <div>
                        <p className="text-sm text-gray-600">관리자</p>
                        <p className="text-xl font-semibold">{stats.systemInfo.adminUsers}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">💬</span>
                      <div>
                        <p className="text-sm text-gray-600">전체 질문</p>
                        <p className="text-xl font-semibold">{stats.systemInfo.totalQuestions}개</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 캐시 관리 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">캐시 관리</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">💡</span>
                        <div>
                          <p className="text-sm text-gray-600">조언 캐시</p>
                          <p className="text-xl font-semibold">{stats.cacheStats.adviceCache}개</p>
                        </div>
                      </div>
                      <button
                        onClick={() => clearCache('advice')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        캐시 삭제
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📄</span>
                        <div>
                          <p className="text-sm text-gray-600">가상증빙 캐시</p>
                          <p className="text-xl font-semibold">{stats.cacheStats.virtualEvidenceCache}개</p>
                        </div>
                      </div>
                      <button
                        onClick={() => clearCache('virtual-evidence')}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        캐시 삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 사용자 활동 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">사용자 활동</h2>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {stats.userActivity.slice(0, 10).map((userActivity) => (
                      <li key={userActivity.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-500">
                                  <span className="text-xs font-medium leading-none text-white">
                                    {userActivity.name.charAt(0).toUpperCase()}
                                  </span>
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-gray-900">
                                    {userActivity.name}
                                  </p>
                                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    userActivity.role === 'admin' 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {userActivity.role === 'admin' ? '관리자' : '사용자'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">{userActivity.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-900">
                                질문: {userActivity.questionsAsked}개
                              </p>
                              <p className="text-sm text-gray-500">
                                답변: {userActivity.questionsAnswered}개
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">모니터링 데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}