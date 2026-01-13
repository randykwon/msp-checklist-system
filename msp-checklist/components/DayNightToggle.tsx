'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeType } from '@/lib/theme-system';
import { useLanguage } from '@/contexts/LanguageContext';

interface DayNightToggleProps {
  className?: string;
}

export default function DayNightToggle({ className = '' }: DayNightToggleProps) {
  const { language } = useLanguage();
  const { currentTheme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleDayNight = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newTheme: ThemeType = currentTheme.id === 'day' ? 'night' : 'day';
    setTheme(newTheme);
    
    // 애니메이션 완료 후 상태 리셋
    setTimeout(() => setIsAnimating(false), 300);
  };

  const isDayMode = currentTheme.id === 'day';

  return (
    <button
      onClick={toggleDayNight}
      disabled={isAnimating}
      className={`day-night-toggle ${className}`}
      title={language === 'ko' 
        ? (isDayMode ? '야간 모드로 전환' : '주간 모드로 전환')
        : (isDayMode ? 'Switch to Night Mode' : 'Switch to Day Mode')
      }
      style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        cursor: isAnimating ? 'not-allowed' : 'pointer',
        background: isDayMode 
          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
          : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        boxShadow: isDayMode
          ? '0 2px 8px rgba(251, 191, 36, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          : '0 2px 8px rgba(30, 41, 59, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      {/* 배경 패턴 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDayMode
            ? 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)'
            : 'radial-gradient(circle at 70% 70%, rgba(148, 163, 184, 0.2) 0%, transparent 50%)',
          opacity: 0.6
        }}
      />
      
      {/* 슬라이더 */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: isDayMode ? '2px' : '22px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: isDayMode
            ? 'linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)'
            : 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
          boxShadow: isDayMode
            ? '0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
            : '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          transform: isAnimating ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {/* 아이콘 */}
        <span
          style={{
            transition: 'all 0.3s ease',
            transform: isAnimating ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: isAnimating ? 0.7 : 1
          }}
        >
          {isDayMode ? '☀️' : '🌙'}
        </span>
      </div>
      
      {/* 호버 효과 */}
      <div
        className="hover-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          borderRadius: '12px'
        }}
      />
      
      <style jsx>{`
        .day-night-toggle:hover .hover-overlay {
          opacity: 1;
        }
        
        .day-night-toggle:active {
          transform: scale(0.98);
        }
        
        .day-night-toggle:disabled {
          opacity: 0.7;
        }
      `}</style>
    </button>
  );
}