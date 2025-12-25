'use client';

import { useEffect } from 'react';
import Sidebar, { SidebarSection } from './Sidebar';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  sections: SidebarSection[];
  user?: {
    name: string;
    avatar?: string;
    status?: string;
    onClick?: () => void;
  };
  footer?: React.ReactNode;
}

export default function SidebarDrawer({
  isOpen,
  onClose,
  title = 'Menu',
  sections,
  user,
  footer,
}: SidebarDrawerProps) {
  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fb-sidebar-drawer-overlay ${
          isOpen ? 'fb-sidebar-drawer-overlay-visible' : ''
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fb-sidebar-drawer ${isOpen ? 'fb-sidebar-drawer-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="fb-sidebar-drawer-header">
          <h2 className="fb-sidebar-drawer-title">{title}</h2>
          <button
            className="fb-sidebar-drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Sidebar Content */}
        <div style={{ margin: 'calc(-1 * var(--fb-spacing-md))' }}>
          <Sidebar
            sections={sections}
            user={user}
            footer={footer}
            className="fb-sidebar-in-drawer"
          />
        </div>
      </div>
    </>
  );
}

// Sidebar Toggle Button Component
export function SidebarToggleButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`fb-sidebar-toggle ${className}`}
      onClick={onClick}
      aria-label="Open menu"
    >
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  );
}
