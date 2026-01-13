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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 간단한 환영 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {t('home.title')}
                <span className="inline-block ml-3 px-3 py-1 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full">
                  v{checklistData.version}
                </span>
              </h1>
              <p className="text-lg text-gray-600">
                AWS MSP 파트너 프로그램 자체 평가를 위한 체크리스트 시스템
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* 환영 메시지 */}
        <div className="text-center mb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/50">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                AWS MSP 자체 평가 시작하기
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                AWS MSP(Managed Service Provider) 파트너 프로그램 요구사항을 체계적으로 확인하고 
                평가할 수 있는 전문 도구입니다. 로그인하여 맞춤형 평가를 시작해보세요.
              </p>
            </div>

            {/* 로그인 버튼 */}
            <div className="mb-8">
              <a
                href="/login"
                className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                로그인 / 회원가입
              </a>
            </div>

            {/* 추가 정보 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowProgramInfoModal(true)}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white/80 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                📋 프로그램 정보
              </button>
              <button
                onClick={() => setShowJourneyModal(true)}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white/80 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                🗺️ 파트너 여정
              </button>
            </div>
          </div>
        </div>

        {/* 주요 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">체계적 평가</h3>
              <p className="text-sm text-gray-600">MSP 요구사항을 단계별로 체크하고 진행상황을 추적합니다.</p>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">진행률 관리</h3>
              <p className="text-sm text-gray-600">실시간 대시보드로 평가 진행률과 완료 상태를 확인합니다.</p>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">가이드 제공</h3>
              <p className="text-sm text-gray-600">각 요구사항에 대한 상세한 가이드와 모범 사례를 제공합니다.</p>
            </div>
          </div>
        </div>

        {/* 공지사항 */}
        <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">📢 공지사항</h3>
              <div className="text-amber-700 space-y-2">
                <p>• MSP 체크리스트 시스템 v{checklistData.version} 업데이트 완료</p>
                <p>• 새로운 테마 시스템과 향상된 사용자 경험 제공</p>
                <p>• 평가 데이터는 안전하게 암호화되어 저장됩니다</p>
                <p>• 문의사항은 관리자에게 연락해주세요</p>
              </div>
            </div>
          </div>
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
