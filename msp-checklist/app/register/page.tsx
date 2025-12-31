'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError(language === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(language === 'ko' ? '비밀번호는 6자 이상이어야 합니다.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const result = await register(email, password, name);
      
      if (result.requiresActivation) {
        // 활성화 필요 - 성공 메시지 표시 후 로그인 페이지로 이동
        setSuccessMessage(language === 'ko' 
          ? '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' 
          : 'Registration successful. You can login after admin approval.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        // 자동 활성화됨 - 바로 평가 페이지로 이동
        router.push('/assessment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // 서버와 클라이언트 모두 동일한 로딩 UI 렌더링
  const loadingUI = (
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

  // 언어 관련 텍스트 (mounted 후에만 사용)
  const texts = {
    title: mounted ? (language === 'ko' ? '회원가입' : 'Create Account') : '회원가입',
    subtitle: mounted ? (language === 'ko' ? 'AWS MSP 자체 평가 헬퍼에 가입하세요' : 'Join AWS MSP Self-Assessment Helper') : '',
    name: mounted ? (language === 'ko' ? '이름' : 'Name') : '이름',
    namePlaceholder: mounted ? (language === 'ko' ? '이름을 입력하세요' : 'Enter your name') : '',
    email: mounted ? (language === 'ko' ? '이메일' : 'Email') : '이메일',
    emailPlaceholder: mounted ? (language === 'ko' ? '이메일 주소를 입력하세요' : 'Enter your email') : '',
    password: mounted ? (language === 'ko' ? '비밀번호' : 'Password') : '비밀번호',
    passwordPlaceholder: mounted ? (language === 'ko' ? '비밀번호 (6자 이상)' : 'Password (min 6 characters)') : '',
    confirmPassword: mounted ? (language === 'ko' ? '비밀번호 확인' : 'Confirm Password') : '비밀번호 확인',
    confirmPlaceholder: mounted ? (language === 'ko' ? '비밀번호를 다시 입력하세요' : 'Confirm your password') : '',
    submit: mounted ? (language === 'ko' ? '회원가입' : 'Sign Up') : '회원가입',
    submitting: mounted ? (language === 'ko' ? '가입 중...' : 'Creating account...') : '가입 중...',
    or: mounted ? (language === 'ko' ? '또는' : 'or') : '또는',
    hasAccount: mounted ? (language === 'ko' ? '이미 계정이 있으신가요?' : 'Already have an account?') : '',
    signIn: mounted ? (language === 'ko' ? '로그인' : 'Sign In') : '로그인'
  };

  return (
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
              fontWeight: mounted && language === 'ko' ? 700 : 400,
              color: 'white',
              background: mounted && language === 'ko' ? 'rgba(255,255,255,0.2)' : 'transparent',
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
              fontWeight: mounted && language === 'en' ? 700 : 400,
              color: 'white',
              background: mounted && language === 'en' ? 'rgba(255,255,255,0.2)' : 'transparent',
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
          padding: '32px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg style={{ width: '38px', height: '38px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white' }}>
            {texts.title}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
            {texts.subtitle}
          </p>
        </div>

        {/* 회원가입 폼 카드 */}
        <div style={{
          borderRadius: '0 0 20px 20px',
          background: 'white',
          padding: '28px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* 성공 메시지 */}
            {successMessage && (
              <div style={{
                background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                border: '1px solid #10B981',
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
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '18px', height: '18px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#065F46', fontWeight: 500 }}>{successMessage}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#047857' }}>
                    {language === 'ko' ? '잠시 후 로그인 페이지로 이동합니다...' : 'Redirecting to login page...'}
                  </p>
                </div>
              </div>
            )}

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

            {/* 이름 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '8px' }}>
                👤 {texts.name} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                placeholder={texts.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '12px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E4E6EB'; e.target.style.background = '#F0F2F5'; }}
              />
            </div>

            {/* 이메일 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '8px' }}>
                📧 {texts.email} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder={texts.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '12px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E4E6EB'; e.target.style.background = '#F0F2F5'; }}
              />
            </div>

            {/* 비밀번호 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '8px' }}>
                🔒 {texts.password} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder={texts.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    fontSize: '15px',
                    border: '2px solid #E4E6EB',
                    borderRadius: '12px',
                    background: '#F0F2F5',
                    color: '#1C1E21',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E4E6EB'; e.target.style.background = '#F0F2F5'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#65676B' }}
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

            {/* 비밀번호 확인 필드 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1C1E21', marginBottom: '8px' }}>
                🔒 {texts.confirmPassword} <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder={texts.confirmPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    fontSize: '15px',
                    border: '2px solid #E4E6EB',
                    borderRadius: '12px',
                    background: '#F0F2F5',
                    color: '#1C1E21',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E4E6EB'; e.target.style.background = '#F0F2F5'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#65676B' }}
                >
                  {showConfirmPassword ? (
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

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: 700,
                color: 'white',
                background: loading ? 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
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
            >
              {loading ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  {texts.submitting}
                </>
              ) : (
                <>🚀 {texts.submit}</>
              )}
            </button>
          </form>

          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E4E6EB' }} />
            <span style={{ fontSize: '13px', color: '#65676B' }}>{texts.or}</span>
            <div style={{ flex: 1, height: '1px', background: '#E4E6EB' }} />
          </div>

          {/* 로그인 링크 */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#65676B' }}>
              {texts.hasAccount}{' '}
              <Link href="/login" style={{ color: '#059669', fontWeight: 600, textDecoration: 'none' }}>
                {texts.signIn}
              </Link>
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
          © 2024 AWS MSP Self-Assessment Helper. All rights reserved.
        </p>
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
