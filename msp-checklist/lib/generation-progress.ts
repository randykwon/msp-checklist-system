/**
 * 캐시 생성 진행 상태 관리
 */

export interface GenerationProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalItems: number;
  completedItems: number;
  currentLanguage: 'ko' | 'en' | null;
  currentItem: string | null;
  currentItemTitle: string | null;
  errors: Array<{
    itemId: string;
    language: string;
    error: string;
    timestamp: string;
  }>;
  startTime: string | null;
  endTime: string | null;
  version: string | null;
}

// 전역 진행 상태 저장소
const progressStore: Map<string, GenerationProgress> = new Map();

// 이벤트 리스너 저장소
const listeners: Map<string, Set<(progress: GenerationProgress) => void>> = new Map();

export function getProgress(type: 'advice' | 'virtual-evidence'): GenerationProgress {
  const existing = progressStore.get(type);
  if (existing) return existing;
  
  const initial: GenerationProgress = {
    status: 'idle',
    totalItems: 0,
    completedItems: 0,
    currentLanguage: null,
    currentItem: null,
    currentItemTitle: null,
    errors: [],
    startTime: null,
    endTime: null,
    version: null,
  };
  progressStore.set(type, initial);
  return initial;
}

export function updateProgress(type: 'advice' | 'virtual-evidence', update: Partial<GenerationProgress>) {
  const current = getProgress(type);
  const updated = { ...current, ...update };
  progressStore.set(type, updated);
  
  // 리스너들에게 알림
  const typeListeners = listeners.get(type);
  if (typeListeners) {
    typeListeners.forEach(listener => listener(updated));
  }
  
  return updated;
}

export function resetProgress(type: 'advice' | 'virtual-evidence') {
  const initial: GenerationProgress = {
    status: 'idle',
    totalItems: 0,
    completedItems: 0,
    currentLanguage: null,
    currentItem: null,
    currentItemTitle: null,
    errors: [],
    startTime: null,
    endTime: null,
    version: null,
  };
  progressStore.set(type, initial);
  
  // 리스너들에게 알림
  const typeListeners = listeners.get(type);
  if (typeListeners) {
    typeListeners.forEach(listener => listener(initial));
  }
  
  return initial;
}

export function addProgressListener(type: 'advice' | 'virtual-evidence', listener: (progress: GenerationProgress) => void) {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(listener);
  
  // 현재 상태 즉시 전송
  listener(getProgress(type));
  
  return () => {
    listeners.get(type)?.delete(listener);
  };
}

export function addError(type: 'advice' | 'virtual-evidence', itemId: string, language: string, error: string) {
  const current = getProgress(type);
  const newError = {
    itemId,
    language,
    error,
    timestamp: new Date().toISOString(),
  };
  updateProgress(type, {
    errors: [...current.errors, newError],
  });
}
