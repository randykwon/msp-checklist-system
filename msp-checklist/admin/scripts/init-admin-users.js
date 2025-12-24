const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Database path - use the main database
const dbPath = path.join(process.cwd(), '..', 'msp-assessment.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

async function createAdminUsers() {
  try {
    console.log('Creating admin users...');

    // Check if users already exist
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('Existing users count:', existingUsers.count);

    // Create test users if none exist
    if (existingUsers.count === 0) {
      const users = [
        {
          email: 'admin@msp.com',
          password: await bcrypt.hash('admin123', 10),
          name: '시스템 관리자',
          role: 'superadmin',
          status: 'active',
          organization: 'MSP 헬퍼'
        },
        {
          email: 'operator@msp.com',
          password: await bcrypt.hash('operator123', 10),
          name: '운영자',
          role: 'operator',
          status: 'active',
          organization: 'MSP 헬퍼'
        },
        {
          email: 'user@msp.com',
          password: await bcrypt.hash('user123', 10),
          name: '일반 사용자',
          role: 'user',
          status: 'active',
          organization: '테스트 회사'
        }
      ];

      const insertUser = db.prepare(`
        INSERT INTO users (email, password, name, role, status, organization)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const user of users) {
        try {
          const result = insertUser.run(
            user.email,
            user.password,
            user.name,
            user.role,
            user.status,
            user.organization
          );
          console.log(`Created user: ${user.email} (ID: ${result.lastInsertRowid})`);
        } catch (error) {
          console.error(`Error creating user ${user.email}:`, error.message);
        }
      }
    } else {
      console.log('Users already exist, skipping creation');
    }

    // Create some sample assessment data
    const sampleAssessmentData = [
      {
        user_id: 1,
        assessment_type: 'prerequisites',
        item_id: 'PREREQ_001',
        category: '기본 요구사항',
        title: '사업자 등록증',
        description: '유효한 사업자 등록증을 보유하고 있어야 합니다.',
        is_mandatory: 1,
        evidence_required: '사업자 등록증 사본',
        met: 'true',
        partner_response: '사업자 등록증을 보유하고 있습니다.'
      },
      {
        user_id: 1,
        assessment_type: 'technical',
        item_id: 'TECH_001',
        category: '기술 역량',
        title: 'AWS 인증',
        description: 'AWS 관련 인증을 보유하고 있어야 합니다.',
        is_mandatory: 0,
        evidence_required: 'AWS 인증서',
        met: 'false',
        partner_response: '현재 AWS 인증 취득을 준비 중입니다.'
      }
    ];

    const insertAssessment = db.prepare(`
      INSERT OR IGNORE INTO assessment_data 
      (user_id, assessment_type, item_id, category, title, description, is_mandatory, evidence_required, met, partner_response)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of sampleAssessmentData) {
      try {
        insertAssessment.run(
          item.user_id,
          item.assessment_type,
          item.item_id,
          item.category,
          item.title,
          item.description,
          item.is_mandatory,
          item.evidence_required,
          item.met,
          item.partner_response
        );
        console.log(`Created assessment item: ${item.item_id}`);
      } catch (error) {
        console.error(`Error creating assessment item ${item.item_id}:`, error.message);
      }
    }

    // Create some sample Q&A data
    const sampleQA = [
      {
        item_id: 'PREREQ_001',
        assessment_type: 'prerequisites',
        question: '사업자 등록증은 어떤 형태로 제출해야 하나요?',
        answer: 'PDF 또는 이미지 파일로 제출하시면 됩니다.',
        question_user_id: 3,
        answer_user_id: 2
      }
    ];

    const insertQA = db.prepare(`
      INSERT OR IGNORE INTO item_qa 
      (item_id, assessment_type, question, answer, question_user_id, answer_user_id, answer_created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const qa of sampleQA) {
      try {
        insertQA.run(
          qa.item_id,
          qa.assessment_type,
          qa.question,
          qa.answer,
          qa.question_user_id,
          qa.answer_user_id
        );
        console.log(`Created Q&A for item: ${qa.item_id}`);
      } catch (error) {
        console.error(`Error creating Q&A for ${qa.item_id}:`, error.message);
      }
    }

    // Create sample advice cache
    const sampleAdvice = [
      {
        item_id: 'PREREQ_001',
        language: 'ko',
        advice_content: '사업자 등록증은 MSP 파트너 프로그램의 기본 요구사항입니다. 유효한 사업자 등록증을 준비하여 제출하시기 바랍니다.'
      }
    ];

    const insertAdvice = db.prepare(`
      INSERT OR IGNORE INTO advice_cache (item_id, language, advice_content)
      VALUES (?, ?, ?)
    `);

    for (const advice of sampleAdvice) {
      try {
        insertAdvice.run(advice.item_id, advice.language, advice.advice_content);
        console.log(`Created advice cache for: ${advice.item_id}`);
      } catch (error) {
        console.error(`Error creating advice cache for ${advice.item_id}:`, error.message);
      }
    }

    console.log('\n=== Admin Users Created ===');
    console.log('Super Admin: admin@msp.com / admin123');
    console.log('Operator: operator@msp.com / operator123');
    console.log('User: user@msp.com / user123');
    console.log('\nAdmin system is ready to use!');

  } catch (error) {
    console.error('Error initializing admin users:', error);
  } finally {
    db.close();
  }
}

createAdminUsers();