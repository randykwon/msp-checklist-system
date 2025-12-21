'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import PermissionGuard from '@/components/PermissionGuard';

interface CacheVersion {
  version: string;
  createdAt: string;
  totalItems: number;
  description: string;
}

interface CacheStats {
  total: number;
  korean: number;
  english: number;
  unique_items: number;
}

interface CachedVirtualEvidenceItem {
  id: string;
  itemId: string;
  category: string;
  title: string;
  virtualEvidence: string;
  language: 'ko' | 'en';
  createdAt: string;
  version: string;
}

export default function VirtualEvidencePage() {
  const [versions, setVersions] = useState<CacheVersion[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isMounted, setIsMounted] = useState(false);
  
  // 캐시 내용 관리 상태
  const [showCacheViewer, setShowCacheViewer] = useState(false);
  const [cacheItems, setCacheItems] = useState<CachedVirtualEvidenceItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en'>('ko');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<CachedVirtualEvidenceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 활성 버전 관리 상태
  const [activeVersions, setActiveVersions] = useState<{advice: string | null, virtualEvidence: string | null}>({
    advice: null,
    virtualEvidence: null
  });
  const [isSettingActiveVersion, setIsSettingActiveVersion] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadCacheData();
  }, []);

  const loadCacheData = async () => {
    try {
      setIsLoading(true);
      
      // 버전 목록 로드
      const versionsResponse = await fetch('/api/virtual-evidence-cache?action=versions');
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData.versions);
        
        if (versionsData.versions.length > 0) {
          setSelectedVersion(versionsData.versions[0].version);
        }
      }

      // 전체 통계 로드
      const statsResponse = await fetch('/api/virtual-evidence-cache?action=stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // 활성 버전 로드
      const activeVersionsResponse = await fetch('/api/cache-version');
      if (activeVersionsResponse.ok) {
        const activeVersionsData = await activeVersionsResponse.json();
        setActiveVersions(activeVersionsData.activeVersions);
      }
    } catch (error) {
      console.error('Failed to load cache data:', error);
      showMessage('캐시 데이터 로드에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCache = async () => {
    try {
      setIsGenerating(true);
      showMessage('가상증빙예제 캐시 생성을 시작합니다...', 'info');

      const response = await fetch('/api/virtual-evidence-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          options: {
            includeAdvice: false,
            forceRegenerate: true
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showMessage(
          `캐시 생성 완료! 버전: ${result.version}, 총 ${result.totalItems}개 항목 처리`,
          'success'
        );
        
        // 데이터 새로고침
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`캐시 생성 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to generate cache:', error);
      showMessage('캐시 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadVersionStats = async (version: string) => {
    try {
      const response = await fetch(`/api/virtual-evidence-cache?action=stats&version=${version}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load version stats:', error);
    }
  };

  const setActiveVersion = async (cacheType: 'advice' | 'virtual_evidence', version: string) => {
    try {
      setIsSettingActiveVersion(true);
      showMessage(`${cacheType === 'advice' ? '조언' : '가상증빙예제'} 캐시의 활성 버전을 설정 중...`, 'info');

      const response = await fetch('/api/cache-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cacheType,
          version
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showMessage(
          `${cacheType === 'advice' ? '조언' : '가상증빙예제'} 캐시의 활성 버전이 ${version}으로 설정되었습니다.`,
          'success'
        );
        
        // 활성 버전 정보 새로고침
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`활성 버전 설정 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to set active version:', error);
      showMessage('활성 버전 설정 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSettingActiveVersion(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  const loadCacheItems = async (version?: string, language: 'ko' | 'en' = 'ko') => {
    try {
      const versionParam = version || selectedVersion || (versions.length > 0 ? versions[0].version : '');
      if (!versionParam) {
        showMessage('선택된 버전이 없습니다.', 'error');
        return;
      }

      const response = await fetch(`/api/virtual-evidence-cache?action=list&version=${versionParam}&language=${language}`);
      if (response.ok) {
        const data = await response.json();
        setCacheItems(data.evidence || []);
        setShowCacheViewer(true);
      } else {
        showMessage('캐시 항목 로드에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Failed to load cache items:', error);
      showMessage('캐시 항목 로드 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleEditItem = (item: CachedVirtualEvidenceItem) => {
    setEditingItem({ ...item });
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/virtual-evidence-cache', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingItem.id,
          virtualEvidence: editingItem.virtualEvidence,
        }),
      });

      if (response.ok) {
        showMessage('가상증빙예제가 성공적으로 업데이트되었습니다.', 'success');
        setEditingItem(null);
        // 목록 새로고침
        await loadCacheItems(selectedVersion, selectedLanguage);
      } else {
        const error = await response.json();
        showMessage(`업데이트 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      showMessage('업데이트 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCacheItems = cacheItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.itemId.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  if (!isMounted || isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/cache">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">가상증빙예제 캐시 관리</h1>
              <p className="text-gray-600">
                평가 항목별 AI 가상증빙예제 캐시를 독립적으로 관리합니다
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={loadCacheData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
              <button
                onClick={generateCache}
                disabled={isGenerating}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                  isGenerating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    새 캐시 생성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 활성 버전 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">활성 캐시 버전</h2>
            <div className="mt-2 sm:mt-0 text-sm text-gray-500">
              사용자에게 제공되는 캐시 버전을 선택하세요
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 가상증빙예제 캐시 활성 버전 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">📋 가상증빙예제 캐시</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  activeVersions.virtualEvidence ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {activeVersions.virtualEvidence ? '활성' : '미설정'}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  현재 활성 버전: {activeVersions.virtualEvidence || '없음'}
                </div>
                
                <div className="flex space-x-2">
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">버전 선택</option>
                    {versions.map((version) => (
                      <option key={version.version} value={version.version}>
                        {version.version} ({version.totalItems}개 항목)
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => selectedVersion && setActiveVersion('virtual_evidence', selectedVersion)}
                    disabled={!selectedVersion || isSettingActiveVersion}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors duration-200"
                  >
                    {isSettingActiveVersion ? '설정 중...' : '활성화'}
                  </button>
                </div>
              </div>
            </div>

            {/* 조언 캐시 활성 버전 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">🎯 조언 캐시</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  activeVersions.advice ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {activeVersions.advice ? '활성' : '미설정'}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  현재 활성 버전: {activeVersions.advice || '없음'}
                </div>
                
                <div className="text-sm text-blue-600">
                  💡 조언 캐시는 별도 페이지에서 관리됩니다
                </div>
                
                <button
                  onClick={() => window.location.href = '/cache'}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-200"
                >
                  조언 캐시 관리로 이동
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div className={`p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">총 캐시 항목</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">한국어 예제</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.korean}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">영어 예제</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.english}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">고유 평가 항목</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.unique_items}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 캐시 버전 관리 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">캐시 버전 관리</h2>
                <p className="text-sm text-gray-600 mt-1">
                  생성된 가상증빙예제 캐시 버전들을 확인하고 관리할 수 있습니다
                </p>
              </div>
              <span className="text-sm text-gray-500">{versions.length}개의 버전</span>
            </div>
          </div>

          <div className="p-6">
            {versions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">📋</div>
                <p className="text-gray-600">생성된 캐시 버전이 없습니다.</p>
                <p className="text-sm text-gray-500 mt-1">
                  "새 캐시 생성" 버튼을 클릭하여 첫 번째 캐시를 생성해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 버전 선택 및 캐시 내용 보기 */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-bold text-gray-900">
                      버전 선택:
                    </label>
                    <select
                      value={selectedVersion}
                      onChange={(e) => {
                        setSelectedVersion(e.target.value);
                        if (e.target.value) {
                          loadVersionStats(e.target.value);
                        }
                      }}
                      className="border-2 border-gray-400 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors shadow-sm"
                    >
                      <option value="">전체 통계</option>
                      {versions.map((version) => (
                        <option key={version.version} value={version.version}>
                          {version.version} ({formatDate(version.createdAt)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedVersion && (
                    <button
                      onClick={() => loadCacheItems(selectedVersion, selectedLanguage)}
                      className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      캐시 내용 보기
                    </button>
                  )}
                </div>

                {/* 버전 목록 */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          버전
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          생성일시
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          항목 수
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          설명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {versions.map((version, index) => (
                        <tr key={version.version} className={index === 0 ? 'bg-purple-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {version.version}
                            {index === 0 && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                최신
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(version.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {version.totalItems}개
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {version.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              완료
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 사용 가이드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">가상증빙예제 캐시 시스템 가이드</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">캐시 생성</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 모든 평가 항목에 대한 AI 가상증빙예제 생성</li>
                      <li>• 한국어/영어 버전 모두 생성</li>
                      <li>• 항목별 맞춤형 증빙자료 예제</li>
                      <li>• 날짜 기반 버전 관리</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">캐시 사용</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• SQLite DB에 저장되어 빠른 조회</li>
                      <li>• 평가 페이지에서 자동 로드</li>
                      <li>• 언어별 개별 캐시</li>
                      <li>• 조언 캐시와 독립적 관리</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 캐시 내용 뷰어 모달 */}
        {showCacheViewer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white min-h-[90vh]">
              <div className="flex flex-col h-full">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">가상증빙예제 캐시 내용 관리</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      버전: {selectedVersion} | 언어: {selectedLanguage === 'ko' ? '한국어' : '영어'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCacheViewer(false);
                      setCacheItems([]);
                      setEditingItem(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 필터 및 검색 */}
                <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">언어</label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => {
                          setSelectedLanguage(e.target.value as 'ko' | 'en');
                          loadCacheItems(selectedVersion, e.target.value as 'ko' | 'en');
                        }}
                        className="border-2 border-gray-400 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors shadow-sm"
                      >
                        <option value="ko">한국어</option>
                        <option value="en">영어</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">검색</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="항목 ID, 제목, 카테고리..."
                        className="border-2 border-gray-400 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white w-64 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors shadow-sm placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-800 font-semibold bg-white px-4 py-2 rounded-lg border border-gray-300 shadow-sm">
                    {filteredCacheItems.length}개 항목 표시 (총 {cacheItems.length}개)
                  </div>
                </div>

                {/* 캐시 항목 목록 */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    {filteredCacheItems.map((item) => (
                      <div key={item.id} className="bg-white rounded-lg p-6 border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-mono text-sm bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm">
                                {item.itemId}
                              </span>
                              <span className="text-sm bg-gray-800 text-white px-3 py-1 rounded-lg font-semibold">
                                {item.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg leading-tight">{item.title}</h4>
                          </div>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-bold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            편집
                          </button>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            가상증빙예제 내용
                          </h5>
                          <div className="bg-white p-5 rounded-lg border-2 border-purple-200 text-sm text-gray-900 whitespace-pre-wrap leading-relaxed shadow-sm">
                            {item.virtualEvidence}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 편집 모달 */}
        {editingItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
            <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white min-h-[90vh]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">가상증빙예제 편집</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {editingItem.itemId} - {editingItem.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      가상증빙예제 내용
                    </label>
                    <textarea
                      value={editingItem.virtualEvidence}
                      onChange={(e) => setEditingItem({...editingItem, virtualEvidence: e.target.value})}
                      rows={20}
                      className="w-full border-2 border-gray-400 rounded-lg px-5 py-4 text-sm text-gray-900 bg-white font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors leading-relaxed shadow-sm"
                      placeholder="가상증빙예제 내용을 입력하세요..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-8 py-3 border-2 border-gray-400 rounded-lg text-sm font-bold text-gray-800 bg-white hover:bg-gray-100 hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdateItem}
                    disabled={isUpdating}
                    className={`px-8 py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 ${
                      isUpdating
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg transform hover:scale-105'
                    }`}
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        저장 중...
                      </>
                    ) : (
                      '저장'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </PermissionGuard>
    </AdminLayout>
  );
}