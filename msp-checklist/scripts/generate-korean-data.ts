const fs = require('fs');
const path = require('path');
const { parseAssessmentCSV } = require('../lib/csv-parser');

// CSV 파일 읽기
const prerequisitesKoPath = path.join(__dirname, '../../msp_data/7.x/AWS_MSP_Self_Assessment_MSP_Prerequisites_ko.csv');
const technicalKoPath = path.join(__dirname, '../../msp_data/7.x/AWS_MSP_Self_Assessment_MSP_Technical_Validation_ko.csv');

const prerequisitesKoCsv = fs.readFileSync(prerequisitesKoPath, 'utf-8');
const technicalKoCsv = fs.readFileSync(technicalKoPath, 'utf-8');

// CSV 파싱
const prerequisitesKoData = parseAssessmentCSV(prerequisitesKoCsv, 'prerequisites');
const technicalKoData = parseAssessmentCSV(technicalKoCsv, 'technical');

// TypeScript 파일 생성
const prerequisitesOutput = `// 한국어 버전 - AWS MSP Self Assessment - MSP Prerequisites
// 자동 생성됨

import { AssessmentItem } from '../lib/csv-parser';

export const prerequisitesDataKo: AssessmentItem[] = ${JSON.stringify(prerequisitesKoData, null, 2)};
`;

const technicalOutput = `// 한국어 버전 - AWS MSP Self Assessment - Technical Validation
// 자동 생성됨

import { AssessmentItem } from '../lib/csv-parser';

export const technicalValidationDataKo: AssessmentItem[] = ${JSON.stringify(technicalKoData, null, 2)};
`;

// 파일 저장
fs.writeFileSync(path.join(__dirname, '../data/assessment-data-ko.ts'), prerequisitesOutput);
fs.writeFileSync(path.join(__dirname, '../data/technical-validation-data-ko.ts'), technicalOutput);

console.log('✅ Korean data files generated successfully!');
console.log(`- Prerequisites: ${prerequisitesKoData.length} items`);
console.log(`- Technical Validation: ${technicalKoData.length} items`);
