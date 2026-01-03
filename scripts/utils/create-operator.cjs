const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

async function createOperator() {
  try {
    // 데이터베이스 연결
    const dbPath = path.join(__dirname, 'msp-checklist', 'msp-assessment.db');
    const db = new Database(dbPath);

    // 운영자 계정 정보
    const operatorEmail = 'operator@msp.com';
    const operatorPassword = 'operator123!';
    const operatorName = 'MSP 운영자';
    const operatorRole = 'operator';

    // 기존 운영자 계정 확인
    const existingOperator = db.prepare('SELECT * FROM users WHERE email = ?').get(operatorEmail);
    
    if (existingOperator) {
      console.log('✅ 운영자 계정이 이미 존재합니다.');
      console.log(`📧 이메일: ${operatorEmail}`);
      console.log(`🔑 비밀번호: ${operatorPassword}`);
      console.log(`👤 역할: ${operatorRole}`);
      return;
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(operatorPassword, 10);

    // 운영자 계정 생성
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, role, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(operatorEmail, hashedPassword, operatorName, operatorRole, 'active');

    console.log('🎉 운영자 계정이 성공적으로 생성되었습니다!');
    console.log('');
    console.log('📋 계정 정보:');
    console.log(`📧 이메일: ${operatorEmail}`);
    console.log(`🔑 비밀번호: ${operatorPassword}`);
    console.log(`👤 이름: ${operatorName}`);
    console.log(`🛡️ 역할: ${operatorRole}`);
    console.log(`🆔 사용자 ID: ${result.lastInsertRowid}`);
    console.log('');
    console.log('🔐 운영자 권한:');
    console.log('✅ 대시보드 접근');
    console.log('✅ 진행 현황 모니터링');
    console.log('✅ 공지사항 관리');
    console.log('✅ 시스템 모니터링');
    console.log('❌ 사용자 관리 (제한)');
    console.log('❌ 질의응답 관리 (제한)');
    console.log('❌ 조언 캐시 관리 (제한)');
    console.log('❌ 시스템 관리 (제한)');
    console.log('');
    console.log('🌐 관리자 시스템 접속: http://localhost:3011');

    db.close();
  } catch (error) {
    console.error('❌ 운영자 계정 생성 실패:', error);
    process.exit(1);
  }
}

createOperator();