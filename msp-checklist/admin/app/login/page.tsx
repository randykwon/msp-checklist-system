'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px'
      }}>
        {/* 로고 카드 */}
        <div style={{
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 700,
            color: 'white'
          }}>MSP 헬퍼</h1>
          <p style={{
            margin: '8px 0 0',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)'
          }}>관리자 콘솔 로그인</p>
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
                📧 이메일
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  e.target.style.borderColor = '#1877F2';
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
                🔒 비밀번호
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  e.target.style.borderColor = '#1877F2';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E4E6EB';
                  e.target.style.background = '#F0F2F5';
                }}
              />
            </div>

            {/* 이메일 기억하기 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#1877F2',
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="remember-me" style={{
                marginLeft: '10px',
                fontSize: '14px',
                color: '#65676B',
                cursor: 'pointer'
              }}>
                이메일 기억하기
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
                  ? 'linear-gradient(135deg, #93C5FD 0%, #60A5FA 100%)'
                  : 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 119, 242, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.3)';
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
                  로그인 중...
                </>
              ) : (
                <>🚀 로그인</>
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
            <span style={{ fontSize: '13px', color: '#65676B' }}>또는</span>
            <div style={{ flex: 1, height: '1px', background: '#E4E6EB' }} />
          </div>

          {/* 회원가입 링크 */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#65676B' }}>
              계정이 없으신가요?{' '}
              <a 
                href="/register" 
                style={{
                  color: '#1877F2',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                회원가입
              </a>
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
          © 2024 MSP 헬퍼. All rights reserved.
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
