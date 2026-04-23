// CSV 데이터를 파싱하여 체크리스트 항목으로 변환

export interface AssessmentItem {
  id: string;
  category: string;
  categoryKo?: string;
  title: string;
  titleKo?: string;
  description: string;
  descriptionKo?: string;
  isMandatory: boolean;
  evidenceRequired: string;
  evidenceRequiredKo?: string;
  advice?: string;
  adviceKo?: string;
  met: boolean | null;
  partnerResponse: string;
  lastUpdated: Date;
  // 증빙 파일 업로드 및 평가 관련 필드
  evidenceFiles?: EvidenceFile[];
  evaluation?: EvidenceEvaluation;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  base64Data: string;
  mimeType: string;
  fileType: 'image' | 'pdf';
  // PDF의 경우 텍스트 추출 결과
  extractedText?: string;
}

export interface EvidenceEvaluation {
  score: number; // 0-100 점수
  feedback: string;
  feedbackKo?: string;
  evaluatedAt: Date;
  criteria: EvaluationCriteria[];
}

export interface EvaluationCriteria {
  name: string;
  nameKo?: string;
  score: number; // 0-100
  comment: string;
  commentKo?: string;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseAssessmentCSV(csvContent: string, type: 'prerequisites' | 'technical'): AssessmentItem[] {
  const lines = csvContent.split('\n');
  const items: AssessmentItem[] = [];
  let currentCategory = '';
  let i = 3; // 헤더 스킵

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line || line === ',,,') {
      i++;
      continue;
    }

    const fields = parseCSVLine(line);
    const firstField = fields[0]?.replace(/^\"|\"$/g, '').trim();

    // 카테고리 라인 감지 (Business, People, Governance 등)
    if (firstField && !firstField.includes('-') && fields.length <= 2 && firstField.match(/^[A-Z][a-z]+/)) {
      currentCategory = firstField;
      i++;
      continue;
    }

    // ID가 있는 항목 라인 (예: BUSP-001, BUS-001)
    if (firstField && firstField.match(/^[A-Z]+-\d+$/)) {
      const id = firstField;
      const descriptionField = fields[1]?.replace(/^\"|\"$/g, '').trim() || '';

      // 설명 파싱
      const descLines = descriptionField.split('\n').filter(p => p.trim());
      const title = descLines[0] || id;
      const isMandatory = descriptionField.toLowerCase().includes('mandatory');

      // Evidence 추출
      const evidenceMatch = descriptionField.match(/Evidence must be.*?(?=\n\n|$)/s);
      const evidenceRequired = evidenceMatch ? evidenceMatch[0] : '';

      items.push({
        id,
        category: currentCategory,
        title: title.replace(/Mandatory|Recommended/gi, '').trim(),
        description: descriptionField,
        isMandatory,
        evidenceRequired,
        met: null,
        partnerResponse: '',
        lastUpdated: new Date()
      });

      i++;
    } else {
      i++;
    }
  }

  return items;
}
