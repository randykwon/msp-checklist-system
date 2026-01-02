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

interface EvidenceStats {
  storagePath: string;
  s3Bucket: string;
  s3Prefix: string;
  pending: { count: number; size: number; sizeFormatted: string };
  uploaded: { count: number; size: number; sizeFormatted: string };
  total: { count: number; size: number; sizeFormatted: string };
}

export default function SystemPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [evidenceUploadEnabled, setEvidenceUploadEnabled] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [evidenceStats, setEvidenceStats] = useState<EvidenceStats | null>(null);
  const [editingStorage, setEditingStorage] = useState(false);
  const [storagePathInput, setStoragePathInput] = useState('');
  const [s3BucketInput, setS3BucketInput] = useState('');
  const [s3PrefixInput, setS3PrefixInput] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role === 'superadmin') {
      fetchSystemInfo();
      fetchSettings();
      fetchEvidenceStats();
    } else if (user && user.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const fetchEvidenceStats = async () => {
    try {
      const response = await fetch('/api/evidence/stats');
      if (response.ok) {
        const data = await response.json();
        setEvidenceStats(data);
        setStoragePathInput(data.storagePath || '');
        setS3BucketInput(data.s3Bucket || '');
        setS3PrefixInput(data.s3Prefix || '');
      }
    } catch (error) {
      console.error('Failed to fetch evidence stats:', error);
    }
  };

  const handleSaveStorageSettings = async () => {
    setUpdatingSettings(true);
    try {
      // 저장 경로 설정
      await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'evidenceStoragePath', value: storagePathInput })
      });
      
      // S3 버킷 설정
      await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'evidenceS3Bucket', value: s3BucketInput })
      });
      
      // S3 접두사 설정
      await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'evidenceS3Prefix', value: s3PrefixInput })
      });
      
      alert('저장소 설정이 저장되었습니다. 변경사항을 적용하려면 서버를 재시작해야 합니다.');
      setEditingStorage(false);
      fetchEvidenceStats();
    } catch (error) {
      console.error('Failed to save storage settings:', error);
      alert('저장소 설정 저장에 실패했습니다.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/system/settings');
      if (response.ok) {
        const data = await response.json();
        setEvidenceUploadEnabled(data.evidenceUploadEnabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleToggleEvidenceUpload = async () => {
    setUpdatingSettings(true);
    try {
      const newValue = !evidenceUploadEnabled;
      const response = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'evidenceUploadEnabled', value: newValue })
      });
      
      if (response.ok) {
        setEvidenceUploadEnabled(newValue);
        alert(`증빙 자료 업로드 기능이 ${newValue ? '활성화' : '비활성화'}되었습니다.`);
      } else {
        alert('설정 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('설정 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingSettings(false);
    }
  };

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

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F2F5' }}>
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
        {/* 헤더 카드 */}
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>⚙️ 시스템 관리</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>시스템 상태 및 유지보수 기능</p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '12px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>시스템 상태</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>✅ 정상 운영</div>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 정보 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>💾 데이터베이스 크기</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1877F2' }}>
                {loadingSystem ? '...' : formatBytes(systemInfo?.dbSize || 0)}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>⏱️ 시스템 가동시간</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#42B883' }}>
                {loadingSystem ? '...' : formatUptime(systemInfo?.systemUptime || 0)}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>💡 조언 캐시</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>
                {loadingSystem ? '...' : systemInfo?.cacheStats?.adviceCache || 0}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>📄 가상증빙 캐시</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>
                {loadingSystem ? '...' : systemInfo?.cacheStats?.virtualEvidenceCache || 0}
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 관리 작업 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 기능 설정 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎛️ 기능 설정</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">📎 증빙 자료 업로드</h4>
                  <p className="text-sm text-gray-500">사용자가 증빙 자료를 업로드할 수 있는 기능</p>
                </div>
                <button
                  onClick={handleToggleEvidenceUpload}
                  disabled={updatingSettings}
                  style={{
                    position: 'relative',
                    width: 56,
                    height: 28,
                    borderRadius: 14,
                    border: 'none',
                    cursor: updatingSettings ? 'not-allowed' : 'pointer',
                    background: evidenceUploadEnabled 
                      ? 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' 
                      : '#E4E6EB',
                    transition: 'all 0.3s ease',
                    opacity: updatingSettings ? 0.7 : 1
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: evidenceUploadEnabled ? 30 : 2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.3s ease'
                  }} />
                </button>
              </div>
              <div style={{ 
                padding: 12, 
                background: evidenceUploadEnabled ? '#ECFDF5' : '#FEF2F2', 
                borderRadius: 8,
                border: `1px solid ${evidenceUploadEnabled ? '#A7F3D0' : '#FECACA'}`
              }}>
                <div style={{ 
                  fontSize: 13, 
                  color: evidenceUploadEnabled ? '#047857' : '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {evidenceUploadEnabled ? (
                    <>✅ 증빙 자료 업로드 기능이 활성화되어 있습니다.</>
                  ) : (
                    <>🚫 증빙 자료 업로드 기능이 비활성화되어 있습니다.</>
                  )}
                </div>
              </div>
            </div>
          </div>

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

        {/* 증빙 파일 저장소 통계 */}
        {evidenceStats && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="text-lg font-semibold text-gray-900">📁 증빙 파일 저장소</h3>
              {!editingStorage ? (
                <button
                  onClick={() => setEditingStorage(true)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#6366F1',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  ✏️ 설정 편집
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSaveStorageSettings}
                    disabled={updatingSettings}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'white',
                      background: updatingSettings ? '#9CA3AF' : '#10B981',
                      border: 'none',
                      borderRadius: 6,
                      cursor: updatingSettings ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updatingSettings ? '저장 중...' : '💾 저장'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingStorage(false);
                      setStoragePathInput(evidenceStats.storagePath || '');
                      setS3BucketInput(evidenceStats.s3Bucket || '');
                      setS3PrefixInput(evidenceStats.s3Prefix || '');
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#6B7280',
                      background: '#F3F4F6',
                      border: '1px solid #D1D5DB',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div style={{ 
                padding: 16, 
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', 
                borderRadius: 12,
                border: '1px solid #F59E0B'
              }}>
                <div style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>⏳ 업로드 대기</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>{evidenceStats.pending.count}</div>
                <div style={{ fontSize: 12, color: '#92400E' }}>{evidenceStats.pending.sizeFormatted}</div>
              </div>
              <div style={{ 
                padding: 16, 
                background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)', 
                borderRadius: 12,
                border: '1px solid #10B981'
              }}>
                <div style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>✅ S3 업로드 완료</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{evidenceStats.uploaded.count}</div>
                <div style={{ fontSize: 12, color: '#065F46' }}>{evidenceStats.uploaded.sizeFormatted}</div>
              </div>
              <div style={{ 
                padding: 16, 
                background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)', 
                borderRadius: 12,
                border: '1px solid #6366F1'
              }}>
                <div style={{ fontSize: 13, color: '#3730A3', fontWeight: 500 }}>📊 전체 파일</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#4F46E5' }}>{evidenceStats.total.count}</div>
                <div style={{ fontSize: 12, color: '#3730A3' }}>{evidenceStats.total.sizeFormatted}</div>
              </div>
            </div>
            
            {/* 저장소 설정 */}
            <div style={{ 
              padding: 16, 
              background: '#F9FAFB', 
              borderRadius: 8,
              border: '1px solid #E5E7EB'
            }}>
              {editingStorage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                      📂 로컬 저장 경로
                    </label>
                    <input
                      type="text"
                      value={storagePathInput}
                      onChange={(e) => setStoragePathInput(e.target.value)}
                      placeholder="/opt/msp-checklist-system/evidence-files"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: 13,
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        fontFamily: 'monospace'
                      }}
                    />
                    <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                      증빙 파일이 저장될 서버 내 경로입니다.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                      ☁️ S3 버킷 이름
                    </label>
                    <input
                      type="text"
                      value={s3BucketInput}
                      onChange={(e) => setS3BucketInput(e.target.value)}
                      placeholder="my-evidence-bucket"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: 13,
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        fontFamily: 'monospace'
                      }}
                    />
                    <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                      증빙 파일을 업로드할 S3 버킷 이름입니다. 비워두면 S3 동기화가 비활성화됩니다.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                      📁 S3 접두사 (Prefix)
                    </label>
                    <input
                      type="text"
                      value={s3PrefixInput}
                      onChange={(e) => setS3PrefixInput(e.target.value)}
                      placeholder="evidence/"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: 13,
                        border: '1px solid #D1D5DB',
                        borderRadius: 6,
                        fontFamily: 'monospace'
                      }}
                    />
                    <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                      S3 버킷 내 파일이 저장될 경로 접두사입니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#4B5563' }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>📂 저장 경로:</span>{' '}
                    <code style={{ background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                      {evidenceStats.storagePath || '미설정'}
                    </code>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>☁️ S3 버킷:</span>{' '}
                    <code style={{ background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                      {evidenceStats.s3Bucket || '미설정'}
                    </code>
                  </div>
                  <div>
                    <span style={{ fontWeight: 500 }}>📁 S3 접두사:</span>{' '}
                    <code style={{ background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                      {evidenceStats.s3Prefix || '미설정'}
                    </code>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={fetchEvidenceStats}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#4F46E5',
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              🔄 새로고침
            </button>
          </div>
        )}

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