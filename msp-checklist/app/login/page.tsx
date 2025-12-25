'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 컴포넌트 마운트 시 저장된 이메일 불러오기 (hydration 후에만)
  useEffect(() => {
    setIsHydrated(true);
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // 이메일 기억하기 체크박스 변경 처리
  const handleRememberEmailChange = (checked: boolean) => {
    setRememberEmail(checked);
    if (!checked && isHydrated) {
      localStorage.removeItem('rememberedEmail');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // 이메일 기억하기가 체크되어 있으면 저장
      if (isHydrated) {
        if (rememberEmail) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
      }
      
      router.push('/assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--theme-bg)', transition: 'background-color 0.3s ease' }}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center items-center mb-4 gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition-all"
              style={{
                backgroundColor: theme === 'light' ? '#E4E6EB' : '#3A3B3C',
                color: theme === 'light' ? '#050505' : '#E4E6EB'
              }}
              title={theme === 'light' ? (language === 'ko' ? '야간 모드' : 'Dark Mode') : (language === 'ko' ? '주간 모드' : 'Light Mode')}
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage('ko')}
              className={`px-3 py-1 text-sm ${language === 'ko' ? 'font-bold text-blue-600' : ''}`}
              style={{ color: language === 'ko' ? '#1877F2' : 'var(--theme-text-secondary)' }}
            >
              한국어
            </button>
            <span style={{ color: 'var(--theme-text-secondary)' }}>|</span>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-sm ${language === 'en' ? 'font-bold text-blue-600' : ''}`}
              style={{ color: language === 'en' ? '#1877F2' : 'var(--theme-text-secondary)' }}
            >
              English
            </button>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: 'var(--theme-text-primary)' }}>
            {t('auth.login.title')}
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {t('auth.login.subtitle')}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                style={{ 
                  backgroundColor: 'var(--theme-input-bg)', 
                  borderColor: 'var(--theme-border)', 
                  color: 'var(--theme-text-primary)' 
                }}
                placeholder={t('auth.login.email')}
                disabled={loading}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                {t('auth.login.password')}
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.login.password')}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                disabled={loading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 이메일 기억하기 체크박스 */}
          <div className="flex items-center">
            <input
              id="remember-email"
              name="remember-email"
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => handleRememberEmailChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="remember-email" className="ml-2 block text-sm text-gray-900">
              {t('auth.login.rememberEmail')}
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.login.loading') : t('auth.login.button')}
            </button>
          </div>

          <div className="text-sm text-center">
            <span className="text-gray-600">{t('auth.login.noAccount')} </span>
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth.login.signup')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
