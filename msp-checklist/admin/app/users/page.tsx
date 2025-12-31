'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getRoleDisplayName, UserRole } from '@/lib/permissions';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  organization?: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoActivate, setAutoActivate] = useState(false);
  const [loadingAutoActivate, setLoadingAutoActivate] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (user) {
      fetchUsers();
      fetchAutoActivateSetting();
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (response.ok) setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAutoActivateSetting = async () => {
    try {
      const response = await fetch('/api/users/auto-activate');
      const data = await response.json();
      if (response.ok) setAutoActivate(data.enabled);
    } catch (error) {
      console.error('Failed to fetch auto-activate setting:', error);
    }
  };

  const handleToggleAutoActivate = async () => {
    setLoadingAutoActivate(true);
    try {
      const response = await fetch('/api/users/auto-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autoActivate })
      });
      if (response.ok) {
        setAutoActivate(!autoActivate);
        setMessage({ type: 'success', text: `자동 활성화가 ${!autoActivate ? '활성화' : '비활성화'}되었습니다.` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '설정 변경에 실패했습니다.' });
    } finally {
      setLoadingAutoActivate(false);
    }
  };

  const handleEditUser = (u: User) => { setSelectedUser(u); setShowEditModal(true); setMessage(null); };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/users/role', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });
      if (response.ok) { fetchUsers(); setShowEditModal(false); setMessage({ type: 'success', text: '역할이 변경되었습니다.' }); }
    } catch (error) { setMessage({ type: 'error', text: '역할 변경에 실패했습니다.' }); }
    finally { setActionLoading(false); }
  };

  const handleUpdateStatus = async (userId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/users/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      if (response.ok) { fetchUsers(); setShowEditModal(false); setMessage({ type: 'success', text: '상태가 변경되었습니다.' }); }
    } catch (error) { setMessage({ type: 'error', text: '상태 변경에 실패했습니다.' }); }
    finally { setActionLoading(false); }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' }); return; }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' }); return; }
    setActionLoading(true);
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser?.id, newPassword })
      });
      if (response.ok) { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setMessage({ type: 'success', text: '비밀번호가 재설정되었습니다.' }); }
    } catch (error) { setMessage({ type: 'error', text: '비밀번호 재설정에 실패했습니다.' }); }
    finally { setActionLoading(false); }
  };

  const formatDate = (dateString: string) => {
    if (!isHydrated) return '';
    return new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Hydration 로딩 화면
  if (!isHydrated || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #E4E6EB', borderTopColor: '#1877F2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#65676B' }}>로딩 중...</p>
        </div>
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  
  if (!user) return null;

  const roleColors: Record<string, { bg: string }> = {
    superadmin: { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' },
    admin: { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' },
    operator: { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
    user: { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' },
  };
  const cardColors = [
    { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' },
    { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' },
    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' },
    { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)' },
    { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)' },
    { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' },
    { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' },
  ];

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 메시지 알림 */}
        {message && (
          <div style={{ padding: '12px 20px', borderRadius: 12, background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECACA'}`, color: message.type === 'success' ? '#047857' : '#B91C1C', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{message.type === 'success' ? '✅' : '❌'} {message.text}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'inherit' }}>×</button>
          </div>
        )}

        {/* 헤더 카드 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>👥 사용자 관리</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>시스템 사용자들의 정보와 권한을 관리합니다</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* 자동 활성화 토글 */}
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>신규 가입 자동 활성화</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{autoActivate ? '활성화됨' : '비활성화됨'}</div>
                  </div>
                  <button
                    onClick={handleToggleAutoActivate}
                    disabled={loadingAutoActivate}
                    style={{
                      width: 50,
                      height: 28,
                      borderRadius: 14,
                      border: 'none',
                      background: autoActivate ? '#42B883' : 'rgba(255,255,255,0.3)',
                      cursor: loadingAutoActivate ? 'not-allowed' : 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: 3,
                      left: autoActivate ? 25 : 3,
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>총 사용자</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{users.length}명</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          {[
            { title: '👤 전체', value: users.length, color: '#1877F2', gradient: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' },
            { title: '🛡️ 관리자', value: users.filter(u => ['admin', 'superadmin'].includes(u.role)).length, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' },
            { title: '⚙️ 운영자', value: users.filter(u => u.role === 'operator').length, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
            { title: '✅ 활성', value: users.filter(u => u.status === 'active').length, color: '#42B883', gradient: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' },
            { title: '⏸️ 비활성', value: users.filter(u => u.status === 'inactive').length, color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)' },
            { title: '🚫 정지', value: users.filter(u => u.status === 'suspended').length, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' }
          ].map((stat, idx) => (
            <div key={idx} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ padding: '10px 14px', background: stat.gradient, color: 'white' }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{stat.title}</div>
              </div>
              <div style={{ padding: 14, background: 'white' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 사용자 카드 그리드 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📋 사용자 목록</h3>
          </div>
          {loadingUsers ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'white' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E4E6EB', borderTopColor: '#42B883', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: '#65676B' }}>사용자 목록을 불러오는 중...</p>
            </div>
          ) : (
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {users.map((userData, index) => {
                  const colorScheme = cardColors[index % cardColors.length];
                  const roleColor = roleColors[userData.role] || roleColors.user;
                  return (
                    <div key={userData.id} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #E4E6EB' }}>
                      <div style={{ padding: '14px 16px', background: colorScheme.bg, color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                          {userData.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{userData.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>{userData.email}</div>
                        </div>
                      </div>
                      <div style={{ padding: 16, background: 'white' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: roleColor.bg, color: 'white' }}>
                            {getRoleDisplayName(userData.role as UserRole)}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: userData.status === 'active' ? 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' : userData.status === 'suspended' ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' : 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)', color: 'white' }}>
                            {userData.status === 'active' ? '✅ 활성' : userData.status === 'suspended' ? '🚫 정지' : '⏸️ 비활성'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#65676B', marginBottom: 8 }}>🏢 {userData.organization || '소속 없음'}</div>
                        <div style={{ fontSize: 12, color: '#8B8D91' }}>📅 가입일: {formatDate(userData.created_at)}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          <button onClick={() => handleEditUser(userData)} style={{ flex: 1, padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✏️ 편집</button>
                          <button onClick={() => { setSelectedUser(userData); setShowPasswordModal(true); setMessage(null); }} style={{ flex: 1, padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>🔑 비밀번호</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 편집 모달 */}
        {showEditModal && selectedUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 450, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>✏️ 사용자 편집</h3>
                <button onClick={() => setShowEditModal(false)} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', fontSize: 18, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: 24, background: 'white' }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>이름</label>
                  <input type="text" value={selectedUser.name} disabled style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, background: '#F0F2F5', color: '#65676B', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>이메일</label>
                  <input type="email" value={selectedUser.email} disabled style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, background: '#F0F2F5', color: '#65676B', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>역할</label>
                  <select value={selectedUser.role} onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})} style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #8B5CF6', borderRadius: 10, background: 'white', color: '#1C1E21', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="user">👤 일반 사용자</option>
                    <option value="operator">⚙️ 운영자</option>
                    <option value="admin">🛡️ 관리자</option>
                    <option value="superadmin">👑 최고 관리자</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>상태</label>
                  <select value={selectedUser.status} onChange={(e) => setSelectedUser({...selectedUser, status: e.target.value})} style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #42B883', borderRadius: 10, background: 'white', color: '#1C1E21', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="active">✅ 활성</option>
                    <option value="inactive">⏸️ 비활성</option>
                    <option value="suspended">🚫 정지</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#65676B', background: '#E4E6EB', border: 'none', borderRadius: 10, cursor: 'pointer' }}>취소</button>
                  <button onClick={async () => { await handleUpdateRole(selectedUser.id, selectedUser.role); await handleUpdateStatus(selectedUser.id, selectedUser.status); }} disabled={actionLoading} style={{ flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'white', background: actionLoading ? '#A78BFA' : 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', border: 'none', borderRadius: 10, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                    {actionLoading ? '저장 중...' : '💾 저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 비밀번호 재설정 모달 */}
        {showPasswordModal && selectedUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 420, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🔑 비밀번호 재설정</h3>
                <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setShowNewPw(false); setShowConfirmPw(false); }} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', fontSize: 18, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: 24, background: 'white' }}>
                <div style={{ padding: '12px 16px', background: '#FEF3C7', borderRadius: 10, marginBottom: 20, border: '1px solid #FCD34D' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#92400E' }}>
                    <strong>{selectedUser.name}</strong> ({selectedUser.email}) 님의 비밀번호를 재설정합니다.
                  </p>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>새 비밀번호</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showNewPw ? 'text' : 'password'} 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="최소 6자 이상 입력"
                      style={{ width: '100%', padding: '12px 44px 12px 16px', fontSize: 14, border: '2px solid #F59E0B', borderRadius: 10, background: 'white', color: '#1C1E21', boxSizing: 'border-box' }} 
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#65676B' }}>
                      {showNewPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>비밀번호 확인</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showConfirmPw ? 'text' : 'password'} 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호를 다시 입력"
                      style={{ width: '100%', padding: '12px 44px 12px 16px', fontSize: 14, border: '2px solid #F59E0B', borderRadius: 10, background: 'white', color: '#1C1E21', boxSizing: 'border-box' }} 
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#65676B' }}>
                      {showConfirmPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#EF4444' }}>❌ 비밀번호가 일치하지 않습니다</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#42B883' }}>✅ 비밀번호가 일치합니다</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setShowNewPw(false); setShowConfirmPw(false); }} style={{ flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#65676B', background: '#E4E6EB', border: 'none', borderRadius: 10, cursor: 'pointer' }}>취소</button>
                  <button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 6 || newPassword !== confirmPassword} style={{ flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'white', background: (actionLoading || newPassword.length < 6 || newPassword !== confirmPassword) ? '#FCD34D' : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', border: 'none', borderRadius: 10, cursor: (actionLoading || newPassword.length < 6 || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer' }}>
                    {actionLoading ? '재설정 중...' : '🔐 재설정'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
