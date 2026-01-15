'use client';

import React, { forwardRef, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ============================================
// Navigation Item Types
// ============================================

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

// Icons
const DashboardIcon = () => (
  <svg data-testid="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 1v10h10V4H5z" clipRule="evenodd" />
  </svg>
);

const FinancesIcon = () => (
  <svg data-testid="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);

const ItineraryIcon = () => (
  <svg data-testid="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

const GalleryIcon = () => (
  <svg data-testid="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  </svg>
);

const AttendeesIcon = () => (
  <svg data-testid="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const SettingsIcon = () => (
  <svg data-testid="nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

// ============================================
// MobileNav Component
// ============================================

interface MobileNavProps extends React.HTMLAttributes<HTMLElement> {
  tripId: string;
}

const MobileNav = forwardRef<HTMLElement, MobileNavProps>(
  ({ tripId, className = '', ...props }, ref) => {
    const pathname = usePathname();

    const navItems: NavItem[] = [
      { label: 'Dashboard', href: `/trips/${tripId}/dashboard`, icon: <DashboardIcon /> },
      { label: 'Finances', href: `/trips/${tripId}/finances`, icon: <FinancesIcon /> },
      { label: 'Itinerary', href: `/trips/${tripId}/itinerary`, icon: <ItineraryIcon /> },
      { label: 'Gallery', href: `/trips/${tripId}/gallery`, icon: <GalleryIcon /> },
    ];

    return (
      <nav ref={ref} className={`mobile-nav ${className}`} {...props}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${isActive ? 'mobile-nav-item-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }
);

MobileNav.displayName = 'MobileNav';

// ============================================
// DesktopSidebar Component
// ============================================

interface DesktopSidebarProps extends React.HTMLAttributes<HTMLElement> {
  tripId: string;
  tripName: string;
  collapsed?: boolean;
  userName?: string;
  userAvatar?: string;
}

const DesktopSidebar = forwardRef<HTMLElement, DesktopSidebarProps>(
  ({ tripId, tripName, collapsed = false, userName, userAvatar, className = '', ...props }, ref) => {
    const pathname = usePathname();

    const navItems: NavItem[] = [
      { label: 'Dashboard', href: `/trips/${tripId}/dashboard`, icon: <DashboardIcon /> },
      { label: 'Finances', href: `/trips/${tripId}/finances`, icon: <FinancesIcon /> },
      { label: 'Itinerary', href: `/trips/${tripId}/itinerary`, icon: <ItineraryIcon /> },
      { label: 'Gallery', href: `/trips/${tripId}/gallery`, icon: <GalleryIcon /> },
      { label: 'Attendees', href: `/trips/${tripId}/attendees`, icon: <AttendeesIcon /> },
      { label: 'Settings', href: `/trips/${tripId}/settings`, icon: <SettingsIcon /> },
    ];

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <nav
        ref={ref}
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${className}`}
        {...props}
      >
        <div className="sidebar-header">
          <span className={`sidebar-title ${collapsed ? 'sr-only' : ''}`}>{tripName}</span>
        </div>

        <div className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className={`sidebar-nav-label ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {userName && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} />
                ) : (
                  <span>{getInitials(userName)}</span>
                )}
              </div>
              <span className={`sidebar-user-name ${collapsed ? 'sr-only' : ''}`}>{userName}</span>
            </div>
          </div>
        )}
      </nav>
    );
  }
);

DesktopSidebar.displayName = 'DesktopSidebar';

// ============================================
// PageHeader Component
// ============================================

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  sticky?: boolean;
  loading?: boolean;
}

const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  ({
    title,
    subtitle,
    showBack,
    onBack,
    actions,
    breadcrumbs,
    sticky = false,
    loading = false,
    className = '',
    ...props
  }, ref) => {
    if (loading) {
      return (
        <header
          ref={ref}
          className={`page-header ${sticky ? 'page-header-sticky' : ''} ${className}`}
          {...props}
        >
          <div className="page-header-skeleton" data-testid="page-header-skeleton">
            <div className="skeleton skeleton-pulse skeleton-text" style={{ width: '200px', height: '2rem' }} />
            <div className="skeleton skeleton-pulse skeleton-text" style={{ width: '300px', height: '1rem', marginTop: '0.5rem' }} />
          </div>
        </header>
      );
    }

    return (
      <header
        ref={ref}
        className={`page-header ${sticky ? 'page-header-sticky' : ''} ${className}`}
        {...props}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="page-header-breadcrumbs" aria-label="Breadcrumb">
            <ol className="breadcrumb-list">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="breadcrumb-item">
                  {crumb.href ? (
                    <Link href={crumb.href} className="breadcrumb-link">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="breadcrumb-current" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && (
                    <span className="breadcrumb-separator" aria-hidden="true">
                      /
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="page-header-content">
          <div className="page-header-left">
            {showBack && (
              <button
                type="button"
                className="page-header-back"
                onClick={onBack}
                aria-label="Go back"
              >
                <BackIcon />
              </button>
            )}
            <div className="page-header-text">
              <h1 className="page-header-title">{title}</h1>
              {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
            </div>
          </div>

          {actions && <div className="page-header-actions">{actions}</div>}
        </div>
      </header>
    );
  }
);

PageHeader.displayName = 'PageHeader';

export { MobileNav, DesktopSidebar, PageHeader };
export type { MobileNavProps, DesktopSidebarProps, PageHeaderProps, Breadcrumb };
