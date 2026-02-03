'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  completedAssessments: number;
  averageProgress: number;
  systemUptime: number;
}

export default function AdminHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchStats();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (isHydrated && stats) {
      setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
    }
  }, [isHydrated, stats]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  if (!isHydrated || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F0F2F5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid #E4E6EB',
            borderTopColor: '#1877F2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#65676B', fontSize: 16 }}>로딩 중...</p>
        </div>
        <style jsx global>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  // 통계 카드 색상
  const statCards = [
    { 
      title: '총 사용자', 
      value: stats?.totalUsers || 0, 
      icon: '👥', 
      desc: '등록된 전체 사용자',
      gradient: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)'
    },
    { 
      title: '활동중인 사용자', 
      value: stats?.activeUsers || 0, 
      icon: '✅', 
      desc: '최근 30일 활동',
      gradient: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)'
    },
    { 
      title: '완료된 평가', 
      value: stats?.completedAssessments || 0, 
      icon: '📋', 
      desc: '총 평가 항목',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
    },
    { 
      title: '평균 진행률', 
      value: `${stats?.averageProgress || 0}%`, 
      icon: '📈', 
      desc: '전체 사용자 평균',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
    }
  ];

  // 빠른 작업 메뉴
  const quickActions = [
    { title: '사용자 관리', desc: '사용자 권한 및 정보 관리', href: '/users', icon: '👥', gradient: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' },
    { title: '진행 현황', desc: '사용자별 평가 진행 상황', href: '/progress', icon: '📊', gradient: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' },
    { title: '공지사항 관리', desc: '공지사항 작성 및 관리', href: '/announcements', icon: '📢', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
    { title: '질의응답 관리', desc: 'Q&A 답변 및 관리', href: '/qa', icon: '💬', gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' },
    { title: '조언 캐시 관리', desc: 'AI 조언 캐시 관리', href: '/cache', icon: '💾', gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)' },
    { title: '시스템 관리', desc: '시스템 설정 및 유지보수', href: '/system', icon: '⚙️', gradient: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)' }
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
            padding: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🏠 관리자 대시보드</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 15 }}>MSP 어드바이저 시스템 현황을 한눈에 확인하세요</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={fetchStats}
                  disabled={loadingStats}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loadingStats ? 'not-allowed' : 'pointer',
                    opacity: loadingStats ? 0.7 : 1
                  }}
                >
                  🔄 {loadingStats ? '새로고침 중...' : '새로고침'}
                </button>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(255,255,255,0.15)',
                  padding: '8px 16px',
                  borderRadius: 12
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700
                  }}>
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{user.role}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 실시간 상태 */}
            <div style={{ 
              marginTop: 16, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 24,
              fontSize: 13,
              opacity: 0.9
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, background: '#4ADE80', borderRadius: '50%' }} />
                시스템 정상 운영
              </div>
              {lastUpdate && (
                <div>🕐 마지막 업데이트: {lastUpdate}</div>
              )}
            </div>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {statCards.map((card, index) => (
            <div key={index} style={{
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                padding: '16px 20px',
                background: card.gradient,
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{card.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{card.title}</span>
                </div>
              </div>
              <div style={{ padding: '20px', background: 'white' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1C1E21' }}>
                  {loadingStats ? (
                    <div style={{ width: 60, height: 32, background: '#E4E6EB', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
                  ) : card.value}
                </div>
                <div style={{ fontSize: 13, color: '#65676B', marginTop: 4 }}>{card.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 시스템 상태 & 빠른 작업 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* 시스템 상태 */}
          <div style={{
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🖥️ 시스템 상태</h3>
            </div>
            <div style={{ padding: 20, background: 'white' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: '서버 상태', value: '정상 운영', badge: true },
                  { label: '포트', value: '3011' },
                  { label: 'Next.js 버전', value: '14.2.18' },
                  { label: '시스템 가동시간', value: loadingStats ? '...' : formatUptime(stats?.systemUptime || 0) }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#F0F2F5',
                    borderRadius: 10
                  }}>
                    <span style={{ fontSize: 14, color: '#65676B' }}>{item.label}</span>
                    {item.badge ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 12px',
                        background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                        borderRadius: 20,
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        <div style={{ width: 6, height: 6, background: 'white', borderRadius: '50%' }} />
                        {item.value}
                      </span>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 빠른 작업 */}
          <div style={{
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>⚡ 빠른 작업</h3>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {quickActions.map((action, idx) => (
                  <a
                    key={idx}
                    href={action.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      background: '#F0F2F5',
                      borderRadius: 12,
                      textDecoration: 'none',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E4E6EB';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F0F2F5';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      background: action.gradient,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0
                    }}>
                      {action.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>{action.title}</div>
                      <div style={{ fontSize: 11, color: '#65676B' }}>{action.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </AdminLayout>
  );
}
