#!/usr/bin/env node

// 간단한 캐시 테스트 스크립트
const path = require('path');
const fs = require('fs');

console.log('🧪 Simple cache test starting...');

// 캐시 디렉토리 생성
const cacheDir = path.join(process.cwd(), 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log('📁 Created cache directory');
}

// 더미 캐시 데이터 생성
const dummyCache = {
  version: '20241217_test',
  createdAt: new Date().toISOString(),
  totalItems: 5,
  koAdvice: [
    {
      itemId: 'BUSP-001',
      advice: '웹 사이트 존재 관련 조언입니다.',
      virtualEvidence: '가상 증빙 예제입니다.',
      language: 'ko'
    }
  ],
  enAdvice: [
    {
      itemId: 'BUSP-001', 
      advice: 'Web presence related advice.',
      virtualEvidence: 'Virtual evidence example.',
      language: 'en'
    }
  ]
};

// 캐시 파일 저장
const cacheFile = path.join(cacheDir, 'advice_cache_test.json');
fs.writeFileSync(cacheFile, JSON.stringify(dummyCache, null, 2));

console.log(`✅ Test cache file created: ${cacheFile}`);
console.log('📊 Cache contents:');
console.log(`  - Version: ${dummyCache.version}`);
console.log(`  - Korean advice: ${dummyCache.koAdvice.length} items`);
console.log(`  - English advice: ${dummyCache.enAdvice.length} items`);

console.log('🎉 Simple cache test completed successfully!');