#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 파일 경로
const xlsxPath = './msp_data/7.x/AWS Managed Service Provider (MSP) Program Self-Assessment_checklist.xlsx';
const outputDir = './msp_data/7.x/';

try {
  // xlsx 파일 읽기
  console.log('Reading xlsx file...');
  const workbook = XLSX.readFile(xlsxPath);

  // 각 시트를 CSV로 변환
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\nProcessing sheet: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // 파일명 생성
    const csvFileName = `AWS_MSP_Self_Assessment_${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    const csvPath = path.join(outputDir, csvFileName);

    // CSV 파일 저장
    fs.writeFileSync(csvPath, csv);
    console.log(`✓ Created: ${csvFileName}`);

    // 미리보기 (처음 5줄)
    const lines = csv.split('\n').slice(0, 5);
    console.log('Preview:');
    lines.forEach((line, i) => {
      if (line.trim()) {
        console.log(`  ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      }
    });
  });

  console.log('\n✅ Conversion completed successfully!');
  console.log(`\nTotal sheets converted: ${workbook.SheetNames.length}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
