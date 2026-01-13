'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<Theme>('dark');
  const [isHydrated, setIsHydrated] = useState(false);

  // 항상 다크 모드로 설정
  useEffect(() => {
    setIsHydrated(true);
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('app-theme', 'dark');
  }, []);

  // 테마 변경 함수 (호환성 유지, 실제로는 항상 dark)
  const setTheme = (_newTheme: Theme) => {
    // 항상 dark 모드 유지
    if (isHydrated) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  // 토글 함수 (호환성 유지, 실제로는 아무 동작 안함)
  const toggleTheme = () => {
    // 항상 dark 모드 유지
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
