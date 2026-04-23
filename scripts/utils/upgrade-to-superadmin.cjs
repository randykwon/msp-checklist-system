const Database = require('better-sqlite3');
const path = require('path');

function upgradeToSuperAdmin() {
  try {
    // 데이터베이스 연결
    const dbPath = path.join(__dirname, 'msp-checklist', 'msp-assessment.db');
    const db = new Database(dbPath);

    // 기존 admin 역할을 가진 사용자들을 superadmin으로 업그레이드
    const updateStmt = db.prepare(`
      UPDATE users 
      SET role = 'superadmin', updated_at = datetime('now')
      WHERE role = 'admin'
    `);

    const result = updateStmt.run();

    if (result.changes > 0) {
      console.log(`🎉 ${result.changes}명의 관리자가 슈퍼관리자로 업그레이드되었습니다!`);
      
      // 업그레이드된 사용자 목록 표시
      const superAdmins = db.prepare(`
        SELECT id, email, name, role, updated_at 
        FROM users 
        WHERE role = 'superadmin'
        ORDER BY updated_at DESC
      `).all();

      console.log('');
      console.log('👑 슈퍼관리자 목록:');
      superAdmins.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
      });

      console.log('');
      console.log('🔐 슈퍼관리자 권한:');
      console.log('✅ 모든 기능에 대한 완전한 접근 권한');
      console.log('✅ 사용자 관리 (모든 역할 변경 가능)');
      console.log('✅ 질의응답 관리');
      console.log('✅ 조언 캐시 관리');
      console.log('✅ 시스템 관리');
      console.log('✅ 시스템 모니터링');
      console.log('✅ 공지사항 관리');
      console.log('✅ 진행 현황 모니터링');
    } else {
      console.log('ℹ️ 업그레이드할 관리자 계정이 없습니다.');
    }

    db.close();
  } catch (error) {
    console.error('❌ 슈퍼관리자 업그레이드 실패:', error);
    process.exit(1);
  }
}

upgradeToSuperAdmin();