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

      if (!importData.data || !importData.data.prerequisites || !importData.data.technical) {
        throw new Error('Invalid file format. Please select a valid progress export file.');
      }

      const confirmMessage = language === 'ko' 
        ? `진행상황을 가져오시겠습니까?\n\n파일: ${file.name}\n내보낸 날짜: ${new Date(importData.exportDate).toLocaleString()}\n프로파일: ${importData.profile?.name || 'Unknown'}\n\n현재 진행상황이 덮어씌워집니다.`
        : `Import progress data?\n\nFile: ${file.name}\nExported: ${new Date(importData.exportDate).toLocaleString()}\nProfile: ${importData.profile?.name || 'Unknown'}\n\nCurrent progress will be overwritten.`;

      if (!confirm(confirmMessage)) {
        setIsImporting(false);
        return;
      }

      for (const item of importData.data.prerequisites) {
        await fetch('/api/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentType: 'prerequisites', item }),
        });
      }

      for (const item of importData.data.technical) {
        await fetch('/api/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentType: 'technical', item }),
        });
      }

      await loadActiveVersionAndData();

      alert(language === 'ko' 
        ? `진행상황을 성공적으로 가져왔습니다!\n\n사전 요구사항: ${importData.data.prerequisites.length}개 항목\n기술 검증: ${importData.data.technical.length}개 항목\n\n페이지를 새로고침하여 변경사항을 확인하세요.`
        : `Progress imported successfully!\n\nPrerequisites: ${importData.data.prerequisites.length} items\nTechnical: ${importData.data.technical.length} items\n\nPlease refresh the page to see the changes.`
      );
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(language === 'ko' ? `가져오기 실패: ${errorMessage}` : `Import failed: ${errorMessage}`);
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
      alert(language === 'ko' ? 'JSON 파일만 가져올 수 있습니다.' : 'Only JSON files can be imported.');
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
      className={`fb-header ${isDragOver ? 'fb-header-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fb-header-drag-overlay">
          <div className="fb-header-drag-content">
            <svg className="fb-header-drag-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <p className="fb-header-drag-title">
              {language === 'ko' ? 'JSON 파일을 여기에 놓으세요' : 'Drop JSON file here'}
            </p>
            <p className="fb-header-drag-subtitle">
              {language === 'ko' ? '진행상황 파일을 가져옵니다' : 'Import progress data'}
            </p>
          </div>
        </div>
      )}

      {/* Left Section - Logo */}
      <div className="fb-header-left">
        <Link href="/" className="fb-header-logo">
          <DragonflyIcon width={40} height={40} className="fb-header-logo-icon" />
        </Link>
        <span className="fb-header-version">v{mspChecklistData.version}</span>
      </div>

      {/* Center Section - Action Buttons */}
      <div className="fb-header-center">
        <div className="fb-header-actions">
          <Link href="/versions" className="fb-header-nav-btn">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>{language === 'ko' ? '프로파일 관리' : 'Profile Management'}</span>
          </Link>
          
          <button onClick={() => setShowProgramInfoModal(true)} className="fb-header-nav-btn fb-header-nav-btn-success">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{language === 'ko' ? '프로그램 상세' : 'Program Info'}</span>
          </button>
          
          <button onClick={() => setShowJourneyModal(true)} className="fb-header-nav-btn fb-header-nav-btn-purple">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>{language === 'ko' ? '파트너 여정 보기' : 'Partner Journey'}</span>
          </button>
          
          <button onClick={handleExportProgress} className="fb-header-nav-btn fb-header-nav-btn-orange">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{t('assessment.exportProgress')}</span>
          </button>
          
          <button onClick={handleImportProgress} disabled={isImporting} className="fb-header-nav-btn fb-header-nav-btn-teal">
            {isImporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            )}
            <span>{isImporting ? (language === 'ko' ? '가져오는 중...' : 'Importing...') : t('assessment.importProgress')}</span>
          </button>
        </div>
      </div>

      {/* Right Section - Language & User Menu */}
      <div className="fb-header-right">
        {/* Language Switcher */}
        <div className="fb-header-lang">
          <button
            onClick={() => setLanguage('ko')}
            className={`fb-header-lang-btn ${language === 'ko' ? 'fb-header-lang-btn-active' : ''}`}
          >
            한국어
          </button>
          <span className="fb-header-lang-divider">|</span>
          <button
            onClick={() => setLanguage('en')}
            className={`fb-header-lang-btn ${language === 'en' ? 'fb-header-lang-btn-active' : ''}`}
          >
            English
          </button>
        </div>

        {/* User Menu */}
        <div className="fb-header-user">
          <button onClick={() => setShowMenu(!showMenu)} className="fb-header-user-btn">
            <div className="fb-header-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="fb-header-user-name">{user.name}</span>
            <svg className="fb-header-user-dropdown-icon w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showMenu && (
            <div className="fb-header-dropdown">
              <div className="fb-header-dropdown-header">
                <p className="fb-header-dropdown-name">{user.name}</p>
                <p className="fb-header-dropdown-email">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="fb-header-dropdown-item">
                <svg className="fb-header-dropdown-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('header.logout')}
              </button>
              <div className="fb-header-dropdown-divider"></div>
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className="fb-header-dropdown-item fb-header-dropdown-item-danger"
              >
                <svg className="fb-header-dropdown-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('header.deleteAccount')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fb-modal-overlay">
          <div className="fb-modal fb-modal-confirm">
            <div className="fb-modal-body">
              <div className="fb-modal-confirm-icon fb-modal-confirm-icon-danger">
                ⚠️
              </div>
              <h3 className="fb-modal-confirm-title">
                {t('delete.title')}
              </h3>
              <p className="fb-modal-confirm-message">
                {t('delete.message')}
              </p>
            </div>
            <div className="fb-modal-footer" style={{ justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="fb-btn fb-btn-secondary">
                {t('delete.cancel')}
              </button>
              <button onClick={handleDeleteAccount} className="fb-btn fb-btn-danger">
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
