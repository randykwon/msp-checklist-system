#!/usr/bin/env node

/**
 * MSP Checklist System - API 테스트 스크립트
 * 
 * 사용법:
 *   node api-tests.js                    # 전체 테스트
 *   node api-tests.js --quick            # 빠른 테스트
 *   node api-tests.js --json             # JSON 출력
 */

const http = require('http');
const https = require('https');

// 설정
const CONFIG = {
  mainUrl: process.env.MAIN_URL || 'http://localhost:3010',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3011',
  testEmail: `test_${Date.now()}@example.com`,
  testPassword: 'TestPass123!',
  testName: '테스트사용자',
  timeout: 10000
};

// 결과 저장
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: Date.now()
};

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 옵션 파싱
const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const jsonOutput = args.includes('--json');

// 로그 함수
function log(message, color = 'reset') {
  if (!jsonOutput) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

function logSection(title) {
  log(`\n${'━'.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log('━'.repeat(60), 'cyan');
}

// HTTP 요청 함수
function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: CONFIG.timeout
    };
    
    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: body });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: {}, raw: body });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 테스트 실행 함수
async function runTest(name, testFn) {
  results.total++;
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    if (result.skip) {
      results.skipped++;
      results.tests.push({ name, status: 'SKIP', message: result.message, duration });
      log(`[- SKIP] ${name}: ${result.message}`, 'yellow');
    } else if (result.pass) {
      results.passed++;
      results.tests.push({ name, status: 'PASS', duration });
      log(`[✓ PASS] ${name} (${duration}ms)`, 'green');
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', message: result.message, duration });
      log(`[✗ FAIL] ${name}: ${result.message}`, 'red');
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;
    results.tests.push({ name, status: 'FAIL', message: error.message, duration });
    log(`[✗ FAIL] ${name}: ${error.message}`, 'red');
  }
}

// 저장된 인증 정보
let authToken = null;
let adminToken = null;
let testUserId = null;

// ============================================================================
// 테스트 케이스
// ============================================================================

async function testServerHealth() {
  logSection('1. 서버 상태 테스트');
  
  await runTest('메인 서버 응답', async () => {
    const res = await request({ url: CONFIG.mainUrl, method: 'GET' });
    return { pass: res.status === 200 };
  });
  
  await runTest('Admin 서버 응답', async () => {
    const res = await request({ url: CONFIG.adminUrl, method: 'GET' });
    return { pass: res.status === 200 };
  });
}

async function testAuthentication() {
  logSection('2. 인증 API 테스트');
  
  // 회원가입
  await runTest('회원가입 API', async () => {
    const res = await request({
      url: `${CONFIG.mainUrl}/api/auth/register`,
      method: 'POST'
    }, {
      email: CONFIG.testEmail,
      password: CONFIG.testPassword,
      name: CONFIG.testName,
      organization: '테스트조직'
    });
    
    if (res.body.user) {
      testUserId = res.body.user.id;
    }
    return { pass: res.status === 200 || res.status === 201 };
  });
  
  // 로그인
  await runTest('로그인 API', async () => {
    const res = await request({
      url: `${CONFIG.mainUrl}/api/auth/login`,
      method: 'POST'
    }, {
      email: CONFIG.testEmail,
      password: CONFIG.testPassword
    });
    
    if (res.body.token) {
      authToken = res.body.token;
    }
    // 쿠키에서 토큰 추출
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const tokenMatch = setCookie.find(c => c.includes('msp_auth_token'));
      if (tokenMatch) {
        authToken = tokenMatch.split('=')[1].split(';')[0];
      }
    }
    
    return { pass: res.status === 200 && (res.body.success || res.body.token || authToken) };
  });
  
  // 사용자 정보 조회
  await runTest('사용자 정보 조회 API', async () => {
    if (!authToken) {
      return { skip: true, message: '인증 토큰 없음' };
    }
    
    const res = await request({
      url: `${CONFIG.mainUrl}/api/auth/me`,
      method: 'GET',
      headers: { Cookie: `msp_auth_token=${authToken}` }
    });
    
    return { pass: res.status === 200 };
  });
}

async function testAssessment() {
  logSection('3. 평가 데이터 API 테스트');
  
  await runTest('Prerequisites 데이터 조회', async () => {
    if (!authToken) {
      return { skip: true, message: '인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.mainUrl}/api/assessment?type=prerequisites`,
      method: 'GET',
      headers: { Cookie: `msp_auth_token=${authToken}` }
    });
    
    return { pass: res.status === 200 };
  });
  
  await runTest('Technical 데이터 조회', async () => {
    if (!authToken) {
      return { skip: true, message: '인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.mainUrl}/api/assessment?type=technical`,
      method: 'GET',
      headers: { Cookie: `msp_auth_token=${authToken}` }
    });
    
    return { pass: res.status === 200 };
  });
  
  await runTest('평가 항목 저장', async () => {
    if (!authToken) {
      return { skip: true, message: '인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.mainUrl}/api/assessment`,
      method: 'POST',
      headers: { Cookie: `msp_auth_token=${authToken}` }
    }, {
      assessmentType: 'prerequisites',
      item: {
        id: 'BUS-001',
        met: true,
        partnerResponse: '테스트 응답'
      }
    });
    
    return { pass: res.status === 200 };
  });
}

