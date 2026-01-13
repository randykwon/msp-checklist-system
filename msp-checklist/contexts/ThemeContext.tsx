'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themeManager, Theme, ThemeType } from '@/lib/theme-system';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: ThemeType) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themeManager.getCurrentTheme());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    
    // 테마 매니저 초기화
    themeManager.initialize();
    
    // 테마 변경 구독
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme);
    });

    return unsubscribe;
  }, []);

  const setTheme = (themeId: ThemeType) => {
    if (isHydrated) {
      themeManager.setTheme(themeId);
    }
  };

  // 사용 가능한 모든 테마 목록
  const availableThemes = Object.values(themeManager.getCurrentTheme().constructor === Object ? 
    require('@/lib/theme-system').themes : {});

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      availableThemes: Object.values(require('@/lib/theme-system').themes)
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
