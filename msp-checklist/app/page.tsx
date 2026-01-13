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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* 간단한 환영 헤더 */}
      <header className="bg-white/70 backdrop-blur-md border-b border-pink-200/30 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-3">
                {t('home.title')}
                <span className="inline-block ml-3 px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-100/80 rounded-full border border-purple-200">
                  v{checklistData.version}
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                AWS MSP 파트너 프로그램 자체 평가를 위한 체크리스트 시스템
              </p>
            </div>
            
            {/* 헤더 로그인 아이콘 버튼 */}
            <div className="ml-6">
              <a
                href="/login"
                className="header-login-icon-btn inline-flex items-center justify-center w-12 h-12 rounded-full transform hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #f472b6, #a855f7, #3b82f6)',
                  color: '#ffffff'
                }}
                title="로그인"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* 환영 메시지 */}
        <div className="text-center mb-16">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-pink-200/30">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                AWS MSP 자체 평가 시작하기
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                AWS MSP(Managed Service Provider) 파트너 프로그램 요구사항을 체계적으로 확인하고 
                평가할 수 있는 전문 도구입니다. 로그인하여 맞춤형 평가를 시작해보세요.
              </p>
            </div>

            {/* 메인 로그인 버튼 */}
            <div className="mb-10">
              <div className="text-center space-y-6">
                <a
                  href="/login"
                  className="main-login-button-pastel inline-flex items-center px-16 py-6 text-2xl font-bold rounded-3xl transform transition-all duration-300 shadow-xl hover:shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #3b82f6 100%)',
                    color: '#ffffff',
                    textShadow: '0 3px 6px rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <svg className="w-8 h-8 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  🚀 지금 시작하기
                </a>
                
                {/* 부가 설명 */}
                <p className="text-base text-gray-500">
                  무료 회원가입 • 즉시 사용 가능 • 데이터 안전 보장
                </p>
                
                {/* 빠른 로그인 옵션 */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <a
                    href="/login"
                    className="quick-login-option-pastel blue-option inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                      color: '#1e40af',
                      border: '2px solid #93c5fd'
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    기존 계정으로 로그인
                  </a>
                  <a
                    href="/register"
                    className="quick-login-option-pastel green-option inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      color: '#047857',
                      border: '2px solid #86efac'
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    새 계정 만들기
                  </a>
                </div>
              </div>
            </div>

            {/* 추가 정보 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowProgramInfoModal(true)}
                className="inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                  color: '#92400e',
                  border: '2px solid #fcd34d'
                }}
              >
                📋 프로그램 정보
              </button>
              <button
                onClick={() => setShowJourneyModal(true)}
                className="inline-flex items-center px-8 py-4 text-base font-medium rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                  color: '#3730a3',
                  border: '2px solid #a5b4fc'
                }}
              >
                🗺️ 파트너 여정
              </button>
            </div>
          </div>
        </div>

        {/* 주요 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-pink-200/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-300 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">체계적 평가</h3>
              <p className="text-base text-gray-600">MSP 요구사항을 단계별로 체크하고 진행상황을 추적합니다.</p>
            </div>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-green-200/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-300 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">진행률 관리</h3>
              <p className="text-base text-gray-600">실시간 대시보드로 평가 진행률과 완료 상태를 확인합니다.</p>
            </div>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-200/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-300 to-violet-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">가이드 제공</h3>
              <p className="text-base text-gray-600">각 요구사항에 대한 상세한 가이드와 모범 사례를 제공합니다.</p>
            </div>
          </div>
        </div>

        {/* 공지사항 */}
        <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-8 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-300 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-amber-800 mb-3">📢 공지사항</h3>
              <div className="text-amber-700 space-y-2 text-base leading-relaxed">
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
      
      {/* 플로팅 로그인 아이콘 버튼 */}
      <a
        href="/login"
        className="floating-login-icon-btn"
        title="로그인하기"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 1000,
          borderRadius: '50%',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f472b6, #a855f7, #3b82f6)',
          boxShadow: '0 8px 25px rgba(244, 114, 182, 0.4)',
          transition: 'all 0.3s ease',
          color: '#ffffff',
          textDecoration: 'none'
        }}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      </a>
    </div>
  );
}