async function testAdviceCache() {
  logSection('4. 조언 캐시 API 테스트');
  
  await runTest('조언 캐시 통계 조회', async () => {
    const res = await request({
      url: `${CONFIG.mainUrl}/api/advice-cache/stats`,
      method: 'GET'
    });
    
    return { pass: res.status === 200 };
  });
  
  await runTest('캐시 버전 목록 조회', async () => {
    const res = await request({
      url: `${CONFIG.mainUrl}/api/cache-version`,
      method: 'GET'
    });
    
    return { pass: res.status === 200 };
  });
}

async function testVirtualEvidence() {
  logSection('5. 가상증빙 API 테스트');
  
  await runTest('가상증빙 캐시 통계', async () => {
    const res = await request({
      url: `${CONFIG.mainUrl}/api/virtual-evidence-cache/stats`,
      method: 'GET'
    });
    
    return { pass: res.status === 200 };
  });
  
  if (!quickMode) {
    await runTest('가상증빙 생성 API', async () => {
      const res = await request({
        url: `${CONFIG.mainUrl}/api/virtual-evidence`,
        method: 'POST'
      }, {
        itemId: 'BUS-001',
        title: '테스트 항목',
        description: '테스트 설명',
        evidenceRequired: '문서',
        language: 'ko'
      });
      
      return { pass: res.status === 200 };
    });
  } else {
    await runTest('가상증빙 생성 API', async () => {
      return { skip: true, message: '빠른 모드' };
    });
  }
}

async function testAnnouncements() {
  logSection('6. 공지사항 API 테스트');
  
  await runTest('활성 공지사항 조회', async () => {
    const res = await request({
      url: `${CONFIG.mainUrl}/api/announcements`,
      method: 'GET'
    });
    
    return { pass: res.status === 200 };
  });
}

async function testQA() {
  logSection('7. Q&A API 테스트');
  
  await runTest('Q&A 목록 조회', async () => {
    if (!authToken) {
      return { skip: true, message: '인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.mainUrl}/api/qa?itemId=BUS-001&assessmentType=prerequisites`,
      method: 'GET',
      headers: { Cookie: `msp_auth_token=${authToken}` }
    });
    
    return { pass: res.status === 200 };
  });
}

