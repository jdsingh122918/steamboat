import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TripStatsCard } from '../trip-stats-card';

describe('TripStatsCard', () => {
  const defaultStats = {
    totalExpenses: 250000, // $2,500.00 in cents
    totalAttendees: 8,
    confirmedAttendees: 6,
    totalPhotos: 42,
    totalActivities: 12,
    totalPolls: 5,
    openPolls: 2,
    expenseBreakdown: [
      { category: 'food', amount_cents: 80000 },
      { category: 'accommodation', amount_cents: 100000 },
      { category: 'activities', amount_cents: 50000 },
      { category: 'transport', amount_cents: 20000 },
    ],
    paymentStatus: {
      settled: 150000,
      pending: 100000,
    },
  };

  describe('rendering', () => {
    it('should render total expenses', () => {
      render(<TripStatsCard stats={defaultStats} />);

      expect(screen.getByText(/\$2,500\.00/)).toBeInTheDocument();
    });

    it('should render attendee count', () => {
      render(<TripStatsCard stats={defaultStats} />);

      expect(screen.getByText(/8 attendees/i)).toBeInTheDocument();
      expect(screen.getByText(/6 confirmed/i)).toBeInTheDocument();
    });

    it('should render photo count', () => {
      render(<TripStatsCard stats={defaultStats} />);

      expect(screen.getByText(/42 photos/i)).toBeInTheDocument();
    });

    it('should render activity count', () => {
      render(<TripStatsCard stats={defaultStats} />);

      expect(screen.getByText(/12 activities/i)).toBeInTheDocument();
    });

    it('should render poll count', () => {
      render(<TripStatsCard stats={defaultStats} />);

      expect(screen.getByText(/5 polls/i)).toBeInTheDocument();
      expect(screen.getByText(/2 open/i)).toBeInTheDocument();
    });
  });

  describe('expense breakdown', () => {
    it('should render expense categories', () => {
      render(<TripStatsCard stats={defaultStats} />);

      // Use getAllBy since 'activities' appears in both overview and breakdown
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Accommodation')).toBeInTheDocument();
      expect(screen.getByText('Activities')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
    });

    it('should render category amounts', () => {
      render(<TripStatsCard stats={defaultStats} />);

      // Category amounts in the expense breakdown section
      const expenseList = screen.getByText('Expense Breakdown').parentElement;
      expect(expenseList).toBeInTheDocument();
      expect(screen.getByText('$800.00')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
      // Note: $1,000.00 also appears in pending payments, use getAllBy
      expect(screen.getAllByText('$1,000.00').length).toBeGreaterThan(0);
    });

    it('should render category percentages', () => {
      render(<TripStatsCard stats={defaultStats} />);

      // food: 80000 / 250000 = 32%
      expect(screen.getByText(/32%/)).toBeInTheDocument();
      // accommodation: 100000 / 250000 = 40%
      expect(screen.getByText(/40%/)).toBeInTheDocument();
    });
  });

  describe('payment status', () => {
    it('should render settled amount', () => {
      render(<TripStatsCard stats={defaultStats} />);

      const settledSection = screen.getByText('Settled').closest('.payment-item');
      expect(settledSection).toBeInTheDocument();
      expect(settledSection?.querySelector('.payment-amount')).toHaveTextContent('$1,500.00');
    });

    it('should render pending amount', () => {
      render(<TripStatsCard stats={defaultStats} />);

      const pendingSection = screen.getByText('Pending').closest('.payment-item');
      expect(pendingSection).toBeInTheDocument();
      expect(pendingSection?.querySelector('.payment-amount')).toHaveTextContent('$1,000.00');
    });

    it('should render settlement progress', () => {
      render(<TripStatsCard stats={defaultStats} />);

      // 150000 / 250000 = 60% settled
      expect(screen.getByText(/60%.*settled/i)).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should handle zero expenses', () => {
      render(
        <TripStatsCard
          stats={{
            ...defaultStats,
            totalExpenses: 0,
            expenseBreakdown: [],
            paymentStatus: { settled: 0, pending: 0 },
          }}
        />
      );

      // Multiple $0.00 values appear (Total Expenses, Settled, Pending)
      expect(screen.getAllByText(/\$0\.00/).length).toBeGreaterThan(0);
      expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument();
    });

    it('should handle zero attendees', () => {
      render(
        <TripStatsCard
          stats={{
            ...defaultStats,
            totalAttendees: 0,
            confirmedAttendees: 0,
          }}
        />
      );

      expect(screen.getByText(/0 attendees/i)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<TripStatsCard stats={defaultStats} className="custom-class" />);

      const card = screen.getByTestId('trip-stats-card');
      expect(card).toHaveClass('custom-class');
    });

    it('should highlight categories with high percentages', () => {
      render(<TripStatsCard stats={defaultStats} />);

      // Accommodation at 40% should be highlighted as top category
      const accommodationCategory = screen.getByText('Accommodation').closest('.expense-category');
      expect(accommodationCategory).toHaveClass('top-category');
    });
  });

  describe('loading state', () => {
    it('should show loading skeleton when loading', () => {
      render(<TripStatsCard stats={defaultStats} loading />);

      expect(screen.getByTestId('trip-stats-loading')).toBeInTheDocument();
    });

    it('should hide content when loading', () => {
      render(<TripStatsCard stats={defaultStats} loading />);

      expect(screen.queryByText(/\$2,500\.00/)).not.toBeInTheDocument();
    });
  });
});
