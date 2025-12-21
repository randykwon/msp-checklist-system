'use client';

import { useState } from 'react';

export default function TestAdvicePage() {
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testAdviceAPI = async () => {
    setLoading(true);
    setError('');
    setAdvice('');

    const testData = {
      itemId: 'BUSP-001',
      title: 'Web Presence',
      description: 'AWS Partner has a public landing page on their primary website that describes their AWS managed services practice and links to their public case studies. This page must describe the Partner\'s differentiated expertise in designing, building, and managing workloads on AWS.',
      evidenceRequired: 'Evidence must be in the form of a public URL for their AWS MSP practice landing page.',
      language: 'ko'
    };

    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 호출 실패');
      }

      const data = await response.json();
      setAdvice(data.advice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 AI 조언 API 테스트
          </h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">테스트 데이터:</h2>
            <div className="bg-gray-100 p-4 rounded-lg text-sm">
              <p><strong>항목 ID:</strong> BUSP-001</p>
              <p><strong>제목:</strong> Web Presence</p>
              <p><strong>언어:</strong> 한국어</p>
            </div>
          </div>

          <button
            onClick={testAdviceAPI}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {loading ? '⏳ AI 조언 생성 중...' : '🤖 AI 조언 테스트 실행'}
          </button>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">❌ 오류 발생:</h3>
              <p className="text-red-800">{error}</p>
              {error.includes('API key') && (
                <div className="mt-3 text-sm text-red-700">
                  <p>💡 해결 방법:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>OpenAI 계정에서 API 키를 발급받으세요</li>
                    <li>.env.local 파일에 OPENAI_API_KEY를 설정하세요</li>
                    <li>개발 서버를 재시작하세요</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {advice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-4">✅ AI 생성 조언:</h3>
              <div className="text-blue-800 whitespace-pre-line text-sm">
                {advice}
              </div>
            </div>
          )}

          <div className="mt-8 text-sm text-gray-600">
            <h3 className="font-semibold mb-2">📋 테스트 체크리스트:</h3>
            <ul className="space-y-1">
              <li>✅ API 엔드포인트 생성됨 (/api/advice)</li>
              <li>✅ 프론트엔드 컴포넌트 연동됨</li>
              <li>✅ 한국어/영어 프롬프트 지원</li>
              <li>✅ 오류 처리 및 로딩 상태 구현</li>
              <li>{advice ? '✅' : '⏳'} AI 조언 생성 테스트</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}