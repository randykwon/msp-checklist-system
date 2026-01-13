'use client';

import { useState, useEffect } from 'react';
import { themeManager, ThemeType } from '@/lib/theme-system';

export default function SeasonsPage() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('day');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    themeManager.initialize();
    
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme.id);
    });

    return unsubscribe;
  }, []);

  const changeTheme = (themeId: ThemeType) => {
    if (themeId === currentTheme) return;
    
    setIsAnimating(true);
    themeManager.setTheme(themeId);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const seasons = [
    {
      id: 'day' as ThemeType,
      name: '주간',
      nameEn: 'Day',
      icon: '☀️',
      description: '밝고 활기찬 주간 모드',
      color: '#3B82F6'
    },
    {
      id: 'night' as ThemeType,
      name: '야간',
      nameEn: 'Night',
      icon: '🌙',
      description: '편안한 야간 모드',
      color: '#1E293B'
    },
    {
      id: 'spring' as ThemeType,
      name: '봄',
      nameEn: 'Spring',
      icon: '🌸',
      description: '생기 넘치는 봄의 향기',
      color: '#8B5CF6'
    },
    {
      id: 'summer' as ThemeType,
      name: '여름',
      nameEn: 'Summer',
      icon: '☀️',
      description: '뜨거운 여름의 열정',
      color: '#F97316'
    },
    {
      id: 'autumn' as ThemeType,
      name: '가을',
      nameEn: 'Autumn',
      icon: '🍂',
      description: '따뜻한 가을의 정취',
      color: '#D97706'
    },
    {
      id: 'winter' as ThemeType,
      name: '겨울',
      nameEn: 'Winter',
      icon: '❄️',
      description: '차가운 겨울의 순수함',
      color: '#3B82F6'
    }
  ];

  const getCurrentSeasonData = () => {
    return seasons.find(s => s.id === currentTheme) || seasons[0];
  };

  const currentSeason = getCurrentSeasonData();

  return (
    <div className="min-h-screen">
      {/* 테마 선택 버튼들 - 최상단 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a 
                href="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 mr-4"
              >
                ← 홈으로
              </a>
              <h1 className="text-2xl font-bold text-gray-900">🎨 테마 갤러리</h1>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                현재: {currentSeason.name} {currentSeason.icon}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => changeTheme(season.id)}
                  className="relative px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${season.color}dd, ${season.color})`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{season.icon}</span>
                    <span className="font-bold">{season.name}</span>
                  </div>
                  
                  {currentTheme === season.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="pt-24 pb-12">
        {/* 히어로 섹션 */}
        <div className="relative overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
            <div className="mb-8">
              <div className="text-8xl mb-6 animate-bounce">{currentSeason.icon}</div>
              <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {currentSeason.name} 테마
              </h2>
              <p className="text-2xl text-gray-600 mb-8">{currentSeason.description}</p>
              <div className="text-lg text-gray-500">
                {currentSeason.nameEn} Theme
              </div>
            </div>
          </div>
        </div>

        {/* 테마 특징 카드들 */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 색상 팔레트 카드 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
                🎨 색상 팔레트
              </h3>
              <div className="space-y-4">
                <div 
                  className="h-16 rounded-xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${currentSeason.color}dd, ${currentSeason.color})` }}
                ></div>
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4].map((i) => (
                    <div 
                      key={i}
                      className="h-12 rounded-lg shadow-md"
                      style={{
                        background: `${currentSeason.color}${['ff', 'dd', 'bb', '99'][i-1]}`
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* 분위기 설명 카드 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
                ✨ 테마 분위기
              </h3>
              <div className="space-y-4">
                <div className="text-lg font-semibold text-gray-800">{currentSeason.description}</div>
                <div className="text-gray-600 leading-relaxed">
                  {currentTheme === 'spring' && '새싹이 돋아나는 생명력 넘치는 봄의 에너지를 담았습니다. 핑크와 퍼플의 조화로 따뜻하고 희망찬 느낌을 전달합니다.'}
                  {currentTheme === 'summer' && '뜨거운 태양과 푸른 바다를 연상시키는 역동적인 여름의 열정을 표현했습니다. 오렌지와 레드의 강렬한 조합이 특징입니다.'}
                  {currentTheme === 'autumn' && '단풍잎이 물드는 가을의 따뜻하고 포근한 감성을 담았습니다. 황금빛과 갈색의 조화로 안정감을 제공합니다.'}
                  {currentTheme === 'winter' && '눈 내리는 겨울의 순수하고 깨끗한 아름다움을 표현했습니다. 블루와 화이트의 차가운 조합이 평온함을 선사합니다.'}
                </div>
              </div>
            </div>

            {/* 사용 가이드 카드 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
                📖 사용 가이드
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div className="text-sm text-gray-700">상단 버튼을 클릭하여 원하는 계절 테마를 선택하세요</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div className="text-sm text-gray-700">테마가 자동으로 적용되어 전체 페이지 스타일이 변경됩니다</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div className="text-sm text-gray-700">선택한 테마는 브라우저에 저장되어 다음 방문시에도 유지됩니다</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">🌟 테마 시스템 정보</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              MSP 체크리스트 시스템은 사계절을 테마로 한 아름다운 UI를 제공합니다. 
              각 테마는 계절의 특성을 반영한 색상과 분위기로 구성되어 있으며, 
              사용자의 취향에 따라 자유롭게 선택할 수 있습니다.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {seasons.map((season) => (
                <div 
                  key={season.id}
                  className="p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                  onClick={() => changeTheme(season.id)}
                >
                  <div className="text-3xl mb-2">{season.icon}</div>
                  <div className="font-bold text-gray-900">{season.name}</div>
                  <div className="text-sm text-gray-600">{season.nameEn}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}