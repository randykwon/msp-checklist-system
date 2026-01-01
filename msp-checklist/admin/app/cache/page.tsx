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

interface CachedAdviceItem {
  id: string;
  itemId: string;
  category: string;
  title: string;
  advice: string;
  virtualEvidence: string;
  language: 'ko' | 'en';
  createdAt: string;
  version: string;
}

// LLM 설정 인터페이스
interface LLMConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'bedrock';
  model: string;
  apiKey?: string;
  // Bedrock 전용
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  // LLM 파라미터
  temperature?: number;
  maxTokens?: number;
}

// 생성 옵션 인터페이스
interface GenerationOptions {
  includeKorean: boolean;
  includeEnglish: boolean;
}

const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (추천)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    color: '#10A37F',
  },
  claude: {
    name: 'Anthropic Claude',
    icon: '🧠',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (추천)' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
    color: '#D97706',
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (추천)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
    ],
    color: '#4285F4',
  },
  bedrock: {
    name: 'AWS Bedrock',
    icon: '☁️',
    models: [
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2 (추천)' },
      { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus' },
      { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
    ],
    color: '#FF9900',
  },
};

export default function CachePage() {
  const [versions, setVersions] = useState<CacheVersion[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isMounted, setIsMounted] = useState(false);
  const [showCacheViewer, setShowCacheViewer] = useState(false);
  const [cacheItems, setCacheItems] = useState<CachedAdviceItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en'>('ko');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<CachedAdviceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeVersions, setActiveVersions] = useState<{advice: string | null, virtualEvidence: string | null}>({
    advice: null,
    virtualEvidence: null
  });
  const [isSettingActiveVersion, setIsSettingActiveVersion] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailVersion, setDetailVersion] = useState<CacheVersion | null>(null);
  const [detailStats, setDetailStats] = useState<CacheStats | null>(null);
  
  // LLM 설정 관련 state
  const [showLLMConfigModal, setShowLLMConfigModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAwsSecretKey, setShowAwsSecretKey] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: 'bedrock',
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    apiKey: '',
    awsRegion: 'ap-northeast-2',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    temperature: 0.8,
    maxTokens: 8192,
  });
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    includeKorean: true,
    includeEnglish: true,
  });

  useEffect(() => {
    setIsMounted(true);
    loadCacheData();
  }, []);

  const loadCacheData = async () => {
    try {
      setIsLoading(true);
      const versionsResponse = await fetch('/api/advice-cache?action=versions');
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData.versions || []);
        // 버전이 있고 현재 선택된 버전이 없거나 삭제된 경우 첫 번째 버전 선택
        if (versionsData.versions && versionsData.versions.length > 0) {
          const versionExists = versionsData.versions.some((v: CacheVersion) => v.version === selectedVersion);
          if (!selectedVersion || !versionExists) {
            setSelectedVersion(versionsData.versions[0].version);
          }
        } else {
          setSelectedVersion('');
        }
      }
      const statsResponse = await fetch('/api/advice-cache?action=stats');
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
    if (!generationOptions.includeKorean && !generationOptions.includeEnglish) {
      showMessage('최소 하나의 언어를 선택해주세요.', 'error');
      return;
    }
    
    try {
      setIsGenerating(true);
      setShowLLMConfigModal(false);
      const languages = [];
      if (generationOptions.includeKorean) languages.push('한국어');
      if (generationOptions.includeEnglish) languages.push('영어');
      showMessage(`${LLM_PROVIDERS[llmConfig.provider].name} (${llmConfig.model})로 ${languages.join(', ')} 조언 캐시 생성을 시작합니다...`, 'info');
      
      const response = await fetch('/api/advice-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate', 
          options: { 
            includeVirtualEvidence: true, 
            forceRegenerate: true,
            includeKorean: generationOptions.includeKorean,
            includeEnglish: generationOptions.includeEnglish,
          },
          llmConfig: {
            provider: llmConfig.provider,
            model: llmConfig.model,
            apiKey: llmConfig.apiKey,
            awsRegion: llmConfig.awsRegion,
            awsAccessKeyId: llmConfig.awsAccessKeyId,
            awsSecretAccessKey: llmConfig.awsSecretAccessKey,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
          }
        }),
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

  const openLLMConfigModal = () => {
    setShowLLMConfigModal(true);
  };

  const handleProviderChange = (provider: 'openai' | 'gemini' | 'claude' | 'bedrock') => {
    setLLMConfig({
      ...llmConfig,
      provider,
      model: LLM_PROVIDERS[provider].models[0].id,
    });
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

  // Export 캐시 기능 - 활성 버전을 기본으로 사용
  const handleExportCache = async () => {
    // 활성 버전이 있으면 활성 버전 사용, 없으면 선택된 버전 사용
    const exportVersion = activeVersions.advice || selectedVersion;
    
    if (!exportVersion) {
      showMessage('내보낼 버전을 선택해주세요. (활성 버전이 설정되어 있지 않습니다)', 'error');
      return;
    }
    
    try {
      setIsExporting(true);
      const versionLabel = exportVersion === activeVersions.advice ? `${exportVersion} (활성)` : exportVersion;
      showMessage(`캐시 데이터를 내보내는 중... (버전: ${versionLabel})`, 'info');
      
      const response = await fetch(`/api/advice-cache?action=export&version=${exportVersion}`);
      if (response.ok) {
        const data = await response.json();
        
        // JSON 파일로 다운로드
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `advice_cache_${exportVersion}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage(`캐시 버전 ${versionLabel}을 성공적으로 내보냈습니다.`, 'success');
      } else {
        const error = await response.json();
        showMessage(`내보내기 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to export cache:', error);
      showMessage('캐시 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import 캐시 기능
  const handleImportCache = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      showMessage('캐시 데이터를 가져오는 중...', 'info');
      
      const fileContent = await file.text();
      const cacheData = JSON.parse(fileContent);
      
      // 데이터 유효성 검사
      if (!cacheData.version || !cacheData.koAdvice || !cacheData.enAdvice) {
        showMessage('유효하지 않은 캐시 파일 형식입니다.', 'error');
        return;
      }
      
      const response = await fetch('/api/advice-cache', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', cacheData }),
      });
      
      if (response.ok) {
        const result = await response.json();
        showMessage(`캐시 가져오기 완료! 버전: ${result.version}, ${result.totalItems}개 항목`, 'success');
        setShowImportModal(false);
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`가져오기 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to import cache:', error);
      showMessage('캐시 가져오기 중 오류가 발생했습니다. 파일 형식을 확인해주세요.', 'error');
    } finally {
      setIsImporting(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  // 버전 삭제 기능
  const handleDeleteVersion = async (version: string) => {
    if (!confirm(`버전 "${version}"을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      showMessage(`버전 ${version} 삭제 중...`, 'info');
      
      const response = await fetch(`/api/advice-cache?version=${version}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        showMessage(`버전 ${version}이 성공적으로 삭제되었습니다.`, 'success');
        // 삭제된 버전이 선택된 버전이면 초기화
        if (selectedVersion === version) {
          setSelectedVersion('');
        }
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`삭제 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      showMessage('버전 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 버전 상세보기 기능
  const handleViewDetail = async (version: CacheVersion) => {
    console.log('handleViewDetail called with:', version);
    try {
      setDetailVersion(version);
      setShowDetailModal(true);
      
      // 해당 버전의 통계 조회
      const statsResponse = await fetch(`/api/advice-cache?action=stats&version=${version.version}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats data:', statsData);
        setDetailStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load version details:', error);
      showMessage('버전 상세 정보 로드에 실패했습니다.', 'error');
    }
  };

  const loadCacheItems = async (version?: string, language: 'ko' | 'en' = 'ko') => {
    try {
      const versionParam = version || selectedVersion || (versions.length > 0 ? versions[0].version : '');
      if (!versionParam) {
        showMessage('선택된 버전이 없습니다.', 'error');
        return;
      }
      console.log('Loading cache items for version:', versionParam, 'language:', language);
      const response = await fetch(`/api/advice-cache?action=list&version=${versionParam}&language=${language}`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        console.log('Advice items count:', data.advice?.length || 0);
        setCacheItems(data.advice || []);
        setShowCacheViewer(true);
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        showMessage('캐시 항목 로드에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Failed to load cache items:', error);
      showMessage('캐시 항목 로드 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleEditItem = (item: CachedAdviceItem) => {
    setEditingItem({ ...item });
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setIsUpdating(true);
    try {
      const response = await fetch('/api/advice-cache', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, advice: editingItem.advice, virtualEvidence: editingItem.virtualEvidence }),
      });
      if (response.ok) {
        showMessage('조언이 성공적으로 업데이트되었습니다.', 'success');
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

  if (!isMounted) {
    return null;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PermissionGuard requiredRoute="/cache">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
            <div style={{ 
              width: 48, height: 48, border: '4px solid #E4E6EB', 
              borderTopColor: '#1877F2', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </PermissionGuard>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/cache">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 헤더 카드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>💡 조언 캐시 관리</h1>
                  <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>평가 항목별 AI 조언과 가상 증빙 예제 캐시를 관리합니다</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setShowImportModal(true)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#42B883',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    📥 가져오기
                  </button>
                  <button
                    onClick={handleExportCache}
                    disabled={isExporting || (!activeVersions.advice && !selectedVersion)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, 
                      cursor: isExporting || (!activeVersions.advice && !selectedVersion) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: isExporting || (!activeVersions.advice && !selectedVersion) ? 0.7 : 1
                    }}
                  >
                    {isExporting ? '⏳ 내보내는 중...' : `📤 내보내기${activeVersions.advice ? ' (활성버전)' : ''}`}
                  </button>
                  <button
                    onClick={loadCacheData}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#1877F2',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    🔄 새로고침
                  </button>
                  <button
                    onClick={openLLMConfigModal}
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
              background: messageType === 'success' ? '#E8F5E9' : messageType === 'error' ? '#FEE2E2' : '#E7F3FF',
              color: messageType === 'success' ? '#2E7D32' : messageType === 'error' ? '#DC2626' : '#1877F2',
              border: `1px solid ${messageType === 'success' ? '#A5D6A7' : messageType === 'error' ? '#FECACA' : '#90CAF9'}`
            }}>
              {message}
            </div>
          )}

          {/* 통계 카드 그리드 */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>💾 총 캐시 항목</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{stats.total}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🇰🇷 한국어 조언</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>{stats.korean}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🌐 영어 조언</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{stats.english}</div>
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
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🎯 활성 캐시 버전</h3>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {/* 조언 캐시 활성 버전 */}
                <div style={{ padding: 20, borderRadius: 12, border: '2px solid #42B883', background: '#E8F5E9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#2E7D32' }}>🎯 조언 캐시</span>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: activeVersions.advice ? '#42B883' : '#9CA3AF', color: 'white'
                    }}>
                      {activeVersions.advice ? '활성' : '미설정'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#65676B', marginBottom: 12 }}>
                    현재 활성 버전: <strong>{activeVersions.advice || '없음'}</strong>
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
                      onClick={() => selectedVersion && setActiveVersion('advice', selectedVersion)}
                      disabled={!selectedVersion || isSettingActiveVersion}
                      style={{
                        padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'white',
                        background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                        border: 'none', borderRadius: 10, cursor: !selectedVersion || isSettingActiveVersion ? 'not-allowed' : 'pointer',
                        opacity: !selectedVersion || isSettingActiveVersion ? 0.7 : 1
                      }}
                    >
                      {isSettingActiveVersion ? '설정 중...' : '활성화'}
                    </button>
                  </div>
                </div>
                {/* 가상증빙예제 캐시 */}
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
                  <button
                    onClick={() => window.location.href = '/virtual-evidence'}
                    style={{
                      width: '100%', padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: '2px solid #8B5CF6', borderRadius: 10, cursor: 'pointer'
                    }}
                  >
                    가상증빙예제 캐시 관리로 이동 →
                  </button>
                </div>
              </div>
            </div>
          </div>


          {/* 캐시 버전 관리 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 캐시 버전 관리</h3>
                <span style={{ fontSize: 14, opacity: 0.9 }}>{versions.length}개의 버전</span>
              </div>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              {versions.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                  <p style={{ color: '#65676B', fontSize: 16 }}>생성된 캐시 버전이 없습니다.</p>
                  <p style={{ color: '#8B8D91', fontSize: 14, marginTop: 8 }}>"새 캐시 생성" 버튼을 클릭하여 첫 번째 캐시를 생성해보세요.</p>
                </div>
              ) : (
                <>
                  {/* 버전 선택 및 캐시 내용 보기 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#F0F2F5', borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>버전 선택:</label>
                      <select
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        style={{ padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, fontWeight: 600 }}
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
                        style={{
                          padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white',
                          background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                          border: 'none', borderRadius: 10, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}
                      >
                        👁️ 캐시 내용 보기
                      </button>
                    )}
                  </div>
                  {/* 버전 목록 테이블 */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F0F2F5' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>버전</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>생성일시</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>항목 수</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>설명</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>상태</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#65676B' }}>액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map((version, index) => (
                          <tr key={version.version} style={{ background: index === 0 ? '#E7F3FF' : 'white', borderBottom: '1px solid #E4E6EB' }}>
                            <td style={{ padding: '12px 16px', fontSize: 14, fontFamily: 'monospace', color: '#1C1E21' }}>
                              {version.version}
                              {index === 0 && (
                                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#1877F2', color: 'white' }}>
                                  최신
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>{formatDate(version.createdAt)}</td>
                            <td style={{ padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>{version.totalItems}개</td>
                            <td style={{ padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>{version.description}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#E8F5E9', color: '#2E7D32' }}>
                                완료
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleViewDetail(version)}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                    color: '#1877F2', background: '#E7F3FF',
                                    border: 'none', borderRadius: 6, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    position: 'relative', zIndex: 1
                                  }}
                                >
                                  🔍 상세
                                </button>
                                <button
                                  onClick={() => { setSelectedVersion(version.version); loadCacheItems(version.version, selectedLanguage); }}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                    color: '#42B883', background: '#E8F5E9',
                                    border: 'none', borderRadius: 6, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    position: 'relative', zIndex: 1
                                  }}
                                >
                                  👁️ 내용
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version.version); }}
                                  disabled={isDeleting || activeVersions.advice === version.version}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                    color: activeVersions.advice === version.version ? '#9CA3AF' : '#DC2626',
                                    background: activeVersions.advice === version.version ? '#F3F4F6' : '#FEE2E2',
                                    border: 'none', borderRadius: 6,
                                    cursor: isDeleting || activeVersions.advice === version.version ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    opacity: isDeleting ? 0.7 : 1,
                                    position: 'relative', zIndex: 1
                                  }}
                                  title={activeVersions.advice === version.version ? '활성 버전은 삭제할 수 없습니다' : '버전 삭제'}
                                >
                                  🗑️ 삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 사용 가이드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📖 캐시 시스템 가이드</h3>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                <div style={{ padding: 20, borderRadius: 12, background: '#E7F3FF', border: '1px solid #90CAF9' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1877F2' }}>📝 캐시 생성</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#1C1E21', lineHeight: 1.8 }}>
                    <li>모든 평가 항목에 대한 AI 조언 생성</li>
                    <li>한국어/영어 버전 모두 생성</li>
                    <li>가상 증빙 예제 포함</li>
                    <li>날짜 기반 버전 관리</li>
                  </ul>
                </div>
                <div style={{ padding: 20, borderRadius: 12, background: '#E8F5E9', border: '1px solid #A5D6A7' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#2E7D32' }}>🔄 캐시 사용</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#1C1E21', lineHeight: 1.8 }}>
                    <li>SQLite DB에 저장되어 빠른 조회</li>
                    <li>평가 페이지에서 자동 로드</li>
                    <li>언어별 개별 캐시</li>
                    <li>로컬 메모리 캐시와 연동</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>


          {/* 버전 상세보기 모달 */}
          {showDetailModal && detailVersion && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100
            }}>
              <div style={{
                width: '90%', maxWidth: 600, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🔍 버전 상세 정보</h3>
                  <button
                    onClick={() => { setShowDetailModal(false); setDetailVersion(null); setDetailStats(null); }}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#1877F2',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  {/* 버전 기본 정보 */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      <div style={{ padding: 16, borderRadius: 12, background: '#E7F3FF', border: '1px solid #90CAF9' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#65676B', marginBottom: 4 }}>버전</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1877F2', fontFamily: 'monospace' }}>{detailVersion.version}</div>
                      </div>
                      <div style={{ padding: 16, borderRadius: 12, background: '#E8F5E9', border: '1px solid #A5D6A7' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#65676B', marginBottom: 4 }}>생성일시</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#2E7D32' }}>{formatDate(detailVersion.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 통계 정보 */}
                  {detailStats && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1C1E21' }}>📊 캐시 통계</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#1877F2' }}>{detailStats.total}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>총 항목</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#42B883' }}>{detailStats.korean}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>한국어</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>{detailStats.english}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>영어</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{detailStats.unique_items}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>고유 항목</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 설명 */}
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#65676B' }}>설명</h4>
                    <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', fontSize: 14, color: '#1C1E21' }}>
                      {detailVersion.description || '설명 없음'}
                    </div>
                  </div>
                  
                  {/* 활성 상태 */}
                  <div style={{ padding: 16, borderRadius: 12, background: activeVersions.advice === detailVersion.version ? '#E8F5E9' : '#FEF3C7', border: `1px solid ${activeVersions.advice === detailVersion.version ? '#A5D6A7' : '#F59E0B'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{activeVersions.advice === detailVersion.version ? '✅' : '⚠️'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: activeVersions.advice === detailVersion.version ? '#2E7D32' : '#92400E' }}>
                        {activeVersions.advice === detailVersion.version ? '현재 활성 버전입니다' : '비활성 버전입니다'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button
                      onClick={() => { setSelectedVersion(detailVersion.version); loadCacheItems(detailVersion.version, selectedLanguage); setShowDetailModal(false); }}
                      style={{
                        flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'white',
                        background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                        border: 'none', borderRadius: 10, cursor: 'pointer'
                      }}
                    >
                      👁️ 캐시 내용 보기
                    </button>
                    {activeVersions.advice !== detailVersion.version && (
                      <button
                        onClick={() => { setActiveVersion('advice', detailVersion.version); setShowDetailModal(false); }}
                        disabled={isSettingActiveVersion}
                        style={{
                          flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'white',
                          background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                          border: 'none', borderRadius: 10, cursor: isSettingActiveVersion ? 'not-allowed' : 'pointer',
                          opacity: isSettingActiveVersion ? 0.7 : 1
                        }}
                      >
                        🎯 활성화
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM 설정 모달 */}
          {showLLMConfigModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100
            }}>
              <div style={{
                width: '90%', maxWidth: 600, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white',
                maxHeight: '90vh', overflowY: 'auto'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🤖 LLM 설정 및 캐시 생성</h3>
                  <button
                    onClick={() => setShowLLMConfigModal(false)}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  {/* LLM 제공자 선택 */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 12 }}>
                      LLM 제공자 선택
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {(Object.keys(LLM_PROVIDERS) as Array<keyof typeof LLM_PROVIDERS>).map((key) => {
                        const provider = LLM_PROVIDERS[key];
                        const isSelected = llmConfig.provider === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleProviderChange(key)}
                            style={{
                              padding: 16, borderRadius: 12, border: `2px solid ${isSelected ? provider.color : '#E4E6EB'}`,
                              background: isSelected ? `${provider.color}15` : 'white',
                              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ fontSize: 32, marginBottom: 8 }}>{provider.icon}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? provider.color : '#1C1E21' }}>
                              {provider.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 모델 선택 */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      모델 선택
                    </label>
                    <select
                      value={llmConfig.model}
                      onChange={(e) => setLLMConfig({ ...llmConfig, model: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                        borderRadius: 10, background: 'white', cursor: 'pointer'
                      }}
                    >
                      {LLM_PROVIDERS[llmConfig.provider].models.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* API 키 입력 (OpenAI, Gemini, Claude) */}
                  {(llmConfig.provider === 'openai' || llmConfig.provider === 'gemini' || llmConfig.provider === 'claude') && (
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                        {llmConfig.provider === 'openai' ? 'OpenAI API Key' : llmConfig.provider === 'gemini' ? 'Google API Key' : 'Anthropic API Key'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={llmConfig.apiKey || ''}
                          onChange={(e) => setLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                          placeholder={llmConfig.provider === 'openai' ? 'sk-...' : llmConfig.provider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
                          style={{
                            width: '100%', padding: '12px 44px 12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 10, boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#65676B'
                          }}
                        >
                          {showApiKey ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#65676B' }}>
                        {llmConfig.provider === 'openai' 
                          ? '💡 OpenAI API 키는 https://platform.openai.com/api-keys 에서 발급받을 수 있습니다.'
                          : llmConfig.provider === 'gemini'
                          ? '💡 Google API 키는 https://aistudio.google.com/app/apikey 에서 발급받을 수 있습니다.'
                          : '💡 Anthropic API 키는 https://console.anthropic.com/settings/keys 에서 발급받을 수 있습니다.'}
                      </p>
                    </div>
                  )}

                  {/* AWS 자격증명 입력 (Bedrock) */}
                  {llmConfig.provider === 'bedrock' && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                          AWS Region
                        </label>
                        <select
                          value={llmConfig.awsRegion || 'us-east-1'}
                          onChange={(e) => setLLMConfig({ ...llmConfig, awsRegion: e.target.value })}
                          style={{
                            width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 10, background: 'white', cursor: 'pointer'
                          }}
                        >
                          <option value="us-east-1">US East (N. Virginia)</option>
                          <option value="us-west-2">US West (Oregon)</option>
                          <option value="eu-west-1">Europe (Ireland)</option>
                          <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                          <option value="ap-northeast-2">Asia Pacific (Seoul) 🇰🇷</option>
                          <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                          <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                          AWS Access Key ID
                        </label>
                        <input
                          type="text"
                          value={llmConfig.awsAccessKeyId || ''}
                          onChange={(e) => setLLMConfig({ ...llmConfig, awsAccessKeyId: e.target.value })}
                          placeholder="AKIA..."
                          style={{
                            width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 10, boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                          AWS Secret Access Key
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showAwsSecretKey ? 'text' : 'password'}
                            value={llmConfig.awsSecretAccessKey || ''}
                            onChange={(e) => setLLMConfig({ ...llmConfig, awsSecretAccessKey: e.target.value })}
                            placeholder="비밀 액세스 키 입력"
                            style={{
                              width: '100%', padding: '12px 44px 12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                              borderRadius: 10, boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                            style={{
                              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#65676B'
                            }}
                          >
                            {showAwsSecretKey ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: 16, borderRadius: 12, background: '#FEF3C7', border: '1px solid #F59E0B', marginBottom: 24 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>
                          ⚠️ AWS IAM 사용자에게 <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: 4 }}>bedrock:InvokeModel</code> 권한이 필요합니다.
                        </p>
                      </div>
                    </>
                  )}

                  {/* LLM 파라미터 설정 */}
                  <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 16 }}>
                      ⚙️ LLM 파라미터 설정
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 6 }}>
                          Temperature (창의성)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={llmConfig.temperature || 0.8}
                            onChange={(e) => setLLMConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                            style={{ flex: 1 }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21', minWidth: 36 }}>
                            {llmConfig.temperature?.toFixed(1) || '0.8'}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                          낮을수록 일관성 ↑, 높을수록 다양성 ↑
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 6 }}>
                          Max Tokens (최대 길이)
                        </label>
                        <select
                          value={llmConfig.maxTokens || 8192}
                          onChange={(e) => setLLMConfig({ ...llmConfig, maxTokens: parseInt(e.target.value) })}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 8, background: 'white', cursor: 'pointer'
                          }}
                        >
                          <option value={2048}>2,048 (짧은 응답)</option>
                          <option value={4096}>4,096 (기본)</option>
                          <option value={8192}>8,192 (상세 응답)</option>
                          <option value={16384}>16,384 (매우 상세)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 언어 선택 */}
                  <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 12 }}>
                      🌐 생성할 언어 선택
                    </label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={generationOptions.includeKorean}
                          onChange={(e) => setGenerationOptions({ ...generationOptions, includeKorean: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>🇰🇷 한국어</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={generationOptions.includeEnglish}
                          onChange={(e) => setGenerationOptions({ ...generationOptions, includeEnglish: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>🇺🇸 영어</span>
                      </label>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#65676B' }}>
                      💡 두 언어 모두 선택하면 한국어 → 영어 순서로 생성됩니다.
                    </p>
                  </div>

                  {/* 현재 설정 요약 */}
                  <div style={{ padding: 16, borderRadius: 12, background: '#F0F2F5', marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#65676B', marginBottom: 8 }}>현재 설정</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{LLM_PROVIDERS[llmConfig.provider].icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>
                          {LLM_PROVIDERS[llmConfig.provider].name}
                        </div>
                        <div style={{ fontSize: 12, color: '#65676B' }}>
                          {LLM_PROVIDERS[llmConfig.provider].models.find(m => m.id === llmConfig.model)?.name || llmConfig.model}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 생성 버튼 */}
                  <button
                    onClick={generateCache}
                    disabled={isGenerating || 
                      (llmConfig.provider !== 'bedrock' && !llmConfig.apiKey) ||
                      (llmConfig.provider === 'bedrock' && (!llmConfig.awsAccessKeyId || !llmConfig.awsSecretAccessKey))
                    }
                    style={{
                      width: '100%', padding: '14px 24px', fontSize: 16, fontWeight: 600, color: 'white',
                      background: `linear-gradient(135deg, ${LLM_PROVIDERS[llmConfig.provider].color} 0%, ${LLM_PROVIDERS[llmConfig.provider].color}CC 100%)`,
                      border: 'none', borderRadius: 12, cursor: 'pointer',
                      opacity: (isGenerating || 
                        (llmConfig.provider !== 'bedrock' && !llmConfig.apiKey) ||
                        (llmConfig.provider === 'bedrock' && (!llmConfig.awsAccessKeyId || !llmConfig.awsSecretAccessKey))) ? 0.5 : 1
                    }}
                  >
                    {isGenerating ? '⏳ 캐시 생성 중...' : '🚀 캐시 생성 시작'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import 모달 */}
          {showImportModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50
            }}>
              <div style={{
                width: '90%', maxWidth: 500, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📥 캐시 가져오기</h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#42B883',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: '0 0 16px', fontSize: 14, color: '#65676B', lineHeight: 1.6 }}>
                      이전에 내보낸 캐시 JSON 파일을 선택하여 가져올 수 있습니다.
                      동일한 버전이 이미 존재하는 경우 덮어쓰기됩니다.
                    </p>
                    <div style={{
                      padding: 24, borderRadius: 12, border: '2px dashed #42B883',
                      background: '#E8F5E9', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#2E7D32' }}>
                        JSON 파일을 선택하세요
                      </p>
                      <label style={{
                        display: 'inline-block', padding: '12px 24px', fontSize: 14, fontWeight: 600,
                        color: 'white', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                        borderRadius: 10, cursor: isImporting ? 'not-allowed' : 'pointer',
                        opacity: isImporting ? 0.7 : 1
                      }}>
                        {isImporting ? '⏳ 가져오는 중...' : '📂 파일 선택'}
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportCache}
                          disabled={isImporting}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 12, background: '#FEF3C7', border: '1px solid #F59E0B' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>
                      ⚠️ 주의: 가져온 캐시는 기존 데이터와 병합됩니다. 동일한 버전의 항목은 덮어쓰기됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 캐시 내용 뷰어 모달 */}
          {showCacheViewer && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              zIndex: 50, padding: '20px 0', overflowY: 'auto'
            }}>
              <div style={{
                width: '95%', maxWidth: 1200, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                {/* 모달 헤더 */}
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📋 조언 캐시 내용 관리</h3>
                    <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>
                      버전: {selectedVersion} | 언어: {selectedLanguage === 'ko' ? '한국어' : '영어'} | 총 {filteredCacheItems.length}개 항목
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowCacheViewer(false); setCacheItems([]); setEditingItem(null); }}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#1877F2',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                {/* 모달 바디 */}
                <div style={{ padding: 24 }}>
                  {/* 필터 */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setSelectedLanguage('ko'); loadCacheItems(selectedVersion, 'ko'); }}
                        style={{
                          padding: '10px 20px', fontSize: 14, fontWeight: 600,
                          color: selectedLanguage === 'ko' ? 'white' : '#42B883',
                          background: selectedLanguage === 'ko' ? 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' : '#E8F5E9',
                          border: 'none', borderRadius: 10, cursor: 'pointer'
                        }}
                      >
                        🇰🇷 한국어
                      </button>
                      <button
                        onClick={() => { setSelectedLanguage('en'); loadCacheItems(selectedVersion, 'en'); }}
                        style={{
                          padding: '10px 20px', fontSize: 14, fontWeight: 600,
                          color: selectedLanguage === 'en' ? 'white' : '#1877F2',
                          background: selectedLanguage === 'en' ? 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' : '#E7F3FF',
                          border: 'none', borderRadius: 10, cursor: 'pointer'
                        }}
                      >
                        🌐 영어
                      </button>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="항목ID, 제목, 카테고리 검색..."
                      style={{ flex: 1, padding: '10px 16px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10 }}
                    />
                  </div>
                  {/* 캐시 항목 목록 */}
                  <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                    {filteredCacheItems.length === 0 ? (
                      <div style={{ padding: 48, textAlign: 'center' }}>
                        <p style={{ color: '#65676B' }}>캐시 항목이 없습니다.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredCacheItems.map((item) => (
                          <div key={item.id} style={{
                            padding: 16, borderRadius: 12, border: '1px solid #E4E6EB',
                            background: editingItem?.id === item.id ? '#E7F3FF' : 'white'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#E7F3FF', color: '#1877F2' }}>
                                  {item.itemId}
                                </span>
                                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#E8F5E9', color: '#2E7D32' }}>
                                  {item.category}
                                </span>
                              </div>
                              <button
                                onClick={() => editingItem?.id === item.id ? setEditingItem(null) : handleEditItem(item)}
                                style={{
                                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                  color: editingItem?.id === item.id ? '#1877F2' : '#1877F2',
                                  background: editingItem?.id === item.id ? '#E7F3FF' : '#E7F3FF',
                                  border: 'none', borderRadius: 6, cursor: 'pointer'
                                }}
                              >
                                {editingItem?.id === item.id ? '취소' : '✏️ 편집'}
                              </button>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21', marginBottom: 12 }}>{item.title}</div>
                            {editingItem?.id === item.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1877F2', marginBottom: 4 }}>💡 조언</label>
                                  <textarea
                                    value={editingItem.advice}
                                    onChange={(e) => setEditingItem({ ...editingItem, advice: e.target.value })}
                                    style={{ width: '100%', minHeight: 250, padding: 12, fontSize: 14, border: '2px solid #1877F2', borderRadius: 10, resize: 'vertical', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <button
                                  onClick={handleUpdateItem}
                                  disabled={isUpdating}
                                  style={{
                                    padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white',
                                    background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                                    border: 'none', borderRadius: 10, cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    opacity: isUpdating ? 0.7 : 1
                                  }}
                                >
                                  {isUpdating ? '저장 중...' : '💾 저장'}
                                </button>
                              </div>
                            ) : (
                              <div style={{ padding: 12, borderRadius: 10, background: '#E7F3FF', border: '1px solid #90CAF9' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#1877F2', marginBottom: 6 }}>💡 조언</div>
                                <div style={{ fontSize: 14, color: '#1C1E21', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                  {item.advice}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
