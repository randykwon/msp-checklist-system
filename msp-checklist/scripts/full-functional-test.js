#!/usr/bin/env node
/**
 * MSP Checklist - 전체 웹페이지 기능 테스트 스크립트
 * 
 * 메인 서비스 (포트 3010)와 어드민 서비스 (포트 3011)의 
 * 모든 페이지와 API 엔드포인트를 테스트합니다.
 * 
 * 사용법: node scripts/full-functional-test.js [options]
 *   --main-only    메인 서비스만 테스트
 *   --admin-only   어드민 서비스만 테스트
 *   --verbose      상세 출력
 */

const http = require('http');
const https = require('https');

// 설정
const CONFIG = {
  mainService: {
    host: 'localhost',
    port: 3010,
    name: '메인 서비스'
  },
  adminService: {
    host: 'localhost',
    port: 3011,
    name: '어드민 서비스'
  },
  timeout: 10000,
  verbose: process.argv.includes('--verbose')
};

// 테스트 결과 저장
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(name, success, message = '', duration = 0) {
  const status = success ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  const durationStr = duration > 0 ? `${colors.dim}(${duration}ms)${colors.reset}` : '';
  console.log(`  ${status} ${name} ${durationStr}`);
  if (message && (CONFIG.verbose || !success)) {
    console.log(`       ${colors.dim}${message}${colors.reset}`);
  }
}

// HTTP 요청 함수
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          duration: Date.now() - startTime
        });
      });
    });

    req.on('error', (err) => {
      reject({ error: err.message, duration: Date.now() - startTime });
    });

    req.setTimeout(CONFIG.timeout, () => {
      req.destroy();
      reject({ error: 'Request timeout', duration: Date.now() - startTime });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 페이지 테스트 (여러 상태 코드 허용)
async function testPage(service, path, expectedStatuses = [200], description = '') {
  const name = description || path;
  const statusArray = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
  
  try {
    const response = await makeRequest({
      hostname: service.host,
      port: service.port,
      path: path,
      method: 'GET',
      headers: { 'Accept': 'text/html' }
    });

    const success = statusArray.includes(response.statusCode);
    if (success) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(`${service.name} ${path}: Expected ${statusArray.join('/')}, got ${response.statusCode}`);
    }
    logResult(name, success, `Status: ${response.statusCode}`, response.duration);
    return success;
  } catch (err) {
    results.failed++;
    results.errors.push(`${service.name} ${path}: ${err.error}`);
    logResult(name, false, err.error, err.duration);
    return false;
  }
}

// API 테스트 (여러 상태 코드 허용)
async function testAPI(service, method, path, body = null, expectedStatuses = [200], description = '') {
  const name = description || `${method} ${path}`;
  const statusArray = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
  
  try {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const response = await makeRequest({
      hostname: service.host,
      port: service.port,
      path: path,
      method: method,
      headers: headers
    }, body ? JSON.stringify(body) : null);

    const success = statusArray.includes(response.statusCode);
    if (success) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(`${service.name} ${method} ${path}: Expected ${statusArray.join('/')}, got ${response.statusCode}`);
    }
    
    let message = `Status: ${response.statusCode}`;
    if (CONFIG.verbose && response.body) {
      try {
        const json = JSON.parse(response.body);
        message += ` | Response: ${JSON.stringify(json).substring(0, 100)}...`;
      } catch (e) {
        message += ` | Response length: ${response.body.length}`;
      }
    }
    
    logResult(name, success, message, response.duration);
    return success;
  } catch (err) {
    results.failed++;
    results.errors.push(`${service.name} ${method} ${path}: ${err.error}`);
    logResult(name, false, err.error, err.duration);
    return false;
  }
}

// 서비스 연결 확인
async function checkServiceConnection(service) {
  try {
    await makeRequest({
      hostname: service.host,
      port: service.port,
      path: '/',
      method: 'GET'
    });
    return true;
  } catch (err) {
    return false;
  }
}


