'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getRoleColor, getRoleDisplayName, UserRole } from '@/lib/permissions';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchUsers();
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const response = await fetch('/api/users');
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        console.error('API error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 역할별 색상 스킴
  const roleColors: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', text: '#EF4444' },
    admin: { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', text: '#8B5CF6' },
    operator: { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', text: '#F59E0B' },
    user: { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', text: '#1877F2' },
  };

  // 사용자 카드 색상 (8색 로테이션)
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
            background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>👥 사용자 관리</h1>
                <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>시스템 사용자들의 정보와 권한을 관리합니다</p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '12px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>총 사용자</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{users.length}명</div>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* 전체 사용자 */}
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>👤 전체 사용자</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{users.length}</div>
            </div>
          </div>
          {/* 관리자 */}
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>🛡️ 관리자</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>
                {users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}
              </div>
            </div>
          </div>
          {/* 운영자 */}
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>⚙️ 운영자</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>
                {users.filter(u => u.role === 'operator').length}
              </div>
            </div>
          </div>
          {/* 활성 사용자 */}
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>✅ 활성 사용자</div>
            </div>
            <div style={{ padding: 16, background: 'white' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>
                {users.filter(u => u.status === 'active').length}
              </div>
            </div>
          </div>
        </div>

        {/* 사용자 카드 그리드 */}
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📋 사용자 목록</h3>
          </div>
          
          {loadingUsers ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'white' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p style={{ color: '#65676B' }}>사용자 목록을 불러오는 중...</p>
            </div>
          ) : (
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {users.map((userData, index) => {
                  const colorScheme = cardColors[index % cardColors.length];
                  const roleColor = roleColors[userData.role] || roleColors.user;
                  
                  return (
                    <div key={userData.id} style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid #E4E6EB',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}>
                      {/* 카드 헤더 */}
                      <div style={{
                        padding: '14px 16px',
                        background: colorScheme.bg,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 700
                        }}>
                          {userData.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{userData.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>{userData.email}</div>
                        </div>
                      </div>
                      {/* 카드 바디 */}
                      <div style={{ padding: 16, background: 'white' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {/* 역할 배지 */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: roleColor.bg,
                            color: 'white'
                          }}>
                            {getRoleDisplayName(userData.role as UserRole)}
                          </span>
                          {/* 상태 배지 */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: userData.status === 'active' 
                              ? 'linear-gradient(135deg, #42B883 0%, #35495E 100%)'
                              : userData.status === 'suspended'
                              ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
                              : 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
                            color: 'white'
                          }}>
                            {userData.status === 'active' ? '✅ 활성' : userData.status === 'suspended' ? '🚫 정지' : '⏸️ 비활성'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#65676B', marginBottom: 8 }}>
                          🏢 {userData.organization || '소속 없음'}
                        </div>
                        <div style={{ fontSize: 12, color: '#8B8D91' }}>
                          📅 가입일: {formatDate(userData.created_at)}
                        </div>
                        {/* 액션 버튼 */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          <button
                            onClick={() => handleEditUser(userData)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'white',
                              background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ 편집
                          </button>
                          <button
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

        {/* 편집 모달 */}
        {showEditModal && selectedUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{
              width: 420,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              {/* 모달 헤더 */}
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                color: 'white'
              }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>✏️ 사용자 편집</h3>
              </div>
              {/* 모달 바디 */}
              <div style={{ padding: 24, background: 'white' }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>이름</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 14,
                      border: '2px solid #E4E6EB',
                      borderRadius: 10,
                      background: '#F0F2F5',
                      color: '#65676B',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>이메일</label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 14,
                      border: '2px solid #E4E6EB',
                      borderRadius: 10,
                      background: '#F0F2F5',
                      color: '#65676B',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>역할</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 14,
                      border: '2px solid #8B5CF6',
                      borderRadius: 10,
                      background: 'white',
                      color: '#1C1E21',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="user">👤 일반 사용자</option>
                    <option value="operator">⚙️ 운영자</option>
                    <option value="admin">🛡️ 관리자</option>
                    <option value="superadmin">👑 최고 관리자</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setShowEditModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#65676B',
                      background: '#E4E6EB',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleUpdateRole(selectedUser.id, selectedUser.role)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'white',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    💾 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}