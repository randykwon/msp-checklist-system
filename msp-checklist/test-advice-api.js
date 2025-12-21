// AI 조언 API 테스트 스크립트
const testAdviceAPI = async () => {
  const testData = {
    itemId: 'BUSP-001',
    title: 'Web Presence',
    description: 'AWS Partner has a public landing page on their primary website that describes their AWS managed services practice and links to their public case studies.',
    evidenceRequired: 'Evidence must be in the form of a public URL for their AWS MSP practice landing page.',
    language: 'ko'
  };

  try {
    console.log('🧪 AI 조언 API 테스트 시작...');
    console.log('📝 테스트 데이터:', testData);
    
    const response = await fetch('http://localhost:3000/api/advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📡 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API 오류:', errorData);
      return;
    }

    const data = await response.json();
    console.log('✅ API 응답 성공!');
    console.log('💡 생성된 조언:');
    console.log('─'.repeat(80));
    console.log(data.advice);
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
};

// Node.js 환경에서 fetch 사용을 위한 polyfill
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testAdviceAPI();