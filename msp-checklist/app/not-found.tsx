'use client';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#333' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>페이지를 찾을 수 없습니다</h2>
      <p style={{ color: '#888', marginBottom: '2rem' }}>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <a 
        href="/"
        style={{
          padding: '12px 24px',
          backgroundColor: '#0070f3',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none'
        }}
      >
        홈으로 돌아가기
      </a>
    </div>
  );
}
