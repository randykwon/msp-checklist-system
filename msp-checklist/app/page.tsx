'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mspChecklistData } from '@/data/msp-checklist-data';
import { MSPChecklistData, FilterStatus, FilterPriority } from '@/types';
import MSPPartnerJourneyModal from '@/components/MSPPartnerJourneyModal';
import MSPProgramInfoModal from '@/components/MSPProgramInfoModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [checklistData, setChecklistData] = useState<MSPChecklistData>(mspChecklistData);
  const [homepageAnnouncements, setHomepageAnnouncements] = useState<any[]>([]);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showProgramInfoModal, setShowProgramInfoModal] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/assessment');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setIsHydrated(true);
    fetchHomepageAnnouncements();
  }, []);

  const fetchHomepageAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements/homepage');
      if (response.ok) {
        const data = await response.json();
        setHomepageAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Failed to fetch homepage announcements:', error);
    }
  };

  useEffect(() => {
    if (isHydrated) {
      const savedData = localStorage.getItem('msp-checklist-data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
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

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('msp-checklist-data', JSON.stringify(checklistData));
    }
  }, [checklistData, isHydrated]);

  if (!isHydrated) {
    return null;
  }

  return (
    <div className="home-page">
      {/* 배경 장식 요소 */}
      <div className="home-bg-decoration">
        <div className="home-bg-circle home-bg-circle-1"></div>
        <div className="home-bg-circle home-bg-circle-2"></div>
        <div className="home-bg-circle home-bg-circle-3"></div>
      </div>

      {/* 헤더 */}
      <header className="home-header">
        <div className="home-header-content">
          <div className="home-logo-section">
            <div className="home-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="home-title-group">
              <h1 className="home-title">AWS MSP 체크리스트</h1>
              <span className="home-version">v{checklistData.version}</span>
            </div>
          </div>
          <a href="/login" className="home-header-login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </a>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero-content">
            <div className="home-hero-badge">
              <span>🚀 AWS MSP Partner Program</span>
            </div>
            <h2 className="home-hero-title">
              파트너 프로그램<br />
              <span className="home-hero-highlight">자체 평가 시스템</span>
            </h2>
            <p className="home-hero-desc">
              AWS MSP 요구사항을 체계적으로 확인하고<br className="home-mobile-br" />
              평가 진행률을 실시간으로 관리하세요
            </p>

            {/* CTA 버튼 */}
            <div className="home-cta-group">
              <a href="/login" className="home-cta-primary">
                <span>시작하기</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a href="/register" className="home-cta-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>회원가입</span>
              </a>
            </div>
          </div>

          {/* 히어로 일러스트 */}
          <div className="home-hero-visual">
            <div className="home-hero-card">
              <div className="home-hero-card-header">
                <div className="home-hero-card-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div className="home-hero-card-body">
                <div className="home-hero-progress">
                  <div className="home-hero-progress-bar"></div>
                </div>
                <div className="home-hero-checklist">
                  <div className="home-hero-check-item done">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    <span>기본 요구사항</span>
                  </div>
                  <div className="home-hero-check-item done">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    <span>운영 관리</span>
                  </div>
                  <div className="home-hero-check-item">
                    <div className="home-hero-check-empty"></div>
                    <span>보안 컴플라이언스</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 기능 카드 */}
        <section className="home-features">
          <div className="home-feature-card">
            <div className="home-feature-icon pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>체계적 평가</h3>
            <p>MSP 요구사항을 단계별로 체크하고 진행상황을 추적</p>
          </div>
          
          <div className="home-feature-card">
            <div className="home-feature-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3>실시간 대시보드</h3>
            <p>평가 진행률과 완료 상태를 한눈에 확인</p>
          </div>
          
          <div className="home-feature-card">
            <div className="home-feature-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3>AI 가이드</h3>
            <p>각 요구사항에 대한 상세 가이드와 모범 사례 제공</p>
          </div>
        </section>

        {/* 추가 정보 버튼 */}
        <section className="home-info-buttons">
          <button onClick={() => setShowProgramInfoModal(true)} className="home-info-btn">
            <span className="home-info-btn-icon">📋</span>
            <span>프로그램 정보</span>
          </button>
          <button onClick={() => setShowJourneyModal(true)} className="home-info-btn">
            <span className="home-info-btn-icon">🗺️</span>
            <span>파트너 여정</span>
          </button>
        </section>

        {/* 공지사항 */}
        {homepageAnnouncements.length > 0 && (
          <section className="home-announcements">
            <div className="home-announcements-header">
              <span className="home-announcements-icon">📢</span>
              <h3>공지사항</h3>
            </div>
            <div className="home-announcements-list">
              {homepageAnnouncements.map((announcement) => (
                <div key={announcement.id} className="home-announcement-item">
                  <span className="home-announcement-type">
                    {announcement.type === 'warning' ? '⚠️' : 
                     announcement.type === 'error' ? '❌' : 
                     announcement.type === 'success' ? '✅' : '📢'}
                  </span>
                  <div className="home-announcement-content">
                    <strong>{announcement.title}</strong>
                    <p>{announcement.content}</p>
                    {announcement.priority === 3 && (
                      <span className="home-announcement-badge">중요</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 푸터 */}
      <footer className="home-footer">
        <p>© 2024 AWS MSP Checklist System</p>
      </footer>

      {/* 모달 */}
      <MSPProgramInfoModal 
        isOpen={showProgramInfoModal} 
        onClose={() => setShowProgramInfoModal(false)} 
      />
      <MSPPartnerJourneyModal 
        isOpen={showJourneyModal} 
        onClose={() => setShowJourneyModal(false)} 
      />
      
      {/* 플로팅 버튼 */}
      <a href="/login" className="home-floating-btn" title="로그인">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      </a>
    </div>
  );
}
