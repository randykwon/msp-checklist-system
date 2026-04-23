'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  badge?: number | string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  position?: 'left' | 'right';
  compact?: boolean;
  elevated?: boolean;
  className?: string;
  footer?: React.ReactNode;
  user?: {
    name: string;
    avatar?: string;
    status?: string;
    onClick?: () => void;
  };
}

export default function Sidebar({
  sections,
  position = 'left',
  compact = false,
  elevated = false,
  className = '',
  footer,
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isItemActive = (item: SidebarItem): boolean => {
    if (item.active !== undefined) return item.active;
    if (item.href) return pathname === item.href;
    return false;
  };

  const renderSidebarItem = (item: SidebarItem, isSubmenuItem = false) => {
    const isActive = isItemActive(item);
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    const itemClasses = [
      'fb-sidebar-item',
      isActive ? 'fb-sidebar-item-active' : '',
      item.disabled ? 'fb-sidebar-item-disabled' : '',
      hasChildren && isExpanded ? 'fb-sidebar-item-expanded' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = (e: React.MouseEvent) => {
      if (hasChildren) {
        e.preventDefault();
        toggleExpanded(item.id);
      }
      if (item.onClick) {
        item.onClick();
      }
    };

    const content = (
      <>
        <span className="fb-sidebar-item-icon">{item.icon}</span>
        <span className="fb-sidebar-item-content">
          <span className="fb-sidebar-item-text">{item.label}</span>
          {item.description && (
            <span className="fb-sidebar-item-description">{item.description}</span>
          )}
        </span>
        {item.badge !== undefined && (
          <span className="fb-sidebar-item-badge">{item.badge}</span>
        )}
        {hasChildren && (
          <span className="fb-sidebar-item-arrow">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        )}
      </>
    );

    if (item.href && !hasChildren) {
      return (
        <Link
          key={item.id}
          href={item.href}
          className={itemClasses}
          onClick={item.onClick}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        className={itemClasses}
        onClick={handleClick}
        disabled={item.disabled}
        type="button"
      >
        {content}
      </button>
    );
  };

  const sidebarClasses = [
    'fb-sidebar',
    position === 'left' ? 'fb-sidebar-left' : 'fb-sidebar-right',
    compact ? 'fb-sidebar-compact' : '',
    elevated ? 'fb-sidebar-elevated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={sidebarClasses}>
      {/* User Card */}
      {user && (
        <div
          className="fb-sidebar-user"
          onClick={user.onClick}
          role={user.onClick ? 'button' : undefined}
          tabIndex={user.onClick ? 0 : undefined}
        >
          <div className="fb-sidebar-user-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="fb-sidebar-user-info">
            <div className="fb-sidebar-user-name">{user.name}</div>
            {user.status && (
              <div className="fb-sidebar-user-status">{user.status}</div>
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.id} className="fb-sidebar-section">
          {section.title && (
            <div className="fb-sidebar-section-title">{section.title}</div>
          )}
          {section.items.map((item) => (
            <div key={item.id}>
              {renderSidebarItem(item)}
              {item.children && item.children.length > 0 && (
                <div
                  className={`fb-sidebar-submenu ${
                    expandedItems.has(item.id) ? 'fb-sidebar-submenu-open' : ''
                  }`}
                >
                  {item.children.map((child) => renderSidebarItem(child, true))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Footer */}
      {footer && <div className="fb-sidebar-footer">{footer}</div>}
    </aside>
  );
}
