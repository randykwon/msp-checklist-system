// 테마 시스템 타입 정의
export type ThemeType = 'night' | 'ocean' | 'mountain' | 'spring' | 'summer' | 'autumn' | 'winter';

export interface ThemeColors {
  // 배경 색상
  background: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
  };
  
  // 텍스트 색상
  text: {
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
  };
  
  // UI 요소 색상
  ui: {
    border: string;
    card: string;
    button: {
      primary: string;
      secondary: string;
      hover: string;
    };
    progress: string;
    success: string;
    warning: string;
    error: string;
  };
  
  // 마크다운 콘텐츠 색상
  markdown: {
    text: string;
    heading: string;
    code: {
      background: string;
      text: string;
      border: string;
    };
    link: string;
    emphasis: string;
  };
}

export interface Theme {
  id: ThemeType;
  name: {
    ko: string;
    en: string;
  };
  description: {
    ko: string;
    en: string;
  };
  icon: string;
  colors: ThemeColors;
  backgroundImage?: string;
  backgroundPattern?: string;
}

// 테마 정의
export const themes: Record<ThemeType, Theme> = {
  night: {
    id: 'night',
    name: { ko: '야간 모드', en: 'Night Mode' },
    description: { ko: '편안한 야간 작업을 위한 다크 테마', en: 'Dark theme for comfortable night work' },
    icon: '🌙',
    colors: {
      background: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#334155',
        gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f1f5f9',
        accent: '#e2e8f0',
        muted: '#cbd5e1'
      },
      ui: {
        border: '#334155',
        card: '#1e293b',
        button: {
          primary: '#3b82f6',
          secondary: '#64748b',
          hover: '#2563eb'
        },
        progress: '#60a5fa',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#f1f5f9',
        heading: '#ffffff',
        code: {
          background: 'rgba(51, 65, 85, 0.3)',
          text: '#ffffff',
          border: '#334155'
        },
        link: '#60a5fa',
        emphasis: '#f1f5f9'
      }
    }
  },
  
  ocean: {
    id: 'ocean',
    name: { ko: '바다 테마', en: 'Ocean Theme' },
    description: { ko: '시원한 바다를 연상시키는 블루 테마', en: 'Cool blue theme inspired by the ocean' },
    icon: '🌊',
    colors: {
      background: {
        primary: '#0c4a6e',
        secondary: '#075985',
        accent: '#0369a1',
        gradient: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f0f9ff',
        accent: '#e0f2fe',
        muted: '#bae6fd'
      },
      ui: {
        border: '#0369a1',
        card: '#075985',
        button: {
          primary: '#0ea5e9',
          secondary: '#0284c7',
          hover: '#0284c7'
        },
        progress: '#38bdf8',
        success: '#06b6d4',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#f0f9ff',
        heading: '#ffffff',
        code: {
          background: 'rgba(3, 105, 161, 0.3)',
          text: '#ffffff',
          border: '#0369a1'
        },
        link: '#38bdf8',
        emphasis: '#e0f2fe'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)'
  },
  
  mountain: {
    id: 'mountain',
    name: { ko: '산 테마', en: 'Mountain Theme' },
    description: { ko: '웅장한 산을 연상시키는 그린 테마', en: 'Majestic green theme inspired by mountains' },
    icon: '⛰️',
    colors: {
      background: {
        primary: '#14532d',
        secondary: '#166534',
        accent: '#15803d',
        gradient: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f0fdf4',
        accent: '#dcfce7',
        muted: '#bbf7d0'
      },
      ui: {
        border: '#15803d',
        card: '#166534',
        button: {
          primary: '#22c55e',
          secondary: '#16a34a',
          hover: '#16a34a'
        },
        progress: '#4ade80',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#f0fdf4',
        heading: '#ffffff',
        code: {
          background: 'rgba(21, 128, 61, 0.3)',
          text: '#ffffff',
          border: '#15803d'
        },
        link: '#4ade80',
        emphasis: '#dcfce7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 30% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(22, 163, 74, 0.1) 0%, transparent 50%)'
  },
  
  spring: {
    id: 'spring',
    name: { ko: '봄 테마', en: 'Spring Theme' },
    description: { ko: '생기 넘치는 봄을 연상시키는 핑크-그린 테마', en: 'Vibrant pink-green theme inspired by spring' },
    icon: '🌸',
    colors: {
      background: {
        primary: '#4c1d95',
        secondary: '#5b21b6',
        accent: '#7c3aed',
        gradient: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #7c3aed 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#fdf4ff',
        accent: '#fae8ff',
        muted: '#f3e8ff'
      },
      ui: {
        border: '#7c3aed',
        card: '#5b21b6',
        button: {
          primary: '#a855f7',
          secondary: '#9333ea',
          hover: '#9333ea'
        },
        progress: '#c084fc',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#fdf4ff',
        heading: '#ffffff',
        code: {
          background: 'rgba(124, 58, 237, 0.3)',
          text: '#ffffff',
          border: '#7c3aed'
        },
        link: '#c084fc',
        emphasis: '#fae8ff'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 25% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(192, 132, 252, 0.1) 0%, transparent 50%)'
  },
  
  summer: {
    id: 'summer',
    name: { ko: '여름 테마', en: 'Summer Theme' },
    description: { ko: '뜨거운 여름을 연상시키는 오렌지 테마', en: 'Hot orange theme inspired by summer' },
    icon: '☀️',
    colors: {
      background: {
        primary: '#9a3412',
        secondary: '#c2410c',
        accent: '#ea580c',
        gradient: 'linear-gradient(135deg, #9a3412 0%, #c2410c 50%, #ea580c 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#fff7ed',
        accent: '#fed7aa',
        muted: '#fdba74'
      },
      ui: {
        border: '#ea580c',
        card: '#c2410c',
        button: {
          primary: '#f97316',
          secondary: '#ea580c',
          hover: '#ea580c'
        },
        progress: '#fb923c',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#fff7ed',
        heading: '#ffffff',
        code: {
          background: 'rgba(234, 88, 12, 0.3)',
          text: '#ffffff',
          border: '#ea580c'
        },
        link: '#fb923c',
        emphasis: '#fed7aa'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 40% 60%, rgba(249, 115, 22, 0.1) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(251, 146, 60, 0.1) 0%, transparent 50%)'
  },
  
  autumn: {
    id: 'autumn',
    name: { ko: '가을 테마', en: 'Autumn Theme' },
    description: { ko: '따뜻한 가을을 연상시키는 브라운 테마', en: 'Warm brown theme inspired by autumn' },
    icon: '🍂',
    colors: {
      background: {
        primary: '#78350f',
        secondary: '#92400e',
        accent: '#b45309',
        gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#fefce8',
        accent: '#fef3c7',
        muted: '#fde68a'
      },
      ui: {
        border: '#b45309',
        card: '#92400e',
        button: {
          primary: '#d97706',
          secondary: '#b45309',
          hover: '#b45309'
        },
        progress: '#f59e0b',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#fefce8',
        heading: '#ffffff',
        code: {
          background: 'rgba(180, 83, 9, 0.3)',
          text: '#ffffff',
          border: '#b45309'
        },
        link: '#fcd34d',
        emphasis: '#fef3c7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 35% 65%, rgba(217, 119, 6, 0.1) 0%, transparent 50%), radial-gradient(circle at 65% 35%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)'
  },
  
  winter: {
    id: 'winter',
    name: { ko: '겨울 테마', en: 'Winter Theme' },
    description: { ko: '차가운 겨울을 연상시키는 화이트-블루 테마', en: 'Cool white-blue theme inspired by winter' },
    icon: '❄️',
    colors: {
      background: {
        primary: '#1e3a8a',
        secondary: '#1e40af',
        accent: '#2563eb',
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        accent: '#f1f5f9',
        muted: '#e2e8f0'
      },
      ui: {
        border: '#2563eb',
        card: '#1e40af',
        button: {
          primary: '#3b82f6',
          secondary: '#2563eb',
          hover: '#2563eb'
        },
        progress: '#60a5fa',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#f8fafc',
        heading: '#ffffff',
        code: {
          background: 'rgba(37, 99, 235, 0.3)',
          text: '#ffffff',
          border: '#2563eb'
        },
        link: '#60a5fa',
        emphasis: '#f1f5f9'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 25% 75%, rgba(96, 165, 250, 0.05) 0%, transparent 50%)'
  }
};

// 테마 관리 클래스
export class ThemeManager {
  private currentTheme: ThemeType = 'night';
  private listeners: ((theme: Theme) => void)[] = [];

  constructor() {
    // 로컬 스토리지에서 저장된 테마 불러오기
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('msp-theme');
      if (saved && saved in themes) {
        this.currentTheme = saved as ThemeType;
      }
    }
  }

  getCurrentTheme(): Theme {
    return themes[this.currentTheme];
  }

  setTheme(themeId: ThemeType): void {
    this.currentTheme = themeId;
    
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('msp-theme', themeId);
    }
    
    // CSS 변수 업데이트
    this.updateCSSVariables();
    
    // 리스너들에게 알림
    this.listeners.forEach(listener => listener(this.getCurrentTheme()));
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private updateCSSVariables(): void {
    if (typeof window === 'undefined') return;
    
    const theme = this.getCurrentTheme();
    const root = document.documentElement;
    
    // CSS 변수 설정
    root.style.setProperty('--theme-bg-primary', theme.colors.background.primary);
    root.style.setProperty('--theme-bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--theme-bg-accent', theme.colors.background.accent);
    root.style.setProperty('--theme-bg-gradient', theme.colors.background.gradient);
    
    root.style.setProperty('--theme-text-primary', theme.colors.text.primary);
    root.style.setProperty('--theme-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--theme-text-accent', theme.colors.text.accent);
    root.style.setProperty('--theme-text-muted', theme.colors.text.muted);
    
    root.style.setProperty('--theme-ui-border', theme.colors.ui.border);
    root.style.setProperty('--theme-ui-card', theme.colors.ui.card);
    root.style.setProperty('--theme-ui-button-primary', theme.colors.ui.button.primary);
    root.style.setProperty('--theme-ui-button-secondary', theme.colors.ui.button.secondary);
    root.style.setProperty('--theme-ui-button-hover', theme.colors.ui.button.hover);
    root.style.setProperty('--theme-ui-progress', theme.colors.ui.progress);
    root.style.setProperty('--theme-ui-success', theme.colors.ui.success);
    root.style.setProperty('--theme-ui-warning', theme.colors.ui.warning);
    root.style.setProperty('--theme-ui-error', theme.colors.ui.error);
    
    root.style.setProperty('--theme-markdown-text', theme.colors.markdown.text);
    root.style.setProperty('--theme-markdown-heading', theme.colors.markdown.heading);
    root.style.setProperty('--theme-markdown-code-bg', theme.colors.markdown.code.background);
    root.style.setProperty('--theme-markdown-code-text', theme.colors.markdown.code.text);
    root.style.setProperty('--theme-markdown-code-border', theme.colors.markdown.code.border);
    root.style.setProperty('--theme-markdown-link', theme.colors.markdown.link);
    root.style.setProperty('--theme-markdown-emphasis', theme.colors.markdown.emphasis);
    
    // 배경 패턴 설정
    if (theme.backgroundPattern) {
      root.style.setProperty('--theme-bg-pattern', theme.backgroundPattern);
    } else {
      root.style.removeProperty('--theme-bg-pattern');
    }
  }

  // 초기화 시 CSS 변수 설정
  initialize(): void {
    this.updateCSSVariables();
  }
}

// 전역 테마 매니저 인스턴스
export const themeManager = new ThemeManager();