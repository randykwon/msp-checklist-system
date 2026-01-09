'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      router.push('/assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 로딩 화면 (서버/클라이언트 동일)
  if (!isHydrated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 50%, #7c3aed 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2563eb 50%, #7c3aed 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* 언어 선택 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setLanguage('ko')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: language === 'ko' ? 700 : 400,
              color: 'white',
              background: language === 'ko' ? 'rgba(255,255,255,0.2)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            한국어
          </button>
          <button
            onClick={() => setLanguage('en')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: language === 'en' ? 700 : 400,
              color: 'white',
              background: language === 'en' ? 'rgba(255,255,255,0.2)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            English
          </button>
        </div>

        {/* 로고 카드 */}
        <div style={{
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          padding: '40px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <svg style={{ width: '44px', height: '44px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 700,
            color: 'white'
          }}>
            {language === 'ko' ? 'AWS MSP 자체 평가 어드바이저' : 'AWS MSP Self-Assessment Advisor'}
          </h1>
          <p style={{
            margin: '8px 0 0',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)'
          }}>
            {language === 'ko' ? 'MSP 파트너 프로그램 검증 도우미' : 'MSP Partner Program Verification Assistant'}
          </p>
        </div>

        {/* 로그인 폼 카드 */}
        <div style={{
          borderRadius: '0 0 20px 20px',
          background: 'white',
          padding: '32px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* 에러 메시지 */}
            {error && (
              <div style={{
                background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                border: '1px solid #EF4444',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '18px', height: '18px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C', fontWeight: 500 }}>{error}</p>
              </div>
            )}

            {/* 이메일 필드 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '8px'
              }}>
                📧 {language === 'ko' ? '이메일' : 'Email'}
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder={language === 'ko' ? '이메일 주소를 입력하세요' : 'Enter your email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '12px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#059669';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E4E6EB';
                  e.target.style.background = '#F0F2F5';
                }}
              />
            </div>

            {/* 비밀번호 필드 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '8px'
              }}>
                🔒 {language === 'ko' ? '비밀번호' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder={language === 'ko' ? '비밀번호를 입력하세요' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    fontSize: '15px',
                    border: '2px solid #E4E6EB',
                    borderRadius: '12px',
                    background: '#F0F2F5',
                    color: '#1C1E21',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#059669';
                    e.target.style.background = 'white';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E4E6EB';
                    e.target.style.background = '#F0F2F5';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#65676B'
                  }}
                >
                  {showPassword ? (
                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 이메일 기억하기 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <input
                type="checkbox"
                id="remember-email"
                checked={rememberEmail}
                onChange={(e) => {
                  setRememberEmail(e.target.checked);
                  if (!e.target.checked) {
                    localStorage.removeItem('rememberedEmail');
                  }
                }}
                disabled={loading}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#059669',
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="remember-email" style={{
                marginLeft: '10px',
                fontSize: '14px',
                color: '#65676B',
                cursor: 'pointer'
              }}>
                {language === 'ko' ? '이메일 기억하기' : 'Remember email'}
              </label>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: 700,
                color: 'white',
                background: loading 
                  ? 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  {language === 'ko' ? '로그인 중...' : 'Signing in...'}
                </>
              ) : (
                <>🚀 {language === 'ko' ? '로그인' : 'Sign In'}</>
              )}
            </button>
          </form>

          {/* 구분선 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
            gap: '16px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#E4E6EB' }} />
            <span style={{ fontSize: '13px', color: '#65676B' }}>
              {language === 'ko' ? '또는' : 'or'}
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E4E6EB' }} />
          </div>

          {/* 회원가입 링크 */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#65676B' }}>
              {language === 'ko' ? '계정이 없으신가요?' : "Don't have an account?"}{' '}
              <Link 
                href="/register" 
                style={{
                  color: '#059669',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {language === 'ko' ? '회원가입' : 'Sign Up'}
              </Link>
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.8)'
        }}>
          © 2024 AWS MSP Self-Assessment Helper. All rights reserved.
        </p>
      </div>

      {/* 스피너 애니메이션 */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
