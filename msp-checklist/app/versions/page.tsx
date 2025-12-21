'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import VersionSwitcher from '@/components/VersionSwitcher';

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
  const { language, t } = useLanguage();
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
      
      const response = await fetch('/api/versions?include_inactive=true');
      if (!response.ok) {
        throw new Error('Failed to load versions');
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
      setActiveVersion(data.activeVersion);
    } catch (error: any) {
      console.error('Error loading versions:', error);
      setError(error.message || 'Failed to load versions');
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
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Reset form and close modal
      setCreateForm({ name: '', description: '', copyFromVersionId: null });
      setShowCreateModal(false);
      
      // Reload versions
      await loadVersions();
      
    } catch (error: any) {
      console.error('Error creating version:', error);
      alert(error.message || 'Failed to create version');
    } finally {
      setIsCreating(false);
    }
  };

  const duplicateVersion = async (sourceVersionId: number, sourceName: string) => {
    const newName = prompt(
      language === 'ko' 
        ? `"${sourceName}"의 복사본 이름을 입력하세요:` 
        : `Enter name for copy of "${sourceName}":`,
      `${sourceName} - Copy`
    );
    
    if (!newName || !newName.trim()) return;

    try {
      const response = await fetch(`/api/versions/${sourceVersionId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newName: newName.trim(),
          description: `Duplicated from ${sourceName}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate version');
      }

      await loadVersions();
      
    } catch (error: any) {
      console.error('Error duplicating version:', error);
      alert(error.message || 'Failed to duplicate version');
    }
  };

  const updateVersion = async () => {
    if (!editingVersion || !editForm.name.trim()) return;

    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/versions/${editingVersion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setEditForm({ name: '', description: '' });
      await loadVersions();
      
    } catch (error: any) {
      console.error('Error updating version:', error);
      alert(error.message || 'Failed to update version');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteVersion = async (version: Version) => {
    const confirmed = confirm(
      language === 'ko'
        ? `"${version.versionName}" 프로파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
        : `Are you sure you want to delete profile "${version.versionName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // If deleting the active version, we need to activate another one first
      if (version.isActive && versions.length > 1) {
        const otherVersion = versions.find(v => v.id !== version.id);
        if (otherVersion) {
          console.log('Activating another version before deletion:', otherVersion.versionName);
          await activateVersion(otherVersion.id);
        }
      }

      const response = await fetch(`/api/versions/${version.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete version');
      }

      await loadVersions();
      
    } catch (error: any) {
      console.error('Error deleting version:', error);
      alert(error.message || 'Failed to delete version');
    }
  };

  const activateVersion = async (versionId: number | string) => {
    try {
      // Ensure versionId is a valid number
      const numericVersionId = typeof versionId === 'string' ? parseInt(versionId, 10) : versionId;
      
      if (isNaN(numericVersionId) || numericVersionId <= 0) {
        throw new Error(`Invalid version ID: ${versionId}`);
      }
      
      console.log('Activating version with ID:', numericVersionId, 'original:', versionId, 'type:', typeof versionId);
      
      const url = `/api/versions/${numericVersionId}/activate`;
      console.log('Making request to URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Activate response status:', response.status);
      console.log('Activate response ok:', response.ok);

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            if (responseText.trim()) {
              errorData = JSON.parse(responseText);
            } else {
              errorData = { error: 'Empty response body' };
            }
          } else {
            const textResponse = await response.text();
            console.log('Non-JSON error response:', textResponse);
            errorData = { error: textResponse || 'Unknown error' };
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: 'Failed to parse server response' };
        }
        
        console.error('Activate error response:', errorData);
        
        // More specific error message
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to activate version`;
        throw new Error(`Profile activation failed: ${errorMessage}`);
      }

      const successData = await response.json();
      console.log('Activate success response:', successData);

      await loadVersions();
      
      // Show success message
      const successMessage = `Profile "${successData.version?.versionName || 'Unknown'}" activated successfully`;
      alert(successMessage);
      
    } catch (error: any) {
      console.error('Error activating version:', error);
      
      // More detailed error message for user
      const userMessage = error.message.includes('Profile activation failed:') 
        ? error.message 
        : `Failed to activate profile: ${error.message}`;
        
      alert(userMessage);
    }
  };

  const startEdit = (version: Version) => {
    setEditingVersion(version);
    setEditForm({
      name: version.versionName,
      description: version.description || ''
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {language === 'ko' ? '프로파일을 로딩 중...' : 'Loading profiles...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {language === 'ko' ? '프로파일 관리' : 'Profile Management'}
              </h1>
              <p className="text-gray-600 mt-2">
                {language === 'ko' 
                  ? '여러 프로파일을 생성하고 관리하여 다양한 평가 시나리오를 독립적으로 진행하세요.'
                  : 'Create and manage multiple profiles to handle different assessment scenarios independently.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <VersionSwitcher />
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'ko' ? '+ 새 프로파일' : '+ New Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Versions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {language === 'ko' ? '프로파일 목록' : 'Profile List'}
            </h2>
          </div>
          
          {versions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {language === 'ko' ? '프로파일이 없습니다' : 'No profiles found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'ko' 
                  ? '첫 번째 프로파일을 생성하여 시작하세요.'
                  : 'Create your first profile to get started.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'ko' ? '첫 번째 프로파일 생성' : 'Create First Profile'}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {versions.map((version) => (
                <div key={version.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {version.versionName}
                        </h3>
                        {version.isActive && (
                          <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                            {language === 'ko' ? '활성' : 'Active'}
                          </span>
                        )}
                      </div>
                      
                      {version.description && (
                        <p className="text-gray-600 mb-3">{version.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>
                          {language === 'ko' ? '생성일:' : 'Created:'} {' '}
                          {new Date(version.createdAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')}
                        </span>
                        <span>
                          {language === 'ko' ? '수정일:' : 'Updated:'} {' '}
                          {new Date(version.updatedAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')}
                        </span>
                      </div>
                      
                      {version.progressSummary && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span>
                              {language === 'ko' ? '진행률' : 'Progress'}: {' '}
                              {version.progressSummary.completedItems} / {version.progressSummary.totalItems} {' '}
                              ({version.progressSummary.completionPercentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${version.progressSummary.completionPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          console.log('Activate button clicked for version:', version.id, version.versionName, 'type:', typeof version.id);
                          activateVersion(version.id);
                        }}
                        disabled={version.isActive}
                        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                          version.isActive 
                            ? 'text-green-700 bg-green-100 cursor-default' 
                            : 'text-green-600 bg-green-50 hover:bg-green-100 cursor-pointer'
                        }`}
                      >
                        {version.isActive ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {language === 'ko' ? '활성' : 'Active'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {language === 'ko' ? '선택' : 'Select'}
                          </span>
                        )}
                      </button>
                      
                      <button
                        onClick={() => duplicateVersion(version.id, version.versionName)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        {language === 'ko' ? '복제' : 'Duplicate'}
                      </button>
                      
                      <button
                        onClick={() => startEdit(version)}
                        className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {language === 'ko' ? '편집' : 'Edit'}
                      </button>
                      
                      <button
                        onClick={() => deleteVersion(version)}
                        className="px-3 py-1 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        {language === 'ko' ? '삭제' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← {language === 'ko' ? '대시보드로 돌아가기' : 'Back to Dashboard'}
          </a>
        </div>
      </div>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {language === 'ko' ? '새 프로파일 생성' : 'Create New Profile'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ko' ? '프로파일 이름' : 'Profile Name'} *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                    placeholder={language === 'ko' ? '예: 2024 Q1 평가' : 'e.g., 2024 Q1 Assessment'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ko' ? '설명' : 'Description'}
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                    rows={3}
                    placeholder={language === 'ko' ? '이 프로파일에 대한 설명을 입력하세요...' : 'Enter a description for this profile...'}
                  />
                </div>
                
                {versions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {language === 'ko' ? '기존 프로파일에서 복사' : 'Copy from existing profile'}
                    </label>
                    <select
                      value={createForm.copyFromVersionId || ''}
                      onChange={(e) => setCreateForm(prev => ({ 
                        ...prev, 
                        copyFromVersionId: e.target.value ? parseInt(e.target.value) : null 
                      }))}
                      className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">
                        {language === 'ko' ? '빈 프로파일로 시작' : 'Start with empty profile'}
                      </option>
                      {versions.map((version) => (
                        <option key={version.id} value={version.id}>
                          {version.versionName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={createVersion}
                  disabled={isCreating || !createForm.name.trim()}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 
                    (language === 'ko' ? '생성 중...' : 'Creating...') :
                    (language === 'ko' ? '생성' : 'Create')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Version Modal */}
      {editingVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {language === 'ko' ? '프로파일 편집' : 'Edit Profile'}
                </h3>
                <button
                  onClick={() => setEditingVersion(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ko' ? '프로파일 이름' : 'Profile Name'} *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ko' ? '설명' : 'Description'}
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingVersion(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={updateVersion}
                  disabled={isUpdating || !editForm.name.trim()}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? 
                    (language === 'ko' ? '저장 중...' : 'Saving...') :
                    (language === 'ko' ? '저장' : 'Save')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}