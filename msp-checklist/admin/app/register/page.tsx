'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organization, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          maxWidth: '420px',
          background: 'white',
          borderRadius: '20px',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg style={{ width: '44px', height: '44px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: 700, color: '#1C1E21' }}>
            🎉 회원가입 완료!
          </h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#65676B' }}>
            잠시 후 로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

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
          background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
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
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 700,
            color: 'white'
          }}>회원가입</h1>
          <p style={{
            margin: '8px 0 0',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)'
          }}>MSP 어드바이저 관리자 계정 생성</p>
        </div>

        {/* 회원가입 폼 카드 */}
        <div style={{
          borderRadius: '0 0 20px 20px',
          background: 'white',
          padding: '28px 24px',
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
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#B91C1C', fontWeight: 500 }}>{error}</p>
              </div>
            )}

            {/* 이름 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '6px'
              }}>
                👤 이름 *
              </label>
              <input
                type="text"
                required
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '10px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#42B883';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E4E6EB';
                  e.target.style.background = '#F0F2F5';
                }}
              />
            </div>

            {/* 이메일 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '6px'
              }}>
                📧 이메일 *
              </label>
              <input
                type="email"
                required
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '10px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#42B883';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E4E6EB';
                  e.target.style.background = '#F0F2F5';
                }}
              />
            </div>

            {/* 비밀번호 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '6px'
              }}>
                🔒 비밀번호 *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="비밀번호 (최소 6자)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    fontSize: '14px',
                    border: '2px solid #E4E6EB',
                    borderRadius: '10px',
                    background: '#F0F2F5',
                    color: '#1C1E21',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#42B883';
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
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#65676B',
                    padding: '4px'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '6px'
              }}>
                🔒 비밀번호 확인 *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    fontSize: '14px',
                    border: '2px solid #E4E6EB',
                    borderRadius: '10px',
                    background: '#F0F2F5',
                    color: '#1C1E21',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#42B883';
                    e.target.style.background = 'white';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E4E6EB';
                    e.target.style.background = '#F0F2F5';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#65676B',
                    padding: '4px'
                  }}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 소속 필드 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '6px'
              }}>
                🏢 소속 (선택)
              </label>
              <input
                type="text"
                placeholder="회사/조직명"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '10px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#42B883';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E4E6EB';
                  e.target.style.background = '#F0F2F5';
                }}
              />
            </div>

            {/* 전화번호 필드 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1C1E21',
                marginBottom: '6px'
              }}>
                📱 전화번호 (선택)
              </label>
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '2px solid #E4E6EB',
                  borderRadius: '10px',
                  background: '#F0F2F5',
                  color: '#1C1E21',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#42B883';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E4E6EB';
                  e.target.style.background = '#F0F2F5';
                }}
              />
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
                background: loading 
                  ? 'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)'
                  : 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(66, 184, 131, 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(66, 184, 131, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 184, 131, 0.3)';
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
                  가입 중...
                </>
              ) : (
                <>✨ 회원가입</>
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

          {/* 로그인 링크 */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#65676B' }}>
              이미 계정이 있으신가요?{' '}
              <a 
                href="/login" 
                style={{
                  color: '#1877F2',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                로그인
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
          © 2024 MSP 어드바이저. All rights reserved.
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
