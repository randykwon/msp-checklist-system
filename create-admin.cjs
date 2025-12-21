const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, 'msp-checklist/msp-assessment.db');
const db = new Database(dbPath);

async function createAdminUser() {
  try {
    // 관리자 계정 정보
    const adminEmail = 'admin@msp.com';
    const adminPassword = 'admin123!';
    const adminName = 'MSP 헬퍼 관리자';
    const adminRole = 'admin';

    // 기존 관리자 계정 확인
    const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
    
    if (existingAdmin) {
      console.log('❌ 관리자 계정이 이미 존재합니다.');
      console.log(`📧 이메일: ${adminEmail}`);
      return;
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 관리자 계정 생성
    const stmt = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(adminEmail, hashedPassword, adminName, adminRole);

    console.log('✅ 관리자 계정이 성공적으로 생성되었습니다!');
    console.log('');
    console.log('📋 관리자 계정 정보:');
    console.log(`📧 이메일: ${adminEmail}`);
    console.log(`🔑 비밀번호: ${adminPassword}`);
    console.log(`👤 이름: ${adminName}`);
    console.log(`🔒 역할: ${adminRole}`);
    console.log('');
    console.log('🌐 관리자 시스템 접속:');
    console.log('   http://localhost:3011');
    console.log('');
    console.log('⚠️  보안을 위해 첫 로그인 후 비밀번호를 변경하세요!');

  } catch (error) {
    console.error('❌ 관리자 계정 생성 중 오류 발생:', error);
  } finally {
    db.close();
  }
}

createAdminUser();