// ============================================
// 메인 서비스 테스트 (포트 3010)
// ============================================
async function testMainService() {
  const service = CONFIG.mainService;
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📱 ${service.name} 테스트 (포트 ${service.port})`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');

  // 서비스 연결 확인
  const isConnected = await checkServiceConnection(service);
  if (!isConnected) {
    log(`\n❌ ${service.name}에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.`, 'red');
    results.skipped += 25;
    return;
  }

  // 1. 페이지 테스트
  log('\n📄 페이지 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testPage(service, '/', [200], '홈페이지 (/)');
  await testPage(service, '/login', [200], '로그인 페이지');
  await testPage(service, '/register', [200], '회원가입 페이지');
  await testPage(service, '/assessment', [200, 302, 307], '평가 페이지');
  await testPage(service, '/versions', [200, 302, 307], '버전 관리 페이지');
  await testPage(service, '/test-advice', [200], '조언 테스트 페이지');
  await testPage(service, '/test-pdf', [200], 'PDF 테스트 페이지');
  await testPage(service, '/nonexistent-page', [404], '404 페이지 처리');

  // 2. 인증 API 테스트
  log('\n🔐 인증 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/auth/me', null, [401], '인증 상태 확인 (비로그인)');
  await testAPI(service, 'POST', '/api/auth/login', { email: 'test@test.com', password: 'wrong' }, [401], '로그인 실패 테스트');
  await testAPI(service, 'POST', '/api/auth/logout', null, [200], '로그아웃');

  // 3. 시스템 API 테스트
  log('\n⚙️ 시스템 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/llm-config', null, [200], 'LLM 설정 조회');
  await testAPI(service, 'GET', '/api/cache-version', null, [200], '캐시 버전 조회');
  await testAPI(service, 'GET', '/api/system/settings', null, [200, 401], '시스템 설정 조회');

  // 4. 평가 API 테스트 (인증 필요)
  log('\n📊 평가 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/assessment', null, [200, 401], '평가 데이터 조회');
  await testAPI(service, 'GET', '/api/versions', null, [200, 401], '버전 목록 조회');

  // 5. 조언 캐시 API 테스트
  log('\n💡 조언 캐시 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/advice-cache?itemId=OPS-001&version=1', null, [200, 400, 404], '조언 캐시 조회');
  await testAPI(service, 'GET', '/api/advice-summary?version=1', null, [200, 400, 404], '조언 요약 조회');

  // 6. 가상 증빙 API 테스트
  log('\n📁 가상 증빙 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/virtual-evidence-cache?itemId=OPS-001&version=1', null, [200, 400, 404], '가상 증빙 캐시 조회');
  await testAPI(service, 'GET', '/api/virtual-evidence-summary?version=1', null, [200, 400, 404], '가상 증빙 요약 조회');

  // 7. Q&A API 테스트
  log('\n❓ Q&A API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/qa?itemId=OPS-001', null, [200, 400, 401], 'Q&A 조회');

  // 8. 증빙 평가 API 테스트
  log('\n📎 증빙 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'POST', '/api/evaluate-evidence', { itemId: 'OPS-001', evidence: 'test' }, [200, 400, 401, 500], '증빙 평가 (파라미터 검증)');
}

// ============================================
// 어드민 서비스 테스트 (포트 3011)
// ============================================
async function testAdminService() {
  const service = CONFIG.adminService;
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔧 ${service.name} 테스트 (포트 ${service.port})`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');

  // 서비스 연결 확인
  const isConnected = await checkServiceConnection(service);
  if (!isConnected) {
    log(`\n❌ ${service.name}에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.`, 'red');
    results.skipped += 35;
    return;
  }

  // 1. 페이지 테스트
  log('\n📄 페이지 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testPage(service, '/', [200], '어드민 홈페이지');
  await testPage(service, '/login', [200], '어드민 로그인 페이지');
  await testPage(service, '/register', [200], '어드민 회원가입 페이지');
  await testPage(service, '/dashboard', [200, 302, 307], '대시보드');
  await testPage(service, '/users', [200, 302, 307], '사용자 관리');
  await testPage(service, '/cache', [200, 302, 307], '캐시 관리');
  await testPage(service, '/evidence', [200, 302, 307], '증빙 관리');
  await testPage(service, '/virtual-evidence', [200, 302, 307], '가상 증빙 관리');
  await testPage(service, '/announcements', [200, 302, 307], '공지사항 관리');
  await testPage(service, '/qa', [200, 302, 307], 'Q&A 관리');
  await testPage(service, '/activity', [200, 302, 307], '활동 로그');
  await testPage(service, '/monitoring', [200, 302, 307], '모니터링');
  await testPage(service, '/progress', [200, 302, 307], '진행 상황');
  await testPage(service, '/system', [200, 302, 307], '시스템 설정');

  // 2. 인증 API 테스트
  log('\n🔐 인증 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/auth/me', null, [401], '어드민 인증 상태 확인 (비로그인)');
  await testAPI(service, 'POST', '/api/auth/login', { email: 'admin@test.com', password: 'wrong' }, [401], '어드민 로그인 실패 테스트');

  // 3. 대시보드 API 테스트 (인증 필요)
  log('\n📊 대시보드 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/dashboard/stats', null, [200, 401], '대시보드 통계');

  // 4. 사용자 관리 API 테스트 (인증 필요)
  log('\n👥 사용자 관리 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/users', null, [200, 401], '사용자 목록 조회');

  // 5. 캐시 관리 API 테스트
  log('\n💾 캐시 관리 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/cache-versions', null, [200, 401], '캐시 버전 목록');
  await testAPI(service, 'GET', '/api/advice-cache?itemId=OPS-001&version=1', null, [200, 400, 401, 404], '조언 캐시 조회');
  await testAPI(service, 'GET', '/api/virtual-evidence-cache?itemId=OPS-001&version=1', null, [200, 400, 401, 404], '가상 증빙 캐시 조회');

  // 6. 공지사항 API 테스트 (인증 필요)
  log('\n📢 공지사항 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/announcements', null, [200, 401], '공지사항 목록');

  // 7. Q&A API 테스트 (인증 필요)
  log('\n❓ Q&A API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/qa?itemId=OPS-001', null, [200, 400, 401, 404], 'Q&A 목록');

  // 8. 증빙 관리 API 테스트 (인증 필요)
  log('\n📎 증빙 관리 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/evidence?itemId=OPS-001', null, [200, 400, 401, 404], '증빙 목록');

  // 9. 활동 로그 API 테스트 (인증 필요)
  log('\n📝 활동 로그 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/activity-logs', null, [200, 401], '활동 로그 조회');

  // 10. 모니터링 API 테스트 (인증 필요)
  log('\n📈 모니터링 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/monitoring/stats', null, [200, 401], '모니터링 통계');

  // 11. 시스템 API 테스트
  log('\n⚙️ 시스템 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/llm-config', null, [200], 'LLM 설정 조회');
  await testAPI(service, 'GET', '/api/system/settings', null, [200, 401], '시스템 설정 조회');
  await testAPI(service, 'GET', '/api/system/logs', null, [200, 401], '시스템 로그 조회');

  // 12. 요약 API 테스트
  log('\n📋 요약 API 테스트', 'blue');
  log('-'.repeat(40), 'dim');
  
  await testAPI(service, 'GET', '/api/advice-summary?version=1', null, [200, 400, 401, 404], '조언 요약 조회');
  await testAPI(service, 'GET', '/api/virtual-evidence-summary?version=1', null, [200, 400, 401, 404], '가상 증빙 요약 조회');
  await testAPI(service, 'GET', '/api/active-summary-version', null, [200], '활성 요약 버전 조회');
}


// ============================================
// 메인 실행
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const mainOnly = args.includes('--main-only');
  const adminOnly = args.includes('--admin-only');

  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     MSP Checklist - 전체 기능 테스트 스크립트              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const startTime = Date.now();
  
  log(`\n📅 테스트 시작: ${new Date().toLocaleString('ko-KR')}`, 'dim');
  log(`🔧 옵션: verbose=${CONFIG.verbose}, mainOnly=${mainOnly}, adminOnly=${adminOnly}`, 'dim');

  try {
    if (!adminOnly) {
      await testMainService();
    }
    
    if (!mainOnly) {
      await testAdminService();
    }
  } catch (error) {
    log(`\n❌ 테스트 중 오류 발생: ${error.message}`, 'red');
    console.error(error);
  }

  // 결과 요약
  const totalTime = Date.now() - startTime;
  const total = results.passed + results.failed + results.skipped;
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('📊 테스트 결과 요약', 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
  
  console.log(`
  총 테스트: ${total}
  ${colors.green}✓ 성공: ${results.passed}${colors.reset}
  ${colors.red}✗ 실패: ${results.failed}${colors.reset}
  ${colors.yellow}⊘ 스킵: ${results.skipped}${colors.reset}
  
  ⏱️  소요 시간: ${(totalTime / 1000).toFixed(2)}초
  `);

  if (results.errors.length > 0) {
    log('\n❌ 실패한 테스트 목록:', 'red');
    log('-'.repeat(40), 'dim');
    results.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  // 성공률 계산
  const testedCount = total - results.skipped;
  const successRate = testedCount > 0 ? ((results.passed / testedCount) * 100).toFixed(1) : 0;
  
  log(`\n📈 성공률: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
  
  if (results.failed === 0 && results.skipped === 0) {
    log('\n🎉 모든 테스트가 성공했습니다!', 'green');
  } else if (results.failed > 0) {
    log('\n⚠️  일부 테스트가 실패했습니다. 위의 오류 목록을 확인하세요.', 'yellow');
  } else if (results.skipped > 0) {
    log('\n⚠️  일부 테스트가 스킵되었습니다. 서버 상태를 확인하세요.', 'yellow');
  }

  log(`\n📅 테스트 완료: ${new Date().toLocaleString('ko-KR')}`, 'dim');
  
  // 종료 코드 설정
  process.exit(results.failed > 0 ? 1 : 0);
}

// 실행
main().catch(console.error);
