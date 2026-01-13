'use client';

import React, { useState, useEffect } from 'react';

// CSS 애니메이션을 위한 스타일
const fadeInUp = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
`;

interface CategoryProgress {
  id: string;
  name: string;
  nameKo: string;
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
  type: 'prerequisites' | 'technical';
}

interface ProgressChartProps {
  data?: any[];
  className?: string;
}

export default function ProgressChart({ data = [], className = '' }: ProgressChartProps) {
  const [progressData, setProgressData] = useState<CategoryProgress[]>([]);
  const [selectedView, setSelectedView] = useState<'all' | 'prerequisites' | 'technical'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 실제 데이터가 있으면 사용하고, 없으면 API에서 가져오기
    if (data && data.length > 0) {
      processRealData(data);
      setLoading(false);
    } else {
      fetchProgressData();
    }
  }, [data]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard/progress');
      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setProgressData(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('진행 현황 데이터를 불러오는데 실패했습니다.');
      // 에러 시 샘플 데이터 사용
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const processRealData = (realData: any[]) => {
    const processed = realData.map((category: any) => ({
      id: category.id,
      name: category.name,
      nameKo: category.nameKo,
      total: category.progress?.total || 0,
      completed: category.progress?.completed || 0,
      inProgress: category.progress?.inProgress || 0,
      percentage: category.progress?.percentage || 0,
      type: category.id === 'prerequisites' ? 'prerequisites' : 'technical'
    }));
    setProgressData(processed);
  };

  const loadSampleData = () => {
    // 샘플 데이터 - 실제 MSP 체크리스트 기반
    const sampleData: CategoryProgress[] = [
      // 사전요구사항
      {
        id: 'prerequisites',
        name: 'Prerequisites Controls',
        nameKo: '사전 요구사항 제어',
        total: 4,
        completed: 2,
        inProgress: 1,
        percentage: 50,
        type: 'prerequisites'
      },
      
      // 기술검증 카테고리들
      {
        id: 'customer-management',
        name: 'Customer Management',
        nameKo: '고객 관리',
        total: 12,
        completed: 8,
        inProgress: 2,
        percentage: 67,
        type: 'technical'
      },
      {
        id: 'service-delivery',
        name: 'Service Delivery',
        nameKo: '서비스 제공',
        total: 15,
        completed: 10,
        inProgress: 3,
        percentage: 67,
        type: 'technical'
      },
      {
        id: 'monitoring',
        name: 'Monitoring and Observability',
        nameKo: '모니터링 및 옵저버빌리티',
        total: 10,
        completed: 6,
        inProgress: 2,
        percentage: 60,
        type: 'technical'
      },
      {
        id: 'security',
        name: 'Security and Compliance',
        nameKo: '보안 및 규정 준수',
        total: 18,
        completed: 12,
        inProgress: 4,
        percentage: 67,
        type: 'technical'
      },
      {
        id: 'backup-dr',
        name: 'Backup and Disaster Recovery',
        nameKo: '백업 및 재해 복구',
        total: 8,
        completed: 5,
        inProgress: 1,
        percentage: 63,
        type: 'technical'
      },
      {
        id: 'cost-optimization',
        name: 'Cost Optimization',
        nameKo: '비용 최적화',
        total: 6,
        completed: 4,
        inProgress: 1,
        percentage: 67,
        type: 'technical'
      }
    ];
    setProgressData(sampleData);
  };

  const getFilteredData = () => {
    if (selectedView === 'all') return progressData;
    return progressData.filter(item => item.type === selectedView);
  };

  const getSummaryStats = (type?: 'prerequisites' | 'technical') => {
    const filtered = type ? progressData.filter(item => item.type === type) : progressData;
    const total = filtered.reduce((sum, item) => sum + item.total, 0);
    const completed = filtered.reduce((sum, item) => sum + item.completed, 0);
    const inProgress = filtered.reduce((sum, item) => sum + item.inProgress, 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, inProgress, percentage };
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 80) return '우수';
    if (percentage >= 60) return '양호';
    if (percentage >= 40) return '보통';
    return '개선필요';
  };

  const filteredData = getFilteredData();
  const overallStats = getSummaryStats();
  const prerequisitesStats = getSummaryStats('prerequisites');
  const technicalStats = getSummaryStats('technical');

  // 로딩 상태
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 로드 실패</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchProgressData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            📈 MSP 검증 진행 현황
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            사전요구사항 및 기술검증 카테고리별 진행 상황
          </p>
        </div>
        
        {/* 뷰 선택 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProgressData}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="새로고침"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedView('all')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedView === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setSelectedView('prerequisites')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedView === 'prerequisites'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            사전요구사항
          </button>
          <button
            onClick={() => setSelectedView('technical')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedView === 'technical'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            기술검증
          </button>
        </div>
      </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 전체 현황 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">전체 진행률</p>
              <p className="text-2xl font-bold text-blue-900">{overallStats.percentage}%</p>
              <p className="text-xs text-blue-700">
                {overallStats.completed}/{overallStats.total} 완료
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        {/* 사전요구사항 현황 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">사전요구사항</p>
              <p className="text-2xl font-bold text-green-900">{prerequisitesStats.percentage}%</p>
              <p className="text-xs text-green-700">
                {prerequisitesStats.completed}/{prerequisitesStats.total} 완료
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        {/* 기술검증 현황 */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">기술검증</p>
              <p className="text-2xl font-bold text-purple-900">{technicalStats.percentage}%</p>
              <p className="text-xs text-purple-700">
                {technicalStats.completed}/{technicalStats.total} 완료
              </p>
            </div>
            <div className="text-3xl">🔧</div>
          </div>
        </div>
      </div>

      {/* 카테고리별 진행 현황 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedView === 'all' && '전체 카테고리'}
          {selectedView === 'prerequisites' && '사전요구사항 상세'}
          {selectedView === 'technical' && '기술검증 상세'}
        </h3>

        {filteredData.map((category, index) => (
          <div 
            key={category.id} 
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 transform hover:-translate-y-1"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{category.nameKo}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    category.type === 'prerequisites' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {category.type === 'prerequisites' ? '사전요구사항' : '기술검증'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{category.name}</p>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{category.percentage}%</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(category.percentage)}`}>
                    {getStatusText(category.percentage)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {category.completed}/{category.total} 완료
                  {category.inProgress > 0 && `, ${category.inProgress} 진행중`}
                </p>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
              <div className="flex h-3 rounded-full">
                {/* 완료된 부분 */}
                <div 
                  className="bg-green-500 transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${(category.completed / category.total) * 100}%`,
                    animationDelay: '0.2s'
                  }}
                />
                {/* 진행중인 부분 */}
                <div 
                  className="bg-yellow-400 transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${(category.inProgress / category.total) * 100}%`,
                    animationDelay: '0.4s'
                  }}
                />
              </div>
            </div>

            {/* 상세 통계 */}
            <div className="flex justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                완료: {category.completed}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                진행중: {category.inProgress}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                미시작: {category.total - category.completed - category.inProgress}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 요약 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            총 {filteredData.length}개 카테고리 | 
            전체 항목 {filteredData.reduce((sum, item) => sum + item.total, 0)}개
          </span>
          <span>
            마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}
          </span>
        </div>
      </div>
    </div>
  );
}