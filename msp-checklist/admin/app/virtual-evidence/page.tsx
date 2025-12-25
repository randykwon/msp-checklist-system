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
  const [showCacheViewer, setShowCacheViewer] = useState(false);
  const [cacheItems, setCacheItems] = useState<CachedVirtualEvidenceItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en'>('ko');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<CachedVirtualEvidenceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
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
      const versionsResponse = await fetch('/api/virtual-evidence-cache?action=versions');
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData.versions);
        if (versionsData.versions.length > 0) {
          setSelectedVersion(versionsData.versions[0].version);
        }
      }
      const statsResponse = await fetch('/api/virtual-evidence-cache?action=stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', options: { includeAdvice: false, forceRegenerate: true } }),
      });
      if (response.ok) {
        const result = await response.json();
        showMessage(`캐시 생성 완료! 버전: ${result.version}, 총 ${result.totalItems}개 항목 처리`, 'success');
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

  const setActiveVersion = async (cacheType: 'advice' | 'virtual_evidence', version: string) => {
    try {
      setIsSettingActiveVersion(true);
      showMessage(`${cacheType === 'advice' ? '조언' : '가상증빙예제'} 캐시의 활성 버전을 설정 중...`, 'info');
      const response = await fetch('/api/cache-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheType, version }),
      });
      if (response.ok) {
        showMessage(`${cacheType === 'advice' ? '조언' : '가상증빙예제'} 캐시의 활성 버전이 ${version}으로 설정되었습니다.`, 'success');
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

  const showMessageFunc = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };
  const showMessage = showMessageFunc;

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, virtualEvidence: editingItem.virtualEvidence }),
      });
      if (response.ok) {
        showMessage('가상증빙예제가 성공적으로 업데이트되었습니다.', 'success');
        setEditingItem(null);
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
    return item.itemId.toLowerCase().includes(query) || item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
  });

  if (!isMounted || isLoading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/cache">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 헤더 카드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📋 가상증빙예제 캐시 관리</h1>
                  <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>평가 항목별 AI 가상증빙예제 캐시를 독립적으로 관리합니다</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={loadCacheData}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    🔄 새로고침
                  </button>
                  <button
                    onClick={generateCache}
                    disabled={isGenerating}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                      background: isGenerating ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                      border: '2px solid white', borderRadius: 8, cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, opacity: isGenerating ? 0.7 : 1
                    }}
                  >
                    {isGenerating ? '⏳ 생성 중...' : '➕ 새 캐시 생성'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div style={{
              padding: 16, borderRadius: 12,
              background: messageType === 'success' ? '#E8F5E9' : messageType === 'error' ? '#FEE2E2' : '#EDE9FE',
              color: messageType === 'success' ? '#2E7D32' : messageType === 'error' ? '#DC2626' : '#8B5CF6',
              border: `1px solid ${messageType === 'success' ? '#A5D6A7' : messageType === 'error' ? '#FECACA' : '#C4B5FD'}`
            }}>
              {message}
            </div>
          )}

          {/* 통계 카드 그리드 */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>📄 총 캐시 항목</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{stats.total}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🇰🇷 한국어 예제</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>{stats.korean}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🌐 영어 예제</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{stats.english}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>📋 고유 평가 항목</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{stats.unique_items}</div>
                </div>
              </div>
            </div>
          )}

          {/* 활성 버전 정보 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🎯 활성 캐시 버전</h3>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {/* 가상증빙예제 캐시 활성 버전 */}
                <div style={{ padding: 20, borderRadius: 12, border: '2px solid #8B5CF6', background: '#EDE9FE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#5B21B6' }}>📋 가상증빙예제 캐시</span>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: activeVersions.virtualEvidence ? '#8B5CF6' : '#9CA3AF', color: 'white'
                    }}>
                      {activeVersions.virtualEvidence ? '활성' : '미설정'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#65676B', marginBottom: 12 }}>
                    현재 활성 버전: <strong>{activeVersions.virtualEvidence || '없음'}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
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
                      style={{
                        padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'white',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                        border: 'none', borderRadius: 10, cursor: !selectedVersion || isSettingActiveVersion ? 'not-allowed' : 'pointer',
                        opacity: !selectedVersion || isSettingActiveVersion ? 0.7 : 1
                      }}
                    >
                      {isSettingActiveVersion ? '설정 중...' : '활성화'}
                    </button>
                  </div>
                </div>
                {/* 조언 캐시 */}
                <div style={{ padding: 20, borderRadius: 12, border: '2px solid #1877F2', background: '#E7F3FF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1565C0' }}>🎯 조언 캐시</span>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: activeVersions.advice ? '#1877F2' : '#9CA3AF', color: 'white'
                    }}>
                      {activeVersions.advice ? '활성' : '미설정'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#65676B', marginBottom: 12 }}>
                    현재 활성 버전: <strong>{activeVersions.advice || '없음'}</strong>
                  </div>
                  <button
                    onClick={() => window.location.href = '/cache'}
                    style={{
                      width: '100%', padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#1877F2',
                      background: 'white', border: '2px solid #1877F2', borderRadius: 10, cursor: 'pointer'
                    }}
                  >
                    조언 캐시 관리로 이동 →
                  </button>
                </div>
              </div>
            </div>
          </div>
