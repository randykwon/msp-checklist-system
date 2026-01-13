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
import DayNightToggle from './DayNightToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { themes, ThemeType } from '@/lib/theme-system';

export default function Header() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { currentTheme, setTheme } = useTheme();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showProgramInfoModal, setShowProgramInfoModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
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

  // Close theme dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showThemeDropdown) {
        const target = event.target as Element;
        if (!target.closest('.fb-header-left')) {
          setShowThemeDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeDropdown]);

  const loadActiveVersionAndData = async () => {
    try {
      // Load active version
      const versionsResponse = await fetch('/api/versions', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setActiveVersion(versionsData.activeVersion);
      } else if (versionsResponse.status === 401) {
        console.log('User not authenticated, skipping version load');
        return;
      }

      // Load assessment data for both types
      const [prerequisitesResponse, technicalResponse] = await Promise.all([
        fetch('/api/assessment?type=prerequisites', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/assessment?type=technical', { credentials: 'include', cache: 'no-store' })
      ]);

      const prerequisitesData = prerequisitesResponse.ok ? await prerequisitesResponse.json() : { data: [] };
      const technicalData = technicalResponse.ok ? await technicalResponse.json() : { data: [] };

      setAssessmentData({
        prerequisites: prerequisitesData.data || [],
        technical: technicalData.data || []
      });
    } catch (error: any) {
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

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(language === 'ko' ? '모든 필드를 입력해주세요.' : 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'ko' ? '새 비밀번호가 일치하지 않습니다.' : 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(language === 'ko' ? '비밀번호는 최소 6자 이상이어야 합니다.' : 'Password must be at least 6 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess(language === 'ko' ? '비밀번호가 성공적으로 변경되었습니다.' : 'Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(data.error || (language === 'ko' ? '비밀번호 변경에 실패했습니다.' : 'Failed to change password.'));
      }
    } catch (error) {
      setPasswordError(language === 'ko' ? '비밀번호 변경에 실패했습니다.' : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
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

      {/* Left Section - Logo with Theme Dropdown */}
      <div className="fb-header-left">
        <div className="relative">
          <button 
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="fb-header-logo flex items-center"
            title={language === 'ko' ? '테마 선택' : 'Select Theme'}
          >
            <DragonflyIcon width={40} height={40} className="fb-header-logo-icon" />
            <svg 
              className="w-3 h-3 ml-1 transition-transform duration-200" 
              style={{ transform: showThemeDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Theme Dropdown Menu */}
          {showThemeDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50" style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}>
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--theme-text-primary)' }}>
                  {language === 'ko' ? '테마 선택' : 'Select Theme'}
                </h3>
                
                {/* Day/Night Themes */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
                    {language === 'ko' ? '주야간 모드' : 'Day/Night Mode'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['day', 'night'] as ThemeType[]).map((themeId) => {
                      const theme = themes[themeId];
                      const isActive = currentTheme.id === themeId;
                      return (
                        <button
                          key={themeId}
                          onClick={() => {
                            setTheme(themeId);
                            setShowThemeDropdown(false);
                          }}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                            isActive 
                              ? 'border-blue-500' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{
                            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-bg-secondary)',
                            borderColor: isActive ? '#3b82f6' : 'var(--theme-border)',
                            boxShadow: isActive ? '0 0 0 1px rgba(59, 130, 246, 0.3)' : 'none'
                          }}
                        >
                          <div className="flex items-center justify-center mb-1">
                            <span className="text-lg">{theme.icon}</span>
                          </div>
                          <div className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                            {theme.name[language]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seasonal Themes */}
                <div>
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
                    {language === 'ko' ? '사계절 테마' : 'Seasonal Themes'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['spring', 'summer', 'autumn', 'winter'] as ThemeType[]).map((themeId) => {
                      const theme = themes[themeId];
                      const isActive = currentTheme.id === themeId;
                      return (
                        <button
                          key={themeId}
                          onClick={() => {
                            setTheme(themeId);
                            setShowThemeDropdown(false);
                          }}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                            isActive 
                              ? 'border-blue-500' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{
                            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-bg-secondary)',
                            borderColor: isActive ? '#3b82f6' : 'var(--theme-border)',
                            boxShadow: isActive ? '0 0 0 1px rgba(59, 130, 246, 0.3)' : 'none'
                          }}
                          title={theme.name[language]}
                        >
                          <div className="flex items-center justify-center">
                            <span className="text-2xl">{theme.icon}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nature Themes */}
                <div className="mt-4">
                  <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
                    {language === 'ko' ? '자연 테마' : 'Nature Themes'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ocean', 'mountain'] as ThemeType[]).map((themeId) => {
                      const theme = themes[themeId];
                      const isActive = currentTheme.id === themeId;
                      return (
                        <button
                          key={themeId}
                          onClick={() => {
                            setTheme(themeId);
                            setShowThemeDropdown(false);
                          }}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                            isActive 
                              ? 'border-blue-500' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{
                            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--theme-bg-secondary)',
                            borderColor: isActive ? '#3b82f6' : 'var(--theme-border)',
                            boxShadow: isActive ? '0 0 0 1px rgba(59, 130, 246, 0.3)' : 'none'
                          }}
                        >
                          <div className="flex items-center justify-center mb-1">
                            <span className="text-lg">{theme.icon}</span>
                          </div>
                          <div className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                            {theme.name[language]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
          
          <button 
            onClick={() => {
              // 커스텀 이벤트 발생 - assessment 페이지에서 처리
              window.dispatchEvent(new CustomEvent('saveAllProgress'));
            }} 
            className="fb-header-nav-btn"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>{language === 'ko' ? '💾 저장' : '💾 Save'}</span>
          </button>
          
          {/* Day/Night Toggle */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginLeft: '8px',
            height: '40px' // Match header button height
          }}>
            <DayNightToggle />
          </div>
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
                  setShowPasswordModal(true);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="fb-header-dropdown-item"
              >
                <svg className="fb-header-dropdown-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                {language === 'ko' ? '비밀번호 변경' : 'Change Password'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fb-modal-overlay">
          <div className="fb-modal" style={{ maxWidth: '420px' }}>
            <div className="fb-modal-header" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>🔑 {language === 'ko' ? '비밀번호 변경' : 'Change Password'}</h3>
              <button 
                onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setPasswordSuccess(''); }}
                style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', fontSize: '16px', cursor: 'pointer' }}
              >×</button>
            </div>
            <div className="fb-modal-body" style={{ padding: '20px' }}>
              {passwordError && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', marginBottom: '16px', color: '#B91C1C', fontSize: '14px' }}>
                  ❌ {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', marginBottom: '16px', color: '#047857', fontSize: '14px' }}>
                  ✅ {passwordSuccess}
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '6px' }}>
                  {language === 'ko' ? '현재 비밀번호' : 'Current Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showCurrentPw ? 'text' : 'password'} 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={language === 'ko' ? '현재 비밀번호 입력' : 'Enter current password'}
                    style={{ width: '100%', padding: '10px 40px 10px 14px', fontSize: '14px', border: '2px solid #E4E6EB', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#65676B' }}
                  >
                    {showCurrentPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '6px' }}>
                  {language === 'ko' ? '새 비밀번호' : 'New Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showNewPw ? 'text' : 'password'} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={language === 'ko' ? '최소 6자 이상' : 'At least 6 characters'}
                    style={{ width: '100%', padding: '10px 40px 10px 14px', fontSize: '14px', border: '2px solid #F59E0B', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#65676B' }}
                  >
                    {showNewPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '6px' }}>
                  {language === 'ko' ? '새 비밀번호 확인' : 'Confirm New Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPw ? 'text' : 'password'} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={language === 'ko' ? '비밀번호 다시 입력' : 'Re-enter new password'}
                    style={{ width: '100%', padding: '10px 40px 10px 14px', fontSize: '14px', border: '2px solid #F59E0B', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#65676B' }}
                  >
                    {showConfirmPw ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#EF4444' }}>❌ {language === 'ko' ? '비밀번호가 일치하지 않습니다' : 'Passwords do not match'}</p>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#42B883' }}>✅ {language === 'ko' ? '비밀번호가 일치합니다' : 'Passwords match'}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setPasswordSuccess(''); }}
                  style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#65676B', background: '#E4E6EB', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                  style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: 'white', background: (isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6) ? '#FCD34D' : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', border: 'none', borderRadius: '8px', cursor: (isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6) ? 'not-allowed' : 'pointer' }}
                >
                  {isChangingPassword ? (language === 'ko' ? '변경 중...' : 'Changing...') : (language === 'ko' ? '🔐 변경' : '🔐 Change')}
                </button>
              </div>
              
              {/* 비밀번호 분실 안내 */}
              <div style={{ marginTop: '16px', padding: '12px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
                  💡 {language === 'ko' 
                    ? '비밀번호를 잊으셨나요? 관리자에게 연락하여 비밀번호 초기화를 요청해주세요.' 
                    : 'Forgot your password? Please contact the administrator to request a password reset.'}
                </p>
              </div>
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
