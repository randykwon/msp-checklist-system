'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface AssessmentItem {
  id: string;
  category: string;
  title: string;
  description: string;
  isMandatory: boolean;
  met: boolean | null;
  partnerResponse?: string;
  lastUpdated?: string;
}

interface UserProgress {
  userId: number;
  userName: string;
  email: string;
  organization?: string;
  status: string;
  prerequisites: { total: number; completed: number; percentage: number; items?: AssessmentItem[] };
  technical: { total: number; completed: number; percentage: number; items?: AssessmentItem[] };
  overall: { total: number; completed: number; percentage: number };
  lastActivity?: string;
  inProgressItems?: AssessmentItem[];
  completedItems?: AssessmentItem[];
  pendingMandatoryItems?: AssessmentItem[];
}

interface ProgressSummary {
  totalUsers: number;
  activeUsers: number;
  completedUsers: number;
  averageProgress: number;
  userProgress: UserProgress[];
}

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [progressData, setProgressData] = useState<ProgressSummary | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'prerequisites' | 'technical'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProgress | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) fetchProgressData();
  }, [user, loading, router]);

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/dashboard/assessment-progress');
      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getProgressGradient = (percentage: number) => {
    if (percentage >= 80) return 'linear-gradient(135deg, #42B883 0%, #35495E 100%)';
    if (percentage >= 60) return 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)';
    if (percentage >= 40) return 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)';
    return 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)';
  };

  const handleViewDetail = (userItem: UserProgress) => {
    setSelectedUser(userItem);
    setShowDetailModal(true);
  };

  if (!isHydrated || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #E4E6EB', borderTopColor: '#1877F2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#65676B', fontSize: 16 }}>로딩 중...</p>
        </div>
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const userList = progressData?.userProgress || [];
  const stats = {
    total: userList.length,
    completed80: userList.filter(u => u.overall.percentage >= 80).length,
    inProgress: userList.filter(u => u.overall.percentage > 0 && u.overall.percentage < 80).length,
    notStarted: userList.filter(u => u.overall.percentage === 0).length
  };


  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 헤더 카드 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📈 진행 현황</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>사용자별 평가 진행 상황을 확인합니다</p>
              </div>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)}
                style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#14B8A6', background: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                <option value="all">전체</option>
                <option value="prerequisites">사전 요구사항</option>
                <option value="technical">기술 평가</option>
              </select>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { title: '👥 참여 사용자', value: stats.total, gradient: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: '#1877F2' },
            { title: '✅ 완료율 80%+', value: stats.completed80, gradient: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: '#42B883' },
            { title: '⏳ 진행 중', value: stats.inProgress, gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: '#F59E0B' },
            { title: '🚫 미시작', value: stats.notStarted, gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', color: '#EF4444' }
          ].map((stat, idx) => (
            <div key={idx} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '12px 16px', background: stat.gradient, color: 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{stat.title}</div>
              </div>
              <div style={{ padding: 16, background: 'white' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 사용자별 진행 현황 테이블 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📋 사용자별 진행 현황</h3>
          </div>
          <div style={{ background: 'white' }}>
            {loadingProgress ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E4E6EB', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#65676B' }}>진행 현황을 불러오는 중...</p>
              </div>
            ) : userList.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#65676B' }}>진행 현황 데이터가 없습니다.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F0F2F5' }}>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>사용자</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>평가 유형</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>진행률</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>완료/전체</th>
                      <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>최근 업데이트</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#65676B' }}>상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((item, index) => {
                      const progress = selectedType === 'prerequisites' ? item.prerequisites : selectedType === 'technical' ? item.technical : item.overall;
                      return (
                        <tr key={`${item.userId}-${index}`} style={{ borderBottom: '1px solid #E4E6EB' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #1877F2 0%, #8B5CF6 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                                {item.userName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#1C1E21', fontSize: 14 }}>{item.userName}</div>
                                <div style={{ fontSize: 12, color: '#65676B' }}>{item.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: selectedType === 'prerequisites' ? '#E7F3FF' : selectedType === 'technical' ? '#EDE9FE' : '#F0F2F5', color: selectedType === 'prerequisites' ? '#1877F2' : selectedType === 'technical' ? '#8B5CF6' : '#65676B' }}>
                              {selectedType === 'prerequisites' ? '사전 요구사항' : selectedType === 'technical' ? '기술 평가' : '전체'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 100, height: 8, background: '#E4E6EB', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${progress.percentage}%`, height: '100%', background: getProgressGradient(progress.percentage), borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: progress.percentage >= 80 ? '#42B883' : progress.percentage >= 60 ? '#F59E0B' : progress.percentage >= 40 ? '#F97316' : '#EF4444' }}>{progress.percentage}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 14, color: '#1C1E21' }}>{progress.completed} / {progress.total}</td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: '#65676B' }}>{formatDate(item.lastActivity || '')}</td>
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <button onClick={() => handleViewDetail(item)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                              🔍 상세
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 상세보기 모달 */}
      {showDetailModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            {/* 모달 헤더 */}
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
                  {selectedUser.userName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedUser.userName}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.9 }}>{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            
            {/* 모달 바디 */}
            <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: 24 }}>
              {/* 진행률 요약 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { title: '전체 진행률', data: selectedUser.overall, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                  { title: '사전 요구사항', data: selectedUser.prerequisites, gradient: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' },
                  { title: '기술 평가', data: selectedUser.technical, gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' }
                ].map((item, idx) => (
                  <div key={idx} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '12px 16px', background: item.gradient, color: 'white' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                    </div>
                    <div style={{ padding: 16, background: '#F9FAFB' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#1C1E21' }}>{item.data.percentage}%</div>
                      <div style={{ fontSize: 12, color: '#65676B', marginTop: 4 }}>{item.data.completed} / {item.data.total} 완료</div>
                      <div style={{ width: '100%', height: 6, background: '#E4E6EB', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${item.data.percentage}%`, height: '100%', background: item.gradient, borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 미완료 필수 항목 */}
              {selectedUser.pendingMandatoryItems && selectedUser.pendingMandatoryItems.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🚨 미완료 필수 항목 ({selectedUser.pendingMandatoryItems.length}개)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedUser.pendingMandatoryItems.slice(0, 5).map((item, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#B91C1C' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{item.category}</div>
                      </div>
                    ))}
                    {selectedUser.pendingMandatoryItems.length > 5 && (
                      <div style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: 8 }}>
                        외 {selectedUser.pendingMandatoryItems.length - 5}개 항목...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 진행 중 항목 */}
              {selectedUser.inProgressItems && selectedUser.inProgressItems.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ⏳ 진행 중 항목 ({selectedUser.inProgressItems.length}개)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedUser.inProgressItems.slice(0, 5).map((item, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#B45309' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>{item.category}</div>
                      </div>
                    ))}
                    {selectedUser.inProgressItems.length > 5 && (
                      <div style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: 8 }}>
                        외 {selectedUser.inProgressItems.length - 5}개 항목...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 완료된 항목 */}
              {selectedUser.completedItems && selectedUser.completedItems.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#42B883', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✅ 완료된 항목 ({selectedUser.completedItems.length}개)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedUser.completedItems.slice(0, 5).map((item, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#047857' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>{item.category}</div>
                      </div>
                    ))}
                    {selectedUser.completedItems.length > 5 && (
                      <div style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: 8 }}>
                        외 {selectedUser.completedItems.length - 5}개 항목...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 데이터 없음 */}
              {(!selectedUser.pendingMandatoryItems || selectedUser.pendingMandatoryItems.length === 0) &&
               (!selectedUser.inProgressItems || selectedUser.inProgressItems.length === 0) &&
               (!selectedUser.completedItems || selectedUser.completedItems.length === 0) && (
                <div style={{ padding: 48, textAlign: 'center', color: '#65676B' }}>
                  평가 항목 데이터가 없습니다.
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{ padding: '16px 24px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB' }}>
              <button onClick={() => setShowDetailModal(false)} style={{ width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
