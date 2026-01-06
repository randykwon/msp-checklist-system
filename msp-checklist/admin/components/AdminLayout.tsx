'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import { canAccessRoute, getRoleDisplayName, getRoleColor, UserRole } from '@/lib/permissions';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const allNavigation = [
    { 
      name: '관리자 대시보드', 
      href: '/', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: '사용자 관리', 
      href: '/users', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    { 
      name: '진행 현황', 
      href: '/progress', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    { 
      name: '공지사항 관리', 
      href: '/announcements', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    },
    { 
      name: '질의응답 관리', 
      href: '/qa', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      name: '조언 캐시 관리', 
      href: '/cache', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      )
    },
    { 
      name: '가상증빙예제 캐시', 
      href: '/virtual-evidence', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      name: '시스템 관리', 
      href: '/system', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      name: '시스템 모니터링', 
      href: '/monitoring', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      name: '활동 모니터링', 
      href: '/activity', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
  ];

  // 사용자 권한에 따라 네비게이션 필터링
  const navigation = allNavigation.filter(item => 
    canAccessRoute(user?.role as UserRole, item.href)
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--fb-background)', 
      display: 'flex' 
    }}>
      {/* Facebook Style Sidebar */}
      <div 
        className={`fb-admin-sidebar ${isSidebarOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'var(--fb-sidebar-width)',
          backgroundColor: 'var(--fb-surface)',
          borderRight: '1px solid var(--fb-border)',
          transform: isSidebarOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.3s ease-in-out',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        {/* Facebook Style Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 'var(--fb-header-height)',
          padding: '0 var(--fb-spacing-lg)',
          backgroundColor: 'var(--fb-primary)',
          borderBottom: '1px solid var(--fb-primary-hover)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--fb-surface)',
              borderRadius: 'var(--fb-radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--fb-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div style={{ marginLeft: 'var(--fb-spacing-md)' }}>
              <h1 style={{ 
                fontSize: 'var(--fb-font-size-lg)', 
                fontWeight: 'var(--fb-font-weight-semibold)', 
                color: 'white',
                margin: 0
              }}>MSP 헬퍼</h1>
              <p style={{ 
                fontSize: 'var(--fb-font-size-xs)', 
                color: 'rgba(255,255,255,0.8)',
                margin: 0
              }}>관리자 콘솔</p>
            </div>
          </div>
        </div>

        {/* Facebook Style Navigation */}
        <nav style={{ 
          flex: 1, 
          padding: 'var(--fb-spacing-sm)', 
          overflowY: 'auto' 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fb-spacing-xs)' }}>
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--fb-spacing-md)',
                  padding: 'var(--fb-spacing-sm) var(--fb-spacing-md)',
                  borderRadius: 'var(--fb-radius-lg)',
                  backgroundColor: pathname === item.href ? 'var(--fb-active-bg)' : 'transparent',
                  color: pathname === item.href ? 'var(--fb-primary)' : 'var(--fb-text-primary)',
                  fontFamily: 'var(--fb-font-family)',
                  fontSize: 'var(--fb-font-size-base)',
                  fontWeight: 'var(--fb-font-weight-semibold)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all var(--fb-transition-fast)'
                }}
                onMouseEnter={(e) => {
                  if (pathname !== item.href) {
                    e.currentTarget.style.backgroundColor = 'var(--fb-background)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== item.href) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--fb-radius-full)',
                  backgroundColor: pathname === item.href ? 'var(--fb-active-bg)' : 'var(--fb-secondary)',
                  color: pathname === item.href ? 'var(--fb-primary)' : 'var(--fb-text-primary)',
                  flexShrink: 0,
                  transition: 'all var(--fb-transition-fast)'
                }}>
                  {item.icon}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
              </a>
            ))}
          </div>
        </nav>

        {/* Facebook Style User Info */}
        <div style={{
          padding: 'var(--fb-spacing-lg)',
          borderTop: '1px solid var(--fb-border)',
          backgroundColor: 'var(--fb-background)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 'var(--fb-spacing-md)' 
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--fb-primary)',
              borderRadius: 'var(--fb-radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ 
                fontSize: 'var(--fb-font-size-sm)', 
                fontWeight: 'var(--fb-font-weight-semibold)', 
                color: 'white' 
              }}>
                {isHydrated ? user?.name?.charAt(0)?.toUpperCase() : ''}
              </span>
            </div>
            <div style={{ 
              marginLeft: 'var(--fb-spacing-sm)', 
              flex: 1, 
              minWidth: 0 
            }}>
              <p style={{ 
                fontSize: 'var(--fb-font-size-base)', 
                fontWeight: 'var(--fb-font-weight-semibold)', 
                color: 'var(--fb-text-primary)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {isHydrated ? user?.name : ''}
              </p>
              <p style={{ 
                fontSize: 'var(--fb-font-size-xs)', 
                color: 'var(--fb-text-secondary)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {isHydrated ? user?.email : ''}
              </p>
              {isHydrated && user?.role && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${getRoleColor(user.role as UserRole)}`}>
                  {getRoleDisplayName(user.role as UserRole)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--fb-spacing-sm) var(--fb-spacing-md)',
              backgroundColor: 'var(--fb-secondary)',
              color: 'var(--fb-text-primary)',
              border: 'none',
              borderRadius: 'var(--fb-radius-md)',
              fontFamily: 'var(--fb-font-family)',
              fontSize: 'var(--fb-font-size-base)',
              fontWeight: 'var(--fb-font-weight-semibold)',
              cursor: 'pointer',
              transition: 'all var(--fb-transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--fb-secondary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--fb-secondary)';
            }}
          >
            <svg style={{ width: '16px', height: '16px', marginRight: 'var(--fb-spacing-sm)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </div>

      {/* Facebook Style Mobile Header */}
      <div 
        className="lg:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          backgroundColor: 'var(--fb-surface)',
          borderBottom: '1px solid var(--fb-border)',
          boxShadow: 'var(--fb-shadow-sm)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'var(--fb-header-height)',
          padding: '0 var(--fb-spacing-lg)'
        }}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: 'var(--fb-radius-full)',
              backgroundColor: 'var(--fb-secondary)',
              color: 'var(--fb-text-primary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--fb-transition-fast)'
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 style={{ 
            fontSize: 'var(--fb-font-size-lg)', 
            fontWeight: 'var(--fb-font-weight-semibold)', 
            color: 'var(--fb-text-primary)',
            margin: 0
          }}>MSP 헬퍼 관리자</h1>
          <div style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'var(--fb-primary)',
            borderRadius: 'var(--fb-radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ 
              fontSize: 'var(--fb-font-size-sm)', 
              fontWeight: 'var(--fb-font-weight-semibold)', 
              color: 'white' 
            }}>
              {isHydrated ? user?.name?.charAt(0)?.toUpperCase() : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Facebook Style Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }}
        />
      )}

      {/* Facebook Style Main Content */}
      <div 
        className="fb-admin-main"
        style={{
          flex: 1,
          marginLeft: 'var(--fb-sidebar-width)',
          minHeight: '100vh',
          backgroundColor: 'var(--fb-background)'
        }}
      >
        <main style={{ 
          paddingTop: '24px',
          minHeight: '100vh'
        }} className="lg:pt-6 pt-14">
          <div style={{
            height: '100%',
            padding: '24px var(--fb-spacing-lg) var(--fb-spacing-lg)',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {children}
          </div>
        </main>
      </div>

      {/* Responsive Styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .fb-admin-sidebar {
            transform: translateX(-100%);
          }
          .fb-admin-sidebar.open {
            transform: translateX(0);
          }
          .fb-admin-main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
