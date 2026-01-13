'use client';

import { useState, useEffect } from 'react';
import { themeManager, ThemeType } from '@/lib/theme-system';

export default function DayNightPage() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('day');
  const [isDayMode, setIsDayMode] = useState(true);

  useEffect(() => {
    themeManager.initialize();
    
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme.id);
    });

    return unsubscribe;
  }, []);

  const toggleDayNight = () => {
    const newMode = !isDayMode;
    setIsDayMode(newMode);
    
    const newTheme = newMode ? 'day' : 'night';
    themeManager.setTheme(newTheme as ThemeType);
  };

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                ← 홈으로
              </a>
              <h1 className="text-2xl font-bold text-gray-900">🌓 주야간 모드</h1>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                현재: {isDayMode ? '주간' : '야간'} 모드
              </span>
            </div>
            
            {/* 주야간 토글 스위치 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">🌙 야간</span>
              
              <button
                onClick={toggleDayNight}
                className={`
                  relative w-16 h-8 rounded-full transition-all duration-500 focus:outline-none focus:ring-4 focus:ring-blue-300
                  ${isDayMode 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg'
                  }
                `}
              >
                <div
                  className={`
                    absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 flex items-center justify-center
                    ${isDayMode ? 'left-9 transform rotate-180' : 'left-1'}
                  `}
                >
                  <span className="text-xs">
                    {isDayMode ? '☀️' : '🌙'}
                  </span>
                </div>
              </button>
              
              <span className="text-sm font-medium text-gray-600">☀️ 주간</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="pt-24 pb-12">
        {/* 히어로 섹션 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
            <div className="mb-8">
              <div className="text-8xl mb-6 animate-pulse">
                {isDayMode ? '☀️' : '🌙'}
              </div>
              <h2 className="text-6xl font-bold mb-4">
                {isDayMode ? '주간' : '야간'} 모드
              </h2>
              <p className="text-2xl mb-8 text-slate-300">
                {isDayMode ? '밝고 활기찬 주간 작업 환경' : '편안하고 집중적인 야간 작업 환경'}
              </p>
              <div className="text-lg text-slate-400">
                {isDayMode ? 'Day Mode - Bright & Energetic' : 'Night Mode - Comfortable & Focused'}
              </div>
            </div>
          </div>
        </div>

        {/* 비교 섹션 */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">⚖️ 주야간 모드 비교</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 주간 모드 특징 */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border border-yellow-200">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">☀️</div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">주간 모드</h4>
                <p className="text-gray-600">밝고 활기찬 작업 환경</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">높은 가독성</div>
                    <div className="text-sm text-gray-600">밝은 배경으로 텍스트가 선명하게 보임</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">활기찬 분위기</div>
                    <div className="text-sm text-gray-600">밝은 색상으로 에너지 넘치는 느낌</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">낮 시간 최적화</div>
                    <div className="text-sm text-gray-600">자연광과 조화로운 화면 밝기</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 야간 모드 특징 */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-600 text-white">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🌙</div>
                <h4 className="text-2xl font-bold mb-2">야간 모드</h4>
                <p className="text-slate-300">편안하고 집중적인 작업 환경</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold">눈의 피로 감소</div>
                    <div className="text-sm text-slate-300">어두운 배경으로 눈부심 방지</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold">배터리 절약</div>
                    <div className="text-sm text-slate-300">OLED 화면에서 전력 소모 감소</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold">야간 작업 최적화</div>
                    <div className="text-sm text-slate-300">어두운 환경에서 편안한 시야</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 실시간 미리보기 */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">👀 실시간 미리보기</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 카드 미리보기 */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">📋 UI 컴포넌트</h4>
              
              <div className="theme-card theme-transition p-6 rounded-xl border theme-border">
                <h5 className="theme-text-primary text-lg font-bold mb-3">샘플 카드</h5>
                <p className="theme-text-secondary mb-4">
                  현재 {isDayMode ? '주간' : '야간'} 모드가 적용된 카드입니다. 
                  배경색과 텍스트 색상이 모드에 맞게 자동으로 조정됩니다.
                </p>
                <div className="flex gap-3">
                  <button className="theme-button-primary px-4 py-2 rounded-lg font-semibold text-white">
                    주요 버튼
                  </button>
                  <button className="theme-button-secondary px-4 py-2 rounded-lg font-semibold text-white">
                    보조 버튼
                  </button>
                </div>
              </div>
            </div>

            {/* 텍스트 미리보기 */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 mb-4">📝 텍스트 스타일</h4>
              
              <div className="theme-card theme-transition p-6 rounded-xl border theme-border">
                <div className="markdown-content-themed">
                  <h1>{isDayMode ? '주간' : '야간'} 모드 제목</h1>
                  <h2>부제목 스타일</h2>
                  <p>
                    이것은 <strong>굵은 텍스트</strong>와 <em>기울임 텍스트</em>가 포함된 
                    일반 문단입니다. <a href="#">링크 텍스트</a>도 모드에 맞게 스타일이 적용됩니다.
                  </p>
                  
                  <ul>
                    <li>목록 항목 1 - {isDayMode ? '주간' : '야간'} 모드 최적화</li>
                    <li>목록 항목 2 - 가독성 향상</li>
                    <li>목록 항목 3 - 사용자 경험 개선</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">💡 모드 전환 팁</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              상단의 토글 스위치를 사용하여 주간과 야간 모드를 쉽게 전환할 수 있습니다. 
              각 모드는 시간대와 작업 환경에 맞게 최적화되어 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}