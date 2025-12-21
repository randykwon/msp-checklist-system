// MSP 체크리스트 데이터 타입 정의

export interface ChecklistItem {
  id: string;
  category: string;
  subcategory?: string;
  control: string;
  description: string;
  descriptionKo?: string; // 한국어 설명 추가
  isPrerequisite: boolean;
  evidenceRequired: string[];
  evidenceRequiredKo?: string[]; // 한국어 증빙 자료 추가
  status: 'not-started' | 'in-progress' | 'completed' | 'not-applicable';
  notes: string;
  lastUpdated: Date;
  assignee?: string;
  dueDate?: Date;
  documents: UploadedDocument[];
}

export interface UploadedDocument {
  id: string;
  name: string;
  uploadedAt: Date;
  url: string;
  type: string;
}

export interface Category {
  id: string;
  name: string;
  nameKo?: string; // 한국어 카테고리명 추가
  description: string;
  descriptionKo?: string; // 한국어 설명 추가
  items: ChecklistItem[];
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
}

export interface MSPChecklistData {
  version: string;
  lastModified: Date;
  categories: Category[];
  overallProgress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
}

export type FilterStatus = 'all' | 'not-started' | 'in-progress' | 'completed' | 'not-applicable';
export type FilterPriority = 'all' | 'prerequisite' | 'technical';
