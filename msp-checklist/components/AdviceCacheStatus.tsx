'use client';

import { useAdvice } from '@/contexts/AdviceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';

export default function AdviceCacheStatus() {
  const { getCacheSize } = useAdvice();
  const { language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const [serverCacheStats, setServerCacheStats] = useState<{totalItems: number, languages: string[]} | null>(null);
  const [virtualEvidenceCacheStats, setVirtualEvidenceCacheStats] = useState<{totalItems: number, languages: string[]} | null>(null);
  const [qaStats, setQaStats] = useState<{totalQuestions: number, answeredQuestions: number, unansweredQuestions: number} | null>(null);

  const cacheSize = getCacheSize();

  // 서버 캐시 정보 로드
  const loadServerCacheStats = async () => {
    try {
      const [adviceResponse, virtualEvidenceResponse, qaResponse] = await Promise.all([
        fetch('/api/advice/cache'),
        fetch('/api/virtual-evidence/cache'),
        fetch('/api/qa/cache')
      ]);
      
      if (adviceResponse.ok) {
        const stats = await adviceResponse.json();
        setServerCacheStats(stats);
      }
      
      if (virtualEvidenceResponse.ok) {
        const stats = await virtualEvidenceResponse.json();
        setVirtualEvidenceCacheStats(stats);
      }
      
      if (qaResponse.ok) {
        const stats = await qaResponse.json();
        setQaStats(stats);
      }
    } catch (error) {
      console.error('Error loading server cache stats:', error);
    }
  };

  // 컴포넌트 마운트 시 서버 캐시 정보 로드
  useEffect(() => {
    loadServerCacheStats();
  }, []);

  const totalCacheItems = cacheSize + (serverCacheStats?.totalItems || 0) + (virtualEvidenceCacheStats?.totalItems || 0) + (qaStats?.totalQuestions || 0);
  
  if (totalCacheItems === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {language === 'ko' ? `캐시: ${totalCacheItems}개` : `Cache: ${totalCacheItems}`}
            <span className="text-xs">{showDetails ? '▲' : '▼'}</span>
          </button>
        </div>
        
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
            <div className="text-xs text-gray-600">
              <div>{language === 'ko' ? `공용 조언: ${serverCacheStats?.totalItems || 0}개` : `Shared Advice: ${serverCacheStats?.totalItems || 0}`}</div>
              <div>{language === 'ko' ? `공용 가상증빙: ${virtualEvidenceCacheStats?.totalItems || 0}개` : `Shared Virtual Evidence: ${virtualEvidenceCacheStats?.totalItems || 0}`}</div>
              <div>{language === 'ko' ? `질의응답: ${qaStats?.totalQuestions || 0}개 (답변: ${qaStats?.answeredQuestions || 0}개)` : `Q&A: ${qaStats?.totalQuestions || 0} (Answered: ${qaStats?.answeredQuestions || 0})`}</div>
              <div>{language === 'ko' ? `세션 캐시: ${cacheSize}개` : `Session Cache: ${cacheSize}`}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}