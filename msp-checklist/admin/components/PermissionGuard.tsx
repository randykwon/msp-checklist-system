'use client';

import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, UserRole } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface PermissionGuardProps {
  children: ReactNode;
  requiredRoute: string;
  fallbackRoute?: string;
}

export default function PermissionGuard({ 
  children, 
  requiredRoute, 
  fallbackRoute = '/dashboard' 
}: PermissionGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const hasAccess = canAccessRoute(user.role as UserRole, requiredRoute);
      
      if (!hasAccess) {
        router.push(fallbackRoute);
      }
    }
  }, [user, loading, requiredRoute, fallbackRoute, router]);

  // 로딩 중이거나 권한이 없으면 로딩 표시
  if (loading || !user || !canAccessRoute(user.role as UserRole, requiredRoute)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}