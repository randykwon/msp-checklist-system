'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { mspChecklistData } from '@/data/msp-checklist-data';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import DragonflyIcon from './DragonflyIcon';
import Link from 'next/link';
import MSPPartnerJourneyModal from './MSPPartnerJourneyModal';
import MSPProgramInfoModal from './MSPProgramInfoModal';

export default function Header() {
  const { user, logout, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProgramInfoModal, setShowProgramInfoModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [assessmentData, setAssessmentData] = useState<any>({
    prerequisites: [],
    technical: []
  });
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load active version and assessment data
  useEffect(() => {
    if (user) {
      loadActiveVersionAndData();
    }
  }, [user]);

  const loadActiveVersionAndData = async () => {
    try {
      // Load active version
      const versionsResponse = await fetch('/api/versions');
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setActiveVersion(versionsData.activeVersion);
      } else if (versionsResponse.status === 401) {
        // User not authenticated - this is expected, don't log error
        console.log('User not authenticated, skipping version load');
        return;
      }

      // Load assessment data for both types
      const [prerequisitesResponse, technicalResponse] = await Promise.all([
        fetch('/api/assessment?type=prerequisites'),
        fetch('/api/assessment?type=technical')
      ]);

      const prerequisitesData = prerequisitesResponse.ok ? await prerequisitesResponse.json() : { data: [] };
      const technicalData = technicalResponse.ok ? await technicalResponse.json() : { data: [] };

      setAssessmentData({
        prerequisites: prerequisitesData.data || [],
        technical: technicalData.data || []
      });
    } catch (error) {
      // Only log error if it's not an authentication issue
      if (!error.message?.includes('401') && !error.message?.includes('Not authenticated')) {
        console.error('Failed to load assessment data:', error);
      }
    }
  };

  const handleExportProgress = () => {
    const exportData = {
      profile: activeVersion ? {
        id: activeVersion.id,
        name: activeVersion.name,
        description: activeVersion.description
      } : null,
      exportDate: new Date().toISOString(),
      data: {
        prerequisites: assessmentData.prerequisites,
        technical: assessmentData.technical
      },
      summary: {
        prerequisitesTotal: assessmentData.prerequisites.length,
        prerequisitesCompleted: assessmentData.prerequisites.filter((item: any) => item.met !== null).length,
        technicalTotal: assessmentData.technical.length,
        technicalCompleted: assessmentData.technical.filter((item: any) => item.met !== null).length
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const profileName = activeVersion?.name || 'unknown-profile';
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `msp-assessment-${profileName}-${dateStr}.json`;
    
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (file: File) => {
    try {
      setIsImporting(true);
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate import data structure
      if (!importData.data || !importData.data.prerequisites || !importData.data.technical) {
        throw new Error('Invalid file format. Please select a valid progress export file.');
      }

      // Confirm import
      const confirmMessage = language === 'ko' 
        ? `진행상황을 가져오시겠습니까?\n\n파일: ${file.name}\n내보낸 날짜: ${new Date(importData.exportDate).toLocaleString()}\n프로파일: ${importData.profile?.name || 'Unknown'}\n\n현재 진행상황이 덮어씌워집니다.`
        : `Import progress data?\n\nFile: ${file.name}\nExported: ${new Date(importData.exportDate).toLocaleString()}\nProfile: ${importData.profile?.name || 'Unknown'}\n\nCurrent progress will be overwritten.`;

      if (!confirm(confirmMessage)) {
        setIsImporting(false);
        return;
      }

      // Import prerequisites data
      for (const item of importData.data.prerequisites) {
        await fetch('/api/assessment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentType: 'prerequisites',
            item: item
          }),
        });
      }

      // Import technical data
      for (const item of importData.data.technical) {
        await fetch('/api/assessment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentType: 'technical',
            item: item
          }),
        });
      }

      // Reload data
      await loadActiveVersionAndData();

      // Show success message
      alert(language === 'ko' 
        ? `진행상황을 성공적으로 가져왔습니다!\n\n사전 요구사항: ${importData.data.prerequisites.length}개 항목\n기술 검증: ${importData.data.technical.length}개 항목\n\n페이지를 새로고침하여 변경사항을 확인하세요.`
        : `Progress imported successfully!\n\nPrerequisites: ${importData.data.prerequisites.length} items\nTechnical: ${importData.data.technical.length} items\n\nPlease refresh the page to see the changes.`
      );

    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(language === 'ko' 
        ? `가져오기 실패: ${errorMessage}`
        : `Import failed: ${errorMessage}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportProgress = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      await handleFileImport(file);
    };
    input.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      await handleFileImport(jsonFile);
    } else {
      alert(language === 'ko' 
        ? 'JSON 파일만 가져올 수 있습니다.'
        : 'Only JSON files can be imported.'
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      router.push('/register');
    } catch (error) {
      console.error('Delete account failed:', error);
    }
  };

  if (!user) return null;

  return (
    <header 
      className={`bg-white shadow-sm border-b border-gray-200 ${isDragOver ? 'bg-blue-50 border-blue-300' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-75 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-dashed border-blue-400">
            <div className="text-center">
              <svg className="w-12 h-12 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <p className="text-lg font-medium text-blue-700">
                {language === 'ko' ? 'JSON 파일을 여기에 놓으세요' : 'Drop JSON file here'}
              </p>
              <p className="text-sm text-blue-600">
                {language === 'ko' ? '진행상황 파일을 가져옵니다' : 'Import progress data'}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <DragonflyIcon width={40} height={40} className="text-blue-600" />
              <span className="ml-2 px-2 py-0.5 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                v{mspChecklistData.version}
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-6">
              <Link
                href="/versions"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {language === 'ko' ? '프로파일 관리' : 'Profile Management'}
              </Link>
              
              <button
                onClick={() => setShowProgramInfoModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {language === 'ko' ? '프로그램 상세' : 'Program Info'}
              </button>
              
              <button
                onClick={() => setShowJourneyModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {language === 'ko' ? '파트너 여정 보기' : 'Partner Journey'}
              </button>
              
              <button
                onClick={handleExportProgress}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-lg transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('assessment.exportProgress')}
              </button>
              
              <button
                onClick={handleImportProgress}
                disabled={isImporting}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-sm"
              >
                {isImporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1.5"></div>
                ) : (
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                )}
                {isImporting 
                  ? (language === 'ko' ? '가져오는 중...' : 'Importing...') 
                  : t('assessment.importProgress')
                }
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => setLanguage('ko')}
                className={`px-2 py-1 ${language === 'ko' ? 'font-bold text-blue-600' : 'text-gray-600'}`}
              >
                한국어
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 ${language === 'en' ? 'font-bold text-blue-600' : 'text-gray-600'}`}
              >
                English
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {t('header.logout')}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    {t('header.deleteAccount')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('delete.title')}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {t('delete.message')}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('delete.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700"
              >
                {t('delete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MSP Program Info Modal */}
      {showProgramInfoModal && (
        <MSPProgramInfoModal 
          isOpen={showProgramInfoModal}
          onClose={() => setShowProgramInfoModal(false)} 
        />
      )}

      {/* MSP Partner Journey Modal */}
      {showJourneyModal && (
        <MSPPartnerJourneyModal 
          isOpen={showJourneyModal}
          onClose={() => setShowJourneyModal(false)} 
        />
      )}
    </header>
  );
}
