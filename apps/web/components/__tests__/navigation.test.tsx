import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav, DesktopSidebar, PageHeader } from '../navigation';

// Mock usePathname
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('MobileNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard');
  });

  describe('rendering', () => {
    it('should render navigation', () => {
      render(<MobileNav tripId="trip123" />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<MobileNav tripId="trip123" />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Finances')).toBeInTheDocument();
      expect(screen.getByText('Itinerary')).toBeInTheDocument();
      expect(screen.getByText('Gallery')).toBeInTheDocument();
    });

    it('should render icons for navigation items', () => {
      render(<MobileNav tripId="trip123" />);
      const navItems = screen.getAllByRole('link');
      expect(navItems.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('active state', () => {
    it('should mark current page as active', () => {
      mockUsePathname.mockReturnValue('/trips/trip123/dashboard');
      render(<MobileNav tripId="trip123" />);
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not mark other pages as active', () => {
      mockUsePathname.mockReturnValue('/trips/trip123/dashboard');
      render(<MobileNav tripId="trip123" />);
      const financesLink = screen.getByRole('link', { name: /finances/i });
      expect(financesLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('links', () => {
    it('should link to correct trip paths', () => {
      render(<MobileNav tripId="trip123" />);
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/trips/trip123/dashboard');
    });

    it('should have correct hrefs for all nav items', () => {
      render(<MobileNav tripId="trip123" />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/trips/trip123/dashboard');
      expect(screen.getByRole('link', { name: /finances/i })).toHaveAttribute('href', '/trips/trip123/finances');
      expect(screen.getByRole('link', { name: /itinerary/i })).toHaveAttribute('href', '/trips/trip123/itinerary');
      expect(screen.getByRole('link', { name: /gallery/i })).toHaveAttribute('href', '/trips/trip123/gallery');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<MobileNav tripId="trip123" className="custom-class" />);
      expect(screen.getByRole('navigation')).toHaveClass('custom-class');
    });

    it('should be fixed at bottom', () => {
      render(<MobileNav tripId="trip123" />);
      expect(screen.getByRole('navigation')).toHaveClass('mobile-nav');
    });
  });
});

describe('DesktopSidebar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/trips/trip123/dashboard');
  });

  describe('rendering', () => {
    it('should render navigation', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render trip name', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" />);
      expect(screen.getByText('Bachelor Party')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Finances')).toBeInTheDocument();
      expect(screen.getByText('Itinerary')).toBeInTheDocument();
      expect(screen.getByText('Gallery')).toBeInTheDocument();
      expect(screen.getByText('Attendees')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render icons for navigation items', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" />);
      const icons = screen.getAllByTestId('nav-icon');
      expect(icons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('active state', () => {
    it('should mark current page as active', () => {
      mockUsePathname.mockReturnValue('/trips/trip123/finances');
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" />);
      const financesLink = screen.getByRole('link', { name: /finances/i });
      expect(financesLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('collapsed state', () => {
    it('should support collapsed prop', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" collapsed />);
      expect(screen.getByRole('navigation')).toHaveClass('sidebar-collapsed');
    });

    it('should hide text when collapsed', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" collapsed />);
      // Trip name should be visually hidden but still in DOM for accessibility
      expect(screen.getByText('Bachelor Party')).toHaveClass('sr-only');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<DesktopSidebar tripId="trip123" tripName="Bachelor Party" className="custom-class" />);
      expect(screen.getByRole('navigation')).toHaveClass('custom-class');
    });
  });

  describe('user info', () => {
    it('should render user avatar when provided', () => {
      render(
        <DesktopSidebar
          tripId="trip123"
          tripName="Bachelor Party"
          userName="John Doe"
        />
      );
      expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
    });
  });
});

describe('PageHeader', () => {
  describe('rendering', () => {
    it('should render header', () => {
      render(<PageHeader title="Dashboard" />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<PageHeader title="Dashboard" />);
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(<PageHeader title="Dashboard" subtitle="Overview of your trip" />);
      expect(screen.getByText('Overview of your trip')).toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('should render back button when showBack is true', () => {
      render(<PageHeader title="Expense Details" showBack />);
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should not render back button by default', () => {
      render(<PageHeader title="Dashboard" />);
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', () => {
      const handleBack = vi.fn();
      render(<PageHeader title="Expense Details" showBack onBack={handleBack} />);
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('actions', () => {
    it('should render actions when provided', () => {
      render(
        <PageHeader title="Finances" actions={<button>Add Expense</button>} />
      );
      expect(screen.getByRole('button', { name: 'Add Expense' })).toBeInTheDocument();
    });

    it('should render multiple actions', () => {
      render(
        <PageHeader
          title="Finances"
          actions={
            <>
              <button>Add Expense</button>
              <button>Export</button>
            </>
          }
        />
      );
      expect(screen.getByRole('button', { name: 'Add Expense' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    });
  });

  describe('breadcrumbs', () => {
    it('should render breadcrumbs when provided', () => {
      render(
        <PageHeader
          title="Expense Details"
          breadcrumbs={[
            { label: 'Finances', href: '/finances' },
            { label: 'Expenses', href: '/finances/expenses' },
            { label: 'Expense #123' },
          ]}
        />
      );
      expect(screen.getByText('Finances')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Expense #123')).toBeInTheDocument();
    });

    it('should render breadcrumb links', () => {
      render(
        <PageHeader
          title="Expense Details"
          breadcrumbs={[
            { label: 'Finances', href: '/finances' },
          ]}
        />
      );
      expect(screen.getByRole('link', { name: 'Finances' })).toHaveAttribute('href', '/finances');
    });

    it('should not link the last breadcrumb', () => {
      render(
        <PageHeader
          title="Expense Details"
          breadcrumbs={[
            { label: 'Finances', href: '/finances' },
            { label: 'Current' },
          ]}
        />
      );
      expect(screen.queryByRole('link', { name: 'Current' })).not.toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<PageHeader title="Dashboard" className="custom-class" />);
      expect(screen.getByRole('banner')).toHaveClass('custom-class');
    });

    it('should support sticky prop', () => {
      render(<PageHeader title="Dashboard" sticky />);
      expect(screen.getByRole('banner')).toHaveClass('page-header-sticky');
    });
  });

  describe('loading state', () => {
    it('should show skeleton when loading', () => {
      render(<PageHeader title="Dashboard" loading />);
      expect(screen.getByTestId('page-header-skeleton')).toBeInTheDocument();
    });
  });
});
