'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Version {
  id: number;
  versionName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  progressSummary?: {
    totalItems: number;
    completedItems: number;
    completionPercentage: number;
    prerequisitesCount: number;
    technicalCount: number;
  };
}

export default function VersionsPage() {
  const { language } = useLanguage();
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersion, setActiveVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Create version modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    copyFromVersionId: null as number | null
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Edit version modal state
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/versions?include_inactive=true', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load versions');
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
      setActiveVersion(data.activeVersion);
    } catch (error: any) {
      console.error('Error loading versions:', error);
      if (error.message === 'Failed to fetch') {
        setError(language === 'ko' ? '서버에 연결할 수 없습니다.' : 'Cannot connect to server.');
      } else {
        setError(error.message || 'Failed to load versions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createVersion = async () => {
    if (!createForm.name.trim()) {
      alert(language === 'ko' ? '프로파일 이름을 입력하세요.' : 'Please enter a profile name.');
      return;
    }

    try {
      setIsCreating(true);
      
      const response = await fetch('/api/versions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          copyFromVersionId: createForm.copyFromVersionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create version');
      }

      setCreateForm({ name: '', description: '', copyFromVersionId: null });
      setShowCreateModal(false);
      await loadVersions();
      
    } catch (error: any) {
      alert(error.message || 'Failed to create version');
    } finally {
      setIsCreating(false);
    }
  };

  const activateVersion = async (versionId: number) => {
    try {
      const response = await fetch(`/api/versions/${versionId}/activate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate version');
      }

      await loadVersions();
    } catch (error: any) {
      alert(error.message || 'Failed to activate version');
    }
  };

  const deleteVersion = async (version: Version) => {
    const confirmed = confirm(
      language === 'ko'
        ? `"${version.versionName}" 프로파일을 삭제하시겠습니까?`
        : `Delete profile "${version.versionName}"?`
    );

    if (!confirmed) return;

    try {
      if (version.isActive && versions.length > 1) {
        const otherVersion = versions.find(v => v.id !== version.id);
        if (otherVersion) {
          await activateVersion(otherVersion.id);
        }
      }

      const response = await fetch(`/api/versions/${version.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete version');
      }

      await loadVersions();
    } catch (error: any) {
      alert(error.message || 'Failed to delete version');
    }
  };

  const updateVersion = async () => {
    if (!editingVersion || !editForm.name.trim()) return;

    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/versions/${editingVersion.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update version');
      }

      setEditingVersion(null);
      await loadVersions();
    } catch (error: any) {
      alert(error.message || 'Failed to update version');
    } finally {
      setIsUpdating(false);
    }
  };

  const duplicateVersion = async (sourceVersionId: number, sourceName: string) => {
    const newName = prompt(
      language === 'ko' ? `"${sourceName}" 복사본 이름:` : `Copy name for "${sourceName}":`,
      `${sourceName} - Copy`
    );
    
    if (!newName?.trim()) return;

    try {
      const response = await fetch(`/api/versions/${sourceVersionId}/duplicate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate version');
      }

      await loadVersions();
    } catch (error: any) {
      alert(error.message || 'Failed to duplicate version');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: 16, color: '#65676B' }}>
            {language === 'ko' ? '로딩 중...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top Navigation */}
        <div style={{ marginBottom: 16 }}>
          <a 
            href="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              color: '#1877F2', 
              textDecoration: 'none', 
              fontWeight: 600,
              fontSize: 14,
              padding: '8px 16px',
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 18 }}>←</span>
            {language === 'ko' ? '대시보드로 돌아가기' : 'Back to Dashboard'}
          </a>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1E21', margin: 0 }}>
              {language === 'ko' ? '프로파일 관리' : 'Profile Management'}
            </h1>
            <p style={{ color: '#65676B', marginTop: 8, fontSize: 14 }}>
              {language === 'ko' 
                ? '여러 프로파일을 생성하고 관리하세요.'
                : 'Create and manage multiple profiles.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '10px 20px',
              background: '#1877F2',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            {language === 'ko' ? '새 프로파일' : 'New Profile'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: 16, background: '#FEE2E2', borderRadius: 8, color: '#DC2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Cards Grid */}
        {versions.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
              {language === 'ko' ? '프로파일이 없습니다' : 'No profiles found'}
            </h3>
            <p style={{ color: '#65676B', marginBottom: 16 }}>
              {language === 'ko' ? '첫 번째 프로파일을 생성하세요.' : 'Create your first profile.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ padding: '10px 24px', background: '#1877F2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              {language === 'ko' ? '프로파일 생성' : 'Create Profile'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
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
                <div
                  key={version.id}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    border: version.isActive ? `3px solid ${colorScheme.accent}` : '3px solid transparent',
                    transition: 'all 0.2s',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Card Header - 고정 높이 */}
                  <div style={{ 
                    padding: '20px', 
                    background: colorScheme.bg,
                    minHeight: 80,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h3 style={{ 
                      fontSize: 20, 
                      fontWeight: 700, 
                      color: 'white',
                      margin: 0,
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}>
                      {version.versionName}
                    </h3>
                    {version.isActive && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: 8,
                        padding: '4px 12px',
                        background: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        width: 'fit-content'
                      }}>
                        ✓ {language === 'ko' ? '현재 활성' : 'Active'}
                      </span>
                    )}
                  </div>

                  {/* Card Body - flex-grow로 나머지 공간 채움 */}
                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Description */}
                    <p style={{ 
                      color: '#65676B', 
                      fontSize: 14, 
                      marginBottom: 16, 
                      lineHeight: 1.5,
                      minHeight: 21,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {version.description || (language === 'ko' ? '설명 없음' : 'No description')}
                    </p>

                    {/* Progress */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: '#65676B' }}>
                          {language === 'ko' ? '진행률' : 'Progress'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colorScheme.accent }}>
                          {version.progressSummary?.completionPercentage || 0}%
                        </span>
                      </div>
                      <div style={{ height: 10, background: '#E4E6EB', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${version.progressSummary?.completionPercentage || 0}%`,
                          background: colorScheme.bg,
                          borderRadius: 5,
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                      <div style={{ fontSize: 12, color: '#8A8D91', marginTop: 4 }}>
                        {version.progressSummary?.completedItems || 0} / {version.progressSummary?.totalItems || 0} {language === 'ko' ? '항목' : 'items'}
                      </div>
                    </div>

                    {/* Dates */}
                    <div style={{ fontSize: 12, color: '#8A8D91', marginBottom: 16 }}>
                      <div>{language === 'ko' ? '생성' : 'Created'}: {new Date(version.createdAt).toLocaleDateString()}</div>
                    </div>

                    {/* Actions - 하단에 고정 */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                      {!version.isActive && (
                        <button
                          onClick={() => activateVersion(version.id)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            background: colorScheme.light,
                            color: colorScheme.accent,
                            border: 'none',
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer'
                          }}
                        >
                          {language === 'ko' ? '선택' : 'Select'}
                        </button>
                      )}
                      <button
                        onClick={() => duplicateVersion(version.id, version.versionName)}
                        style={{
                          padding: '10px 12px',
                          background: '#F0F2F5',
                          color: '#65676B',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 500,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'ko' ? '복제' : 'Copy'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingVersion(version);
                          setEditForm({ name: version.versionName, description: version.description || '' });
                        }}
                        style={{
                          padding: '10px 12px',
                          background: '#F0F2F5',
                          color: '#65676B',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 500,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'ko' ? '편집' : 'Edit'}
                      </button>
                      <button
                        onClick={() => deleteVersion(version)}
                        style={{
                          padding: '10px 12px',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 500,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'ko' ? '삭제' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back Link */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <a href="/" style={{ color: '#1877F2', textDecoration: 'none', fontWeight: 500 }}>
            ← {language === 'ko' ? '대시보드로 돌아가기' : 'Back to Dashboard'}
          </a>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {language === 'ko' ? '새 프로파일 생성' : 'Create New Profile'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#65676B' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                  {language === 'ko' ? '프로파일 이름' : 'Profile Name'} *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CED0D4', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  placeholder={language === 'ko' ? '예: 2024 Q1 평가' : 'e.g., 2024 Q1 Assessment'}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                  {language === 'ko' ? '설명' : 'Description'}
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CED0D4', borderRadius: 8, fontSize: 14, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
                  placeholder={language === 'ko' ? '설명을 입력하세요...' : 'Enter description...'}
                />
              </div>
              {versions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                    {language === 'ko' ? '기존 프로파일에서 복사' : 'Copy from existing'}
                  </label>
                  <select
                    value={createForm.copyFromVersionId || ''}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, copyFromVersionId: e.target.value ? parseInt(e.target.value) : null }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #CED0D4', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  >
                    <option value="">{language === 'ko' ? '빈 프로파일로 시작' : 'Start empty'}</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>{v.versionName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: '10px 20px', background: '#E4E6EB', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={createVersion}
                disabled={isCreating || !createForm.name.trim()}
                style={{ padding: '10px 20px', background: '#1877F2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: isCreating || !createForm.name.trim() ? 0.5 : 1 }}
              >
                {isCreating ? (language === 'ko' ? '생성 중...' : 'Creating...') : (language === 'ko' ? '생성' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVersion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {language === 'ko' ? '프로파일 편집' : 'Edit Profile'}
              </h3>
              <button onClick={() => setEditingVersion(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#65676B' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                  {language === 'ko' ? '프로파일 이름' : 'Profile Name'} *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CED0D4', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                  {language === 'ko' ? '설명' : 'Description'}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CED0D4', borderRadius: 8, fontSize: 14, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditingVersion(null)} style={{ padding: '10px 20px', background: '#E4E6EB', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={updateVersion}
                disabled={isUpdating || !editForm.name.trim()}
                style={{ padding: '10px 20px', background: '#1877F2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: isUpdating || !editForm.name.trim() ? 0.5 : 1 }}
              >
                {isUpdating ? (language === 'ko' ? '저장 중...' : 'Saving...') : (language === 'ko' ? '저장' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
