'use client';

import { ReactNode } from 'react';

interface PermissionGuardProps {
  children: ReactNode;
  requiredRoute: string;
}

export default function PermissionGuard({ children, requiredRoute }: PermissionGuardProps) {
  return <>{children}</>;
}
