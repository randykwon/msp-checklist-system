'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mspChecklistData } from '@/data/msp-checklist-data';
import { MSPChecklistData, FilterStatus, FilterPriority } from '@/types';
import Dashboard from '@/components/Dashboard';
import ChecklistView from '@/components/ChecklistView';
import FilterBar from '@/components/FilterBar';
import MSPPartnerJourneyModal from '@/components/MSPPartnerJourneyModal';
import MSPProgramInfoModal from '@/components/MSPProgramInfoModal';
import ThemeSelector from '@/components/ThemeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [checklistData, setChecklistData] = useState<MSPChecklistData>(mspChecklistData);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showProgramInfoModal, setShowProgramInfoModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Redirect to assessment if logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/assessment');
    }
  }, [user, loading, router]);

  // Hydration 완료 표시
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // LocalStorage에서 데이터 로드 (hydration 후에만)
  useEffect(() => {
    if (isHydrated) {
      const savedData = localStorage.getItem('msp-checklist-data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Date 객체 복원
        parsed.lastModified = new Date(parsed.lastModified);
        parsed.categories.forEach((cat: any) => {
          cat.items.forEach((item: any) => {
            item.lastUpdated = new Date(item.lastUpdated);
            if (item.dueDate) item.dueDate = new Date(item.dueDate);
            item.documents.forEach((doc: any) => {
              doc.uploadedAt = new Date(doc.uploadedAt);
            });
          });
        });
        setChecklistData(parsed);
      }
    }
  }, [isHydrated]);

  // 데이터 변경 시 LocalStorage에 저장 (hydration 후에만)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('msp-checklist-data', JSON.stringify(checklistData));
    }
  }, [checklistData, isHydrated]);

  // Hydration 전에는 null 반환
  if (!isHydrated) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="header">
        <div className="header-content">
          <div className="header-flex">
            <div className="header-title animate-fade-in">
              <h1>
                {t('home.title')}
                <span className="version-badge">
                  v{checklistData.version}
                </span>
              </h1>
              <p className="header-subtitle">
                {t('home.version')} {checklistData.version} | {t('home.lastModified')}: {checklistData.lastModified.toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="header-actions animate-fade-in">
              {/* 사계절 테마 페이지 버튼 */}
              <a
                href="/seasons"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  fontWeight: '700',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '140px',
                  justifyContent: 'center'
                }}
              >
                🌈 사계절 테마
              </a>
              
              {/* 주야간 모드 페이지 버튼 */}
              <a
                href="/day-night"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.2)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  fontWeight: '700',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(30, 41, 59, 0.4)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '140px',
                  justifyContent: 'center'
                }}
              >
                🌓 주야간 모드
              </a>
              
              {/* 테마 선택기 추가 */}
              <ThemeSelector 
                language={t.language || 'ko'} 
                className="mr-4"
              />
              
              <button
                onClick={() => setShowProgramInfoModal(true)}
                className="btn btn-success"
              >
                📋 {t('program.viewInfo')}
              </button>
              <button
                onClick={() => setShowJourneyModal(true)}
                className="btn btn-purple"
              >
                🚀 {t('journey.viewJourney')}
              </button>
              <a
                href="/login"
                className="btn btn-primary"
              >
                🔐 {t('home.loginSignup')}
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-section animate-fade-in">
          <Dashboard data={checklistData} />
        </div>

        <div className="content-section animate-fade-in">
          <FilterBar
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>

        <div className="content-section animate-fade-in">
          <ChecklistView
            data={checklistData}
            setData={setChecklistData}
            filterStatus={filterStatus}
            filterPriority={filterPriority}
            searchTerm={searchTerm}
          />
        </div>
      </main>

      {/* MSP Program Info Modal */}
      <MSPProgramInfoModal 
        isOpen={showProgramInfoModal} 
        onClose={() => setShowProgramInfoModal(false)} 
      />

      {/* MSP Partner Journey Modal */}
      <MSPPartnerJourneyModal 
        isOpen={showJourneyModal} 
        onClose={() => setShowJourneyModal(false)} 
      />
    </div>
  );
}
