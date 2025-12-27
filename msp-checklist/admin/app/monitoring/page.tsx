'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';

interface SystemStats {
  userActivity: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    questionsAsked: number;
    questionsAnswered: number;
    created_at: string;
  }>;
  cacheStats: {
    adviceCache: number;
    virtualEvidenceCache: number;
  };
  systemInfo: {
    totalQuestions: number;
    totalUsers: number;
    adminUsers: number;
  };
}

export default function MonitoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/monitoring/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch monitoring stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const clearCache = async (cacheType: 'advice' | 'virtual-evidence') => {
    if (!confirm(`정말로 ${cacheType === 'advice' ? '조언' : '가상증빙'} 캐시를 모두 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/monitoring/cache/${cacheType}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStats();
        alert('캐시가 성공적으로 삭제되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '캐시 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('캐시 삭제 중 오류가 발생했습니다.');
    }
  };

  if (!isHydrated || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F2F5' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 카드 색상 스킴
  const cardColors = [
    { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', accent: '#1877F2' },
    { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', accent: '#42B883' },
    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', accent: '#F59E0B' },
    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', accent: '#8B5CF6' },
    { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', accent: '#EC4899' },
    { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', accent: '#14B8A6' },
    { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', accent: '#EF4444' },
    { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', accent: '#6366F1' },
  ];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 헤더 카드 */}
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📊 시스템 모니터링</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>시스템 상태 및 사용자 활동을 모니터링합니다</p>
              </div>
              <button
                onClick={fetchStats}
                style={{
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#8B5CF6',
                  background: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>

        {statsLoading ? (
          <div style={{ padding: 48, textAlign: 'center', background: 'white', borderRadius: 16 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p style={{ color: '#65676B' }}>모니터링 데이터 로딩 중...</p>
          </div>
        ) : stats ? (
          <>
            {/* 시스템 개요 통계 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {/* 전체 사용자 */}
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: cardColors[0].bg, color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>👥 전체 사용자</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: cardColors[0].accent }}>{stats.systemInfo.totalUsers}명</div>
                </div>
              </div>
              {/* 관리자 */}
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: cardColors[3].bg, color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🛡️ 관리자</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: cardColors[3].accent }}>{stats.systemInfo.adminUsers}명</div>
                </div>
              </div>
              {/* 전체 질문 */}
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: cardColors[1].bg, color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>💬 전체 질문</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: cardColors[1].accent }}>{stats.systemInfo.totalQuestions}개</div>
                </div>
              </div>
            </div>

            {/* 캐시 관리 */}
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                color: 'white'
              }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>💾 캐시 관리</h3>
              </div>
              <div style={{ padding: 24, background: 'white' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {/* 조언 캐시 */}
                  <div style={{
                    padding: 20,
                    borderRadius: 12,
                    border: '2px solid #F59E0B',
                    background: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>💡 조언 캐시</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>{stats.cacheStats.adviceCache}개</div>
                    </div>
                    <button
                      onClick={() => clearCache('advice')}
                      style={{
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'white',
                        background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                  {/* 가상증빙 캐시 */}
                  <div style={{
                    padding: 20,
                    borderRadius: 12,
                    border: '2px solid #8B5CF6',
                    background: '#EDE9FE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#5B21B6' }}>📄 가상증빙 캐시</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6', marginTop: 4 }}>{stats.cacheStats.virtualEvidenceCache}개</div>
                    </div>
                    <button
                      onClick={() => clearCache('virtual-evidence')}
                      style={{
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'white',
                        background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자 활동 */}
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <div style={{
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                color: 'white'
              }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>👤 사용자 활동</h3>
              </div>
              <div style={{ padding: 24, background: 'white' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {stats.userActivity.slice(0, 10).map((userActivity, index) => {
                    const colorScheme = cardColors[index % cardColors.length];
                    return (
                      <div key={userActivity.id} style={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #E4E6EB'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          background: colorScheme.bg,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 700
                          }}>
                            {userActivity.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{userActivity.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.9 }}>{userActivity.email}</div>
                          </div>
                        </div>
                        <div style={{ padding: 16, background: 'white' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: userActivity.role === 'admin' 
                                ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
                                : 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                              color: 'white'
                            }}>
                              {userActivity.role === 'admin' ? '🛡️ 관리자' : '👤 사용자'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#65676B' }}>
                            <span>❓ 질문: <strong style={{ color: '#1877F2' }}>{userActivity.questionsAsked}개</strong></span>
                            <span>✅ 답변: <strong style={{ color: '#42B883' }}>{userActivity.questionsAnswered}개</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 48, textAlign: 'center', background: 'white', borderRadius: 16 }}>
            <p style={{ color: '#65676B' }}>모니터링 데이터를 불러올 수 없습니다.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}