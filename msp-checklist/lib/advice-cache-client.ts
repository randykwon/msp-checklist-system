// 클라이언트용 조언 캐시 인터페이스
export interface CachedAdvice {
  id: string;
  itemId: string;
  category: string;
  title: string;
  advice: string;
  virtualEvidence: string;
  language: 'ko' | 'en';
  createdAt: string;
  version: string;
}

export interface CacheVersion {
  version: string;
  createdAt: string;
  totalItems: number;
  description: string;
}

// 클라이언트에서 사용할 캐시 서비스 (API 호출 기반)
export class ClientAdviceCacheService {
  
  // 캐시된 조언 조회
  async getCachedAdvice(itemId: string, language: 'ko' | 'en' = 'ko', version?: string): Promise<CachedAdvice | null> {
    try {
      const params = new URLSearchParams({
        action: 'advice',
        itemId,
        language
      });
      
      if (version) {
        params.append('version', version);
      }

      const response = await fetch(`/api/advice-cache?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.advice;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached advice:', error);
      return null;
    }
  }

  // 캐시 버전 목록 조회
  async getCacheVersions(): Promise<CacheVersion[]> {
    try {
      const response = await fetch('/api/advice-cache?action=versions');
      
      if (response.ok) {
        const data = await response.json();
        return data.versions;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get cache versions:', error);
      return [];
    }
  }

  // 최신 캐시 버전 조회
  async getLatestCacheVersion(): Promise<CacheVersion | null> {
    const versions = await this.getCacheVersions();
    return versions.length > 0 ? versions[0] : null;
  }

  // 캐시 통계 조회
  async getCacheStats(version?: string): Promise<any> {
    try {
      const params = new URLSearchParams({ action: 'stats' });
      
      if (version) {
        params.append('version', version);
      }

      const response = await fetch(`/api/advice-cache?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  // 특정 버전의 모든 캐시된 조언 조회
  async getCachedAdviceByVersion(version: string, language: 'ko' | 'en' = 'ko'): Promise<CachedAdvice[]> {
    try {
      const params = new URLSearchParams({
        action: 'list',
        version,
        language
      });

      const response = await fetch(`/api/advice-cache?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.advice;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get cached advice by version:', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스
let clientCacheServiceInstance: ClientAdviceCacheService | null = null;

export function getClientAdviceCacheService(): ClientAdviceCacheService {
  if (!clientCacheServiceInstance) {
    clientCacheServiceInstance = new ClientAdviceCacheService();
  }
  return clientCacheServiceInstance;
}