'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // CAPTCHA state
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(0);
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  // Generate CAPTCHA on component mount
  useEffect(() => {
    generateCaptcha();
    loadRememberedEmail();
  }, []);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    let question;
    
    switch (operation) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;
      case '-':
        // Ensure positive result
        const larger = Math.max(num1, num2);
        const smaller = Math.min(num1, num2);
        answer = larger - smaller;
        question = `${larger} - ${smaller}`;
        break;
      case '×':
        answer = num1 * num2;
        question = `${num1} × ${num2}`;
        break;
      default:
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer);
    setUserCaptchaAnswer('');
    setCaptchaError('');
  };

  const loadRememberedEmail = () => {
    const rememberedEmail = localStorage.getItem('msp_admin_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  };

  const saveRememberedEmail = () => {
    if (rememberMe) {
      localStorage.setItem('msp_admin_remembered_email', email);
    } else {
      localStorage.removeItem('msp_admin_remembered_email');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCaptchaError('');

    // Validate CAPTCHA
    if (parseInt(userCaptchaAnswer) !== captchaAnswer) {
      setCaptchaError('인간 인증에 실패했습니다. 다시 시도해주세요.');
      generateCaptcha();
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      saveRememberedEmail();
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.');
      generateCaptcha(); // Regenerate CAPTCHA on login failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            MSP 헬퍼 관리자 시스템
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            관리자 전용 로그인
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              이메일 기억하기
            </label>
          </div>

          {/* CAPTCHA */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              인간 인증 (다음 계산의 답을 입력하세요)
            </label>
            <div className="flex items-center space-x-3">
              <div className="bg-white border border-gray-300 rounded px-3 py-2 font-mono text-lg font-bold text-center min-w-[100px]">
                {captchaQuestion} = ?
              </div>
              <input
                type="number"
                value={userCaptchaAnswer}
                onChange={(e) => setUserCaptchaAnswer(e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="답"
                required
              />
              <button
                type="button"
                onClick={generateCaptcha}
                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                title="새로운 문제 생성"
              >
                🔄
              </button>
            </div>
            {captchaError && (
              <div className="mt-2 text-sm text-red-600">{captchaError}</div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '관리자 로그인'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              ⚠️ 관리자 권한이 있는 계정만 접근 가능합니다
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}