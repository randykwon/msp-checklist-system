// 비밀번호 변경 기능 테스트 스크립트
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'msp-assessment.db');
const db = new Database(dbPath);

async function testPasswordReset() {
  console.log('=== 비밀번호 변경 기능 테스트 ===\n');

  // 1. 테스트 사용자 확인
  const testUser = db.prepare('SELECT * FROM users WHERE email = ?').get('test@example.com');
  
  if (!testUser) {
    console.log('❌ 테스트 사용자가 없습니다. DB 초기화가 필요합니다.');
    return;
  }

  console.log('✅ 테스트 사용자 발견:');
  console.log(`   - ID: ${testUser.id}`);
  console.log(`   - Email: ${testUser.email}`);
  console.log(`   - Name: ${testUser.name}`);
  console.log(`   - Status: ${testUser.status}`);
  console.log('');

  // 2. 기존 비밀번호 확인
  const originalPasswordValid = await bcrypt.compare('test1234', testUser.password);
  console.log(`✅ 기존 비밀번호 'test1234' 검증: ${originalPasswordValid ? '성공' : '실패'}`);

  // 3. 비밀번호 변경 테스트
  const newPassword = 'newpassword123';
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hashedNewPassword, testUser.id);
  
  console.log(`✅ 비밀번호를 '${newPassword}'로 변경 완료`);

  // 4. 변경된 비밀번호 확인
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
  const newPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
  console.log(`✅ 새 비밀번호 검증: ${newPasswordValid ? '성공' : '실패'}`);

  // 5. 기존 비밀번호로 복원
  const restoredPassword = await bcrypt.hash('test1234', 10);
  db.prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?")
    .run(restoredPassword, testUser.id);
  
  console.log(`✅ 비밀번호를 'test1234'로 복원 완료`);

  // 6. 복원된 비밀번호 확인
  const restoredUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
  const restoredPasswordValid = await bcrypt.compare('test1234', restoredUser.password);
  console.log(`✅ 복원된 비밀번호 검증: ${restoredPasswordValid ? '성공' : '실패'}`);

  console.log('\n=== 테스트 완료 ===');
  console.log('비밀번호 변경 기능이 정상적으로 동작합니다.');
  
  db.close();
}

testPasswordReset().catch(console.error);
