#!/usr/bin/env node

/**
 * MSP Checklist - 사용자 등록 스크립트
 * 
 * 사용법:
 *   node create-user.cjs                    # 대화형 모드
 *   node create-user.cjs --admin            # 관리자 생성 (대화형)
 *   node create-user.cjs --operator         # 운영자 생성 (대화형)
 *   node create-user.cjs --user             # 일반 사용자 생성 (대화형)
 *   node create-user.cjs -e email -p pass -n name -r role  # 직접 지정
 * 
 * 역할:
 *   superadmin - 최고 관리자 (모든 권한)
 *   admin      - 관리자 (사용자 관리, 시스템 설정)
 *   operator   - 운영자 (모니터링, 캐시 관리)
 *   user       - 일반 사용자 (평가 기능만)
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

// 데이터베이스 경로
const DB_PATH = path.join(__dirname, 'msp-checklist', 'msp-assessment.db');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) { log(`✅ ${message}`, 'green'); }
function logError(message) { log(`❌ ${message}`, 'red'); }
function logInfo(message) { log(`ℹ️  ${message}`, 'blue'); }
function logWarning(message) { log(`⚠️  ${message}`, 'yellow'); }

// readline 인터페이스
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    stdin.on('data', function handler(char) {
      char = char.toString();
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.removeListener('data', handler);
          console.log();
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007F': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(prompt + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

// 역할 정보
const ROLES = {
  superadmin: { name: '최고 관리자', emoji: '👑', description: '모든 권한 (시스템 전체 관리)' },
  admin: { name: '관리자', emoji: '🛡️', description: '사용자 관리, 시스템 설정' },
  operator: { name: '운영자', emoji: '⚙️', description: '모니터링, 캐시 관리, Q&A 관리' },
  user: { name: '일반 사용자', emoji: '👤', description: '평가 기능만 사용 가능' }
};

// 이메일 유효성 검사
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 비밀번호 유효성 검사
function isValidPassword(password) {
  return password && password.length >= 6;
}

// 사용자 생성
async function createUser(email, password, name, role, organization = '') {
  const db = new Database(DB_PATH);
  
  try {
    // 이메일 중복 확인
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error(`이미 존재하는 이메일입니다: ${email}`);
    }
    
    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 사용자 생성
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, role, status, organization, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(email, hashedPassword, name, role, organization);
    
    return {
      id: result.lastInsertRowid,
      email,
      name,
      role,
      organization
    };
  } finally {
    db.close();
  }
}

// 모든 사용자 목록
function listUsers() {
  const db = new Database(DB_PATH);
  
  try {
    const users = db.prepare(`
      SELECT id, email, name, role, status, organization, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    
    return users;
  } finally {
    db.close();
  }
}

// 대화형 모드
async function interactiveMode(presetRole = null) {
  console.log();
  log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           MSP Checklist - 사용자 등록 스크립트                ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();
  
  // 역할 선택
  let role = presetRole;
  if (!role) {
    log('📋 역할을 선택하세요:', 'yellow');
    console.log();
    Object.entries(ROLES).forEach(([key, info], index) => {
      console.log(`  ${index + 1}. ${info.emoji} ${info.name} (${key})`);
      console.log(`     └─ ${info.description}`);
    });
    console.log();
    
    const roleChoice = await question('선택 (1-4): ');
    const roleKeys = Object.keys(ROLES);
    const roleIndex = parseInt(roleChoice) - 1;
    
    if (roleIndex < 0 || roleIndex >= roleKeys.length) {
      logError('잘못된 선택입니다.');
      rl.close();
      process.exit(1);
    }
    
    role = roleKeys[roleIndex];
  }
  
  const roleInfo = ROLES[role];
  console.log();
  logInfo(`${roleInfo.emoji} ${roleInfo.name} 계정을 생성합니다.`);
  console.log();
  
  // 이메일 입력
  let email;
  while (true) {
    email = await question('📧 이메일: ');
    if (!email) {
      logWarning('이메일을 입력해주세요.');
      continue;
    }
    if (!isValidEmail(email)) {
      logWarning('올바른 이메일 형식이 아닙니다.');
      continue;
    }
    break;
  }
  
  // 이름 입력
  let name;
  while (true) {
    name = await question('👤 이름: ');
    if (!name) {
      logWarning('이름을 입력해주세요.');
      continue;
    }
    break;
  }
  
  // 비밀번호 입력
  let password;
  while (true) {
    password = await questionHidden('🔒 비밀번호 (최소 6자): ');
    if (!isValidPassword(password)) {
      logWarning('비밀번호는 최소 6자 이상이어야 합니다.');
      continue;
    }
    
    const confirmPassword = await questionHidden('🔒 비밀번호 확인: ');
    if (password !== confirmPassword) {
      logWarning('비밀번호가 일치하지 않습니다.');
      continue;
    }
    break;
  }
  
  // 소속 입력 (선택)
  const organization = await question('🏢 소속 (선택사항): ');
  
  console.log();
  log('─'.repeat(50), 'cyan');
  console.log();
  
  // 확인
  log('📝 입력 정보 확인:', 'yellow');
  console.log(`   이메일: ${email}`);
  console.log(`   이름: ${name}`);
  console.log(`   역할: ${roleInfo.emoji} ${roleInfo.name}`);
  console.log(`   소속: ${organization || '(없음)'}`);
  console.log();
  
  const confirm = await question('이 정보로 계정을 생성하시겠습니까? (y/N): ');
  
  if (confirm.toLowerCase() !== 'y') {
    logWarning('취소되었습니다.');
    rl.close();
    process.exit(0);
  }
  
  console.log();
  
  try {
    const user = await createUser(email, password, name, role, organization);
    logSuccess(`사용자가 성공적으로 생성되었습니다!`);
    console.log();
    log('📋 생성된 계정 정보:', 'green');
    console.log(`   ID: ${user.id}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   이름: ${user.name}`);
    console.log(`   역할: ${ROLES[user.role].emoji} ${ROLES[user.role].name}`);
    console.log();
    
    if (role === 'user') {
      logInfo('이 계정으로 메인 서비스에 로그인할 수 있습니다.');
    } else {
      logInfo('이 계정으로 관리자 시스템에 로그인할 수 있습니다.');
    }
  } catch (error) {
    logError(error.message);
  }
  
  rl.close();
}

// 명령줄 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    email: null,
    password: null,
    name: null,
    role: null,
    organization: '',
    list: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-e':
      case '--email':
        options.email = args[++i];
        break;
      case '-p':
      case '--password':
        options.password = args[++i];
        break;
      case '-n':
      case '--name':
        options.name = args[++i];
        break;
      case '-r':
      case '--role':
        options.role = args[++i];
        break;
      case '-o':
      case '--organization':
        options.organization = args[++i];
        break;
      case '--admin':
        options.role = 'admin';
        break;
      case '--superadmin':
        options.role = 'superadmin';
        break;
      case '--operator':
        options.role = 'operator';
        break;
      case '--user':
        options.role = 'user';
        break;
      case '-l':
      case '--list':
        options.list = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
    }
  }
  
  return options;
}

// 도움말 출력
function showHelp() {
  console.log(`
${colors.cyan}MSP Checklist - 사용자 등록 스크립트${colors.reset}

${colors.yellow}사용법:${colors.reset}
  node create-user.cjs                     대화형 모드
  node create-user.cjs --admin             관리자 생성 (대화형)
  node create-user.cjs --operator          운영자 생성 (대화형)
  node create-user.cjs --user              일반 사용자 생성 (대화형)
  node create-user.cjs [옵션]              직접 지정 모드

${colors.yellow}옵션:${colors.reset}
  -e, --email <email>       이메일 주소
  -p, --password <pass>     비밀번호 (최소 6자)
  -n, --name <name>         이름
  -r, --role <role>         역할 (superadmin/admin/operator/user)
  -o, --organization <org>  소속 (선택)
  
  --superadmin              최고 관리자로 생성
  --admin                   관리자로 생성
  --operator                운영자로 생성
  --user                    일반 사용자로 생성
  
  -l, --list                사용자 목록 출력
  -h, --help                도움말 출력

${colors.yellow}역할 설명:${colors.reset}
  👑 superadmin  최고 관리자 - 모든 권한
  🛡️ admin       관리자 - 사용자 관리, 시스템 설정
  ⚙️ operator    운영자 - 모니터링, 캐시 관리
  👤 user        일반 사용자 - 평가 기능만

${colors.yellow}예시:${colors.reset}
  node create-user.cjs --admin
  node create-user.cjs -e admin@example.com -p admin123 -n "관리자" -r admin
  node create-user.cjs --list
`);
}

// 사용자 목록 출력
function showUserList() {
  console.log();
  log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    등록된 사용자 목록                         ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();
  
  const users = listUsers();
  
  if (users.length === 0) {
    logWarning('등록된 사용자가 없습니다.');
    return;
  }
  
  users.forEach((user, index) => {
    const roleInfo = ROLES[user.role] || { emoji: '❓', name: user.role };
    const statusEmoji = user.status === 'active' ? '✅' : user.status === 'suspended' ? '🚫' : '⏸️';
    
    console.log(`${index + 1}. ${roleInfo.emoji} ${user.name} (${user.email})`);
    console.log(`   역할: ${roleInfo.name} | 상태: ${statusEmoji} ${user.status}`);
    console.log(`   소속: ${user.organization || '(없음)'}`);
    console.log();
  });
  
  log(`총 ${users.length}명의 사용자가 등록되어 있습니다.`, 'green');
}

// 메인 함수
async function main() {
  const options = parseArgs();
  
  // 도움말
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  // 사용자 목록
  if (options.list) {
    showUserList();
    process.exit(0);
  }
  
  // 직접 지정 모드
  if (options.email && options.password && options.name && options.role) {
    // 유효성 검사
    if (!isValidEmail(options.email)) {
      logError('올바른 이메일 형식이 아닙니다.');
      process.exit(1);
    }
    
    if (!isValidPassword(options.password)) {
      logError('비밀번호는 최소 6자 이상이어야 합니다.');
      process.exit(1);
    }
    
    if (!ROLES[options.role]) {
      logError(`잘못된 역할입니다: ${options.role}`);
      logInfo('사용 가능한 역할: superadmin, admin, operator, user');
      process.exit(1);
    }
    
    try {
      const user = await createUser(
        options.email,
        options.password,
        options.name,
        options.role,
        options.organization
      );
      
      logSuccess(`사용자가 생성되었습니다: ${user.email} (${ROLES[user.role].name})`);
    } catch (error) {
      logError(error.message);
      process.exit(1);
    }
    
    process.exit(0);
  }
  
  // 대화형 모드
  await interactiveMode(options.role);
}

main().catch((error) => {
  logError(error.message);
  process.exit(1);
});
