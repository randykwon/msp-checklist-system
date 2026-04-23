'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#333' }}>500</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>오류가 발생했습니다</h2>
      <p style={{ color: '#888', marginBottom: '2rem' }}>잠시 후 다시 시도해주세요.</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          다시 시도
        </button>
        <a 
          href="/"
          style={{
            padding: '12px 24px',
            backgroundColor: '#666',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none'
          }}
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}
