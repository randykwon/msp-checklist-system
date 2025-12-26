'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { prerequisitesData } from '../../data/assessment-data';
import { technicalValidationData } from '../../data/technical-validation-data';
import { mspChecklistData } from '../../data/msp-checklist-data';
import { AssessmentItem } from '../../lib/csv-parser';
import AssessmentDashboard from '../../components/AssessmentDashboard';
import AssessmentView from '../../components/AssessmentView';
import Header from '../../components/Header';
import AdviceCacheStatus from '../../components/AdviceCacheStatus';
import VersionSwitcher from '../../components/VersionSwitcher';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AnnouncementBanner from '@/components/AnnouncementBanner';

export default function AssessmentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { language, t } = useLanguage();
  const [assessmentType, setAssessmentType] = useState<'prerequisites' | 'technical'>('prerequisites');
  const [prerequisitesState, setPrerequisitesState] = useState<AssessmentItem[]>(prerequisitesData);
  const [technicalValidationState, setTechnicalValidationState] = useState<AssessmentItem[]>(technicalValidationData);
  const [isMounted, setIsMounted] = useState(false);

  // 현재 표시할 데이터
  const currentData = assessmentType === 'prerequisites' ? prerequisitesState : technicalValidationState;
  const setCurrentData = assessmentType === 'prerequisites' ? setPrerequisitesState : setTechnicalValidationState;

  // Authentication check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 데이터베이스에서 사용자별 진행사항 로드
  const loadUserAssessmentData = async (type: 'prerequisites' | 'technical') => {
    if (!user) return;

    try {
      console.log(`Loading ${type} data for current profile...`);
      const response = await fetch(`/api/assessment?type=${type}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`API response for ${type}:`, result);
        
        if (result.data && result.data.length > 0) {
          // 데이터베이스에서 로드된 데이터를 기본 데이터와 병합
          const baseData = type === 'prerequisites' ? prerequisitesData : technicalValidationData;
          const mergedData = baseData.map(baseItem => {
            const savedItem = result.data.find((saved: AssessmentItem) => saved.id === baseItem.id);
            if (savedItem) {
              return {
                ...baseItem,
                ...savedItem,
                lastUpdated: new Date(savedItem.lastUpdated)
              };
            }
            return baseItem;
          });

          if (type === 'prerequisites') {
            setPrerequisitesState(mergedData);
          } else {
            setTechnicalValidationState(mergedData);
          }
          
          console.log(`Loaded ${type} data from database:`, result.data.length, 'items');
          console.log(`Active profile: ${result.activeVersion?.name || 'Unknown'}`);
          return;
        } else {
          // 빈 데이터인 경우 기본 데이터로 초기화
          console.log(`No saved data for ${type}, using default data`);
          if (type === 'prerequisites') {
            setPrerequisitesState(prerequisitesData);
          } else {
            setTechnicalValidationState(technicalValidationData);
          }
        }
      } else {
        console.error(`Failed to load ${type} data:`, response.status, response.statusText);
        // API 실패 시 기본 데이터로 초기화
        if (type === 'prerequisites') {
          setPrerequisitesState(prerequisitesData);
        } else {
          setTechnicalValidationState(technicalValidationData);
        }
      }
    } catch (error) {
      console.error(`Error loading ${type} data from database:`, error);
      // 오류 발생 시 기본 데이터로 초기화
      if (type === 'prerequisites') {
        setPrerequisitesState(prerequisitesData);
      } else {
        setTechnicalValidationState(technicalValidationData);
      }
    }
  };

  // 데이터베이스에 저장
  const saveToDatabase = async (type: 'prerequisites' | 'technical', item: AssessmentItem) => {
    if (!user) return;

    try {
      console.log(`Saving ${type} item ${item.id} to database...`);
      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          assessmentType: type,
          item: item
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Saved ${type} item ${item.id} to database for profile:`, result.activeVersion?.name);
      } else {
        console.error(`Failed to save ${type} item ${item.id} to database:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`Error saving ${type} item to database:`, error);
    }
  };

  // 컴포넌트 마운트 후 초기화
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 사용자 로그인 후 데이터 로드
  useEffect(() => {
    if (user && !loading && isMounted) {
      console.log('Loading assessment data for user:', user.userId);
      loadUserAssessmentData('prerequisites');
      loadUserAssessmentData('technical');
    }
  }, [user, loading, isMounted]);

  const handleUpdate = (itemId: string, updates: Partial<AssessmentItem>) => {
    setCurrentData(prevData => {
      const updatedData = prevData.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };
          // 데이터베이스에 저장
          saveToDatabase(assessmentType, updatedItem);
          return updatedItem;
        }
        return item;
      });
      return updatedData;
    });
  };


  // Show loading state - 하이드레이션 문제 방지를 위해 isMounted 체크
  if (loading || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F2F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <div style={{ marginTop: 16, color: '#65676B', fontSize: 16 }}>
            {isMounted ? (language === 'ko' ? '로딩 중...' : 'Loading...') : ''}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* 공지사항 배너 */}
      <AnnouncementBanner />
      
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6" style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center mb-2">
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                    {t('assessment.title')}
                  </h1>
                  <span className="ml-3 px-3 py-1 text-sm font-semibold text-blue-700 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full border border-blue-300">
                    v{mspChecklistData.version}
                  </span>
                </div>
                <p className="text-lg" style={{ color: 'var(--theme-text-secondary)' }}>
                  {t('assessment.subtitle')}
                </p>
                {/* Version Switcher */}
                <div className="mt-3">
                  <VersionSwitcher 
                    onVersionChange={(version) => {
                      // Reload assessment data when version changes
                      console.log('Profile switched to:', version.versionName);
                      // Reload data for the new profile
                      setTimeout(() => {
                        loadUserAssessmentData('prerequisites');
                        loadUserAssessmentData('technical');
                      }, 100); // Small delay to ensure profile switch is complete
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6" style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}>
            <div className="px-6 py-4">
              <div className="flex space-x-3">
                <button
                  onClick={() => setAssessmentType('prerequisites')}
                  style={{
                    padding: '14px 24px',
                    fontWeight: 600,
                    borderRadius: 10,
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer',
                    background: assessmentType === 'prerequisites' 
                      ? 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' 
                      : '#F0F2F5',
                    color: assessmentType === 'prerequisites' ? 'white' : '#65676B',
                    boxShadow: assessmentType === 'prerequisites' ? '0 4px 12px rgba(24, 119, 242, 0.3)' : 'none'
                  }}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('assessment.prerequisites')}
                  </div>
                </button>
                <button
                  onClick={() => setAssessmentType('technical')}
                  style={{
                    padding: '14px 24px',
                    fontWeight: 600,
                    borderRadius: 10,
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer',
                    background: assessmentType === 'technical' 
                      ? 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' 
                      : '#F0F2F5',
                    color: assessmentType === 'technical' ? 'white' : '#65676B',
                    boxShadow: assessmentType === 'technical' ? '0 4px 12px rgba(66, 184, 131, 0.3)' : 'none'
                  }}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t('assessment.technical')}
                  </div>
                </button>
              </div>
            </div>
          </div>

        {/* Dashboard */}
        <AssessmentDashboard
          items={currentData}
          title={assessmentType === 'prerequisites' ? t('assessment.prerequisitesProgress') : t('assessment.technicalProgress')}
        />

        {/* Assessment Items */}
        <AssessmentView
          items={currentData}
          assessmentType={assessmentType}
          onUpdate={handleUpdate}
        />

        {/* Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('assessment.footer.systemName')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">{t('assessment.footer.version')}</p>
            <p className="text-xs text-gray-500">
              {t('assessment.footer.storage')}
            </p>
          </div>
        </div>
        </div>
      </div>
      
      {/* Advice Cache Status */}
      <AdviceCacheStatus />
    </div>
  );
}
