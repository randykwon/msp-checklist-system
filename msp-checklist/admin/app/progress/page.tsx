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
  evidenceFiles?: EvidenceFile[];
  evaluation?: EvaluationData;
}

interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  base64Data: string;
  uploadedAt: string;
  extractedText?: string;
}

interface EvaluationData {
  score: number;
  feedback: string;
  evaluatedAt: string;
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
  const [viewingFile, setViewingFile] = useState<EvidenceFile | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
    setExpandedItems(new Set());
  };

  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
                    {selectedUser.pendingMandatoryItems.slice(0, 10).map((item, idx) => (
                      <div key={idx} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, overflow: 'hidden' }}>
                        <div 
                          onClick={() => toggleItemExpand(`pending-${item.id}`)}
                          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#B91C1C' }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{item.category}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.evidenceFiles && item.evidenceFiles.length > 0 && (
                              <span style={{ padding: '2px 8px', background: '#FCA5A5', color: '#7F1D1D', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                📎 {item.evidenceFiles.length}
                              </span>
                            )}
                            <span style={{ fontSize: 18, color: '#DC2626' }}>{expandedItems.has(`pending-${item.id}`) ? '▼' : '▶'}</span>
                          </div>
                        </div>
                        {expandedItems.has(`pending-${item.id}`) && (
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #FECACA' }}>
                            {item.partnerResponse && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>파트너 응답:</div>
                                <div style={{ fontSize: 13, color: '#7F1D1D', background: '#FEE2E2', padding: 8, borderRadius: 6 }}>{item.partnerResponse}</div>
                              </div>
                            )}
                            {item.evidenceFiles && item.evidenceFiles.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 8 }}>📎 증빙 파일 ({item.evidenceFiles.length}개):</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                                  {item.evidenceFiles.map((file) => (
                                    <div 
                                      key={file.id} 
                                      onClick={() => setViewingFile(file)}
                                      style={{ 
                                        padding: 8, background: 'white', borderRadius: 8, cursor: 'pointer',
                                        border: '1px solid #FECACA', textAlign: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {file.fileType === 'image' ? (
                                        <img src={file.base64Data} alt={file.fileName} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} />
                                      ) : (
                                        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', borderRadius: 4 }}>
                                          <span style={{ fontSize: 24 }}>📄</span>
                                        </div>
                                      )}
                                      <div style={{ fontSize: 10, color: '#7F1D1D', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</div>
                                      <div style={{ fontSize: 9, color: '#991B1B' }}>{formatFileSize(file.fileSize)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(!item.evidenceFiles || item.evidenceFiles.length === 0) && !item.partnerResponse && (
                              <div style={{ marginTop: 12, fontSize: 13, color: '#991B1B', fontStyle: 'italic' }}>증빙 자료가 없습니다.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedUser.pendingMandatoryItems.length > 10 && (
                      <div style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: 8 }}>
                        외 {selectedUser.pendingMandatoryItems.length - 10}개 항목...
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
                    {selectedUser.inProgressItems.slice(0, 10).map((item, idx) => (
                      <div key={idx} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, overflow: 'hidden' }}>
                        <div 
                          onClick={() => toggleItemExpand(`progress-${item.id}`)}
                          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#B45309' }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>{item.category}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.evidenceFiles && item.evidenceFiles.length > 0 && (
                              <span style={{ padding: '2px 8px', background: '#FCD34D', color: '#78350F', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                📎 {item.evidenceFiles.length}
                              </span>
                            )}
                            {item.evaluation && (
                              <span style={{ padding: '2px 8px', background: '#FDE68A', color: '#78350F', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                점수: {item.evaluation.score}
                              </span>
                            )}
                            <span style={{ fontSize: 18, color: '#D97706' }}>{expandedItems.has(`progress-${item.id}`) ? '▼' : '▶'}</span>
                          </div>
                        </div>
                        {expandedItems.has(`progress-${item.id}`) && (
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #FDE68A' }}>
                            {item.partnerResponse && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>파트너 응답:</div>
                                <div style={{ fontSize: 13, color: '#78350F', background: '#FEF3C7', padding: 8, borderRadius: 6 }}>{item.partnerResponse}</div>
                              </div>
                            )}
                            {item.evaluation && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>AI 평가 결과 (점수: {item.evaluation.score}/100):</div>
                                <div style={{ fontSize: 13, color: '#78350F', background: '#FEF3C7', padding: 8, borderRadius: 6 }}>{item.evaluation.feedback}</div>
                              </div>
                            )}
                            {item.evidenceFiles && item.evidenceFiles.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>📎 증빙 파일 ({item.evidenceFiles.length}개):</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                                  {item.evidenceFiles.map((file) => (
                                    <div 
                                      key={file.id} 
                                      onClick={() => setViewingFile(file)}
                                      style={{ 
                                        padding: 8, background: 'white', borderRadius: 8, cursor: 'pointer',
                                        border: '1px solid #FDE68A', textAlign: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {file.fileType === 'image' ? (
                                        <img src={file.base64Data} alt={file.fileName} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} />
                                      ) : (
                                        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF3C7', borderRadius: 4 }}>
                                          <span style={{ fontSize: 24 }}>📄</span>
                                        </div>
                                      )}
                                      <div style={{ fontSize: 10, color: '#78350F', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</div>
                                      <div style={{ fontSize: 9, color: '#92400E' }}>{formatFileSize(file.fileSize)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(!item.evidenceFiles || item.evidenceFiles.length === 0) && !item.partnerResponse && (
                              <div style={{ marginTop: 12, fontSize: 13, color: '#92400E', fontStyle: 'italic' }}>증빙 자료가 없습니다.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedUser.inProgressItems.length > 10 && (
                      <div style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: 8 }}>
                        외 {selectedUser.inProgressItems.length - 10}개 항목...
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
                    {selectedUser.completedItems.slice(0, 10).map((item, idx) => (
                      <div key={idx} style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, overflow: 'hidden' }}>
                        <div 
                          onClick={() => toggleItemExpand(`completed-${item.id}`)}
                          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#047857' }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>{item.category}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.evidenceFiles && item.evidenceFiles.length > 0 && (
                              <span style={{ padding: '2px 8px', background: '#6EE7B7', color: '#064E3B', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                📎 {item.evidenceFiles.length}
                              </span>
                            )}
                            {item.evaluation && (
                              <span style={{ padding: '2px 8px', background: '#A7F3D0', color: '#064E3B', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                점수: {item.evaluation.score}
                              </span>
                            )}
                            <span style={{ fontSize: 18, color: '#059669' }}>{expandedItems.has(`completed-${item.id}`) ? '▼' : '▶'}</span>
                          </div>
                        </div>
                        {expandedItems.has(`completed-${item.id}`) && (
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #A7F3D0' }}>
                            {item.partnerResponse && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginBottom: 4 }}>파트너 응답:</div>
                                <div style={{ fontSize: 13, color: '#064E3B', background: '#D1FAE5', padding: 8, borderRadius: 6 }}>{item.partnerResponse}</div>
                              </div>
                            )}
                            {item.evaluation && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginBottom: 4 }}>AI 평가 결과 (점수: {item.evaluation.score}/100):</div>
                                <div style={{ fontSize: 13, color: '#064E3B', background: '#D1FAE5', padding: 8, borderRadius: 6 }}>{item.evaluation.feedback}</div>
                              </div>
                            )}
                            {item.evidenceFiles && item.evidenceFiles.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginBottom: 8 }}>📎 증빙 파일 ({item.evidenceFiles.length}개):</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                                  {item.evidenceFiles.map((file) => (
                                    <div 
                                      key={file.id} 
                                      onClick={() => setViewingFile(file)}
                                      style={{ 
                                        padding: 8, background: 'white', borderRadius: 8, cursor: 'pointer',
                                        border: '1px solid #A7F3D0', textAlign: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {file.fileType === 'image' ? (
                                        <img src={file.base64Data} alt={file.fileName} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }} />
                                      ) : (
                                        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#D1FAE5', borderRadius: 4 }}>
                                          <span style={{ fontSize: 24 }}>📄</span>
                                        </div>
                                      )}
                                      <div style={{ fontSize: 10, color: '#064E3B', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</div>
                                      <div style={{ fontSize: 9, color: '#065F46' }}>{formatFileSize(file.fileSize)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(!item.evidenceFiles || item.evidenceFiles.length === 0) && !item.partnerResponse && (
                              <div style={{ marginTop: 12, fontSize: 13, color: '#065F46', fontStyle: 'italic' }}>증빙 자료가 없습니다.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedUser.completedItems.length > 10 && (
                      <div style={{ fontSize: 13, color: '#65676B', textAlign: 'center', padding: 8 }}>
                        외 {selectedUser.completedItems.length - 10}개 항목...
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

      {/* 파일 미리보기 모달 */}
      {viewingFile && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 100, padding: 20 
          }}
          onClick={() => setViewingFile(null)}
        >
          <div 
            style={{ 
              maxWidth: '90vw', maxHeight: '90vh', background: 'white', 
              borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ 
              padding: '16px 20px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', 
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{viewingFile.fileName}</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  {viewingFile.fileType === 'image' ? '🖼️ 이미지' : '📄 PDF'} • {formatFileSize(viewingFile.fileSize)}
                  {viewingFile.uploadedAt && ` • ${new Date(viewingFile.uploadedAt).toLocaleDateString('ko-KR')}`}
                </div>
              </div>
              <button 
                onClick={() => setViewingFile(null)}
                style={{ 
                  width: 36, height: 36, background: 'rgba(255,255,255,0.2)', 
                  border: 'none', borderRadius: '50%', color: 'white', 
                  fontSize: 20, cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center' 
                }}
              >×</button>
            </div>
            
            {/* 콘텐츠 */}
            <div style={{ padding: 20, maxHeight: 'calc(90vh - 120px)', overflow: 'auto' }}>
              {viewingFile.fileType === 'image' ? (
                <img 
                  src={viewingFile.base64Data} 
                  alt={viewingFile.fileName}
                  style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto', borderRadius: 8 }}
                />
              ) : (
                <div>
                  {viewingFile.base64Data.startsWith('data:application/pdf') ? (
                    <iframe
                      src={viewingFile.base64Data}
                      style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
                      title={viewingFile.fileName}
                    />
                  ) : (
                    <div style={{ 
                      padding: 24, background: '#F9FAFB', borderRadius: 8, 
                      textAlign: 'center', color: '#65676B' 
                    }}>
                      <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📄</span>
                      <div style={{ fontSize: 14 }}>PDF 미리보기를 지원하지 않습니다.</div>
                      {viewingFile.extractedText && (
                        <div style={{ marginTop: 16, textAlign: 'left' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>추출된 텍스트:</div>
                          <div style={{ 
                            fontSize: 13, color: '#1C1E21', background: 'white', 
                            padding: 12, borderRadius: 6, border: '1px solid #E4E6EB',
                            maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap'
                          }}>
                            {viewingFile.extractedText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 푸터 */}
            <div style={{ padding: '12px 20px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = viewingFile.base64Data;
                  link.download = viewingFile.fileName;
                  link.click();
                }}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: '#1877F2', background: 'white', 
                  border: '1px solid #1877F2', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                📥 다운로드
              </button>
              <button 
                onClick={() => setViewingFile(null)}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: 'white', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', 
                  border: 'none', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
