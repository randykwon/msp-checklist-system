import { prerequisitesData } from '../data/assessment-data';
import { technicalValidationData } from '../data/technical-validation-data';

/**
 * 유효한 평가 항목 ID 목록을 반환합니다
 */
export function getValidItemIds(): {
  prerequisites: string[];
  technical: string[];
  all: string[];
} {
  const prerequisiteIds = prerequisitesData.map(item => item.id);
  const technicalIds = technicalValidationData.map(item => item.id);
  
  return {
    prerequisites: prerequisiteIds,
    technical: technicalIds,
    all: [...prerequisiteIds, ...technicalIds]
  };
}

/**
 * 주어진 itemId가 해당 assessmentType에서 유효한지 확인합니다
 */
export function isValidItemId(itemId: string, assessmentType: 'prerequisites' | 'technical'): boolean {
  const validIds = getValidItemIds();
  
  if (assessmentType === 'prerequisites') {
    return validIds.prerequisites.includes(itemId);
  } else if (assessmentType === 'technical') {
    return validIds.technical.includes(itemId);
  }
  
  return false;
}

/**
 * 주어진 itemId가 전체 평가 항목에서 유효한지 확인합니다
 */
export function isValidItemIdAny(itemId: string): boolean {
  const validIds = getValidItemIds();
  return validIds.all.includes(itemId);
}

/**
 * itemId로부터 평가 항목 정보를 가져옵니다
 */
export function getAssessmentItemById(itemId: string) {
  const allItems = [...prerequisitesData, ...technicalValidationData];
  return allItems.find(item => item.id === itemId);
}