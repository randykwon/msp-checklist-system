'use client';

import React, { useState, useEffect } from 'react';
import { AdminAnnouncement } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnnouncementBannerProps {
  className?: string;
}

export default function AnnouncementBanner({ className = '' }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { language } = useLanguage();

  // 컴포넌트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 공지사항 가져오기
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements/active');
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
    
    // 30초마다 새로고침
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000); // 5초마다 변경

    return () => clearInterval(interval);
  }, [announcements.length]);

  // 마운트되지 않았거나 공지사항이 없거나 로딩 중이면 표시하지 않음
  if (!isMounted || isLoading || announcements.length === 0 || !isVisible) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-600 border-red-700 text-white';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600 text-white';
      case 'success':
        return 'bg-green-600 border-green-700 text-white';
      default:
        return 'bg-blue-600 border-blue-700 text-white';
    }
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 3) return '🚨'; // High priority
    if (priority >= 2) return '⚠️'; // Medium priority
    return 'ℹ️'; // Low priority
  };

  const texts = {
    ko: {
      close: '닫기',
      prev: '이전',
      next: '다음',
      announcement: '공지사항'
    },
    en: {
      close: 'Close',
      prev: 'Previous',
      next: 'Next',
      announcement: 'Announcement'
    }
  };

  const t = texts[language];

  return (
    <div className={`relative ${className}`}>
      <div className={`
        ${getTypeStyles(currentAnnouncement.type)}
        border-l-4 px-4 py-3 shadow-lg
        animate-pulse
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">
              {getPriorityIcon(currentAnnouncement.priority)}
            </span>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-medium opacity-90">
                  {t.announcement}
                </span>
                {announcements.length > 1 && (
                  <span className="text-xs opacity-75">
                    {currentIndex + 1}/{announcements.length}
                  </span>
                )}
              </div>
              
              <div className="marquee-container overflow-hidden">
                <div className="marquee-content">
                  <span className="font-semibold mr-4">
                    {currentAnnouncement.title}
                  </span>
                  <span className="opacity-90">
                    {currentAnnouncement.content}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {announcements.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentIndex((prev) => 
                    prev === 0 ? announcements.length - 1 : prev - 1
                  )}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title={t.prev}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title={t.next}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            )}
            
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              title={t.close}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-container {
          width: 100%;
        }
        
        .marquee-content {
          display: inline-block;
          white-space: nowrap;
          animation: ${currentAnnouncement.content.length > 100 ? 'marquee 20s linear infinite' : 'none'};
        }
        
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        .marquee-container:hover .marquee-content {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}