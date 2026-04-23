import { AssessmentItem } from './csv-parser';

// 언어별 데이터 매핑
const dataFiles = {
  prerequisites: {
    en: () => import('../data/assessment-data').then(m => m.prerequisitesData),
    ko: () => import('../data/assessment-data').then(m => m.prerequisitesData) // 동일한 데이터 사용 (한국어 번역 완료 시 변경)
  },
  technical: {
    en: () => import('../data/technical-validation-data').then(m => m.technicalValidationData),
    ko: () => import('../data/technical-validation-data').then(m => m.technicalValidationData) // 동일한 데이터 사용 (한국어 번역 완료 시 변경)
  }
};

export async function loadAssessmentData(
  type: 'prerequisites' | 'technical',
  language: 'en' | 'ko'
): Promise<AssessmentItem[]> {
  const loader = dataFiles[type][language];
  return await loader();
}

// 클라이언트 사이드에서 동기적으로 사용할 수 있는 함수
export function getAssessmentData(
  type: 'prerequisites' | 'technical',
  language: 'en' | 'ko'
): AssessmentItem[] {
  // 이 함수는 이미 import된 데이터를 반환
  if (type === 'prerequisites') {
    const { prerequisitesData } = require('../data/assessment-data');
    return prerequisitesData;
  } else {
    const { technicalValidationData } = require('../data/technical-validation-data');
    return technicalValidationData;
  }
}
