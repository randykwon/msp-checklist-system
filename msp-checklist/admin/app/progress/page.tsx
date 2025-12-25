'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface UserProgress {
  userId: number;
  userName: string;
  email: string;
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
  lastUpdated: string;
  assessmentType: string;
}

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [progressData, setProgressData] = useState<UserProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'prerequisites' | 'technical'>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchProgressData();
    }
  }, [user, loading, router]);

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/dashboard/assessment-progress');
      if (response.ok) {
        const data = await response.json();
        setProgressData(data.progress || []);
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const filteredData = progressData.filter(item => 
    selectedType === 'all' || item.assessmentType === selectedType
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-700';
    if (percentage >= 60) return 'text-yellow-700';
    if (percentage >= 40) return 'text-orange-700';
    return 'text-red-700';
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
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 카드 */}
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📈 진행 현황</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>사용자별 평가 진행 상황을 확인합니다</p>
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                style={{
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#14B8A6',
                  background: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer'
                }}
              >
                <option value="all">전체</option>
                <option value="prerequisites">사전 요구사항</option>
                <option value="technical">기술 평가</option>
              </select>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>👥 참여 사용자</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{filteredData.length}</div>
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>✅ 완료율 80%+</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>
                {filteredData.filter(item => item.progressPercentage >= 80).length}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>⏳ 진행 중</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>
                {filteredData.filter(item => item.progressPercentage > 0 && item.progressPercentage < 80).length}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>🚫 미시작</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>
                {filteredData.filter(item => item.progressPercentage === 0).length}
              </div>
            </div>
          </div>
        </div>

        {/* 진행 현황 테이블 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📋 사용자별 진행 현황</h3>
          </div>
          
          {loadingProgress ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">진행 현황을 불러오는 중...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      평가 유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      진행률
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      완료/전체
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최근 업데이트
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        진행 현황 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={`${item.userId}-${item.assessmentType}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {item.userName?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{item.userName}</div>
                              <div className="text-sm text-gray-500">{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.assessmentType === 'prerequisites' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.assessmentType === 'prerequisites' ? '사전 요구사항' : '기술 평가'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className={`h-2 rounded-full ${getProgressColor(item.progressPercentage)}`}
                                style={{ width: `${item.progressPercentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getProgressTextColor(item.progressPercentage)}`}>
                              {item.progressPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.completedItems} / {item.totalItems}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.lastUpdated)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}