// 테마 시스템 타입 정의
export type ThemeType = 'day' | 'night' | 'ocean' | 'mountain' | 'spring' | 'summer' | 'autumn' | 'winter';

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
  day: {
    id: 'day',
    name: { ko: '주간 모드', en: 'Day Mode' },
    description: { ko: '밝고 활기찬 주간 작업을 위한 라이트 테마', en: 'Bright light theme for energetic day work' },
    icon: '☀️',
    colors: {
      background: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        accent: '#f1f5f9',
        gradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
      },
      text: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#334155',
        muted: '#64748b'
      },
      ui: {
        border: '#e2e8f0',
        card: '#ffffff',
        button: {
          primary: '#3b82f6',
          secondary: '#64748b',
          hover: '#2563eb'
        },
        progress: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      markdown: {
        text: '#1e293b',
        heading: '#0f172a',
        code: {
          background: 'rgba(241, 245, 249, 0.8)',
          text: '#0f172a',
          border: '#e2e8f0'
        },
        link: '#3b82f6',
        emphasis: '#1e293b'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)'
  },
  
  night: {
    id: 'night',
    name: { ko: '야간 모드', en: 'Night Mode' },
    description: { ko: '편안한 야간 작업을 위한 다크 테마', en: 'Dark theme for comfortable night work' },
    icon: '🌙',
    colors: {
      background: {
        primary: '#1a202c',
        secondary: '#2d3748',
        accent: '#4a5568',
        gradient: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f7fafc',
        accent: '#edf2f7',
        muted: '#cbd5e0'
      },
      ui: {
        border: '#4a5568',
        card: 'rgba(45, 55, 72, 0.8)',
        button: {
          primary: '#4299e1',
          secondary: '#718096',
          hover: '#3182ce'
        },
        progress: '#63b3ed',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#f7fafc',
        heading: '#ffffff',
        code: {
          background: 'rgba(74, 85, 104, 0.4)',
          text: '#ffffff',
          border: '#4a5568'
        },
        link: '#63b3ed',
        emphasis: '#edf2f7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 20% 80%, rgba(66, 153, 225, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(56, 178, 172, 0.04) 0%, transparent 50%)'
  },
  
  ocean: {
    id: 'ocean',
    name: { ko: '바다 테마', en: 'Ocean Theme' },
    description: { ko: '시원한 바다를 연상시키는 블루 테마', en: 'Cool blue theme inspired by the ocean' },
    icon: '🌊',
    colors: {
      background: {
        primary: '#2c5282',
        secondary: '#3182ce',
        accent: '#4299e1',
        gradient: 'linear-gradient(135deg, #2c5282 0%, #3182ce 50%, #4299e1 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f7fafc',
        accent: '#edf2f7',
        muted: '#cbd5e0'
      },
      ui: {
        border: '#4299e1',
        card: 'rgba(49, 130, 206, 0.7)',
        button: {
          primary: '#63b3ed',
          secondary: '#4299e1',
          hover: '#3182ce'
        },
        progress: '#90cdf4',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#f7fafc',
        heading: '#ffffff',
        code: {
          background: 'rgba(66, 153, 225, 0.25)',
          text: '#ffffff',
          border: '#4299e1'
        },
        link: '#90cdf4',
        emphasis: '#edf2f7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 20% 80%, rgba(144, 205, 244, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99, 179, 237, 0.06) 0%, transparent 50%)'
  },
  
  mountain: {
    id: 'mountain',
    name: { ko: '산 테마', en: 'Mountain Theme' },
    description: { ko: '웅장한 산을 연상시키는 그린 테마', en: 'Majestic green theme inspired by mountains' },
    icon: '⛰️',
    colors: {
      background: {
        primary: '#2f855a',
        secondary: '#38a169',
        accent: '#48bb78',
        gradient: 'linear-gradient(135deg, #2f855a 0%, #38a169 50%, #48bb78 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f7fafc',
        accent: '#edf2f7',
        muted: '#cbd5e0'
      },
      ui: {
        border: '#48bb78',
        card: 'rgba(56, 161, 105, 0.7)',
        button: {
          primary: '#68d391',
          secondary: '#48bb78',
          hover: '#38a169'
        },
        progress: '#9ae6b4',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#f7fafc',
        heading: '#ffffff',
        code: {
          background: 'rgba(72, 187, 120, 0.25)',
          text: '#ffffff',
          border: '#48bb78'
        },
        link: '#9ae6b4',
        emphasis: '#edf2f7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 30% 70%, rgba(154, 230, 180, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(104, 211, 145, 0.06) 0%, transparent 50%)'
  },
  
  spring: {
    id: 'spring',
    name: { ko: '봄 테마', en: 'Spring Theme' },
    description: { ko: '생기 넘치는 봄을 연상시키는 핑크-그린 테마', en: 'Vibrant pink-green theme inspired by spring' },
    icon: '🌸',
    colors: {
      background: {
        primary: '#805ad5',
        secondary: '#9f7aea',
        accent: '#b794f6',
        gradient: 'linear-gradient(135deg, #805ad5 0%, #9f7aea 50%, #b794f6 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#faf5ff',
        accent: '#f3e8ff',
        muted: '#e9d8fd'
      },
      ui: {
        border: '#b794f6',
        card: 'rgba(159, 122, 234, 0.7)',
        button: {
          primary: '#d6bcfa',
          secondary: '#b794f6',
          hover: '#9f7aea'
        },
        progress: '#e9d8fd',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#faf5ff',
        heading: '#ffffff',
        code: {
          background: 'rgba(183, 148, 246, 0.25)',
          text: '#ffffff',
          border: '#b794f6'
        },
        link: '#e9d8fd',
        emphasis: '#f3e8ff'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 25% 75%, rgba(214, 188, 250, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(233, 216, 253, 0.06) 0%, transparent 50%)'
  },
  
  summer: {
    id: 'summer',
    name: { ko: '여름 테마', en: 'Summer Theme' },
    description: { ko: '뜨거운 여름을 연상시키는 오렌지 테마', en: 'Hot orange theme inspired by summer' },
    icon: '☀️',
    colors: {
      background: {
        primary: '#dd6b20',
        secondary: '#ed8936',
        accent: '#f6ad55',
        gradient: 'linear-gradient(135deg, #dd6b20 0%, #ed8936 50%, #f6ad55 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#fffaf0',
        accent: '#fef5e7',
        muted: '#fed7aa'
      },
      ui: {
        border: '#f6ad55',
        card: 'rgba(237, 137, 54, 0.7)',
        button: {
          primary: '#fbb454',
          secondary: '#f6ad55',
          hover: '#ed8936'
        },
        progress: '#fbd38d',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#fffaf0',
        heading: '#ffffff',
        code: {
          background: 'rgba(246, 173, 85, 0.25)',
          text: '#ffffff',
          border: '#f6ad55'
        },
        link: '#fbd38d',
        emphasis: '#fef5e7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 40% 60%, rgba(251, 180, 84, 0.08) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(251, 211, 141, 0.06) 0%, transparent 50%)'
  },
  
  autumn: {
    id: 'autumn',
    name: { ko: '가을 테마', en: 'Autumn Theme' },
    description: { ko: '따뜻한 가을을 연상시키는 브라운 테마', en: 'Warm brown theme inspired by autumn' },
    icon: '🍂',
    colors: {
      background: {
        primary: '#b7791f',
        secondary: '#d69e2e',
        accent: '#ecc94b',
        gradient: 'linear-gradient(135deg, #b7791f 0%, #d69e2e 50%, #ecc94b 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#fffff0',
        accent: '#fefcbf',
        muted: '#f7e98e'
      },
      ui: {
        border: '#ecc94b',
        card: 'rgba(214, 158, 46, 0.7)',
        button: {
          primary: '#f6e05e',
          secondary: '#ecc94b',
          hover: '#d69e2e'
        },
        progress: '#faf089',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#fffff0',
        heading: '#ffffff',
        code: {
          background: 'rgba(236, 201, 75, 0.25)',
          text: '#ffffff',
          border: '#ecc94b'
        },
        link: '#faf089',
        emphasis: '#fefcbf'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 35% 65%, rgba(246, 224, 94, 0.08) 0%, transparent 50%), radial-gradient(circle at 65% 35%, rgba(250, 240, 137, 0.06) 0%, transparent 50%)'
  },
  
  winter: {
    id: 'winter',
    name: { ko: '겨울 테마', en: 'Winter Theme' },
    description: { ko: '차가운 겨울을 연상시키는 화이트-블루 테마', en: 'Cool white-blue theme inspired by winter' },
    icon: '❄️',
    colors: {
      background: {
        primary: '#3182ce',
        secondary: '#4299e1',
        accent: '#63b3ed',
        gradient: 'linear-gradient(135deg, #3182ce 0%, #4299e1 50%, #63b3ed 100%)'
      },
      text: {
        primary: '#ffffff',
        secondary: '#f7fafc',
        accent: '#edf2f7',
        muted: '#cbd5e0'
      },
      ui: {
        border: '#63b3ed',
        card: 'rgba(66, 153, 225, 0.7)',
        button: {
          primary: '#90cdf4',
          secondary: '#63b3ed',
          hover: '#4299e1'
        },
        progress: '#bee3f8',
        success: '#38b2ac',
        warning: '#ed8936',
        error: '#f56565'
      },
      markdown: {
        text: '#f7fafc',
        heading: '#ffffff',
        code: {
          background: 'rgba(99, 179, 237, 0.25)',
          text: '#ffffff',
          border: '#63b3ed'
        },
        link: '#bee3f8',
        emphasis: '#edf2f7'
      }
    },
    backgroundPattern: 'radial-gradient(circle at 50% 50%, rgba(144, 205, 244, 0.08) 0%, transparent 50%), radial-gradient(circle at 25% 75%, rgba(190, 227, 248, 0.06) 0%, transparent 50%)'
  }
};

// 테마 관리 클래스
export class ThemeManager {
  private currentTheme: ThemeType = 'day';
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
    const body = document.body;
    
    // Set data-theme attribute on body for CSS targeting
    body.setAttribute('data-theme', theme.id);
    
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
    root.style.setProperty('--theme-card-bg', theme.colors.ui.card);
    root.style.setProperty('--theme-border', theme.colors.ui.border);
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