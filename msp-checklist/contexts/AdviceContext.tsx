'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CacheItem {
  content: string;
  timestamp: number;
  language: string;
}

interface AdviceCache {
  [key: string]: CacheItem;
}

interface VirtualEvidenceCache {
  [key: string]: CacheItem;
}

interface AdviceContextType {
  getAdvice: (itemId: string, language: string) => string | null;
  setAdvice: (itemId: string, content: string, language: string) => void;
  getVirtualEvidence: (itemId: string, language: string) => string | null;
  setVirtualEvidence: (itemId: string, content: string, language: string) => void;
  clearCache: () => void;
  getCacheSize: () => number;
}

const AdviceContext = createContext<AdviceContextType | undefined>(undefined);

interface AdviceProviderProps {
  children: ReactNode;
}

export function AdviceProvider({ children }: AdviceProviderProps) {
  const [adviceCache, setAdviceCache] = useState<AdviceCache>({});
  const [virtualEvidenceCache, setVirtualEvidenceCache] = useState<VirtualEvidenceCache>({});

  const getCacheKey = (itemId: string, language: string) => `${itemId}_${language}`;

  const getCachedItem = (cache: AdviceCache | VirtualEvidenceCache, itemId: string, language: string, isAdviceOrVirtualEvidence: boolean = false): string | null => {
    const key = getCacheKey(itemId, language);
    const cached = cache[key];
    
    if (!cached) return null;
    
    // 조언과 가상증빙예제 모두 무제한 캐시 (서버 사이드 캐시가 우선이므로 클라이언트는 세션 동안만)
    // 서버 사이드에서 공용 캐시로 관리되므로 클라이언트 캐시는 만료 시간 없음
    
    return cached.content;
  };

  const getAdvice = (itemId: string, language: string): string | null => {
    return getCachedItem(adviceCache, itemId, language, true);
  };

  const setAdvice = (itemId: string, content: string, language: string) => {
    const key = getCacheKey(itemId, language);
    setAdviceCache(prev => ({
      ...prev,
      [key]: {
        content,
        timestamp: Date.now(),
        language
      }
    }));
  };

  const getVirtualEvidence = (itemId: string, language: string): string | null => {
    return getCachedItem(virtualEvidenceCache, itemId, language, true);
  };

  const setVirtualEvidence = (itemId: string, content: string, language: string) => {
    const key = getCacheKey(itemId, language);
    setVirtualEvidenceCache(prev => ({
      ...prev,
      [key]: {
        content,
        timestamp: Date.now(),
        language
      }
    }));
  };

  const clearCache = () => {
    setAdviceCache({});
    setVirtualEvidenceCache({});
  };

  const getCacheSize = () => {
    return Object.keys(adviceCache).length + Object.keys(virtualEvidenceCache).length;
  };

  return (
    <AdviceContext.Provider value={{
      getAdvice,
      setAdvice,
      getVirtualEvidence,
      setVirtualEvidence,
      clearCache,
      getCacheSize
    }}>
      {children}
    </AdviceContext.Provider>
  );
}

export function useAdvice() {
  const context = useContext(AdviceContext);
  if (context === undefined) {
    throw new Error('useAdvice must be used within an AdviceProvider');
  }
  return context;
}