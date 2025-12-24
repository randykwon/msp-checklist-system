// 권한 시스템 정의
export type UserRole = 'user' | 'operator' | 'admin' | 'superadmin';

// 역할별 권한 정의
export const ROLE_PERMISSIONS = {
  user: {
    level: 1,
    canAccess: ['/dashboard'],
    description: '일반 사용자'
  },
  operator: {
    level: 2,
    canAccess: ['/dashboard', '/progress', '/qa'],
    description: '운영자'
  },
  admin: {
    level: 3,
    canAccess: ['/dashboard', '/users', '/progress', '/announcements', '/qa', '/cache', '/virtual-evidence'],
    description: '관리자'
  },
  superadmin: {
    level: 4,
    canAccess: ['/dashboard', '/users', '/progress', '/announcements', '/qa', '/cache', '/virtual-evidence', '/system', '/monitoring'],
    description: '최고 관리자'
  }
};

// 역할 확인 함수
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_PERMISSIONS[userRole]?.level || 0;
  const requiredLevel = ROLE_PERMISSIONS[requiredRole]?.level || 0;
  return userLevel >= requiredLevel;
}

// 라우트 접근 권한 확인
export function canAccessRoute(userRole: UserRole | undefined, route: string): boolean {
  if (!userRole) return false;
  
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  return permissions.canAccess.some(allowedRoute => 
    route.startsWith(allowedRoute)
  );
}

// 역할 표시명 반환
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_PERMISSIONS[role]?.description || '알 수 없음';
}

// 역할별 색상 클래스 반환
export function getRoleColor(role: UserRole): string {
  const colors = {
    user: 'bg-gray-100 text-gray-800',
    operator: 'bg-blue-100 text-blue-800',
    admin: 'bg-green-100 text-green-800',
    superadmin: 'bg-purple-100 text-purple-800'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}