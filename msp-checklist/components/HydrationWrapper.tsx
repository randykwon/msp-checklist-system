'use client';

import { useState, useEffect, ReactNode } from 'react';

interface HydrationWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function HydrationWrapper({ children, fallback }: HydrationWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}