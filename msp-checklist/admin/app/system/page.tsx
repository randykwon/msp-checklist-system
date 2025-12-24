'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface SystemInfo {
  dbSize: number;
  totalUsers: number;
  totalAssessments: number;
  cacheStats: {
    adviceCache: number;
    virtualEvidenceCache: number;
  };
  systemUptime: number;
}

export default function SystemPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loadingSystem, setLoadingSystem] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role === 'superadmin') {
      fetchSystemInfo();
    } else if (user && user.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('/api/system/stats');
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    } finally {
      setLoadingSystem(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const handleClearCache = async (cacheType: 'advice' | 'virtual-evidence') => {
    if (!confirm(`${cacheType === 'advice' ? '조언' : '가상증빙'} 캐시를 모두 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/${cacheType}-cache`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('캐시가 성공적으로 삭제되었습니다.');
        fetchSystemInfo(); // Refresh data
      } else {
        alert('캐시 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('캐시 삭제 중 오류가 발생했습니다.');
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

  if (!user || user.role !== 'superadmin') {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">시스템 관리</h1>
              <p className="text-gray-600 mt-1">시스템 상태 및 유지보수 기능</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">시스템 상태</p>
                <p className="text-lg font-semibold text-green-600">정상 운영</p>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">데이터베이스 크기</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingSystem ? '...' : formatBytes(systemInfo?.dbSize || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">시스템 가동시간</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingSystem ? '...' : formatUptime(systemInfo?.systemUptime || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">조언 캐시</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingSystem ? '...' : systemInfo?.cacheStats?.adviceCache || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">가상증빙 캐시</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loadingSystem ? '...' : systemInfo?.cacheStats?.virtualEvidenceCache || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 관리 작업 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">캐시 관리</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">조언 캐시</h4>
                  <p className="text-sm text-gray-500">AI 생성 조언 캐시 데이터</p>
                </div>
                <button
                  onClick={() => handleClearCache('advice')}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  캐시 삭제
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">가상증빙 캐시</h4>
                  <p className="text-sm text-gray-500">AI 생성 가상증빙 예제 캐시</p>
                </div>
                <button
                  onClick={() => handleClearCache('virtual-evidence')}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  캐시 삭제
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">시스템 정보</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Node.js 버전</span>
                <span className="text-sm font-medium text-gray-900">{process.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Next.js 버전</span>
                <span className="text-sm font-medium text-gray-900">14.2.18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">관리자 포트</span>
                <span className="text-sm font-medium text-gray-900">3011</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">메인 서비스 포트</span>
                <span className="text-sm font-medium text-gray-900">3010</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">데이터베이스</span>
                <span className="text-sm font-medium text-gray-900">SQLite</span>
              </div>
            </div>
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">주의사항</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>캐시 삭제 작업은 시스템 성능에 일시적인 영향을 줄 수 있습니다.</li>
                  <li>데이터베이스 작업 전에는 반드시 백업을 수행하세요.</li>
                  <li>시스템 관리 작업은 사용량이 적은 시간에 수행하는 것을 권장합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}