async function testAdminAPI() {
  logSection('8. Admin API 테스트');
  
  // Admin 로그인 시도
  await runTest('Admin 로그인', async () => {
    const res = await request({
      url: `${CONFIG.adminUrl}/api/auth/login`,
      method: 'POST'
    }, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const tokenMatch = setCookie.find(c => c.includes('admin_auth_token'));
      if (tokenMatch) {
        adminToken = tokenMatch.split('=')[1].split(';')[0];
      }
    }
    
    if (res.status !== 200) {
      return { skip: true, message: 'Admin 계정 없음' };
    }
    return { pass: true };
  });
  
  await runTest('Admin 통계 조회', async () => {
    if (!adminToken) {
      return { skip: true, message: 'Admin 인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.adminUrl}/api/admin/stats`,
      method: 'GET',
      headers: { Cookie: `admin_auth_token=${adminToken}` }
    });
    
    return { pass: res.status === 200 };
  });
  
  await runTest('사용자 목록 조회', async () => {
    if (!adminToken) {
      return { skip: true, message: 'Admin 인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.adminUrl}/api/users`,
      method: 'GET',
      headers: { Cookie: `admin_auth_token=${adminToken}` }
    });
    
    return { pass: res.status === 200 };
  });
  
  await runTest('시스템 설정 조회', async () => {
    if (!adminToken) {
      return { skip: true, message: 'Admin 인증 필요' };
    }
    
    const res = await request({
      url: `${CONFIG.adminUrl}/api/system/settings`,
      method: 'GET',
      headers: { Cookie: `admin_auth_token=${adminToken}` }
    });
    
    return { pass: res.status === 200 };
  });
}

async function testStaticPages() {
  logSection('9. 정적 페이지 테스트');
  
  await runTest('메인 페이지 로드', async () => {
    const res = await request({ url: `${CONFIG.mainUrl}/`, method: 'GET' });
    return { pass: res.status === 200 };
  });
  
  await runTest('로그인 페이지 로드', async () => {
    const res = await request({ url: `${CONFIG.mainUrl}/login`, method: 'GET' });
    return { pass: res.status === 200 };
  });
  
  await runTest('Admin 로그인 페이지 로드', async () => {
    const res = await request({ url: `${CONFIG.adminUrl}/login`, method: 'GET' });
    return { pass: res.status === 200 };
  });
}

async function cleanup() {
  logSection('테스트 정리');
  
  // 테스트 사용자 삭제
  if (adminToken && testUserId) {
    try {
      await request({
        url: `${CONFIG.adminUrl}/api/users/${testUserId}`,
        method: 'DELETE',
        headers: { Cookie: `admin_auth_token=${adminToken}` }
      });
      log('[INFO] 테스트 사용자 삭제됨', 'blue');
    } catch {
      // 무시
    }
  }
}

// 결과 출력
function printResults() {
  const duration = ((Date.now() - results.startTime) / 1000).toFixed(2);
  
  if (jsonOutput) {
    console.log(JSON.stringify({
      ...results,
      duration: `${duration}s`,
      successRate: results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0
    }, null, 2));
    return;
  }
  
  log('\n' + '═'.repeat(60), 'cyan');
  log('                    테스트 결과 요약', 'cyan');
  log('═'.repeat(60), 'cyan');
  log(`\n총 테스트: ${results.total}`);
  log(`  통과: ${results.passed}`, 'green');
  log(`  실패: ${results.failed}`, 'red');
  log(`  건너뜀: ${results.skipped}`, 'yellow');
  log(`\n소요 시간: ${duration}초`);
  
  if (results.total > 0) {
    const successRate = Math.round((results.passed / results.total) * 100);
    log(`성공률: ${successRate}%`);
  }
}

// 메인 실행
async function main() {
  if (!jsonOutput) {
    log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║        MSP Checklist System - API 테스트                      ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
    log(`\n테스트 시작: ${new Date().toLocaleString('ko-KR')}`);
    log(`메인 앱: ${CONFIG.mainUrl}`);
    log(`Admin 앱: ${CONFIG.adminUrl}`);
    if (quickMode) log('모드: 빠른 테스트', 'yellow');
  }
  
  try {
    await testServerHealth();
    await testAuthentication();
    await testAssessment();
    await testAdviceCache();
    await testVirtualEvidence();
    await testAnnouncements();
    await testQA();
    await testAdminAPI();
    await testStaticPages();
    await cleanup();
  } catch (error) {
    log(`\n[ERROR] 테스트 실행 중 오류: ${error.message}`, 'red');
  }
  
  printResults();
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
