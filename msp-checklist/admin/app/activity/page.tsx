'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface ActivityLog {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  actionType: string;
  actionCategory: string;
  itemId: string | null;
  assessmentType: string | null;
  details: string | null;
  sessionId: string | null;
  createdAt: string;
}

interface ActivityStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueIPs: number;
  actionTypeCounts: Record<string, number>;
  actionCategoryCounts: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  dailyDistribution: Record<string, number>;
}

interface UserActivitySummary {
  userId: number;
  userEmail: string;
  userName: string;
  totalActions: number;
  lastActivity: string;
  ipAddresses: string[];
  actionTypes: Record<string, number>;
}

interface IPActivitySummary {
  ipAddress: string;
  totalActions: number;
  uniqueUsers: number;
  lastActivity: string;
  userNames: string[];
  actionTypes: Record<string, number>;
}

type ViewType = 'logs' | 'stats' | 'users' | 'ips';

export default function ActivityMonitoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('stats');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [userSummaries, setUserSummaries] = useState<UserActivitySummary[]>([]);
  const [ipSummaries, setIPSummaries] = useState<IPActivitySummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 필터
  const [filters, setFilters] = useState({
    userId: '',
    ipAddress: '',
    actionType: '',
    actionCategory: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    if (user && !['admin', 'superadmin'].includes(user.role)) {
      router.push('/');
      return;
    }

    if (user) {
      fetchData(activeView);
    }
  }, [user, loading, router, activeView]);

  const fetchData = async (view: ViewType) => {
    setLoadingData(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ view });
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.actionCategory) params.append('actionCategory', filters.actionCategory);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '200');
      
      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity data');
      }
      
      const result = await response.json();
      
      switch (view) {
        case 'logs':
          setLogs(result.data || []);
          break;
        case 'stats':
          setStats(result.data || null);
          break;
        case 'users':
          setUserSummaries(result.data || []);
          break;
        case 'ips':
          setIPSummaries(result.data || []);
          break;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchData(activeView);
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      ipAddress: '',
      actionType: '',
      actionCategory: '',
      startDate: '',
      endDate: '',
    });
    setTimeout(() => fetchData(activeView), 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      login: '로그인',
      logout: '로그아웃',
      register: '회원가입',
      view_assessment: '평가 조회',
      update_assessment: '평가 업데이트',
      view_advice: '조언 조회',
      generate_advice: '조언 생성',
      view_virtual_evidence: '가상증빙 조회',
      generate_virtual_evidence: '가상증빙 생성',
      create_question: '질문 작성',
      answer_question: '답변 작성',
      admin_view_users: '사용자 목록 조회',
      admin_update_user: '사용자 수정',
      admin_delete_user: '사용자 삭제',
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      auth: '인증',
      assessment: '평가',
      advice: '조언',
      virtual_evidence: '가상증빙',
      qa: 'Q&A',
      profile: '프로필',
      admin: '관리자',
      system: '시스템',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      auth: '#1877F2',
      assessment: '#42B883',
      advice: '#8B5CF6',
      virtual_evidence: '#F59E0B',
      qa: '#EC4899',
      admin: '#EF4444',
      system: '#6B7280',
    };
    return colors[category] || '#6B7280';
  };

  if (!isHydrated || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #E4E6EB', borderTopColor: '#1877F2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#65676B', fontSize: 16 }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 헤더 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '24px', background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📊 활동 모니터링</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 15 }}>사용자 및 IP별 활동 현황을 모니터링합니다</p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { key: 'stats', label: '📈 통계', icon: '📈' },
            { key: 'logs', label: '📋 로그', icon: '📋' },
            { key: 'users', label: '👥 사용자별', icon: '👥' },
            { key: 'ips', label: '🌐 IP별', icon: '🌐' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as ViewType)}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                background: activeView === tab.key ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : '#F0F2F5',
                color: activeView === tab.key ? 'white' : '#65676B',
                boxShadow: activeView === tab.key ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 필터 */}
        <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>🔍 필터</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <input
              type="text"
              placeholder="사용자 ID"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E6EB', fontSize: 14 }}
            />
            <input
              type="text"
              placeholder="IP 주소"
              value={filters.ipAddress}
              onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E6EB', fontSize: 14 }}
            />
            <select
              value={filters.actionCategory}
              onChange={(e) => handleFilterChange('actionCategory', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E6EB', fontSize: 14 }}
            >
              <option value="">모든 카테고리</option>
              <option value="auth">인증</option>
              <option value="assessment">평가</option>
              <option value="advice">조언</option>
              <option value="virtual_evidence">가상증빙</option>
              <option value="qa">Q&A</option>
              <option value="admin">관리자</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E6EB', fontSize: 14 }}
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E4E6EB', fontSize: 14 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={applyFilters}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1877F2', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                적용
              </button>
              <button
                onClick={clearFilters}
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E4E6EB', background: 'white', color: '#65676B', fontWeight: 600, cursor: 'pointer' }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 16, borderRadius: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* 로딩 */}
        {loadingData && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #E4E6EB', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#65676B' }}>데이터 로딩 중...</p>
          </div>
        )}

        {/* 통계 뷰 */}
        {!loadingData && activeView === 'stats' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 요약 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: '총 로그', value: stats.totalLogs, color: '#6366F1', icon: '📊' },
                { label: '고유 사용자', value: stats.uniqueUsers, color: '#42B883', icon: '👥' },
                { label: '고유 IP', value: stats.uniqueIPs, color: '#F59E0B', icon: '🌐' },
              ].map((item, idx) => (
                <div key={idx} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '16px 20px', background: item.color, color: 'white' }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 32, fontWeight: 700 }}>{item.value.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 카테고리별 분포 */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>📂 카테고리별 활동</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {Object.entries(stats.actionCategoryCounts).map(([category, count]) => (
                  <div key={category} style={{
                    padding: '12px 20px',
                    borderRadius: 10,
                    background: `${getCategoryColor(category)}15`,
                    border: `1px solid ${getCategoryColor(category)}30`,
                  }}>
                    <div style={{ fontSize: 12, color: '#65676B' }}>{getCategoryLabel(category)}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: getCategoryColor(category) }}>{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 일별 분포 */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>📅 일별 활동 (최근 30일)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(stats.dailyDistribution).slice(0, 14).map(([date, count]) => {
                  const maxCount = Math.max(...Object.values(stats.dailyDistribution));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 100, fontSize: 13, color: '#65676B' }}>{date}</div>
                      <div style={{ flex: 1, height: 24, background: '#F0F2F5', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 시간별 분포 */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>🕐 시간별 활동</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  const count = stats.hourlyDistribution[hour] || 0;
                  const maxCount = Math.max(...Object.values(stats.hourlyDistribution), 1);
                  const height = (count / maxCount) * 100;
                  return (
                    <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%',
                        height: `${height}%`,
                        minHeight: count > 0 ? 4 : 0,
                        background: 'linear-gradient(180deg, #6366F1, #8B5CF6)',
                        borderRadius: '4px 4px 0 0',
                      }} />
                      <div style={{ fontSize: 10, color: '#65676B', marginTop: 4 }}>{hour}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 로그 뷰 */}
        {!loadingData && activeView === 'logs' && (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E6EB' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>📋 활동 로그 ({logs.length}건)</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8F9FA' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>시간</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>사용자</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>IP</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>카테고리</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>액션</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>항목</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #E4E6EB' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{log.userName || '-'}</div>
                        <div style={{ fontSize: 12, color: '#65676B' }}>{log.userEmail || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{log.ipAddress || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          background: `${getCategoryColor(log.actionCategory)}15`,
                          color: getCategoryColor(log.actionCategory),
                        }}>
                          {getCategoryLabel(log.actionCategory)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{getActionTypeLabel(log.actionType)}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{log.itemId || '-'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#65676B' }}>
                        로그가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 사용자별 뷰 */}
        {!loadingData && activeView === 'users' && (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E6EB' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>👥 사용자별 활동 ({userSummaries.length}명)</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {userSummaries.map(summary => (
                <div key={summary.userId} style={{ padding: 20, borderBottom: '1px solid #E4E6EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{summary.userName || '(이름 없음)'}</div>
                      <div style={{ fontSize: 13, color: '#65676B' }}>{summary.userEmail}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#6366F1' }}>{summary.totalActions}</div>
                      <div style={{ fontSize: 12, color: '#65676B' }}>총 활동</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {Object.entries(summary.actionTypes).slice(0, 5).map(([type, count]) => (
                      <span key={type} style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        background: '#F0F2F5',
                        color: '#65676B',
                      }}>
                        {getActionTypeLabel(type)}: {count}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#65676B' }}>
                    <span>마지막 활동: {formatDate(summary.lastActivity)}</span>
                    {summary.ipAddresses.length > 0 && (
                      <span style={{ marginLeft: 16 }}>IP: {summary.ipAddresses.slice(0, 3).join(', ')}{summary.ipAddresses.length > 3 ? '...' : ''}</span>
                    )}
                  </div>
                </div>
              ))}
              {userSummaries.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#65676B' }}>
                  사용자 활동 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        )}

        {/* IP별 뷰 */}
        {!loadingData && activeView === 'ips' && (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E6EB' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🌐 IP별 활동 ({ipSummaries.length}개)</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ipSummaries.map(summary => (
                <div key={summary.ipAddress} style={{ padding: 20, borderBottom: '1px solid #E4E6EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'monospace' }}>{summary.ipAddress}</div>
                      <div style={{ fontSize: 13, color: '#65676B' }}>사용자 {summary.uniqueUsers}명</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{summary.totalActions}</div>
                      <div style={{ fontSize: 12, color: '#65676B' }}>총 활동</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {Object.entries(summary.actionTypes).slice(0, 5).map(([type, count]) => (
                      <span key={type} style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        background: '#F0F2F5',
                        color: '#65676B',
                      }}>
                        {getActionTypeLabel(type)}: {count}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#65676B' }}>
                    <span>마지막 활동: {formatDate(summary.lastActivity)}</span>
                    {summary.userNames.length > 0 && (
                      <span style={{ marginLeft: 16 }}>사용자: {summary.userNames.slice(0, 3).join(', ')}{summary.userNames.length > 3 ? '...' : ''}</span>
                    )}
                  </div>
                </div>
              ))}
              {ipSummaries.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#65676B' }}>
                  IP 활동 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  );
}
