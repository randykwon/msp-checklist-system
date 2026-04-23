export type UserRole = 'admin' | 'operator' | 'viewer';

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  return true; // 임시로 모든 접근 허용
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    admin: '관리자',
    operator: '운영자',
    viewer: '조회자'
  };
  return roleNames[role] || role;
}

export function getRoleColor(role: UserRole): string {
  const roleColors = {
    admin: 'red',
    operator: 'blue',
    viewer: 'green'
  };
  return roleColors[role] || 'gray';
}
