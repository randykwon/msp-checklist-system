'use client';

import { useState } from 'react';
import { extractTextFromPDF } from '../../lib/pdf-utils';

export default function TestPDFPage() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setExtractedText('');

    try {
      // 파일을 Base64로 변환
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // data:application/pdf;base64, 부분 제거
        };
        reader.readAsDataURL(file);
      });

      // PDF에서 텍스트 추출
      const text = await extractTextFromPDF(base64Data);
      setExtractedText(text || '텍스트를 추출할 수 없습니다.');

    } catch (err: any) {
      console.error('PDF 처리 오류:', err);
      setError('PDF 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            PDF 텍스트 추출 테스트
          </h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF 파일 선택
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>

          {isProcessing && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-blue-800">PDF 처리 중...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800">
                <strong>오류:</strong> {error}
              </div>
            </div>
          )}

          {extractedText && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                추출된 텍스트
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {extractedText}
                </pre>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                텍스트 길이: {extractedText.length} 문자
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              💡 테스트 안내
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• PDF 파일을 선택하면 클라이언트 사이드에서 텍스트를 추출합니다</li>
              <li>• PDF.js 라이브러리를 사용하여 브라우저에서 직접 처리됩니다</li>
              <li>• 추출된 텍스트는 AI 평가에 사용됩니다</li>
              <li>• 이미지가 포함된 PDF의 경우 텍스트만 추출됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}