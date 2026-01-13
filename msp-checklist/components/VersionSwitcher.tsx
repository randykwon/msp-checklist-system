'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Version {
  id: number;
  versionName: string;
  description?: string;
  isActive: boolean;
  progressSummary?: {
    totalItems: number;
    completedItems: number;
    completionPercentage: number;
  };
}

interface VersionSwitcherProps {
  onVersionChange?: (version: Version) => void;
  className?: string;
}

export default function VersionSwitcher({ onVersionChange, className = '' }: VersionSwitcherProps) {
  const { language, t } = useLanguage();
  const { user, loading } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersion, setActiveVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>('');

  // Load versions on component mount, but only if user is authenticated
  useEffect(() => {
    if (user && !loading) {
      loadVersions();
    }
  }, [user, loading]);

  const loadVersions = async () => {
    // Don't load if user is not authenticated
    if (!user) {
      console.log('No user authenticated, skipping version load');
      setError('');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('Loading versions...');
      // Include inactive versions to show all profiles
      const response = await fetch('/api/versions?include_inactive=true', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        // User not authenticated - this is normal for non-logged-in users
        console.log('User not authenticated, hiding version switcher');
        setVersions([]);
        setActiveVersion(null);
        setError(''); // Don't show error for unauthenticated users
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to load profiles');
      }
      
      const data = await response.json();
      console.log('Loaded versions data:', data);
      console.log('Versions array:', data.versions);
      
      setVersions(data.versions || []);
      setActiveVersion(data.activeVersion);
      
      console.log('Set versions:', data.versions?.length || 0, 'items');
      console.log('Active version:', data.activeVersion?.versionName || 'None');
      
      // Log each version for debugging
      if (data.versions && data.versions.length > 0) {
        data.versions.forEach((v: any) => {
          console.log(`  - ${v.versionName} (ID: ${v.id}, Active: ${v.isActive})`);
        });
      }
    } catch (error: any) {
      console.error('Error loading versions:', error);
      // Don't show error for network issues or authentication problems
      // "Failed to fetch" usually means network issue or CORS
      const errorMessage = error.message || '';
      const isNetworkError = errorMessage.includes('Failed to fetch') || 
                            errorMessage.includes('NetworkError') ||
                            errorMessage.includes('fetch');
      const isAuthError = errorMessage.includes('401') || 
                         errorMessage.includes('Not authenticated');
      
      if (!isNetworkError && !isAuthError && user) {
        setError(errorMessage || 'Failed to load profiles');
      } else {
        // Clear any existing error for network/auth issues
        setError('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchVersion = async (versionId: number | string) => {
    try {
      // Ensure versionId is a valid number
      const numericVersionId = typeof versionId === 'string' ? parseInt(versionId, 10) : versionId;
      
      if (isNaN(numericVersionId) || numericVersionId <= 0) {
        throw new Error(`Invalid version ID: ${versionId}`);
      }
      
      console.log('VersionSwitcher: Switching to version ID:', numericVersionId, 'original:', versionId, 'type:', typeof versionId);
      
      setIsLoading(true);
      setError('');
      
      // Check if already active
      const currentActive = versions.find(v => v.isActive);
      if (currentActive && currentActive.id === numericVersionId) {
        console.log('Version already active, closing dropdown');
        setIsOpen(false);
        setIsLoading(false);
        return; // Already active, just close the dropdown
      }
      
      console.log('Making API call to activate version:', numericVersionId);
      const response = await fetch(`/api/versions/${numericVersionId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('VersionSwitcher: API response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          const responseText = await response.text();
          console.log('VersionSwitcher: Raw response text:', responseText);
          
          if (responseText.trim()) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: 'Empty response from server' };
          }
        } catch (parseError) {
          console.error('VersionSwitcher: Failed to parse error response:', parseError);
          errorData = { error: 'Invalid server response' };
        }
        
        console.error('VersionSwitcher: API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to switch profile`);
      }
      
      const data = await response.json();
      const newActiveVersion = data.version;
      
      console.log('Version switched successfully:', newActiveVersion.versionName);
      
      // Update local state immediately with progress info
      setActiveVersion(newActiveVersion);
      setVersions(prev => prev.map(v => ({
        ...v,
        isActive: v.id === numericVersionId,
        progressSummary: v.id === numericVersionId ? newActiveVersion.progressSummary : v.progressSummary
      })));
      
      setIsOpen(false);
      
      // Notify parent component for data refresh
      if (onVersionChange) {
        onVersionChange(newActiveVersion);
      }
      
      // Show success message briefly
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 transition-all duration-300 transform translate-x-0';
      successMessage.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <div>
            <div class="font-medium">${language === 'ko' ? '프로파일 전환 완료' : 'Profile Switched'}</div>
            <div class="text-sm opacity-90">${newActiveVersion.versionName}</div>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);
      
      // Animate in
      setTimeout(() => {
        successMessage.style.transform = 'translateX(0) scale(1.05)';
      }, 10);
      
      setTimeout(() => {
        successMessage.style.transform = 'translateX(0) scale(1)';
      }, 150);
      
      setTimeout(() => {
        successMessage.style.opacity = '0';
        successMessage.style.transform = 'translateX(100%) scale(0.95)';
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 300);
      }, 2500);
      
      // Reload versions to ensure all profiles are visible
      setTimeout(() => {
        loadVersions();
      }, 100);
      
    } catch (error: any) {
      console.error('Error switching profile:', error);
      
      // More user-friendly error message
      const userMessage = error.message.includes('Invalid version ID') 
        ? `Profile selection error: ${error.message}` 
        : `Failed to switch profile: ${error.message}`;
        
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if user is not authenticated or still loading
  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (isLoading && !activeVersion) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-500">
          {language === 'ko' ? '프로파일 로딩 중...' : 'Loading profiles...'}
        </span>
      </div>
    );
  }

  if (error && !activeVersion && user) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="font-medium">{language === 'ko' ? '프로파일 로드 오류' : 'Profile Load Error'}</div>
          <div className="text-xs mt-1">{error}</div>
          <button
            onClick={loadVersions}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            {language === 'ko' ? '다시 시도' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Version Switcher Button */}
      <button
        onClick={() => {
          if (!isOpen) {
            // Reload versions when opening dropdown to ensure fresh data
            loadVersions();
          }
          setIsOpen(!isOpen);
        }}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          fontSize: 14,
          fontWeight: 600,
          color: 'white',
          background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
          border: 'none',
          borderRadius: 10,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          boxShadow: '0 2px 8px rgba(24, 119, 242, 0.3)',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📋</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>
              {activeVersion?.versionName || (language === 'ko' ? '프로파일 없음' : 'No Profile')}
            </div>
          </div>
        </div>
        <svg
          style={{ 
            width: 16, 
            height: 16, 
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[800px] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              {language === 'ko' ? '프로파일 선택' : 'Select Profile'}
            </h3>
            
            {/* 설명 박스들 */}
            <div className="space-y-3">
              <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-800 font-semibold leading-relaxed">
                    {language === 'ko' 
                      ? '프로파일을 클릭하면 즉시 전환됩니다' 
                      : 'Click any profile to switch instantly'}
                  </p>
                </div>
              </div>
              
              <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-800 font-semibold leading-relaxed">
                    {language === 'ko' 
                      ? '각 프로파일은 독립적인 진행상황을 저장합니다' 
                      : 'Each profile saves independent progress'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
            {versions.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-3 text-gray-600 font-medium">
                  {language === 'ko' ? '프로파일이 없습니다' : 'No profiles available'}
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/versions';
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-semibold transition-colors"
                >
                  {language === 'ko' ? '첫 번째 프로파일 만들기' : 'Create first profile'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {versions.map((version, index) => {
                  // 각 카드마다 다른 색상 적용
                  const colors = [
                    { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', light: '#E7F3FF', accent: '#1877F2' },
                    { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', light: '#E8F5E9', accent: '#42B883' },
                    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', light: '#FEF3C7', accent: '#F59E0B' },
                    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', light: '#EDE9FE', accent: '#8B5CF6' },
                    { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', light: '#FCE7F3', accent: '#EC4899' },
                    { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', light: '#CCFBF1', accent: '#14B8A6' },
                    { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', light: '#FEE2E2', accent: '#EF4444' },
                    { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', light: '#E0E7FF', accent: '#6366F1' },
                  ];
                  const colorScheme = colors[index % colors.length];
                  
                  return (
                    <button
                      key={version.id}
                      onClick={() => {
                        console.log('Profile selected:', version.id, version.versionName);
                        if (!version.isActive && !isLoading) {
                          switchVersion(version.id);
                        } else if (version.isActive) {
                          setIsOpen(false);
                        }
                      }}
                      disabled={isLoading}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: version.isActive ? `3px solid ${colorScheme.accent}` : '2px solid #E4E6EB',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'all 0.3s ease',
                        boxShadow: version.isActive 
                          ? `0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px ${colorScheme.accent}20`
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transform: version.isActive ? 'scale(1.02)' : 'scale(1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!version.isActive) {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!version.isActive) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                    >
                      {/* Card Header */}
                      <div style={{
                        padding: '14px 16px',
                        background: colorScheme.bg,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative'
                      }}>
                        {/* 배경 오버레이로 텍스트 가독성 향상 */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0, 0, 0, 0.1)',
                          backdropFilter: 'blur(1px)'
                        }}></div>
                        
                        <span style={{ 
                          color: 'white', 
                          fontWeight: 700, 
                          fontSize: 14,
                          position: 'relative',
                          zIndex: 1,
                          textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                          letterSpacing: '0.5px'
                        }}>
                          {version.versionName}
                        </span>
                        {version.isActive && (
                          <span style={{
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            color: colorScheme.accent,
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 700,
                            position: 'relative',
                            zIndex: 1,
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}>
                            ✓ {language === 'ko' ? '활성' : 'Active'}
                          </span>
                        )}
                      </div>
                      
                      {/* Card Body */}
                      <div style={{ 
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {version.description && (
                          <p style={{ 
                            fontSize: 12, 
                            color: '#1C1E21', 
                            marginBottom: 8,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 500,
                            lineHeight: 1.4
                          }}>
                            {version.description}
                          </p>
                        )}
                        
                        {/* Progress */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <div style={{ 
                            flex: 1, 
                            height: 8, 
                            background: 'rgba(228, 230, 235, 0.8)', 
                            borderRadius: 4, 
                            overflow: 'hidden',
                            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${version.progressSummary?.completionPercentage || 0}%`,
                              background: `linear-gradient(90deg, ${colorScheme.accent}, ${colorScheme.accent}dd)`,
                              borderRadius: 4,
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                          <span style={{ 
                            fontSize: 12, 
                            fontWeight: 700, 
                            color: colorScheme.accent, 
                            minWidth: 36,
                            textAlign: 'right',
                            textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                          }}>
                            {version.progressSummary?.completionPercentage || 0}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-red-50 border border-red-200 rounded-lg p-3 z-50">
          <div className="text-sm text-red-800">
            <strong>{language === 'ko' ? '오류:' : 'Error:'}</strong> {error}
          </div>
          <button
            onClick={() => setError('')}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            {language === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}