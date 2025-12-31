'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      console.log('[AuthContext] Fetching current user...');
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      console.log('[AuthContext] Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[AuthContext] User data:', data.user?.email, data.user?.role);
        // 관리자 시스템 접근 권한 확인 (운영자 이상)
        if (['operator', 'admin', 'superadmin'].includes(data.user.role)) {
          setUser(data.user);
        } else {
          console.log('[AuthContext] User role not allowed:', data.user.role);
          setUser(null);
        }
      } else {
        console.log('[AuthContext] Failed to fetch user, status:', res.status);
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to fetch current user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    
    // 관리자 시스템 접근 권한 확인 (운영자 이상)
    if (!['operator', 'admin', 'superadmin'].includes(data.user.role)) {
      throw new Error('관리자 시스템 접근 권한이 필요합니다.');
    }
    
    setUser(data.user);
  };

  const logout = async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Logout failed');
    }

    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}