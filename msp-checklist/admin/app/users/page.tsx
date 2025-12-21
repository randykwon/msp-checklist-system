'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import PermissionGuard from '@/components/PermissionGuard';
import { getRoleDisplayName, getRoleColor, UserRole } from '@/lib/permissions';

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
  questionsAsked?: number;
  questionsAnswered?: number;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  organization: string;
}

export default function UsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  
  const [createForm, setCreateForm] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    organization: ''
  });
  
  const [editForm, setEditForm] = useState<Partial<UserFormData>>({
    name: '',
    email: '',
    phone: '',
    organization: ''
  });

  // Password reset states
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await fetch('/api/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
      } else {
        const error = await response.json();
        alert(error.error || '역할 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to change user role:', error);
      alert('역할 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || '사용자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('사용자 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/users/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status: newStatus }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowStatusModal(false);
        setSelectedUser(null);
      } else {
        const error = await response.json();
        alert(error.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to change user status:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      alert('이름, 이메일, 비밀번호는 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        await fetchUsers();
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'user',
          phone: '',
          organization: ''
        });
        alert('사용자가 성공적으로 생성되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '사용자 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('사용자 생성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          ...editForm
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowEditModal(false);
        setSelectedUser(null);
        setEditForm({
          name: '',
          email: '',
          phone: '',
          organization: ''
        });
        alert('사용자 정보가 성공적으로 업데이트되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '사용자 정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('사용자 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (userData: User) => {
    setSelectedUser(userData);
    setEditForm({
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      organization: userData.organization || ''
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'suspended': return '일시중지';
      case 'inactive': return '비활성';
      default: return status;
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordResetUser) return;

    if (newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 8) {
      alert('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setResettingPassword(true);
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: passwordResetUser.id,
          newPassword: newPassword,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.userEmail}의 비밀번호가 성공적으로 재설정되었습니다.`);
        setShowPasswordResetModal(false);
        setPasswordResetUser(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        alert(error.error || '비밀번호 재설정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setResettingPassword(false);
    }
  };

  const openPasswordResetModal = (userData: User) => {
    setPasswordResetUser(userData);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordResetModal(true);
  };

  // 사용자별 데이터 초기화 함수
  const handleResetUserData = async (userData: User, dataType: 'all' | 'prerequisites' | 'technical') => {
    const typeText = dataType === 'all' ? '모든 평가 데이터' : 
                    dataType === 'prerequisites' ? '사전 요구사항 데이터' : '기술 검증 데이터';
    
    const confirmMessage = `정말로 ${userData.name}(${userData.email})의 ${typeText}를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch('/api/users/reset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userData.id,
          dataType: dataType
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${userData.name}의 ${typeText}가 성공적으로 초기화되었습니다.`);
      } else {
        const error = await response.json();
        alert(error.error || '데이터 초기화에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to reset user data:', error);
      alert('데이터 초기화 중 오류가 발생했습니다.');
    }
  };

  const filteredUsers = users.filter(userData => {
    const matchesSearch = userData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userData.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (userData.organization && userData.organization.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || userData.status === statusFilter;
    const matchesRole = roleFilter === 'all' || userData.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/users">
      <div className="h-full flex flex-col space-y-6">
        {/* Header - 고정 헤더 */}
        <div className="flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
                </div>
                <p className="text-gray-600 ml-11">시스템 사용자를 관리하고 권한을 설정합니다</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={fetchUsers}
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  새로고침
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  사용자 추가
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 - 컴팩트한 디자인 */}
        <div className="flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">필터 및 검색</h2>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{filteredUsers.length}명의 사용자</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-xs text-gray-400">총 {users.length}명</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="이름, 이메일, 소속..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended' | 'inactive')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              >
                <option value="all">전체 상태</option>
                <option value="active">활성</option>
                <option value="suspended">일시중지</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">역할</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'admin')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              >
                <option value="all">전체 역할</option>
                <option value="user">일반 사용자</option>
                <option value="operator">운영자</option>
                <option value="admin">관리자</option>
                <option value="superadmin">슈퍼관리자</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                }}
                className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                초기화
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* 사용자 목록 - 스크롤 가능한 영역 */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0">
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">사용자 목록</h2>
              </div>
              <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                {filteredUsers.length}명 표시
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {usersLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">사용자 목록 로딩 중...</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">사용자가 없습니다</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
                      ? '검색 조건에 맞는 사용자가 없습니다.' 
                      : '등록된 사용자가 없습니다.'}
                  </p>
                  {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setRoleFilter('all');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
              {filteredUsers.map((userData) => (
                <div key={userData.id} className="group p-4 hover:bg-blue-50 transition-all duration-200 border-l-4 border-transparent hover:border-blue-400">
                  <div className="flex items-center justify-between">
                    {/* 왼쪽: 사용자 기본 정보 */}
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md ${
                          userData.role === 'superadmin' 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
                            : userData.role === 'admin'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : userData.role === 'operator'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-gray-500 to-slate-500'
                        }`}>
                          {userData.name.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* 사용자 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {userData.name}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(userData.role as UserRole)}`}>
                            {getRoleDisplayName(userData.role as UserRole)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(userData.status)}`}>
                            {getStatusText(userData.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            {userData.email}
                          </span>
                          {userData.organization && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {userData.organization}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(userData.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 액션 버튼들 */}
                    <div className="flex-shrink-0 ml-4">
                      <div className="flex items-center space-x-2">
                        {/* 주요 액션 버튼들 */}
                        <button
                          onClick={() => openEditModal(userData)}
                          className="inline-flex items-center px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                          title="정보수정"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedUser(userData);
                            setShowRoleModal(true);
                          }}
                          className="inline-flex items-center px-2 py-1 border border-yellow-300 rounded text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors duration-200"
                          title="역할변경"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(userData);
                            setShowStatusModal(true);
                          }}
                          className="inline-flex items-center px-2 py-1 border border-orange-300 rounded text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors duration-200"
                          title="상태변경"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>

                        {/* 더보기 메뉴 */}
                        <div className="relative">
                          <button
                            className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                            title="더보기"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* 확장된 액션 버튼들 (접힌 상태) */}
                      <div className="mt-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => openPasswordResetModal(userData)}
                          className="inline-flex items-center px-1.5 py-0.5 border border-purple-300 rounded text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors duration-200"
                          title="비밀번호 재설정"
                        >
                          비밀번호
                        </button>
                        
                        <button
                          onClick={() => handleResetUserData(userData, 'all')}
                          className="inline-flex items-center px-1.5 py-0.5 border border-red-300 rounded text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200"
                          title="데이터 초기화"
                        >
                          초기화
                        </button>
                        
                        {userData.id !== user.userId && (
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="inline-flex items-center px-1.5 py-0.5 border border-red-500 rounded text-xs font-medium text-red-800 bg-red-100 hover:bg-red-200 transition-colors duration-200"
                            title="사용자 삭제"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 사용자 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                새 사용자 추가
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="사용자 이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="비밀번호"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">일반 사용자</option>
                    <option value="operator">운영자</option>
                    <option value="admin">관리자</option>
                    <option value="superadmin">슈퍼관리자</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소속</label>
                  <input
                    type="text"
                    value={createForm.organization}
                    onChange={(e) => setCreateForm({...createForm, organization: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="회사명 또는 조직명"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      name: '',
                      email: '',
                      password: '',
                      role: 'user',
                      phone: '',
                      organization: ''
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
                >
                  {submitting ? '생성 중...' : '사용자 생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 정보 수정 모달 */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                사용자 정보 수정
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{selectedUser.name}</strong>의 정보를 수정합니다
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">소속</label>
                  <input
                    type="text"
                    value={editForm.organization || ''}
                    onChange={(e) => setEditForm({...editForm, organization: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="회사명 또는 조직명"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditForm({});
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
                >
                  {submitting ? '수정 중...' : '정보 수정'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 역할 변경 모달 */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                사용자 역할 변경
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{selectedUser.name}</strong>의 역할을 변경하시겠습니까?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRoleChange(selectedUser.id, 'user')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.role === 'user'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                  disabled={selectedUser.role === 'user'}
                >
                  일반 사용자
                </button>
                <button
                  onClick={() => handleRoleChange(selectedUser.id, 'operator')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.role === 'operator'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  disabled={selectedUser.role === 'operator'}
                >
                  운영자
                </button>
                <button
                  onClick={() => handleRoleChange(selectedUser.id, 'admin')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.role === 'admin'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={selectedUser.role === 'admin'}
                >
                  관리자
                </button>
                <button
                  onClick={() => handleRoleChange(selectedUser.id, 'superadmin')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.role === 'superadmin'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  disabled={selectedUser.role === 'superadmin'}
                >
                  슈퍼관리자
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상태 변경 모달 */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                사용자 상태 변경
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{selectedUser.name}</strong>의 상태를 변경하시겠습니까?
              </p>
              <p className="text-xs text-gray-500 mb-4">
                현재 상태: <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedUser.status)}`}>
                  {getStatusText(selectedUser.status)}
                </span>
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleStatusChange(selectedUser.id, 'active')}
                  className={`w-full px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.status === 'active'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={selectedUser.status === 'active' || submitting}
                >
                  활성으로 변경
                </button>
                <button
                  onClick={() => handleStatusChange(selectedUser.id, 'suspended')}
                  className={`w-full px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.status === 'suspended'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                  disabled={selectedUser.status === 'suspended' || submitting}
                >
                  일시중지로 변경
                </button>
                <button
                  onClick={() => handleStatusChange(selectedUser.id, 'inactive')}
                  className={`w-full px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.status === 'inactive'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                  disabled={selectedUser.status === 'inactive' || submitting}
                >
                  비활성으로 변경
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedUser(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                  disabled={submitting}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 재설정 모달 */}
      {showPasswordResetModal && passwordResetUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                비밀번호 재설정
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{passwordResetUser.name}</strong> ({passwordResetUser.email})의 비밀번호를 재설정합니다
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="최소 8자 이상"
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="새 비밀번호 다시 입력"
                  />
                </div>
                
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <div className="text-sm text-red-600">
                    비밀번호가 일치하지 않습니다.
                  </div>
                )}
                
                {newPassword && newPassword.length < 8 && (
                  <div className="text-sm text-red-600">
                    비밀번호는 최소 8자 이상이어야 합니다.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setPasswordResetUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                  disabled={resettingPassword}
                >
                  취소
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={resettingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
                >
                  {resettingPassword ? '재설정 중...' : '비밀번호 재설정'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </PermissionGuard>
    </AdminLayout>
  );
}