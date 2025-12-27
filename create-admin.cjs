const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// 데이터베이스 경로 설정
const dbPath = path.join(__dirname, 'msp-checklist/msp-assessment.db');

// 데이터베이스 디렉토리 확인 및 생성
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 데이터베이스 디렉토리 생성:', dbDir);
}

// 데이터베이스 연결
const db = new Database(dbPath);

// 테이블 생성 함수
function initializeDatabase() {
  // users 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      phone TEXT,
      organization TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ users 테이블 확인/생성 완료');

  // assessment_progress 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessment_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      assessment_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      met INTEGER,
      partner_response TEXT,
      evidence_links TEXT,
      notes TEXT,
      version_id INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, assessment_type, item_id, version_id)
    )
  `);
  console.log('✅ assessment_progress 테이블 확인/생성 완료');

  // qa_questions 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS qa_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      assessment_type TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      question_user_id INTEGER NOT NULL,
      answer_user_id INTEGER,
      question_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answer_created_at DATETIME,
      FOREIGN KEY (question_user_id) REFERENCES users(id),
      FOREIGN KEY (answer_user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ qa_questions 테이블 확인/생성 완료');

  // advice_cache 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS advice_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL UNIQUE,
      advice TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ advice_cache 테이블 확인/생성 완료');

  // virtual_evidence_cache 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS virtual_evidence_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL UNIQUE,
      evidence TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ virtual_evidence_cache 테이블 확인/생성 완료');

  // announcements 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      priority INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  console.log('✅ announcements 테이블 확인/생성 완료');

  // user_versions 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      version_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, version_name)
    )
  `);
  console.log('✅ user_versions 테이블 확인/생성 완료');
}

async function createAdminUser() {
  try {
    // 데이터베이스 초기화
    console.log('');
    console.log('🔧 데이터베이스 초기화 중...');
    initializeDatabase();
    console.log('');

    // 관리자 계정 정보
    const adminEmail = 'admin@msp.com';
    const adminPassword = 'admin123!';
    const adminName = 'MSP 관리자';
    const adminRole = 'superadmin';

    // 기존 관리자 계정 확인
    const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
    
    if (existingAdmin) {
      console.log('ℹ️  관리자 계정이 이미 존재합니다.');
      console.log(`📧 이메일: ${adminEmail}`);
      console.log('');
      return;
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 관리자 계정 생성
    const stmt = db.prepare('INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, ?)');
    stmt.run(adminEmail, hashedPassword, adminName, adminRole, 'active');

    console.log('✅ 관리자 계정이 성공적으로 생성되었습니다!');
    console.log('');
    console.log('📋 관리자 계정 정보:');
    console.log(`   📧 이메일: ${adminEmail}`);
    console.log(`   🔑 비밀번호: ${adminPassword}`);
    console.log(`   👤 이름: ${adminName}`);
    console.log(`   🔒 역할: ${adminRole}`);
    console.log('');
    console.log('🌐 관리자 시스템 접속:');
    console.log('   http://[서버주소]:3011');
    console.log('');
    console.log('⚠️  보안을 위해 첫 로그인 후 비밀번호를 변경하세요!');

  } catch (error) {
    console.error('❌ 관리자 계정 생성 중 오류 발생:', error);
  } finally {
    db.close();
  }
}

createAdminUser();
