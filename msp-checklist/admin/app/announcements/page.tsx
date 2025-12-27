'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { AdminAnnouncement } from '@/lib/db';

interface AnnouncementFormData {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// 공지사항 내용 포맷팅 함수
const formatAnnouncementContent = (content: string): string => {
  return content
    .replace(/\n\n+/g, '</p><p style="margin-top: 12px; margin-bottom: 8px;">')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p style="margin-bottom: 8px;">$1</p>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #1C1E21; background: #FEF3C7; padding: 0 4px; border-radius: 4px;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #65676B;">$1</em>')
    .replace(/(중요|주의|알림|공지|안내|필수|긴급|마감|종료|시작|오픈|업데이트|변경|수정)/g, '<span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; background: #FEE2E2; color: #DC2626; margin: 0 2px;">🔔 $1</span>')
    .replace(/(완료|성공|승인|확정|개선|추가|신규)/g, '<span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; background: #D1FAE5; color: #059669; margin: 0 2px;">✅ $1</span>');
};

export default function AnnouncementsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    type: 'info',
    priority: 1,
    isActive: true,
    startDate: '',
    endDate: ''
  });

  // 카드 색상 (8색 로테이션)
  const cardColors = [
    { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', light: '#E7F3FF' },
    { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', light: '#E8F5E9' },
    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', light: '#FEF3C7' },
    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', light: '#EDE9FE' },
    { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', light: '#FCE7F3' },
    { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', light: '#CCFBF1' },
    { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', light: '#FEE2E2' },
    { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', light: '#E0E7FF' },
  ];

  // 타입별 색상
  const typeColors: Record<string, { bg: string; icon: string; label: string }> = {
    info: { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', icon: '📢', label: '정보' },
    warning: { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', icon: '⚠️', label: '경고' },
    success: { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', icon: '✅', label: '성공' },
    error: { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', icon: '❌', label: '오류' },
  };

  // 우선순위별 색상
  const priorityColors: Record<number, { bg: string; label: string }> = {
    3: { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', label: '🔴 높음' },
    2: { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', label: '🟡 보통' },
    1: { bg: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)', label: '⚪ 낮음' },
  };


  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Exception during fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsHydrated(true);
    fetchAnnouncements();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 1,
      isActive: true,
      startDate: '',
      endDate: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!formData.title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!formData.content.trim()) { alert('내용을 입력해주세요.'); return; }
    
    setSaving(true);
    try {
      const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
      const method = editingId ? 'PUT' : 'POST';
      const cleanFormData = { ...formData, startDate: formData.startDate || null, endDate: formData.endDate || null };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cleanFormData)
      });
      
      if (response.ok) {
        alert('공지사항이 성공적으로 저장되었습니다.');
        await fetchAnnouncements();
        resetForm();
      } else {
        const result = await response.json();
        alert(`저장 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      alert(`저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/announcements/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (response.ok) {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !currentStatus } : a));
      } else {
        const error = await response.json();
        alert(`상태 변경 실패: ${error.error}`);
      }
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;
    try {
      const response = await fetch(`/api/announcements/${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        await fetchAnnouncements();
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (announcement: AdminAnnouncement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isActive: announcement.isActive,
      startDate: announcement.startDate ? announcement.startDate.split('T')[0] : '',
      endDate: announcement.endDate ? announcement.endDate.split('T')[0] : ''
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };


  return (
    <AdminLayout>
      {!isHydrated ? (
        <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '3px solid #E4E6EB', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#65676B' }}>로딩 중...</p>
          </div>
          <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 헤더 카드 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📢 공지사항 관리</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>사용자에게 표시될 공지사항을 작성하고 관리합니다</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={fetchAnnouncements}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#F59E0B',
                    background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  🔄 새로고침
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                    background: 'rgba(255,255,255,0.2)', border: '2px solid white', borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  ➕ 새 공지사항
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>📋 전체 공지</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{announcements.length}</div>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>✅ 활성 공지</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>{announcements.filter(a => a.isActive).length}</div>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>🔴 높은 우선순위</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{announcements.filter(a => a.priority === 3).length}</div>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>⚠️ 경고/오류</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{announcements.filter(a => a.type === 'warning' || a.type === 'error').length}</div>
            </div>
          </div>
        </div>


        {/* 공지사항 카드 그리드 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📋 공지사항 목록</h3>
          </div>
          
          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'white' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p style={{ color: '#65676B' }}>공지사항을 불러오는 중...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'white' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p style={{ color: '#65676B', fontSize: 16 }}>등록된 공지사항이 없습니다</p>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  marginTop: 16, padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                  border: 'none', borderRadius: 10, cursor: 'pointer'
                }}
              >
                ➕ 첫 공지사항 작성하기
              </button>
            </div>
          ) : (
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {announcements.map((announcement, index) => {
                  const colorScheme = cardColors[index % cardColors.length];
                  const typeColor = typeColors[announcement.type] || typeColors.info;
                  const priorityColor = priorityColors[announcement.priority] || priorityColors[1];
                  
                  return (
                    <div key={announcement.id} style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid #E4E6EB',
                      opacity: announcement.isActive ? 1 : 0.7
                    }}>
                      {/* 카드 헤더 */}
                      <div style={{
                        padding: '14px 16px',
                        background: colorScheme.bg,
                        color: 'white'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 20 }}>{typeColor.icon}</span>
                          <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{announcement.title}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {/* 타입 배지 */}
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: 'rgba(255,255,255,0.25)', color: 'white'
                          }}>
                            {typeColor.label}
                          </span>
                          {/* 우선순위 배지 */}
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: 'rgba(255,255,255,0.25)', color: 'white'
                          }}>
                            {priorityColor.label}
                          </span>
                          {/* 활성 상태 배지 */}
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: announcement.isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                            color: 'white'
                          }}>
                            {announcement.isActive ? '✅ 활성' : '⏸️ 비활성'}
                          </span>
                        </div>
                      </div>
                      {/* 카드 바디 */}
                      <div style={{ padding: 16, background: 'white' }}>
                        <div 
                          style={{ 
                            fontSize: 14, color: '#1C1E21', marginBottom: 12, lineHeight: 1.6,
                            maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis'
                          }}
                          dangerouslySetInnerHTML={{ __html: formatAnnouncementContent(announcement.content.substring(0, 150) + (announcement.content.length > 150 ? '...' : '')) }}
                        />
                        <div style={{ fontSize: 12, color: '#65676B', marginBottom: 4 }}>
                          📅 생성: {formatDate(announcement.createdAt)}
                        </div>
                        {announcement.startDate && (
                          <div style={{ fontSize: 12, color: '#65676B', marginBottom: 4 }}>
                            🟢 시작: {announcement.startDate.split('T')[0]}
                          </div>
                        )}
                        {announcement.endDate && (
                          <div style={{ fontSize: 12, color: '#65676B', marginBottom: 4 }}>
                            🔴 종료: {announcement.endDate.split('T')[0]}
                          </div>
                        )}
                        {/* 액션 버튼 */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          <button
                            onClick={() => handleEdit(announcement)}
                            style={{
                              flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                              background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                              border: 'none', borderRadius: 8, cursor: 'pointer'
                            }}
                          >
                            ✏️ 편집
                          </button>
                          <button
                            onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                            style={{
                              padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                              background: announcement.isActive 
                                ? 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)'
                                : 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                              border: 'none', borderRadius: 8, cursor: 'pointer'
                            }}
                          >
                            {announcement.isActive ? '⏸️' : '▶️'}
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            style={{
                              padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                              background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                              border: 'none', borderRadius: 8, cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>


        {/* 작성/편집 모달 */}
        {showForm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
          }}>
            <div style={{
              width: 520, maxHeight: '90vh', overflow: 'auto',
              borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              {/* 모달 헤더 */}
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                color: 'white', position: 'sticky', top: 0, zIndex: 1
              }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  {editingId ? '✏️ 공지사항 편집' : '➕ 새 공지사항 작성'}
                </h3>
              </div>
              {/* 모달 바디 */}
              <form onSubmit={handleSave} style={{ padding: 24, background: 'white' }}>
                {/* 제목 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                    📝 제목 <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="공지사항 제목을 입력하세요"
                    style={{
                      width: '100%', padding: '12px 16px', fontSize: 14,
                      border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box'
                    }}
                  />
                </div>
                {/* 내용 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                    📄 내용 <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="공지사항 내용을 입력하세요"
                    rows={6}
                    style={{
                      width: '100%', padding: '12px 16px', fontSize: 14,
                      border: '2px solid #E4E6EB', borderRadius: 10, resize: 'vertical',
                      boxSizing: 'border-box', lineHeight: 1.6
                    }}
                  />
                </div>
                {/* 타입 & 우선순위 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      🏷️ 타입
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementFormData['type'] })}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14,
                        border: '2px solid #F59E0B', borderRadius: 10, cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="info">📢 정보</option>
                      <option value="warning">⚠️ 경고</option>
                      <option value="success">✅ 성공</option>
                      <option value="error">❌ 오류</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      ⚡ 우선순위
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14,
                        border: '2px solid #F59E0B', borderRadius: 10, cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value={1}>⚪ 낮음</option>
                      <option value={2}>🟡 보통</option>
                      <option value={3}>🔴 높음</option>
                    </select>
                  </div>
                </div>
                {/* 시작일 & 종료일 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      🟢 시작일 (선택)
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14,
                        border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      🔴 종료일 (선택)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14,
                        border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                {/* 활성 상태 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: 20, height: 20, accentColor: '#F59E0B' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>
                      ✅ 즉시 활성화
                    </span>
                  </label>
                </div>
                {/* 버튼 */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600,
                      color: '#65676B', background: '#E4E6EB', border: 'none',
                      borderRadius: 10, cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600,
                      color: 'white', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                      border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    {saving ? '저장 중...' : '💾 저장'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      )}
    </AdminLayout>
  );
}
