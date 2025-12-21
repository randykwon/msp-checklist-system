#!/usr/bin/env node

import chokidar from 'chokidar';
import { exec } from 'child_process';
import path from 'path';

// 감시할 디렉토리
const watchDir = './msp_data';

// 처리할 파일 확장자
const targetExtensions = ['.pptx', '.ppt'];

console.log('🔍 MSP Data File Watcher Started');
console.log(`📁 Watching directory: ${path.resolve(watchDir)}`);
console.log(`📄 Target extensions: ${targetExtensions.join(', ')}`);
console.log('⏳ Waiting for new files...\n');

// 이미 처리된 파일 추적
const processedFiles = new Set();

// 파일 감시 시작
const watcher = chokidar.watch(watchDir, {
  ignored: /(^|[\/\\])\../, // 숨김 파일 무시
  persistent: true,
  ignoreInitial: true, // 초기 파일들은 무시
  awaitWriteFinish: {
    stabilityThreshold: 2000, // 파일 쓰기가 완료될 때까지 대기
    pollInterval: 100
  }
});

// PPT 파일 변환 함수
function convertPPTtoPDF(filePath) {
  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);

  console.log(`\n📄 New PowerPoint file detected: ${fileName}`);
  console.log(`📂 Location: ${fileDir}`);

  // 이미 처리된 파일인지 확인
  if (processedFiles.has(filePath)) {
    console.log('⏭️  File already processed, skipping...');
    return;
  }

  processedFiles.add(filePath);

  console.log('🔄 Starting conversion to PDF...');

  // convert-ppt-to-pdf.sh 스크립트 실행
  const command = `cd "${fileDir}" && /Users/yongsunk/dev/msp-qna/convert-ppt-to-pdf.sh "${fileName}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      console.error(stderr);
      // 실패한 경우 다시 시도할 수 있도록 제거
      processedFiles.delete(filePath);
      return;
    }

    console.log(stdout);
    console.log(`✅ Successfully converted: ${fileName} → PDF`);
    console.log('⏳ Waiting for new files...\n');
  });
}

// 파일 추가 이벤트
watcher.on('add', (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (targetExtensions.includes(ext)) {
    convertPPTtoPDF(filePath);
  }
});

// 에러 처리
watcher.on('error', (error) => {
  console.error(`❌ Watcher error: ${error}`);
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n\n👋 File watcher stopped');
  process.exit(0);
});

console.log('✅ File watcher is ready!');
console.log('💡 Upload a .pptx or .ppt file to msp_data directory to trigger conversion\n');
