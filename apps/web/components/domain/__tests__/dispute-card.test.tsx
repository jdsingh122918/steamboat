import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DisputeCard } from '../dispute-card';

describe('DisputeCard', () => {
  const mockOnResolve = vi.fn();

  const defaultDispute = {
    id: 'disp-123',
    expenseId: 'exp-456',
    expenseDescription: 'Dinner at restaurant',
    expenseAmount: 15000,
    filedBy: {
      id: 'att-1',
      name: 'John Doe',
    },
    reason: 'I did not participate in this dinner event',
    disputeType: 'not_participated' as const,
    status: 'open' as const,
    createdAt: new Date('2024-01-15T10:30:00Z'),
  };

  const defaultProps = {
    dispute: defaultDispute,
    isAdmin: false,
    onResolve: mockOnResolve,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnResolve.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render expense description', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/dinner at restaurant/i)).toBeInTheDocument();
    });

    it('should render expense amount', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
    });

    it('should render dispute reason', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/did not participate/i)).toBeInTheDocument();
    });

    it('should render filed by name', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should render dispute type badge', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/not participated/i)).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/open/i)).toBeInTheDocument();
    });

    it('should render created date', () => {
      render(<DisputeCard {...defaultProps} />);

      expect(screen.getByText(/jan.*15.*2024/i)).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should show open status with correct styling', () => {
      render(<DisputeCard {...defaultProps} />);

      const statusBadge = screen.getByText(/open/i);
      expect(statusBadge).toHaveClass('status-open');
    });

    it('should show resolved status with correct styling', () => {
      render(
        <DisputeCard
          {...defaultProps}
          dispute={{ ...defaultDispute, status: 'resolved' }}
        />
      );

      const statusBadge = screen.getByText(/resolved/i);
      expect(statusBadge).toHaveClass('status-resolved');
    });

    it('should show rejected status with correct styling', () => {
      render(
        <DisputeCard
          {...defaultProps}
          dispute={{ ...defaultDispute, status: 'rejected' }}
        />
      );

      const statusBadge = screen.getByText(/rejected/i);
      expect(statusBadge).toHaveClass('status-rejected');
    });
  });

  describe('admin actions', () => {
    it('should show resolve buttons for admin on open disputes', () => {
      render(<DisputeCard {...defaultProps} isAdmin />);

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('should hide resolve buttons for non-admin', () => {
      render(<DisputeCard {...defaultProps} isAdmin={false} />);

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should hide resolve buttons for resolved disputes', () => {
      render(
        <DisputeCard
          {...defaultProps}
          isAdmin
          dispute={{ ...defaultDispute, status: 'resolved' }}
        />
      );

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should call onResolve with accept when accept button is clicked', async () => {
      render(<DisputeCard {...defaultProps} isAdmin />);

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(mockOnResolve).toHaveBeenCalledWith('disp-123', 'resolved');
      });
    });

    it('should call onResolve with reject when reject button is clicked', async () => {
      render(<DisputeCard {...defaultProps} isAdmin />);

      fireEvent.click(screen.getByRole('button', { name: /reject/i }));

      await waitFor(() => {
        expect(mockOnResolve).toHaveBeenCalledWith('disp-123', 'rejected');
      });
    });

    it('should show loading state when resolving', async () => {
      mockOnResolve.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DisputeCard {...defaultProps} isAdmin />);

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(screen.getByText(/resolving/i)).toBeInTheDocument();
      });
    });

    it('should hide buttons while resolving', async () => {
      mockOnResolve.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<DisputeCard {...defaultProps} isAdmin />);

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        // Buttons are replaced by "Resolving..." text
        expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
      });
    });

    it('should show error message on resolve failure', async () => {
      mockOnResolve.mockRejectedValue(new Error('Failed to resolve'));

      render(<DisputeCard {...defaultProps} isAdmin />);

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to resolve/i)).toBeInTheDocument();
      });
    });
  });

  describe('resolution info', () => {
    it('should show resolution date for resolved disputes', () => {
      render(
        <DisputeCard
          {...defaultProps}
          dispute={{
            ...defaultDispute,
            status: 'resolved',
            resolvedAt: new Date('2024-01-16T14:00:00Z'),
          }}
        />
      );

      expect(screen.getByText(/resolved.*jan.*16.*2024/i)).toBeInTheDocument();
    });

    it('should show resolution note if provided', () => {
      render(
        <DisputeCard
          {...defaultProps}
          dispute={{
            ...defaultDispute,
            status: 'resolved',
            resolutionNote: 'Expense was adjusted accordingly',
          }}
        />
      );

      expect(screen.getByText(/expense was adjusted accordingly/i)).toBeInTheDocument();
    });
  });
});
