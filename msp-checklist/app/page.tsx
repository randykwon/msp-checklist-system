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

  // LocalStorage에서 데이터 로드 (hydration 후에만)
  useEffect(() => {
    setIsHydrated(true);
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
  }, []);

  // 데이터 변경 시 LocalStorage에 저장 (hydration 후에만)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('msp-checklist-data', JSON.stringify(checklistData));
    }
  }, [checklistData, isHydrated]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('home.title')}
                <span className="ml-3 px-3 py-1 text-base font-medium text-blue-600 bg-blue-100 rounded-full">
                  v{checklistData.version}
                </span>
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {t('home.version')} {checklistData.version} | {t('home.lastModified')}: {checklistData.lastModified.toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowProgramInfoModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                {t('program.viewInfo')}
              </button>
              <button
                onClick={() => setShowJourneyModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                {t('journey.viewJourney')}
              </button>
              <a
                href="/login"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                {t('home.loginSignup')}
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard data={checklistData} />

        <div className="mt-8">
          <FilterBar
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>

        <div className="mt-6">
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
