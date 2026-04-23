'use client';

import React, { useState, useEffect } from 'react';
import { themeManager, themes, Theme, ThemeType } from '../lib/theme-system';

interface ThemeSelectorProps {
  language: 'ko' | 'en';
  className?: string;
}

export default function ThemeSelector({ language, className = '' }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themeManager.getCurrentTheme());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 테마 매니저 초기화
    themeManager.initialize();
    
    // 테마 변경 구독
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme);
    });

    return unsubscribe;
  }, []);

  const handleThemeChange = (themeId: ThemeType) => {
    themeManager.setTheme(themeId);
    setIsOpen(false);
  };

  const t = {
    title: language === 'ko' ? '테마 선택' : 'Theme Selection',
    current: language === 'ko' ? '현재 테마' : 'Current Theme',
    selectTheme: language === 'ko' ? '테마를 선택하세요' : 'Select a theme'
  };

  return (
    <div className={`relative ${className}`}>
      {/* 현재 테마 표시 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-200 hover:shadow-md"
        style={{
          backgroundColor: 'var(--theme-ui-card)',
          borderColor: 'var(--theme-ui-border)',
          color: 'var(--theme-text-primary)'
        }}
      >
        <span className="text-xl">{currentTheme.icon}</span>
        <div className="text-left">
          <div className="text-sm font-medium">
            {currentTheme.name[language]}
          </div>
          <div 
            className="text-xs"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {currentTheme.description[language]}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 테마 선택 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 드롭다운 메뉴 */}
          <div 
            className="absolute top-full left-0 mt-2 w-80 rounded-lg border shadow-xl z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--theme-ui-card)',
              borderColor: 'var(--theme-ui-border)'
            }}
          >
            {/* 헤더 */}
            <div 
              className="px-4 py-3 border-b"
              style={{
                borderColor: 'var(--theme-ui-border)',
                backgroundColor: 'var(--theme-bg-accent)'
              }}
            >
              <h3 
                className="font-semibold text-sm"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {t.selectTheme}
              </h3>
            </div>

            {/* 테마 목록 */}
            <div className="max-h-96 overflow-y-auto">
              {Object.values(themes).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`w-full px-4 py-3 text-left transition-all duration-200 hover:opacity-80 ${
                    theme.id === currentTheme.id ? 'ring-2 ring-inset' : ''
                  }`}
                  style={{
                    backgroundColor: theme.id === currentTheme.id ? 'var(--theme-bg-accent)' : 'transparent',
                    ringColor: theme.id === currentTheme.id ? 'var(--theme-ui-button-primary)' : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* 테마 아이콘 */}
                    <span className="text-2xl">{theme.icon}</span>
                    
                    {/* 테마 정보 */}
                    <div className="flex-1">
                      <div 
                        className="font-medium text-sm"
                        style={{ color: 'var(--theme-text-primary)' }}
                      >
                        {theme.name[language]}
                      </div>
                      <div 
                        className="text-xs mt-1"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        {theme.description[language]}
                      </div>
                    </div>
                    
                    {/* 테마 색상 미리보기 */}
                    <div className="flex gap-1">
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ 
                          backgroundColor: theme.colors.background.primary,
                          borderColor: 'var(--theme-ui-border)'
                        }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ 
                          backgroundColor: theme.colors.ui.button.primary,
                          borderColor: 'var(--theme-ui-border)'
                        }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ 
                          backgroundColor: theme.colors.text.primary,
                          borderColor: 'var(--theme-ui-border)'
                        }}
                      />
                    </div>
                    
                    {/* 현재 선택된 테마 표시 */}
                    {theme.id === currentTheme.id && (
                      <svg 
                        className="w-4 h-4"
                        style={{ color: 'var(--theme-ui-success)' }}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}