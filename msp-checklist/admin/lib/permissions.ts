// 권한 관리 시스템

export type UserRole = 'user' | 'operator' | 'admin' | 'superadmin';

export interface Permission {
  dashboard: boolean;
  progress: boolean;
  users: boolean;
  announcements: boolean;
  qa: boolean;
  cache: boolean;
  virtualEvidence: boolean;
  system: boolean;
  monitoring: boolean;
}

// 역할별 권한 정의
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  user: {
    dashboard: false,
    progress: false,
    users: false,
    announcements: false,
    qa: false,
    cache: false,
    virtualEvidence: false,
    system: false,
    monitoring: false,
  },
  operator: {
    dashboard: true,
    progress: true,
    users: false,        // 사용자 관리 불가
    announcements: true,
    qa: false,           // 질의응답 관리 불가
    cache: false,        // 조언 캐시 관리 불가
    virtualEvidence: false, // 가상증빙예제 캐시 관리 불가
    system: false,       // 시스템 관리 불가
    monitoring: true,
  },
  admin: {
    dashboard: true,
    progress: true,
    users: true,
    announcements: true,
    qa: true,
    cache: true,
    virtualEvidence: true,
    system: true,
    monitoring: true,
  },
  superadmin: {
    dashboard: true,
    progress: true,
    users: true,
    announcements: true,
    qa: true,
    cache: true,
    virtualEvidence: true,
    system: true,
    monitoring: true,
  },
};

// 권한 체크 함수들
export function hasPermission(userRole: UserRole | undefined | null, permission: keyof Permission): boolean {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  return ROLE_PERMISSIONS[userRole][permission];
}

export function canAccessRoute(userRole: UserRole | undefined | null, route: string): boolean {
  if (!userRole) {
    return false;
  }

  const routePermissionMap: Record<string, keyof Permission> = {
    '/dashboard': 'dashboard',
    '/progress': 'progress',
    '/users': 'users',
    '/announcements': 'announcements',
    '/qa': 'qa',
    '/cache': 'cache',
    '/virtual-evidence': 'virtualEvidence',
    '/system': 'system',
    '/monitoring': 'monitoring',
  };

  const permission = routePermissionMap[route];
  if (!permission) return false;

  return hasPermission(userRole, permission);
}

export function getAccessibleRoutes(userRole: UserRole | undefined | null): string[] {
  if (!userRole) {
    return [];
  }

  const routes = [
    '/dashboard',
    '/progress', 
    '/users',
    '/announcements',
    '/qa',
    '/cache',
    '/virtual-evidence',
    '/system',
    '/monitoring'
  ];

  return routes.filter(route => canAccessRoute(userRole, route));
}

export function getRoleDisplayName(role: UserRole | undefined | null): string {
  if (!role) return '알 수 없음';
  
  const roleNames: Record<UserRole, string> = {
    user: '일반 사용자',
    operator: '운영자',
    admin: '관리자',
    superadmin: '슈퍼관리자'
  };

  return roleNames[role] || '알 수 없음';
}

export function getRoleColor(role: UserRole | undefined | null): string {
  if (!role) return 'bg-gray-100 text-gray-800';
  
  const roleColors: Record<UserRole, string> = {
    user: 'bg-gray-100 text-gray-800',
    operator: 'bg-blue-100 text-blue-800',
    admin: 'bg-green-100 text-green-800',
    superadmin: 'bg-purple-100 text-purple-800'
  };

  return roleColors[role] || 'bg-gray-100 text-gray-800';
}

// 관리자 권한 체크 (기존 admin 또는 superadmin)
export function isAdmin(userRole: UserRole | undefined | null): boolean {
  if (!userRole) return false;
  return userRole === 'admin' || userRole === 'superadmin';
}

// 슈퍼관리자 권한 체크
export function isSuperAdmin(userRole: UserRole | undefined | null): boolean {
  if (!userRole) return false;
  return userRole === 'superadmin';
}

// 운영자 이상 권한 체크
export function isOperatorOrAbove(userRole: UserRole | undefined | null): boolean {
  if (!userRole) return false;
  return ['operator', 'admin', 'superadmin'].includes(userRole);
}