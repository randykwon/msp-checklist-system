// 관리자 로그인 테스트
const testAdminLogin = async () => {
  try {
    console.log('🔐 관리자 로그인 테스트...');
    
    const response = await fetch('http://localhost:3011/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@msp.com',
        password: 'admin123!'
      }),
    });

    console.log('응답 상태:', response.status);
    const result = await response.json();
    console.log('응답 내용:', result);

    if (response.ok) {
      console.log('✅ 로그인 성공!');
    } else {
      console.log('❌ 로그인 실패');
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
};

// Node.js 환경에서 fetch 사용을 위한 polyfill
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testAdminLogin();